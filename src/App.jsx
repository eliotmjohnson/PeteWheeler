import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeDollarSign,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  LineChart,
  ListPlus,
  List,
  MoreHorizontal,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  WalletCards,
  X,
  House,
} from "lucide-react";

const STORAGE_KEY = "wheel-cost-tracker:v1";
const CONTRACT_SIZE = 100;

const TRADE_TYPES = {
  sell_put: {
    label: "Sell put",
    shortLabel: "STO put",
    side: "credit",
    option: true,
    icon: ArrowDownToLine,
  },
  buy_put: {
    label: "Buy back put",
    shortLabel: "BTC put",
    side: "debit",
    option: true,
    icon: ArrowUpFromLine,
  },
  assignment: {
    label: "Assigned shares",
    shortLabel: "Assigned",
    side: "debit",
    option: false,
    icon: CheckCircle2,
  },
  sell_call: {
    label: "Sell call",
    shortLabel: "STO call",
    side: "credit",
    option: true,
    icon: ArrowDownToLine,
  },
  buy_call: {
    label: "Buy back call",
    shortLabel: "BTC call",
    side: "debit",
    option: true,
    icon: ArrowUpFromLine,
  },
  called_away: {
    label: "Called away",
    shortLabel: "Called",
    side: "credit",
    option: false,
    icon: ShieldCheck,
  },
};

const TYPE_ORDER = [
  "sell_put",
  "buy_put",
  "assignment",
  "sell_call",
  "buy_call",
  "called_away",
];

const SAMPLE_POSITION = {
  id: "sample-aapl",
  symbol: "AAPL",
  createdAt: "2026-07-01T10:00:00.000Z",
  events: [
    {
      id: "sample-1",
      type: "sell_put",
      date: "2026-07-03",
      contracts: 1,
      shares: 100,
      strike: 195,
      premium: 2.4,
      fees: 0.65,
      note: "Opened cash-secured put",
    },
    {
      id: "sample-2",
      type: "buy_put",
      date: "2026-07-10",
      contracts: 1,
      shares: 100,
      strike: 195,
      premium: 0.8,
      fees: 0.65,
      note: "Rolled early",
    },
    {
      id: "sample-3",
      type: "sell_put",
      date: "2026-07-10",
      contracts: 1,
      shares: 100,
      strike: 190,
      premium: 3.1,
      fees: 0.65,
      note: "Opened next put",
    },
    {
      id: "sample-4",
      type: "assignment",
      date: "2026-07-24",
      contracts: 1,
      shares: 100,
      strike: 190,
      premium: 0,
      fees: 0,
      note: "Assigned 100 shares",
    },
    {
      id: "sample-5",
      type: "sell_call",
      date: "2026-07-27",
      contracts: 1,
      shares: 100,
      strike: 192.5,
      premium: 1.15,
      fees: 0.65,
      note: "First covered call",
    },
  ],
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyEventForm = () => ({
  type: "sell_put",
  date: today(),
  contracts: "1",
  shares: "100",
  strike: "",
  premium: "",
  fees: "0",
  note: "",
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

function formatCurrency(value, compact = false) {
  if (!Number.isFinite(value)) return "--";
  return compact
    ? compactCurrencyFormatter.format(value)
    : currencyFormatter.format(value);
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "--";
  return numberFormatter.format(value);
}

function parseNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function makeId(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function getShares(event) {
  const shares = parseNumber(event.shares);
  if (shares > 0) return shares;
  return parseNumber(event.contracts) * CONTRACT_SIZE;
}

function optionCredit(event) {
  return (
    parseNumber(event.premium) * parseNumber(event.contracts) * CONTRACT_SIZE
  );
}

function optionFees(event) {
  return parseNumber(event.fees);
}

function eventCashFlow(event) {
  const strike = parseNumber(event.strike);
  const fees = parseNumber(event.fees);
  const shares = getShares(event);

  switch (event.type) {
    case "sell_put":
    case "sell_call":
      return optionCredit(event) - optionFees(event);
    case "buy_put":
    case "buy_call":
      return -(optionCredit(event) + optionFees(event));
    case "assignment":
      return -(strike * shares + fees);
    case "called_away":
      return strike * shares - fees;
    default:
      return 0;
  }
}

function eventOptionNet(event) {
  if (event.type === "sell_put" || event.type === "sell_call")
    return optionCredit(event) - optionFees(event);
  if (event.type === "buy_put" || event.type === "buy_call")
    return -(optionCredit(event) + optionFees(event));
  return 0;
}

function eventSortValue(event, index) {
  const dateValue = new Date(
    `${event.date || "1970-01-01"}T00:00:00`
  ).getTime();
  return `${String(dateValue).padStart(16, "0")}-${String(index).padStart(
    8,
    "0"
  )}`;
}

function analyzePosition(position) {
  const events = [...(position.events || [])]
    .map((event, index) => ({ event, index }))
    .sort((a, b) =>
      eventSortValue(a.event, a.index).localeCompare(
        eventSortValue(b.event, b.index)
      )
    )
    .map(({ event }) => event);

  const totals = {
    putPremium: 0,
    callPremium: 0,
    assignmentCost: 0,
    assignedShares: 0,
    calledAwayProceeds: 0,
    calledAwayShares: 0,
    soldPutContracts: 0,
    boughtPutContracts: 0,
    soldCallContracts: 0,
    boughtCallContracts: 0,
    totalCashFlow: 0,
  };

  events.forEach((event) => {
    const contracts = parseNumber(event.contracts);
    const shares = getShares(event);
    const strike = parseNumber(event.strike);
    const fees = parseNumber(event.fees);
    const optionNet = eventOptionNet(event);

    totals.totalCashFlow += eventCashFlow(event);

    if (event.type === "sell_put") {
      totals.putPremium += optionNet;
      totals.soldPutContracts += contracts;
    }

    if (event.type === "buy_put") {
      totals.putPremium += optionNet;
      totals.boughtPutContracts += contracts;
    }

    if (event.type === "assignment") {
      totals.assignmentCost += strike * shares + fees;
      totals.assignedShares += shares;
    }

    if (event.type === "sell_call") {
      totals.callPremium += optionNet;
      totals.soldCallContracts += contracts;
    }

    if (event.type === "buy_call") {
      totals.callPremium += optionNet;
      totals.boughtCallContracts += contracts;
    }

    if (event.type === "called_away") {
      totals.calledAwayProceeds += strike * shares - fees;
      totals.calledAwayShares += shares;
    }
  });

  const currentShares = Math.max(
    0,
    totals.assignedShares - totals.calledAwayShares
  );
  const assignedPutContracts = totals.assignedShares / CONTRACT_SIZE;
  const openPutContracts = Math.max(
    0,
    totals.soldPutContracts - totals.boughtPutContracts - assignedPutContracts
  );
  const openCallContracts = Math.max(
    0,
    totals.soldCallContracts -
      totals.boughtCallContracts -
      totals.calledAwayShares / CONTRACT_SIZE
  );
  const netPremium = totals.putPremium + totals.callPremium;
  const averageAssignedStrike =
    totals.assignedShares > 0
      ? totals.assignmentCost / totals.assignedShares
      : null;
  const assignmentBasis =
    totals.assignedShares > 0
      ? (totals.assignmentCost - totals.putPremium) / totals.assignedShares
      : null;
  const adjustedBasis =
    totals.assignedShares > 0
      ? (totals.assignmentCost - netPremium) / totals.assignedShares
      : null;
  const closedWheelPnl =
    totals.assignedShares > 0 &&
    currentShares === 0 &&
    totals.calledAwayShares > 0
      ? totals.totalCashFlow
      : null;

  let status = "Watching";
  if (currentShares > 0) status = "Assigned";
  else if (closedWheelPnl !== null) status = "Closed";
  else if (openPutContracts > 0) status = "Put phase";
  else if (openCallContracts > 0) status = "Call phase";

  return {
    events,
    ...totals,
    currentShares,
    openPutContracts,
    openCallContracts,
    netPremium,
    averageAssignedStrike,
    assignmentBasis,
    adjustedBasis,
    closedWheelPnl,
    status,
  };
}

function summarizePortfolio(positions) {
  return positions.reduce(
    (acc, position) => {
      const analysis = analyzePosition(position);
      acc.netPremium += analysis.netPremium;
      acc.currentShares += analysis.currentShares;
      acc.assignmentCost += analysis.assignmentCost;
      acc.assignedPositions += analysis.currentShares > 0 ? 1 : 0;
      acc.openPutContracts += analysis.openPutContracts;
      acc.closedWheelPnl += analysis.closedWheelPnl || 0;
      return acc;
    },
    {
      netPremium: 0,
      currentShares: 0,
      assignmentCost: 0,
      assignedPositions: 0,
      openPutContracts: 0,
      closedWheelPnl: 0,
    }
  );
}

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

function Metric({ icon: Icon, label, value, subValue, tone = "neutral" }) {
  return (
    <article className={`metric metric-${tone}`}>
      <div className="metric-icon" aria-hidden="true">
        <Icon size={18} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {subValue ? <small>{subValue}</small> : null}
      </div>
    </article>
  );
}

function EmptyState({ onLoadSample }) {
  return (
    <section className="empty-state">
      <div className="empty-mark" aria-hidden="true">
        <WalletCards size={34} />
      </div>
      <h2>No positions yet</h2>
      <p>
        Add a ticker, record its transactions, and track its adjusted share cost
        automatically.
      </p>
      <button className="secondary-button" type="button" onClick={onLoadSample}>
        <ListPlus size={18} />
        Load sample
      </button>
    </section>
  );
}

function PositionCreator({ onCreate }) {
  const [draft, setDraft] = useState({
    symbol: "",
  });

  const updateDraft = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const submit = (event) => {
    event.preventDefault();
    const symbol = draft.symbol.trim().toUpperCase();
    if (!symbol) return;

    onCreate({
      id: makeId("position"),
      symbol,
      createdAt: new Date().toISOString(),
      events: [],
    });

    setDraft({
      symbol: "",
    });
  };

  return (
    <form className="position-form" onSubmit={submit}>
      <label>
        <span>Ticker</span>
        <input
          inputMode="text"
          autoCapitalize="characters"
          value={draft.symbol}
          onChange={(event) => updateDraft("symbol", event.target.value)}
          placeholder="AAPL"
        />
      </label>
      <button
        type="submit"
        className="primary-button"
        aria-label="Create position"
      >
        <Plus size={18} />
      </button>
    </form>
  );
}

function PositionList({ positions, onSelect }) {
  return (
    <div className="position-list">
      {positions.map((position) => {
        const analysis = analyzePosition(position);
        return (
          <article className="position-row" key={position.id}>
            <button
              className="position-select"
              type="button"
              onClick={() => onSelect(position.id)}
            >
              <span className="position-main">
                <strong>{position.symbol}</strong>
                <small>{analysis.status} · {analysis.events.length} transactions</small>
              </span>
              <span className="position-side">
                <small>
                  {analysis.adjustedBasis === null
                    ? "No share basis"
                    : `${formatCurrency(analysis.adjustedBasis)} basis`}
                </small>
              </span>
              <ChevronRight className="row-chevron" size={24} strokeWidth={2.25} aria-hidden="true" />
            </button>
          </article>
        );
      })}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const scrollY = window.scrollY;
    const bodyStyle = document.body.style;
    const original = {
      overflow: bodyStyle.overflow,
      position: bodyStyle.position,
      top: bodyStyle.top,
      width: bodyStyle.width,
    };

    bodyStyle.overflow = "hidden";
    bodyStyle.position = "fixed";
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.width = "100%";

    return () => {
      bodyStyle.overflow = original.overflow;
      bodyStyle.position = original.position;
      bodyStyle.top = original.top;
      bodyStyle.width = original.width;
      window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
    };
  }, []);

  const requestClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    window.setTimeout(onClose, 220);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={requestClose}>
      <section
        className={`modal-sheet ${isOpen && !isClosing ? "is-open" : ""} ${
          isClosing ? "is-closing" : ""
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id="modal-title">{title}</h2>
          <button className="icon-button" type="button" onClick={requestClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function TradeForm({ onAdd }) {
  const [form, setForm] = useState(emptyEventForm);
  const [error, setError] = useState("");
  const meta = TRADE_TYPES[form.type];
  const isOption = meta.option;
  const isShareEvent =
    form.type === "assignment" || form.type === "called_away";

  const update = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "contracts" && !isShareEvent) {
        next.shares = String(
          Math.max(0, parseNumber(value) * CONTRACT_SIZE || CONTRACT_SIZE)
        );
      }
      return next;
    });
  };

  const updateType = (type) => {
    setError("");
    setForm((current) => ({
      ...current,
      type,
      premium: TRADE_TYPES[type].option ? current.premium : "",
      shares:
        type === "assignment" || type === "called_away"
          ? current.shares || "100"
          : current.shares,
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    const contracts = parseNumber(form.contracts);
    const shares = parseNumber(form.shares);
    const strike = parseNumber(form.strike);
    const premium = parseNumber(form.premium);

    if (!form.date) {
      setError("Date is required.");
      return;
    }

    if (strike <= 0) {
      setError("Strike must be greater than zero.");
      return;
    }

    if (isOption && contracts <= 0) {
      setError("Contracts must be greater than zero.");
      return;
    }

    if (isOption && premium < 0) {
      setError("Premium cannot be negative.");
      return;
    }

    if (isShareEvent && shares <= 0) {
      setError("Shares must be greater than zero.");
      return;
    }

    onAdd({
      id: makeId("event"),
      type: form.type,
      date: form.date,
      contracts: isOption ? contracts : shares / CONTRACT_SIZE,
      shares: isOption ? contracts * CONTRACT_SIZE : shares,
      strike,
      premium: isOption ? premium : 0,
      fees: parseNumber(form.fees),
      note: form.note.trim(),
    });

    setForm((current) => ({
      ...emptyEventForm(),
      type: current.type,
      date: today(),
      strike: "",
      premium: "",
      fees: current.fees || "0",
    }));
    setError("");
  };

  return (
    <form className="trade-form" onSubmit={submit}>
      <div
        className="trade-type-grid"
        role="tablist"
        aria-label="Transaction type"
      >
        {TYPE_ORDER.map((type) => {
          const TypeIcon = TRADE_TYPES[type].icon;
          return (
            <button
              key={type}
              type="button"
              className={form.type === type ? "is-selected" : ""}
              onClick={() => updateType(type)}
            >
              <TypeIcon size={16} />
              {TRADE_TYPES[type].shortLabel}
            </button>
          );
        })}
      </div>

      <div className="form-grid">
        <label className="date-field">
          <span>Date</span>
          <span className="date-control">
            <input
              type="date"
              value={form.date}
              onChange={(event) => update("date", event.target.value)}
            />
          </span>
        </label>
        {isOption ? (
          <label>
            <span>Contracts</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={form.contracts}
              onChange={(event) => update("contracts", event.target.value)}
            />
          </label>
        ) : (
          <label>
            <span>Shares</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={form.shares}
              onChange={(event) => update("shares", event.target.value)}
            />
          </label>
        )}
        <label>
          <span>Strike</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={form.strike}
            onChange={(event) => update("strike", event.target.value)}
            placeholder="190"
          />
        </label>
        {isOption ? (
          <label>
            <span>Premium</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={form.premium}
              onChange={(event) => update("premium", event.target.value)}
              placeholder="1.25"
            />
          </label>
        ) : null}
        <label>
          <span>Fees</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={form.fees}
            onChange={(event) => update("fees", event.target.value)}
          />
        </label>
        <label className="wide">
          <span>Note</span>
          <input
            type="text"
            value={form.note}
            onChange={(event) => update("note", event.target.value)}
            placeholder={meta.label}
          />
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <button type="submit" className="primary-button wide-button">
        <ListPlus size={18} />
        Add transaction
      </button>
    </form>
  );
}

function EventTimeline({ events, onDelete }) {
  if (!events.length) {
    return (
      <div className="quiet-state">
        <CalendarDays size={22} />
        <span>No transactions</span>
      </div>
    );
  }

  return (
    <ol className="timeline">
      {events.map((event) => {
        const meta = TRADE_TYPES[event.type];
        const Icon = meta.icon;
        const cashFlow = eventCashFlow(event);

        return (
          <li className={`timeline-item ${meta.side}`} key={event.id}>
            <div className="timeline-icon" aria-hidden="true">
              <Icon size={16} />
            </div>
            <div className="timeline-copy">
              <div className="timeline-title">
                <strong>{meta.label}</strong>
                <span className={cashFlow >= 0 ? "positive" : "negative"}>
                  {formatCurrency(cashFlow)}
                </span>
              </div>
              <div className="timeline-meta">
                <span>{event.date}</span>
                <span>{formatNumber(event.shares)} shares</span>
                <span>{formatCurrency(parseNumber(event.strike))} strike</span>
                {meta.option ? (
                  <span>
                    {formatCurrency(parseNumber(event.premium))} premium
                  </span>
                ) : null}
              </div>
              {event.note ? <p>{event.note}</p> : null}
            </div>
            <button
              className="icon-button danger"
              type="button"
              aria-label="Delete transaction"
              onClick={() => onDelete(event.id)}
            >
              <Trash2 size={16} />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function ActivityList({ positions, onDeleteEvent }) {
  const events = positions
    .flatMap((position) =>
      (position.events || []).map((event) => ({ ...event, symbol: position.symbol, positionId: position.id }))
    )
    .sort((a, b) => eventSortValue(b, 0).localeCompare(eventSortValue(a, 0)));

  if (!events.length) {
    return <div className="quiet-state"><CalendarDays size={22} /><span>No transactions yet</span></div>;
  }

  return (
    <ol className="timeline activity-list">
      {events.map((event) => {
        const meta = TRADE_TYPES[event.type];
        const cashFlow = eventCashFlow(event);
        return (
          <li className={`timeline-item ${meta.side}`} key={event.id}>
            <div className="timeline-copy">
              <div className="timeline-title">
                <strong>{event.symbol} · {meta.label}</strong>
                <span className={cashFlow >= 0 ? "positive" : "negative"}>{formatCurrency(cashFlow)}</span>
              </div>
              <div className="timeline-meta">
                <span>{event.date}</span>
                <span>{formatCurrency(parseNumber(event.strike))} strike</span>
                {meta.option ? <span>{formatCurrency(parseNumber(event.premium))} premium</span> : <span>{formatNumber(event.shares)} shares</span>}
              </div>
            </div>
            <button className="icon-button danger" type="button" aria-label="Delete transaction" onClick={() => onDeleteEvent(event.positionId, event.id)}>
              <Trash2 size={16} />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function RecentActivity({ positions, onSeeMore }) {
  const events = positions
    .flatMap((position) =>
      (position.events || []).map((event) => ({ ...event, symbol: position.symbol }))
    )
    .sort((a, b) => eventSortValue(b, 0).localeCompare(eventSortValue(a, 0)))
    .slice(0, 3);

  if (!events.length) return null;

  return (
    <section className="home-section recent-activity">
      <div className="section-title">
        <CalendarDays size={18} />
        <h2>Recent activity</h2>
      </div>
      <ol className="recent-list">
        {events.map((event) => {
          const meta = TRADE_TYPES[event.type];
          const cashFlow = eventCashFlow(event);
          return (
            <li key={event.id}>
              <span>
                <strong>{event.symbol}</strong>
                <small>{meta.shortLabel} · {event.date}</small>
              </span>
              <strong className={cashFlow >= 0 ? "positive" : "negative"}>
                {formatCurrency(cashFlow)}
              </strong>
            </li>
          );
        })}
      </ol>
      <button className="recent-more" type="button" onClick={onSeeMore}>
        See more
        <ChevronRight size={17} />
      </button>
    </section>
  );
}

function PositionDetail({
  position,
  onAddEvent,
  onDeleteEvent,
  onBack,
  onDeletePosition,
}) {
  const analysis = useMemo(() => analyzePosition(position), [position]);
  const hasShares = analysis.currentShares > 0;
  const basisLabel = hasShares ? formatCurrency(analysis.adjustedBasis) : "--";
  const basisSubValue = hasShares
    ? `${formatCurrency(analysis.assignmentBasis)} after puts`
    : analysis.openPutContracts > 0
    ? `${formatNumber(analysis.openPutContracts)} open put contracts`
    : "No assigned shares";

  return (
    <section className="detail">
      <div className="detail-head">
        <div className="detail-title">
          <button className="back-button" type="button" onClick={onBack} aria-label="Back to positions"><ChevronLeft size={20} /></button>
          <h2>{position.symbol}</h2>
        </div>
        <span
          className={`status-pill status-${analysis.status
            .toLowerCase()
            .replace(" ", "-")}`}
        >
          {analysis.status}
        </span>
      </div>

      <>
          <div className="hero-stat">
            <span>Adjusted share cost</span>
            <strong>{basisLabel}</strong>
            <small>{basisSubValue}</small>
          </div>
          <div className="metrics-grid">
            <Metric
              icon={BadgeDollarSign}
              label="Net premiums"
              value={formatCurrency(analysis.netPremium)}
              subValue={`${formatCurrency(
                analysis.putPremium
              )} puts | ${formatCurrency(analysis.callPremium)} calls`}
              tone={analysis.netPremium >= 0 ? "positive" : "negative"}
            />
            <Metric
              icon={WalletCards}
              label="Current shares"
              value={formatNumber(analysis.currentShares)}
              subValue={
                analysis.averageAssignedStrike === null
                  ? "No assignment"
                  : `${formatCurrency(
                      analysis.averageAssignedStrike
                    )} avg strike`
              }
              tone="neutral"
            />
            <Metric
              icon={ShieldCheck}
              label="Open calls"
              value={formatNumber(analysis.openCallContracts)}
              subValue="contracts"
              tone="neutral"
            />
            <Metric
              icon={LineChart}
              label={
                analysis.closedWheelPnl === null
                  ? "Net cash flow"
                  : "Closed wheel P/L"
              }
              value={formatCurrency(
                analysis.closedWheelPnl === null
                  ? analysis.totalCashFlow
                  : analysis.closedWheelPnl
              )}
              subValue={`${formatNumber(
                analysis.openPutContracts
              )} puts | ${formatNumber(analysis.openCallContracts)} calls open`}
              tone={
                (analysis.closedWheelPnl === null
                  ? analysis.totalCashFlow
                  : analysis.closedWheelPnl) >= 0
                  ? "positive"
                  : "negative"
              }
            />
          </div>
        <section className="subsection detail-history">
          <div className="section-title"><CalendarDays size={18} /><h3>Transaction history</h3></div>
          <EventTimeline events={[...analysis.events].reverse()} onDelete={onDeleteEvent} />
        </section>
        <button className="delete-position" type="button" onClick={onDeletePosition}>Delete position</button>
      </>
    </section>
  );
}

function DataActions({ positions, onImport, onReset }) {
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ positions }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `PeteWheeler-${today()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed.positions))
        throw new Error("Missing positions array");
      onImport(parsed.positions);
    } catch {
      window.alert("That file could not be imported.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="data-actions">
      <button className="secondary-button" type="button" onClick={exportData}>
        <Download size={17} />
        Export
      </button>
      <label className="secondary-button file-button">
        <Upload size={17} />
        Import
        <input type="file" accept="application/json" onChange={importData} />
      </label>
      <button
        className="secondary-button danger-text"
        type="button"
        onClick={onReset}
      >
        <RotateCcw size={17} />
        Reset
      </button>
    </div>
  );
}

export default function App() {
  const [positions, setPositions] = useLocalStorage(STORAGE_KEY, []);
  const [activeId, setActiveId] = useState("");
  const [screen, setScreen] = useState("home");
  const [modal, setModal] = useState(null);
  const portfolio = useMemo(() => summarizePortfolio(positions), [positions]);
  const activePosition =
    positions.find((position) => position.id === activeId) ||
    positions[0] ||
    null;

  useEffect(() => {
    if (!activeId && positions.length) {
      setActiveId(positions[0].id);
    }

    if (
      activeId &&
      positions.length &&
      !positions.some((position) => position.id === activeId)
    ) {
      setActiveId(positions[0].id);
    }
  }, [activeId, positions]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [screen]);

  const createPosition = (position) => {
    setPositions((current) => [position, ...current]);
    setActiveId(position.id);
    setScreen("positions");
    setModal(null);
  };

  const deletePosition = (positionId) => {
    const position = positions.find((item) => item.id === positionId);
    if (!position) return false;
    if (!window.confirm(`Delete ${position.symbol}?`)) return false;
    setPositions((current) => current.filter((item) => item.id !== positionId));
    return true;
  };

  const addEvent = (tradeEvent) => {
    if (!activePosition) return;
    setPositions((current) =>
      current.map((position) =>
        position.id === activePosition.id
          ? { ...position, events: [tradeEvent, ...(position.events || [])] }
          : position
      )
    );
    setModal(null);
  };

  const deleteEvent = (positionId, eventId) => {
    setPositions((current) =>
      current.map((position) =>
        position.id === positionId
          ? {
              ...position,
              events: (position.events || []).filter(
                (event) => event.id !== eventId
              ),
            }
          : position
      )
    );
  };

  const loadSample = () => {
    setPositions([SAMPLE_POSITION]);
    setActiveId(SAMPLE_POSITION.id);
    setScreen("positions");
  };

  const resetAll = () => {
    if (!window.confirm("Reset all saved positions?")) return;
    setPositions([]);
    setActiveId("");
  };

  const importPositions = (importedPositions) => {
    const normalized = importedPositions.map((position) => ({
      id: position.id || makeId("position"),
      symbol: String(position.symbol || "").toUpperCase(),
      createdAt: position.createdAt || new Date().toISOString(),
      events: Array.isArray(position.events) ? position.events : [],
    }));
    setPositions(normalized.filter((position) => position.symbol));
    setActiveId(normalized[0]?.id || "");
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <LineChart size={24} />
          </div>
          <div>
            <p>PeteWheeler</p>
            <h1>
              {screen === "home"
                ? "Portfolio"
                : screen === "positions"
                ? "Positions"
                : screen === "detail"
                ? "Position"
                : screen === "activity"
                ? "Activity"
                : "More"}
            </h1>
          </div>
        </div>
        {screen !== "settings" && screen !== "detail" ? (
          <button
            className="header-action"
            type="button"
            onClick={() => setScreen("settings")}
            aria-label="Open settings"
          >
            <MoreHorizontal size={22} />
          </button>
        ) : null}
      </header>

      {screen === "home" ? (
        <main className="screen-content">
          <section className="portfolio-strip" aria-label="Portfolio summary">
            <Metric
              icon={BadgeDollarSign}
              label="Premium bank"
              value={formatCurrency(portfolio.netPremium, true)}
              subValue={`${positions.length} tracked`}
              tone={portfolio.netPremium >= 0 ? "positive" : "negative"}
            />
            <Metric
              icon={WalletCards}
              label="Assigned shares"
              value={formatNumber(portfolio.currentShares)}
              subValue={`${portfolio.assignedPositions} active`}
              tone="neutral"
            />
            <Metric
              icon={ShieldCheck}
              label="Open puts"
              value={formatNumber(portfolio.openPutContracts)}
              subValue="contracts"
              tone="neutral"
            />
          </section>
          <section className="home-section">
            <div className="section-title">
              <ChartNoAxesCombined size={18} />
              <h2>At a glance</h2>
            </div>
            <div className="summary-card">
              <span>Tracked positions</span>
              <strong>{positions.length}</strong>
              <small>
                {portfolio.assignedPositions} holding shares ·{" "}
                {portfolio.openPutContracts} puts open
              </small>
            </div>
          </section>
          <RecentActivity positions={positions} onSeeMore={() => setScreen("activity")} />
        </main>
      ) : null}

      {screen === "positions" ? (
        <main className="screen-content positions-screen">
          <section className="position-column simple-list-screen">
            <div className="section-title">
              <WalletCards size={18} />
              <h2>Your positions</h2>
            </div>
            {positions.length ? (
              <PositionList
                positions={positions}
                onSelect={(id) => {
                  setActiveId(id);
                  setScreen("detail");
                }}
              />
            ) : (
              <EmptyState onLoadSample={loadSample} />
            )}
          </section>
        </main>
      ) : null}

      {screen === "detail" && activePosition ? (
        <main className="screen-content detail-screen">
          <PositionDetail
            position={activePosition}
            onBack={() => setScreen("positions")}
            onDeletePosition={() => {
              if (deletePosition(activePosition.id)) setScreen("positions");
            }}
            onAddEvent={addEvent}
            onDeleteEvent={(eventId) => deleteEvent(activePosition.id, eventId)}
          />
        </main>
      ) : null}

      {screen === "activity" ? (
        <main className="screen-content">
          <ActivityList positions={positions} onDeleteEvent={deleteEvent} />
        </main>
      ) : null}

      {screen === "positions" ? (
        <button className="fab" type="button" onClick={() => setModal("position")} aria-label="Add position"><Plus size={25} /></button>
      ) : null}
      {screen === "detail" && activePosition ? (
        <button className="fab" type="button" onClick={() => setModal("transaction")} aria-label="Add transaction"><Plus size={25} /></button>
      ) : null}

      {modal === "position" ? (
        <Modal title="Add position" onClose={() => setModal(null)}><PositionCreator onCreate={createPosition} /></Modal>
      ) : null}
      {modal === "transaction" ? (
        <Modal title={`Add transaction · ${activePosition?.symbol || ""}`} onClose={() => setModal(null)}><TradeForm onAdd={addEvent} /></Modal>
      ) : null}

      {screen === "settings" ? (
        <main className="screen-content settings-screen">
          <section className="detail">
            <div className="section-title">
              <MoreHorizontal size={18} />
              <h2>Data management</h2>
            </div>
            <p className="settings-copy">
              Your positions are saved privately on this device. Export a backup
              anytime, or import a previous one.
            </p>
            <DataActions
              positions={positions}
              onImport={importPositions}
              onReset={resetAll}
            />
          </section>
        </main>
      ) : null}

      <nav className="tab-bar" aria-label="Main navigation">
        {[
          ["home", House, "Home"],
          ["positions", WalletCards, "Positions"],
          ["activity", List, "Activity"],
          ["settings", MoreHorizontal, "More"],
        ].map(([id, Icon, label]) => (
          <button
            key={id}
            className={screen === id ? "is-active" : ""}
            type="button"
            onClick={() => setScreen(id)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

import { useState } from "react";
import { TYPES } from "./assets";
import { TYPE_ORDER } from "./ultimateData";

function formatCountdown(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/**
 * Debug chrome: signal, reflect, type input, day history at bottom.
 */
export default function DebugPanel({
  data,
  onIncrement,
  onResetDay,
  onReflect,
  reflectDisabled,
  reflectPhase,
  autoIntervalSec = 0,
  autoCountdownSec = null,
  signalStatus = "idle",
  signalUrl = "",
  dataEnv = "sandbox",
  dateKey = "",
  totalPending = 0,
  totalPublished = 0,
  todayAdded = 0,
  dayHistory = [],
  allowResetDay = false,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const counting =
    autoIntervalSec > 0 &&
    autoCountdownSec != null &&
    (!reflectPhase || reflectPhase === "collect");
  const phaseLive = reflectPhase && reflectPhase !== "collect";

  const requestResetDay = (date) => {
    if (!allowResetDay || !onResetDay) return;
    onResetDay(date);
  };

  if (collapsed) {
    return (
      <aside className="ua-debug ua-debug--collapsed">
        <button
          type="button"
          className="ua-debug__chip"
          onClick={() => setCollapsed(false)}
          title="Expand debug panel"
        >
          <strong>Debug</strong>
          <span className="ua-debug__chip-env">{dataEnv}</span>
          <span
            className={`ua-debug__chip-signal ua-debug__chip-signal--${signalStatus}`}
            title={signalUrl || signalStatus}
          >
            WS
          </span>
          {counting ? (
            <span className="ua-debug__chip-countdown" title="Auto reflect">
              {formatCountdown(autoCountdownSec)}
            </span>
          ) : null}
          <span className="ua-debug__chip-total" title="All-time published">
            {totalPublished}
          </span>
          <span className="ua-debug__chip-action" aria-hidden>
            ▾
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="ua-debug">
      <div className="ua-debug__header">
        <div className="ua-debug__title-wrap">
          <strong className="ua-debug__title">Debug</strong>
          <span className="ua-debug__badge">{dataEnv}</span>
          <span
            className={`ua-debug__badge ua-debug__badge--${signalStatus}`}
            title={signalUrl || signalStatus}
          >
            {signalStatus === "connected" ? "WS on" : "WS off"}
          </span>
        </div>
        <button
          type="button"
          className="ua-debug__collapse"
          onClick={() => setCollapsed(true)}
          title="Collapse debug panel"
        >
          Hide
        </button>
      </div>

      <div className="ua-debug__stats">
        <div className="ua-debug__stat">
          <span className="ua-debug__stat-label">All-time</span>
          <span className="ua-debug__stat-value">{totalPublished}</span>
          <span className="ua-debug__stat-sub">pending {totalPending}</span>
        </div>
        <div className="ua-debug__stat">
          <span className="ua-debug__stat-label">Today</span>
          <span className="ua-debug__stat-value">{todayAdded}</span>
          <span className="ua-debug__stat-sub">{dateKey || "—"}</span>
        </div>
      </div>

      <div className="ua-debug__section">
        <div className="ua-debug__label">Reflect</div>
        <div className="ua-debug__row">
          <button
            type="button"
            disabled={reflectDisabled}
            onClick={() => onReflect?.("during")}
            title="Reflect — shuffle bars during silver transition"
          >
            During
          </button>
          <button
            type="button"
            disabled={reflectDisabled}
            onClick={() => onReflect?.("reveal")}
            title="Reflect — slide bars when real % appears"
          >
            Reveal
          </button>
        </div>
        {(phaseLive || counting) && (
          <div className="ua-debug__meta">
            {phaseLive ? <span>Phase {reflectPhase}</span> : null}
            {counting ? (
              <span>
                Auto {formatCountdown(autoCountdownSec)}
                <span className="ua-debug__meta-muted">
                  {" "}
                  / {formatCountdown(autoIntervalSec)}
                </span>
              </span>
            ) : null}
          </div>
        )}
      </div>

      <div className="ua-debug__section ua-debug__section--input">
        <div className="ua-debug__types">
          {TYPE_ORDER.map((typeId, index) => {
            const type = TYPES[typeId];
            const entry = data.entries.find((item) => item.typeId === typeId);
            return (
              <button
                key={typeId}
                type="button"
                onClick={() => onIncrement(typeId)}
                title={`${index + 1} · ${type.zh} ${type.en}`}
              >
                <span
                  className="ua-debug__swatch"
                  style={{ background: type.color }}
                />
                <kbd>{index + 1}</kbd>
                <span className="ua-debug__type-name">{type.zh}</span>
                <b className="ua-debug__type-count">{data.counts[typeId]}</b>
                <small className="ua-debug__type-pct">
                  {entry?.percent ?? 0}%
                </small>
              </button>
            );
          })}
        </div>

        <div className="ua-debug__summary">
          <span className="ua-debug__summary-level">Lv {data.level}</span>
        </div>
      </div>

      <div className="ua-debug__section ua-debug__section--history">
        <div className="ua-debug__label-row">
          <span className="ua-debug__label">History</span>
          <span className="ua-debug__level">{dayHistory.length} logged</span>
        </div>
        {dayHistory.length === 0 ? (
          <div className="ua-debug__empty">No day logs yet</div>
        ) : (
          <ul className="ua-debug__days">
            {dayHistory.map((day) => (
              <li key={day.date} className="ua-debug__day">
                <div className="ua-debug__day-main">
                  <span className="ua-debug__day-date">
                    {day.date}
                    {day.date === dateKey ? (
                      <span className="ua-debug__day-tag">today</span>
                    ) : null}
                  </span>
                  <span className="ua-debug__day-total">+{day.totalAdded}</span>
                </div>
                {allowResetDay ? (
                  <button
                    type="button"
                    className="ua-debug__day-reset"
                      onClick={() => requestResetDay(day.date)}
                    title={`Remove +${day.totalAdded} from all-time`}
                  >
                    Reset
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

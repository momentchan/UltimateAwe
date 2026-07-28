import { TYPES } from "./assets";
import { TYPE_ORDER } from "./ultimateData";

/**
 * Unified debug chrome: display mode and type counters.
 */
export default function DebugPanel({
  data,
  onIncrement,
  onReset,
  displayMode,
  onRealtime,
  onBatch,
  onReflect,
  reflectDisabled,
  reflectPhase,
}) {
  return (
    <aside className="ua-debug">
      <div className="ua-debug__header">
        <strong>Debug</strong>
      </div>

      <div className="ua-debug__section">
        <div className="ua-debug__label">Mode</div>
        <div className="ua-debug__row">
          <button
            type="button"
            className={displayMode === "realtime" ? "is-active" : ""}
            onClick={onRealtime}
          >
            Realtime
          </button>
          <button
            type="button"
            className={displayMode === "batch" ? "is-active" : ""}
            onClick={onBatch}
          >
            Batch
          </button>
        </div>
      </div>

      <div className="ua-debug__section">
        <div className="ua-debug__label">Batch</div>
        <div className="ua-debug__row">
          <button
            type="button"
            disabled={reflectDisabled}
            onClick={onReflect}
            title="Trigger reflect cycle (Batch only)"
          >
            Reflect
          </button>
        </div>
        {displayMode === "batch" && reflectPhase && reflectPhase !== "collect" && (
          <div className="ua-debug__phase">Phase: {reflectPhase}</div>
        )}
      </div>

      <div className="ua-debug__section ua-debug__section--input">
        <div className="ua-debug__label">Input (1–5)</div>
        <div className="ua-debug__types">
          {TYPE_ORDER.map((typeId, index) => {
            const type = TYPES[typeId];
            const entry = data.entries.find((item) => item.typeId === typeId);
            return (
              <button
                key={typeId}
                type="button"
                onClick={() => onIncrement(typeId)}
                title={`Press ${index + 1} to add ${type.en}`}
              >
                <span
                  className="ua-debug__swatch"
                  style={{ background: type.color }}
                />
                <kbd>{index + 1}</kbd>
                <span>{type.zh}</span>
                <b>{data.counts[typeId]}</b>
                <small>{entry?.percent ?? 0}%</small>
              </button>
            );
          })}
        </div>
        <div className="ua-debug__summary">
          <span>
            Total <b>{data.total}</b>
          </span>
          <span>
            Level <b>{data.level}</b>
          </span>
          <button type="button" onClick={onReset}>
            Reset
          </button>
        </div>
      </div>
    </aside>
  );
}

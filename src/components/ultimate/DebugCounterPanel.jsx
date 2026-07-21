import { TYPES } from "./assets";
import { TYPE_ORDER } from "./ultimateData";

export default function DebugCounterPanel({ data, onIncrement, onReset }) {
  return (
    <aside className="ua-debug-counter">
      <div className="ua-debug-counter__header">
        <strong>Debug input</strong>
        <span>Total: {data.total}</span>
      </div>

      <div className="ua-debug-counter__types">
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
                className="ua-debug-counter__swatch"
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

      <div className="ua-debug-counter__footer">
        <span>Level {data.level}</span>
        <button type="button" onClick={onReset}>
          Reset
        </button>
      </div>
    </aside>
  );
}

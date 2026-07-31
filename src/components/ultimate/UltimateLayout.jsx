import { useEffect, useState } from "react";
import { ASSETS, TYPES, faceAsset } from "./assets";
import BlobShaderFill from "./BlobShaderFill";
import ScrambleText from "./ScrambleText";
import "./ultimate.css";

function trendIcon(trend) {
  if (trend === "up") return ASSETS.raise;
  if (trend === "down") return ASSETS.drop;
  return ASSETS.even;
}

function rankLabel(index) {
  if (index === 0) return "1st";
  if (index === 1) return "2nd";
  return String(index + 1);
}

/** Row 172px tall + 25px gap on the align map. */
const ROW_GAP = 25;
const ROW_PITCH = 172 + ROW_GAP;

/** A: bars reshuffle during silver · B: bars only slide on reveal */
export const RANK_MOVE_MODE = {
  during: "during",
  reveal: "reveal",
};

/** Fisher–Yates, retried so the rows visibly move every roll. */
function rollSlots(count, previous) {
  const next = Array.from({ length: count }, (_, i) => i);
  for (let attempt = 0; attempt < 8; attempt++) {
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    const moved = next.some((slot, i) => slot !== (previous ? previous[i] : i));
    if (moved) break;
  }
  return next;
}

const TREND_POOL = ["up", "down", "even"];

function rollTrends(count) {
  return Array.from(
    { length: count },
    () => TREND_POOL[Math.floor(Math.random() * TREND_POOL.length)],
  );
}

/**
 * While % is garbled: always flicker trends; optionally reshuffle bar slots (mode A).
 * Clears on reveal so bars settle onto the published order.
 */
function useReflectShuffle(count, active, intervalMs, moveSlots) {
  const [state, setState] = useState(null);

  useEffect(() => {
    if (!active) {
      setState(null);
      return undefined;
    }
    const roll = () =>
      setState((prev) => ({
        slots: moveSlots ? rollSlots(count, prev?.slots) : null,
        trends: rollTrends(count),
      }));
    roll();
    const id = setInterval(roll, Math.max(80, intervalMs));
    return () => clearInterval(id);
  }, [active, count, intervalMs, moveSlots]);

  return state;
}

function DistributionBar({ entries, muted }) {
  return (
    <div className="ua-dist">
      <img className="ua-dist__frame" src={ASSETS.distributionBar} alt="" draggable={false} />
      <div className={`ua-dist__fill ${muted ? "ua-dist__fill--loading" : ""}`}>
        {!muted &&
          entries.map((e) => (
            <div
              key={e.typeId}
              className="ua-dist__seg"
              style={{
                width: `${e.percent}%`,
                background: TYPES[e.typeId].color,
              }}
            />
          ))}
      </div>
    </div>
  );
}

function RankingList({ entries, placeholderMode, shuffleMs, moveMs, rankMoveMode }) {
  const moveSlots = rankMoveMode === RANK_MOVE_MODE.during;
  const shuffle = useReflectShuffle(
    entries.length,
    placeholderMode === "percent",
    shuffleMs,
    moveSlots,
  );

  return (
    <ul
      className="ua-rank"
      style={{
        height: entries.length * ROW_PITCH - ROW_GAP,
        "--ua-rank-move": `${moveMs}ms`,
      }}
    >
      {entries.map((e, i) => {
        const t = TYPES[e.typeId];
        const full = placeholderMode === "full" || e.placeholder;
        const scrambled = full || placeholderMode === "percent";
        // Mode A: physical slot while shuffling (podium stays put).
        // Mode B / idle: entry index — publish() reorders and bars slide on reveal.
        const slot = shuffle?.slots ? shuffle.slots[i] : i;
        const crowned = slot < 2;
        const trend = shuffle?.trends ? shuffle.trends[i] : e.trend;
        return (
          <li
            key={e.typeId}
            className="ua-rank__row"
            style={{
              transform: `translateY(${slot * ROW_PITCH}px)`,
              zIndex: entries.length - slot,
            }}
          >
            <img className="ua-rank__frame" src={ASSETS.dataBar} alt="" draggable={false} />
            <div className="ua-rank__content">
              <div className={`ua-rank__slot ${crowned ? "ua-rank__slot--crowned" : ""}`}>
                {crowned && (
                  <img className="ua-rank__crown" src={ASSETS.crown} alt="" draggable={false} />
                )}
                <span className="ua-rank__place">{rankLabel(slot)}</span>
              </div>
              <span className="ua-rank__pct">
                {placeholderMode === "percent" ? (
                  <ScrambleText length={4} intervalMs={65} staggerMs={i * 18} />
                ) : scrambled ? (
                  "!@#%"
                ) : (
                  <>
                    {e.percent}
                    <span className="ua-rank__pctsign">%</span>
                  </>
                )}
              </span>
              <span className="ua-rank__zh">{full ? "??型" : t.zh}</span>
              <span className="ua-rank__en">{full ? "" : t.en}</span>
              <img
                className={`ua-rank__trend ua-rank__trend--${trend}`}
                src={trendIcon(trend)}
                alt=""
                draggable={false}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Hard-switch face by kind — no opacity crossfade (only blob color blends).
 * NormalFace / LoadingFace share the same full-sheet placement.
 * @param {'type' | 'idle' | 'loading'} faceKind
 */
function Hero({ leadingTypeId, level, faceKind }) {
  let src = faceAsset(leadingTypeId, level);
  let full = false;
  if (faceKind === "idle") {
    src = ASSETS.faces.normal;
    full = true;
  } else if (faceKind === "loading") {
    src = ASSETS.faces.loading;
    full = true;
  }

  return (
    <div className="ua-hero">
      <img
        className={`ua-hero__face ${full ? "ua-hero__face--full" : ""}`}
        src={src}
        alt=""
        draggable={false}
      />
      <img className="ua-hero__radar" src={ASSETS.radar} alt="" draggable={false} />
    </div>
  );
}

/**
 * @param {{
 *   data: object,
 *   loadingBlend?: number,
 *   faceKind?: 'type' | 'idle' | 'loading',
 *   placeholderMode?: 'none' | 'percent' | 'full',
 *   rankShuffleMs?: number,
 *   rankMoveMs?: number,
 *   rankMoveMode?: 'during' | 'reveal',
 * }} props
 * - `percent`: reflect transition — scramble percentages, keep real type names.
 * - `full`: nothing measured yet — scramble percentages and type names.
 */
export default function UltimateLayout({
  data,
  loadingBlend = 0,
  faceKind = "type",
  placeholderMode = "none",
  rankShuffleMs = 450,
  rankMoveMs = 1000,
  rankMoveMode = RANK_MOVE_MODE.reveal,
}) {
  const leading = data.entries[0]?.typeId ?? "absorb";
  const empty = (data.total ?? 0) === 0;
  const resolvedFace =
    faceKind === "type" && empty ? "loading" : faceKind;
  const mode = empty ? "full" : placeholderMode;

  return (
    <div
      className={`ua-layout ${
        mode === "full"
          ? "ua-layout--loading"
          : mode === "percent"
            ? "ua-layout--scramble"
            : ""
      }`}
    >
      <BlobShaderFill
        loadingBlend={empty && faceKind === "type" ? 1 : loadingBlend}
        entries={data.distributionEntries}
      />
      <img className="ua-bg" src={ASSETS.background} alt="" draggable={false} />

      <header className="ua-header">
        <img className="ua-title" src={ASSETS.title} alt="a Wemoji!" draggable={false} />
      </header>

      <Hero
        leadingTypeId={leading}
        level={data.level ?? 1}
        faceKind={resolvedFace}
      />

      <div className="ua-bottom">
        <DistributionBar
          entries={data.distributionEntries}
          muted={mode !== "none"}
        />
        <RankingList
          entries={data.entries}
          placeholderMode={mode}
          shuffleMs={rankShuffleMs}
          moveMs={rankMoveMs}
          rankMoveMode={rankMoveMode}
        />
      </div>
    </div>
  );
}

import { ASSETS, TYPES, faceAsset } from "./assets";
import BlobShaderFill from "./BlobShaderFill";
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

function DistributionBar({ entries, showPlaceholders }) {
  return (
    <div className="ua-dist">
      <img className="ua-dist__frame" src={ASSETS.distributionBar} alt="" draggable={false} />
      <div className={`ua-dist__fill ${showPlaceholders ? "ua-dist__fill--loading" : ""}`}>
        {!showPlaceholders &&
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

function RankingList({ entries, showPlaceholders }) {
  return (
    <ul className="ua-rank">
      {entries.map((e, i) => {
        const t = TYPES[e.typeId];
        const placeholder = showPlaceholders || e.placeholder;
        const crowned = i < 2;
        return (
          <li key={`${e.typeId}-${i}`} className="ua-rank__row">
            <img className="ua-rank__frame" src={ASSETS.dataBar} alt="" draggable={false} />
            <div className="ua-rank__content">
              <div className={`ua-rank__slot ${crowned ? "ua-rank__slot--crowned" : ""}`}>
                {crowned && (
                  <img className="ua-rank__crown" src={ASSETS.crown} alt="" draggable={false} />
                )}
                <span className="ua-rank__place">{rankLabel(i)}</span>
              </div>
              <span className="ua-rank__pct">
                {placeholder ? (
                  "!@#%"
                ) : (
                  <>
                    {e.percent}
                    <span className="ua-rank__pctsign">%</span>
                  </>
                )}
              </span>
              <span className="ua-rank__zh">{placeholder ? "??型" : t.zh}</span>
              <span className="ua-rank__en">{placeholder ? "" : t.en}</span>
              <img
                className={`ua-rank__trend ua-rank__trend--${e.trend}`}
                src={trendIcon(e.trend)}
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
 *   showPlaceholders?: boolean,
 * }} props
 */
export default function UltimateLayout({
  data,
  loadingBlend = 0,
  faceKind = "type",
  showPlaceholders = false,
}) {
  const leading = data.entries[0]?.typeId ?? "absorb";
  const empty = (data.total ?? 0) === 0;
  const resolvedFace =
    faceKind === "type" && empty ? "loading" : faceKind;
  const placeholders = showPlaceholders || empty;

  return (
    <div className={`ua-layout ${placeholders ? "ua-layout--loading" : ""}`}>
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
          showPlaceholders={placeholders}
        />
        <RankingList entries={data.entries} showPlaceholders={placeholders} />
      </div>
    </div>
  );
}

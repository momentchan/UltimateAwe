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

function DistributionBar({ entries, loading }) {
  return (
    <div className="ua-dist">
      <img className="ua-dist__frame" src={ASSETS.distributionBar} alt="" draggable={false} />
      <div className={`ua-dist__fill ${loading ? "ua-dist__fill--loading" : ""}`}>
        {!loading &&
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

function RankingList({ entries, loading }) {
  return (
    <ul className="ua-rank">
      {entries.map((e, i) => {
        const t = TYPES[e.typeId];
        const placeholder = loading || e.placeholder;
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
 * Fills the blob-shaped hole punched in Background_2@.png.
 * Output mode: WebGPU gradient shader masked by the stencil alpha.
 * Loading mode: simple silver CSS gradient.
 */
function BlobFill({ loading, entries }) {
  if (loading) {
    return <div className="ua-blobfill ua-blobfill--loading" />;
  }
  return <BlobShaderFill entries={entries} />;
}

function Hero({ leadingTypeId, level, loading }) {
  const face = loading
    ? ASSETS.faces.loading
    : faceAsset(leadingTypeId, level);

  return (
    <div className="ua-hero">
      <img
        className={`ua-hero__face ${loading ? "ua-hero__face--full" : ""}`}
        src={face}
        alt=""
        draggable={false}
      />
      <img className="ua-hero__radar" src={ASSETS.radar} alt="" draggable={false} />
    </div>
  );
}

export default function UltimateLayout({ data }) {
  const loading = data.mode === "loading";
  const leading = data.entries[0]?.typeId ?? "absorb";

  return (
    <div className={`ua-layout ${loading ? "ua-layout--loading" : ""}`}>
      {/* Blob color layer sits under the stencil; shows through its hole */}
      <BlobFill loading={loading} entries={data.distributionEntries} />
      <img className="ua-bg" src={ASSETS.background} alt="" draggable={false} />

      <header className="ua-header">
        <img className="ua-title" src={ASSETS.title} alt="a Wemoji!" draggable={false} />
      </header>

      <Hero leadingTypeId={leading} level={data.level ?? 1} loading={loading} />

      <div className="ua-bottom">
        <DistributionBar
          entries={data.distributionEntries}
          loading={loading}
        />
        <RankingList entries={data.entries} loading={loading} />
      </div>
    </div>
  );
}

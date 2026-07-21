import { useCallback, useEffect, useMemo, useState } from "react";
import UltimateLayout from "./UltimateLayout";
import DebugCounterPanel from "./DebugCounterPanel";
import useUltimateDebugData from "./useUltimateDebugData";
import { DESIGN, ASSETS } from "./assets";
import "./ultimate.css";

/**
 * Letterbox a fixed 2160x3840 design canvas into the viewport.
 * Wrapper uses scaled footprint so transform does not push content off-screen.
 */
export default function UltimateStage() {
  const [mode, setMode] = useState("loading");
  const [showGuide, setShowGuide] = useState(false);
  const [scale, setScale] = useState(1);
  const { data: computedData, increment, reset } = useUltimateDebugData();

  useEffect(() => {
    const update = () => {
      const next = Math.min(
        window.innerWidth / DESIGN.width,
        window.innerHeight / DESIGN.height,
      );
      setScale(next);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const data = useMemo(
    () => ({
      ...computedData,
      mode,
      entries: computedData.entries.map((entry) => ({
        ...entry,
        placeholder: mode === "loading",
      })),
    }),
    [computedData, mode],
  );

  const incrementType = useCallback(
    (typeId) => {
      increment(typeId);
      setMode("output");
    },
    [increment],
  );

  const resetData = useCallback(() => {
    reset();
    setMode("loading");
  }, [reset]);

  useEffect(() => {
    const showOutputAfterNumberKey = (event) => {
      if (/^[1-5]$/.test(event.key)) {
        setMode("output");
      }
    };
    window.addEventListener("keyup", showOutputAfterNumberKey);
    return () => window.removeEventListener("keyup", showOutputAfterNumberKey);
  }, []);

  return (
    <div className="ua-viewport">
      <div
        className="ua-stage-shell"
        style={{
          width: DESIGN.width * scale,
          height: DESIGN.height * scale,
        }}
      >
        <div
          className="ua-stage"
          style={{
            width: DESIGN.width,
            height: DESIGN.height,
            transform: `scale(${scale})`,
          }}
        >
          <UltimateLayout data={data} />

          {showGuide && (
            <img
              className="ua-guide"
              src={mode === "loading" ? ASSETS.align.loading : ASSETS.align.output}
              alt=""
              draggable={false}
            />
          )}
        </div>
      </div>

      <div className="ua-dev">
        <button
          type="button"
          className={mode === "output" ? "is-active" : ""}
          onClick={() => setMode("output")}
        >
          Output
        </button>
        <button
          type="button"
          className={mode === "loading" ? "is-active" : ""}
          onClick={() => setMode("loading")}
        >
          Loading
        </button>
        <button
          type="button"
          className={showGuide ? "is-active" : ""}
          onClick={() => setShowGuide((v) => !v)}
        >
          Align guide
        </button>
      </div>

      <DebugCounterPanel
        data={computedData}
        onIncrement={incrementType}
        onReset={resetData}
      />
    </div>
  );
}

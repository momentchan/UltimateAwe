import { useCallback, useEffect, useMemo, useState } from "react";
import UltimateLayout, { RANK_MOVE_MODE } from "./UltimateLayout";
import DebugPanel from "./DebugPanel";
import useUltimateDebugData from "./useUltimateDebugData";
import useReflectCycle, { REFLECT_PHASE } from "./useReflectCycle";
import { useBatchCtrl } from "./batchControls";
import { useDebugCtrl } from "./debugControls";
import useSignalIngress from "./useSignalIngress";
import { DESIGN, ASSETS } from "./assets";
import "./ultimate.css";

/**
 * Letterbox a fixed 2160x3840 design canvas into the viewport.
 * Wrapper uses scaled footprint so transform does not push content off-screen.
 * Display is always batch: counts buffer until a reflect cycle publishes them.
 */
export default function UltimateStage({ showDebug = false }) {
  const [rankMoveMode, setRankMoveMode] = useState(RANK_MOVE_MODE.reveal);
  const [scale, setScale] = useState(1);
  const batchCtrl = useBatchCtrl();
  const debugCtrl = useDebugCtrl();
  const showGuide = Boolean(showDebug && debugCtrl.showAlignGuide);

  const { pendingData, publishedData, increment, reset, publish } =
    useUltimateDebugData();

  const onRevealStart = useCallback(() => {
    publish();
  }, [publish]);

  const timings = useMemo(
    () => ({
      fadeMs: batchCtrl.fadeSec * 1000,
      holdMs: batchCtrl.holdSec * 1000,
      revealMs: batchCtrl.revealSec * 1000,
    }),
    [batchCtrl.fadeSec, batchCtrl.holdSec, batchCtrl.revealSec],
  );

  const {
    phase,
    loadingBlend,
    startReflect,
    cancel: cancelReflect,
    isRunning,
  } = useReflectCycle({
    enabled: true,
    onRevealStart,
    timings,
  });

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

  const resetData = useCallback(() => {
    cancelReflect();
    reset();
  }, [cancelReflect, reset]);

  const incrementType = useCallback(
    (typeId, n = 1) => {
      increment(typeId, n);
    },
    [increment],
  );

  const { status: signalStatus, url: signalUrl } = useSignalIngress({
    onAdd: incrementType,
  });

  const { faceKind, placeholderMode, layoutBlend } = useMemo(() => {
    if (phase === REFLECT_PHASE.fadeToGray) {
      return {
        faceKind: "idle",
        placeholderMode: "percent",
        layoutBlend: loadingBlend,
      };
    }
    if (phase === REFLECT_PHASE.loadingHold) {
      return {
        faceKind: "loading",
        placeholderMode: "percent",
        layoutBlend: 1,
      };
    }
    if (phase === REFLECT_PHASE.reveal) {
      return {
        faceKind: "type",
        placeholderMode: "none",
        layoutBlend: loadingBlend,
      };
    }

    const empty = publishedData.total === 0;
    return {
      faceKind: empty ? "loading" : "type",
      placeholderMode: empty ? "full" : "none",
      layoutBlend: empty ? 1 : 0,
    };
  }, [phase, loadingBlend, publishedData.total]);

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
          <UltimateLayout
            data={publishedData}
            loadingBlend={layoutBlend}
            faceKind={faceKind}
            placeholderMode={placeholderMode}
            rankShuffleMs={batchCtrl.shuffleSec * 1000}
            rankMoveMs={batchCtrl.rankMoveSec * 1000}
            rankMoveMode={rankMoveMode}
          />

          {showGuide && (
            <img
              className="ua-guide"
              src={
                layoutBlend > 0.5 ? ASSETS.align.loading : ASSETS.align.output
              }
              alt=""
              draggable={false}
            />
          )}
        </div>
      </div>

      {showDebug && (
        <DebugPanel
          data={pendingData}
          onIncrement={incrementType}
          onReset={resetData}
          onReflect={(mode) => {
            setRankMoveMode(mode);
            startReflect();
          }}
          reflectDisabled={isRunning}
          reflectPhase={phase}
          signalStatus={signalStatus}
          signalUrl={signalUrl}
        />
      )}
    </div>
  );
}

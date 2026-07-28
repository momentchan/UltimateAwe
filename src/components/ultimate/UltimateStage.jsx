import { useCallback, useEffect, useMemo, useState } from "react";
import UltimateLayout from "./UltimateLayout";
import DebugPanel from "./DebugPanel";
import useUltimateDebugData from "./useUltimateDebugData";
import useReflectCycle, { REFLECT_PHASE } from "./useReflectCycle";
import { useBatchCtrl } from "./batchControls";
import { useDebugCtrl } from "./debugControls";
import { DESIGN, ASSETS } from "./assets";
import "./ultimate.css";

/** Top-level display modes: immediate updates vs buffered + reflect cycle. */
const DISPLAY_MODE = {
  realtime: "realtime",
  batch: "batch",
};

/**
 * Letterbox a fixed 2160x3840 design canvas into the viewport.
 * Wrapper uses scaled footprint so transform does not push content off-screen.
 */
export default function UltimateStage() {
  const [displayMode, setDisplayMode] = useState(DISPLAY_MODE.realtime);
  const [scale, setScale] = useState(1);
  const batchCtrl = useBatchCtrl();
  const debugCtrl = useDebugCtrl();
  const showGuide = Boolean(debugCtrl.showAlignGuide);

  const autoPublish = displayMode === DISPLAY_MODE.realtime;
  const {
    pendingData,
    publishedData,
    increment,
    reset,
    publish,
    alignPendingToPublished,
  } = useUltimateDebugData({ autoPublish });

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
    enabled: displayMode === DISPLAY_MODE.batch,
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

  const setRealtime = useCallback(() => {
    cancelReflect();
    publish();
    setDisplayMode(DISPLAY_MODE.realtime);
  }, [cancelReflect, publish]);

  const setBatch = useCallback(() => {
    cancelReflect();
    alignPendingToPublished();
    setDisplayMode(DISPLAY_MODE.batch);
  }, [cancelReflect, alignPendingToPublished]);

  const resetData = useCallback(() => {
    cancelReflect();
    reset();
  }, [cancelReflect, reset]);

  const incrementType = useCallback(
    (typeId) => {
      increment(typeId);
    },
    [increment],
  );

  const { faceKind, showPlaceholders, layoutBlend } = useMemo(() => {
    if (displayMode === DISPLAY_MODE.realtime) {
      const empty = publishedData.total === 0;
      return {
        faceKind: empty ? "loading" : "type",
        showPlaceholders: empty,
        layoutBlend: empty ? 1 : 0,
      };
    }

    if (phase === REFLECT_PHASE.fadeToGray) {
      return {
        faceKind: "idle",
        showPlaceholders: true,
        layoutBlend: loadingBlend,
      };
    }
    if (phase === REFLECT_PHASE.loadingHold) {
      return {
        faceKind: "loading",
        showPlaceholders: true,
        layoutBlend: 1,
      };
    }
    if (phase === REFLECT_PHASE.reveal) {
      return {
        faceKind: "type",
        showPlaceholders: false,
        layoutBlend: loadingBlend,
      };
    }

    const empty = publishedData.total === 0;
    return {
      faceKind: empty ? "loading" : "type",
      showPlaceholders: empty,
      layoutBlend: empty ? 1 : 0,
    };
  }, [displayMode, phase, loadingBlend, publishedData.total]);

  const layoutData = useMemo(
    () => ({
      ...publishedData,
      entries: publishedData.entries.map((entry) => ({
        ...entry,
        placeholder: showPlaceholders,
      })),
    }),
    [publishedData, showPlaceholders],
  );

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
            data={layoutData}
            loadingBlend={layoutBlend}
            faceKind={faceKind}
            showPlaceholders={showPlaceholders}
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

      <DebugPanel
        data={pendingData}
        onIncrement={incrementType}
        onReset={resetData}
        displayMode={displayMode}
        onRealtime={setRealtime}
        onBatch={setBatch}
        onReflect={() => startReflect()}
        reflectDisabled={displayMode !== DISPLAY_MODE.batch || isRunning}
        reflectPhase={phase}
      />
    </div>
  );
}

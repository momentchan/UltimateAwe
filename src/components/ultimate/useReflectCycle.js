import { useCallback, useEffect, useRef, useState } from "react";
import { BATCH_DEFAULTS } from "./batchControls";

export const REFLECT_PHASE = {
  collect: "collect",
  fadeToGray: "fadeToGray",
  loadingHold: "loadingHold",
  reveal: "reveal",
};

/** @deprecated Prefer BATCH_DEFAULTS / Leva Batch Reflect panel */
export const FADE_MS = BATCH_DEFAULTS.fadeSec * 1000;
export const HOLD_MS = BATCH_DEFAULTS.holdSec * 1000;
export const REVEAL_MS = BATCH_DEFAULTS.revealSec * 1000;
/** Reserved for auto reflect; not wired yet — use the Reflect button. */
export const REFLECT_INTERVAL_MS = BATCH_DEFAULTS.intervalSec * 1000;

/**
 * Batch-mode reflect cycle:
 * fadeToGray → loadingHold → reveal → collect.
 *
 * @param {{
 *   enabled: boolean,
 *   onRevealStart?: () => void,
 *   timings?: { fadeMs: number, holdMs: number, revealMs: number },
 * }} options
 */
export default function useReflectCycle({
  enabled,
  onRevealStart,
  timings = {
    fadeMs: BATCH_DEFAULTS.fadeSec * 1000,
    holdMs: BATCH_DEFAULTS.holdSec * 1000,
    revealMs: BATCH_DEFAULTS.revealSec * 1000,
  },
} = {}) {
  const [phase, setPhase] = useState(REFLECT_PHASE.collect);
  const [loadingBlend, setLoadingBlend] = useState(0);
  const [progress, setProgress] = useState(0);

  const phaseRef = useRef(REFLECT_PHASE.collect);
  const startRef = useRef(0);
  const rafRef = useRef(null);
  const onRevealStartRef = useRef(onRevealStart);
  const timingsRef = useRef(timings);
  onRevealStartRef.current = onRevealStart;
  timingsRef.current = timings;

  const stopRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    stopRaf();
    phaseRef.current = REFLECT_PHASE.collect;
    setPhase(REFLECT_PHASE.collect);
    setLoadingBlend(0);
    setProgress(0);
  }, [stopRaf]);

  const startReflect = useCallback(() => {
    if (!enabled) return false;
    if (phaseRef.current !== REFLECT_PHASE.collect) return false;

    stopRaf();
    phaseRef.current = REFLECT_PHASE.fadeToGray;
    setPhase(REFLECT_PHASE.fadeToGray);
    setLoadingBlend(0);
    setProgress(0);
    startRef.current = performance.now();

    const tick = (now) => {
      const current = phaseRef.current;
      if (current === REFLECT_PHASE.collect) {
        rafRef.current = null;
        return;
      }

      const { fadeMs, holdMs, revealMs } = timingsRef.current;
      const elapsed = now - startRef.current;

      if (current === REFLECT_PHASE.fadeToGray) {
        const t = Math.min(1, elapsed / Math.max(1, fadeMs));
        setLoadingBlend(t);
        setProgress(t);
        if (t >= 1) {
          phaseRef.current = REFLECT_PHASE.loadingHold;
          setPhase(REFLECT_PHASE.loadingHold);
          setLoadingBlend(1);
          setProgress(0);
          startRef.current = now;
        }
      } else if (current === REFLECT_PHASE.loadingHold) {
        const t = Math.min(1, elapsed / Math.max(1, holdMs));
        setLoadingBlend(1);
        setProgress(t);
        if (t >= 1) {
          phaseRef.current = REFLECT_PHASE.reveal;
          setPhase(REFLECT_PHASE.reveal);
          setProgress(0);
          startRef.current = now;
          onRevealStartRef.current?.();
        }
      } else if (current === REFLECT_PHASE.reveal) {
        const t = Math.min(1, elapsed / Math.max(1, revealMs));
        setLoadingBlend(1 - t);
        setProgress(t);
        if (t >= 1) {
          phaseRef.current = REFLECT_PHASE.collect;
          setPhase(REFLECT_PHASE.collect);
          setLoadingBlend(0);
          setProgress(0);
          rafRef.current = null;
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return true;
  }, [enabled, stopRaf]);

  useEffect(() => {
    if (!enabled) cancel();
  }, [enabled, cancel]);

  useEffect(() => () => stopRaf(), [stopRaf]);

  return {
    phase,
    loadingBlend,
    progress,
    startReflect,
    cancel,
    isRunning: phase !== REFLECT_PHASE.collect,
  };
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EMPTY_COUNTS,
  TYPE_ORDER,
  createUltimateData,
} from "./ultimateData";

/** Pause before auto-repeat starts while holding 1–5. */
const HOLD_DELAY_MS = 280;
/** Interval between +1 ticks while held. */
const HOLD_INTERVAL_MS = 70;

function isTypingTarget(target) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target?.isContentEditable
  );
}

/**
 * Batch buffer: increments only update pending counts.
 * Call `publish()` on reflect reveal to push pending → published display.
 * @param {{ enabled?: boolean }} [options] When false, 1–5 keyboard input is ignored.
 */
export default function useUltimateDebugData({ enabled = true } = {}) {
  const [pendingCounts, setPendingCounts] = useState(() => ({ ...EMPTY_COUNTS }));
  const [publishedCounts, setPublishedCounts] = useState(() => ({ ...EMPTY_COUNTS }));
  const previousRankRef = useRef(null);
  const pendingRef = useRef(pendingCounts);

  pendingRef.current = pendingCounts;

  const pendingData = useMemo(
    () => createUltimateData(pendingCounts, null),
    [pendingCounts],
  );

  const publishedData = useMemo(
    () => createUltimateData(publishedCounts, previousRankRef.current),
    [publishedCounts],
  );

  const publish = useCallback(() => {
    setPublishedCounts((prev) => {
      previousRankRef.current = createUltimateData(prev).rank;
      return { ...pendingRef.current };
    });
  }, []);

  const increment = useCallback((typeId, n = 1) => {
    if (!TYPE_ORDER.includes(typeId)) return;
    const amount = Math.max(0, Math.floor(Number(n) || 0));
    if (amount <= 0) return;

    setPendingCounts((current) => ({
      ...current,
      [typeId]: current[typeId] + amount,
    }));
  }, []);

  const reset = useCallback(() => {
    previousRankRef.current = null;
    setPendingCounts({ ...EMPTY_COUNTS });
    setPublishedCounts({ ...EMPTY_COUNTS });
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    let delayId = null;
    let intervalId = null;
    let heldTypeId = null;

    const stopHold = () => {
      if (delayId != null) clearTimeout(delayId);
      if (intervalId != null) clearInterval(intervalId);
      delayId = null;
      intervalId = null;
      heldTypeId = null;
    };

    const onKeyDown = (event) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;

      const index = Number(event.key) - 1;
      const typeId = TYPE_ORDER[index];
      if (!typeId) return;

      // Ignore OS key-repeat; we run our own hold timer.
      if (event.repeat) return;
      if (heldTypeId === typeId) return;

      event.preventDefault();
      heldTypeId = typeId;
      increment(typeId);

      delayId = setTimeout(() => {
        intervalId = setInterval(() => {
          increment(typeId);
        }, HOLD_INTERVAL_MS);
      }, HOLD_DELAY_MS);
    };

    const onKeyUp = (event) => {
      const index = Number(event.key) - 1;
      const typeId = TYPE_ORDER[index];
      if (typeId && heldTypeId === typeId) {
        stopHold();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", stopHold);
    return () => {
      stopHold();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", stopHold);
    };
  }, [enabled, increment]);

  return {
    pendingData,
    publishedData,
    increment,
    reset,
    publish,
  };
}

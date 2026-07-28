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

export default function useUltimateDebugData() {
  const [counts, setCounts] = useState(() => ({ ...EMPTY_COUNTS }));
  const previousRankRef = useRef(null);

  const data = useMemo(
    () => createUltimateData(counts, previousRankRef.current),
    [counts],
  );

  const increment = useCallback((typeId) => {
    if (!TYPE_ORDER.includes(typeId)) return;

    setCounts((current) => {
      previousRankRef.current = createUltimateData(current).rank;
      return { ...current, [typeId]: current[typeId] + 1 };
    });
  }, []);

  const reset = useCallback(() => {
    previousRankRef.current = null;
    setCounts({ ...EMPTY_COUNTS });
  }, []);

  useEffect(() => {
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
  }, [increment]);

  return { data, increment, reset };
}

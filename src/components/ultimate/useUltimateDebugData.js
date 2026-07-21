import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EMPTY_COUNTS,
  TYPE_ORDER,
  createUltimateData,
} from "./ultimateData";

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
    // keyup: fires once on release, immune to key-repeat while held
    const onKeyUp = (event) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      const index = Number(event.key) - 1;
      const typeId = TYPE_ORDER[index];
      if (!typeId) return;

      event.preventDefault();
      increment(typeId);
    };

    window.addEventListener("keyup", onKeyUp);
    return () => window.removeEventListener("keyup", onKeyUp);
  }, [increment]);

  return { data, increment, reset };
}

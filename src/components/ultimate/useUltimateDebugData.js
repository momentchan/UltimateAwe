import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EMPTY_COUNTS,
  TYPE_ORDER,
  createUltimateData,
} from "./ultimateData";
import {
  listDayLogs,
  liveIsEmpty,
  loadDayAddedFromStorage,
  loadLiveFromStorage,
  localDateKey,
  makePersistMessage,
  resolveDataEnv,
  dataEnvLabel,
  resetDayInStorage,
  saveLiveToStorage,
  seedPastDaysOnce,
  sumCounts,
} from "./ultimatePersist";

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
 * Batch buffer: live cumulative totals drive ranking across days.
 * Daily `added` is for reporting only. Dev/main stores are separate.
 * @param {{ enabled?: boolean, onPersist?: (msg: object) => void }} [options]
 */
export default function useUltimateDebugData({
  enabled = true,
  onPersist = null,
} = {}) {
  const dataEnv = useMemo(() => resolveDataEnv(), []);
  const [dateKey, setDateKey] = useState(() => localDateKey());

  const seeded = useMemo(() => seedPastDaysOnce(10, dataEnv), [dataEnv]);
  const initialLive = useMemo(
    () => seeded?.live ?? loadLiveFromStorage(dataEnv),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const initialAdded = useMemo(
    () =>
      seeded?.addedToday ??
      loadDayAddedFromStorage(dateKey, dataEnv).added,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const startedEmpty = liveIsEmpty(initialLive);
  const [pendingCounts, setPendingCounts] = useState(
    () => initialLive.pending,
  );
  const [publishedCounts, setPublishedCounts] = useState(
    () => initialLive.published,
  );
  const [addedToday, setAddedToday] = useState(() => initialAdded);
  const previousRankRef = useRef(initialLive.previousRank);
  const pendingRef = useRef(pendingCounts);
  const publishedRef = useRef(publishedCounts);
  const addedRef = useRef(addedToday);
  const onPersistRef = useRef(onPersist);
  const allowRemoteHydrateRef = useRef(startedEmpty);
  const [persistReady, setPersistReady] = useState(!startedEmpty);

  pendingRef.current = pendingCounts;
  publishedRef.current = publishedCounts;
  addedRef.current = addedToday;
  onPersistRef.current = onPersist;

  const persistNow = useCallback(
    (pending, published, previousRank, added, date = dateKey) => {
      saveLiveToStorage({
        pending,
        published,
        previousRank,
        addedToday: added,
        date,
        env: dataEnv,
      });
      if (!persistReady) return;
      onPersistRef.current?.(
        makePersistMessage({
          date,
          pending,
          published,
          previousRank,
          addedToday: added,
          env: dataEnv,
        }),
      );
    },
    [dataEnv, dateKey, persistReady],
  );

  useEffect(() => {
    persistNow(
      pendingCounts,
      publishedCounts,
      previousRankRef.current,
      addedToday,
      dateKey,
    );
  }, [pendingCounts, publishedCounts, addedToday, dateKey, persistNow]);

  useEffect(() => {
    if (persistReady) return undefined;
    const id = window.setTimeout(() => setPersistReady(true), 2000);
    return () => window.clearTimeout(id);
  }, [persistReady]);

  // Midnight: keep live totals; only roll the "today added" log.
  useEffect(() => {
    const tick = () => {
      const today = localDateKey();
      if (today === dateKey) return;
      // Flush outgoing day log once more, then start a fresh added log.
      saveLiveToStorage({
        pending: pendingRef.current,
        published: publishedRef.current,
        previousRank: previousRankRef.current,
        addedToday: addedRef.current,
        date: dateKey,
        env: dataEnv,
      });
      const nextAdded = loadDayAddedFromStorage(today, dataEnv).added;
      setAddedToday(nextAdded);
      setDateKey(today);
    };
    const id = window.setInterval(tick, 30_000);
    tick();
    return () => window.clearInterval(id);
  }, [dataEnv, dateKey]);

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
    setAddedToday((current) => ({
      ...current,
      [typeId]: (current[typeId] ?? 0) + amount,
    }));
  }, []);

  /** Subtract one day's adds from live totals and drop that day log. */
  const resetDay = useCallback(
    (date) => {
      const result = resetDayInStorage(date, dataEnv);
      if (!result) return false;

      previousRankRef.current = result.live.previousRank;
      setPendingCounts({ ...result.live.pending });
      setPublishedCounts({ ...result.live.published });
      if (result.clearedToday) {
        setAddedToday({ ...EMPTY_COUNTS });
      }

      onPersistRef.current?.(
        makePersistMessage({
          date,
          pending: result.live.pending,
          published: result.live.published,
          previousRank: result.live.previousRank,
          addedToday: EMPTY_COUNTS,
          env: dataEnv,
        }),
      );
      if (!result.clearedToday) {
        onPersistRef.current?.(
          makePersistMessage({
            date: dateKey,
            pending: result.live.pending,
            published: result.live.published,
            previousRank: result.live.previousRank,
            addedToday: addedRef.current,
            env: dataEnv,
          }),
        );
      }
      return true;
    },
    [dataEnv, dateKey],
  );

  /** Apply live snapshot from relay when local live was empty. */
  const hydrateFromRemote = useCallback(
    (msg) => {
      if (!msg || msg.env !== dataEnv) return false;
      if (!allowRemoteHydrateRef.current) return false;

      const live = msg.live ?? msg;
      const pending = live.pending ?? msg.pending;
      const published = live.published ?? msg.published;
      if (liveIsEmpty({ pending, published })) return false;

      previousRankRef.current =
        live.previousRank ?? msg.previousRank ?? null;
      setPendingCounts({ ...EMPTY_COUNTS, ...pending });
      setPublishedCounts({ ...EMPTY_COUNTS, ...published });
      if (msg.addedToday) {
        setAddedToday({ ...EMPTY_COUNTS, ...msg.addedToday });
      }
      allowRemoteHydrateRef.current = false;
      setPersistReady(true);
      return true;
    },
    [dataEnv],
  );

  const finishRemoteHydrate = useCallback(() => {
    allowRemoteHydrateRef.current = false;
    setPersistReady(true);
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

  const dayHistory = useMemo(
    () => listDayLogs(dataEnv),
    [dataEnv, pendingCounts, publishedCounts, addedToday, dateKey],
  );

  return {
    pendingData,
    publishedData,
    increment,
    resetDay,
    publish,
    hydrateFromRemote,
    finishRemoteHydrate,
    dataEnv,
    dataLabel: dataEnvLabel(dataEnv),
    dateKey,
    dayHistory,
    /** All-time pending buffer total. */
    totalPending: sumCounts(pendingCounts),
    /** All-time published total (on-screen after reflect). */
    totalPublished: sumCounts(publishedCounts),
    /** Increments received today (report only). */
    todayAdded: sumCounts(addedToday),
    needsRemoteHydrate: startedEmpty,
  };
}

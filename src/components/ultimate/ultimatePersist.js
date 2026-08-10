import { EMPTY_COUNTS, TYPE_ORDER } from "./ultimateData";

export const COUNTS_STORAGE_VERSION = 3;

/** Dev server → sandbox store; production build → live store. */
export function resolveDataEnv() {
  return import.meta.env.PROD ? "main" : "dev";
}

/** Short label for the debug UI. */
export function dataEnvLabel(env = resolveDataEnv()) {
  return env === "main" ? "live" : "sandbox";
}

export function storageKeyForEnv(env = resolveDataEnv()) {
  return `ultimateAwe.counts.${env}.v${COUNTS_STORAGE_VERSION}`;
}

/** Local calendar date YYYY-MM-DD. */
export function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function sumCounts(counts) {
  return TYPE_ORDER.reduce((sum, typeId) => sum + (counts?.[typeId] ?? 0), 0);
}

export function sanitizeCounts(raw) {
  const next = { ...EMPTY_COUNTS };
  if (!raw || typeof raw !== "object") return next;
  for (const typeId of TYPE_ORDER) {
    next[typeId] = Math.max(0, Math.floor(Number(raw[typeId]) || 0));
  }
  return next;
}

function sanitizePreviousRank(raw) {
  if (!raw || typeof raw !== "object") return null;
  const next = {};
  for (const typeId of TYPE_ORDER) {
    if (raw[typeId] == null) return null;
    next[typeId] = Math.max(0, Math.floor(Number(raw[typeId]) || 0));
  }
  return next;
}

function addCounts(a, b) {
  const next = { ...EMPTY_COUNTS };
  for (const typeId of TYPE_ORDER) {
    next[typeId] = (a?.[typeId] ?? 0) + (b?.[typeId] ?? 0);
  }
  return next;
}

/**
 * Store shape (v3):
 * - live: cumulative pending/published used by ranking (cross-day)
 * - days[YYYY-MM-DD].added: increments received that calendar day (report only)
 */
function emptyLive() {
  return {
    pending: { ...EMPTY_COUNTS },
    published: { ...EMPTY_COUNTS },
    previousRank: null,
    updatedAt: null,
  };
}

function emptyDayLog() {
  return {
    added: { ...EMPTY_COUNTS },
    totalAdded: 0,
    updatedAt: null,
  };
}

function normalizeLive(raw) {
  if (!raw || typeof raw !== "object") return emptyLive();
  const pending = sanitizeCounts(raw.pending);
  const published = sanitizeCounts(raw.published);
  return {
    pending,
    published,
    previousRank: sanitizePreviousRank(raw.previousRank),
    updatedAt: raw.updatedAt ?? null,
    totalPending: sumCounts(pending),
    totalPublished: sumCounts(published),
  };
}

function normalizeDayLog(raw) {
  if (!raw || typeof raw !== "object") return emptyDayLog();
  // v3: `added`. v2 leftover may use `pending` as that day's absolute — treat as added.
  const added = sanitizeCounts(raw.added ?? raw.pending);
  return {
    added,
    totalAdded: sumCounts(added),
    updatedAt: raw.updatedAt ?? null,
  };
}

function emptyStore(env) {
  return {
    version: COUNTS_STORAGE_VERSION,
    env,
    live: emptyLive(),
    days: {},
  };
}

/** Migrate v2 (per-day absolute) → v3 (live cumulative + daily added). */
function migrateV2(parsed, env) {
  const store = emptyStore(env);
  const days = parsed?.days;
  if (!days || typeof days !== "object") return store;

  let pending = { ...EMPTY_COUNTS };
  let published = { ...EMPTY_COUNTS };
  let previousRank = null;
  let latestDate = null;

  for (const [date, day] of Object.entries(days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const p = sanitizeCounts(day.pending);
    const pub = sanitizeCounts(day.published);
    store.days[date] = normalizeDayLog({ added: p, updatedAt: day.updatedAt });
    pending = addCounts(pending, p);
    published = addCounts(published, pub);
    if (!latestDate || date > latestDate) {
      latestDate = date;
      previousRank = sanitizePreviousRank(day.previousRank);
    }
  }

  store.live = normalizeLive({
    pending,
    published,
    previousRank,
    updatedAt: new Date().toISOString(),
  });
  return store;
}

function readRawStore(env) {
  try {
    const raw = localStorage.getItem(storageKeyForEnv(env));
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  // Fall back to v2 key once for migration.
  try {
    const legacy = localStorage.getItem(`ultimateAwe.counts.${env}.v2`);
    if (legacy) return { ...JSON.parse(legacy), version: 2 };
  } catch {
    /* ignore */
  }
  return null;
}

/** Load full env store from localStorage (v3, migrating v2 if needed). */
export function loadStoreFromStorage(env = resolveDataEnv()) {
  const parsed = readRawStore(env);
  if (!parsed) return emptyStore(env);

  if (parsed.version === 2) {
    const migrated = migrateV2(parsed, env);
    writeStore(migrated);
    return migrated;
  }

  if (parsed.version !== COUNTS_STORAGE_VERSION) return emptyStore(env);

  const days = {};
  if (parsed.days && typeof parsed.days === "object") {
    for (const [date, day] of Object.entries(parsed.days)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        days[date] = normalizeDayLog(day);
      }
    }
  }

  return {
    version: COUNTS_STORAGE_VERSION,
    env,
    live: normalizeLive(parsed.live),
    days,
  };
}

function writeStore(store) {
  try {
    localStorage.setItem(storageKeyForEnv(store.env), JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function loadLiveFromStorage(env = resolveDataEnv()) {
  return normalizeLive(loadStoreFromStorage(env).live);
}

export function loadDayAddedFromStorage(
  date = localDateKey(),
  env = resolveDataEnv(),
) {
  const store = loadStoreFromStorage(env);
  return store.days[date]
    ? normalizeDayLog(store.days[date])
    : emptyDayLog();
}

/**
 * Persist live totals + today's added log.
 * @param {{ pending, published, previousRank, addedToday, date, env }} args
 */
export function saveLiveToStorage({
  pending,
  published,
  previousRank,
  addedToday,
  date = localDateKey(),
  env = resolveDataEnv(),
}) {
  const store = loadStoreFromStorage(env);
  const live = normalizeLive({
    pending,
    published,
    previousRank,
    updatedAt: new Date().toISOString(),
  });
  store.live = live;
  store.days[date] = normalizeDayLog({
    added: addedToday,
    updatedAt: live.updatedAt,
  });
  writeStore(store);
  return { live, day: store.days[date] };
}

/** Full clear of live + all day logs. */
export function clearAllInStorage(env = resolveDataEnv()) {
  const store = emptyStore(env);
  writeStore(store);
  return store;
}

/** Day logs newest-first for the history panel. */
export function listDayLogs(env = resolveDataEnv()) {
  const store = loadStoreFromStorage(env);
  return Object.entries(store.days)
    .map(([date, day]) => {
      const d = normalizeDayLog(day);
      return {
        date,
        added: d.added,
        totalAdded: d.totalAdded,
        updatedAt: d.updatedAt,
      };
    })
    .filter((d) => d.totalAdded > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

const ONCE_DUMMY_FLAG = "ultimateAwe.onceDummy10.v1";

function dateKeyOffset(daysAgo) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return localDateKey(d);
}

function demoAddedForDay(daysAgo) {
  const base = [3, 5, 2, 4, 1];
  const added = { ...EMPTY_COUNTS };
  TYPE_ORDER.forEach((typeId, i) => {
    added[typeId] = base[i] + ((daysAgo * (i + 2)) % 4);
  });
  return added;
}

/**
 * One-shot sandbox fill: last `count` days including today.
 * Returns null if already applied (or not DEV).
 */
export function seedPastDaysOnce(count = 10, env = resolveDataEnv()) {
  if (!import.meta.env.DEV) return null;
  try {
    if (localStorage.getItem(ONCE_DUMMY_FLAG)) return null;
  } catch {
    return null;
  }

  const store = loadStoreFromStorage(env);
  const n = Math.max(1, Math.min(90, Math.floor(count)));

  for (let ago = 0; ago < n; ago++) {
    const date = dateKeyOffset(ago);
    store.days[date] = normalizeDayLog({
      added: demoAddedForDay(ago),
      updatedAt: new Date().toISOString(),
    });
  }

  let pending = { ...EMPTY_COUNTS };
  for (const day of Object.values(store.days)) {
    pending = addCounts(pending, normalizeDayLog(day).added);
  }

  store.live = normalizeLive({
    pending,
    published: { ...pending },
    previousRank: null,
    updatedAt: new Date().toISOString(),
  });
  writeStore(store);

  try {
    localStorage.setItem(ONCE_DUMMY_FLAG, "1");
  } catch {
    /* ignore */
  }

  const today = localDateKey();
  return {
    live: store.live,
    addedToday: store.days[today]
      ? normalizeDayLog(store.days[today]).added
      : { ...EMPTY_COUNTS },
  };
}

/**
 * Remove one day's increments from cumulative live totals and clear that day log.
 * Returns updated live + whether today was cleared.
 */
export function resetDayInStorage(date, env = resolveDataEnv()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const store = loadStoreFromStorage(env);
  const day = normalizeDayLog(store.days[date]);
  if (day.totalAdded <= 0 && !store.days[date]) {
    return {
      live: normalizeLive(store.live),
      clearedToday: date === localDateKey(),
      removed: emptyDayLog().added,
    };
  }

  const pending = { ...sanitizeCounts(store.live.pending) };
  const published = { ...sanitizeCounts(store.live.published) };
  for (const typeId of TYPE_ORDER) {
    const n = day.added[typeId] ?? 0;
    pending[typeId] = Math.max(0, pending[typeId] - n);
    published[typeId] = Math.max(0, published[typeId] - n);
  }

  const live = normalizeLive({
    pending,
    published,
    previousRank: store.live.previousRank,
    updatedAt: new Date().toISOString(),
  });
  store.live = live;
  delete store.days[date];
  writeStore(store);

  return {
    live,
    clearedToday: date === localDateKey(),
    removed: day.added,
    totalRemoved: day.totalAdded,
  };
}

export function countsAreEmpty(counts) {
  return TYPE_ORDER.every((typeId) => (counts?.[typeId] ?? 0) === 0);
}

export function liveIsEmpty(live) {
  const l = normalizeLive(live);
  return countsAreEmpty(l.pending) && countsAreEmpty(l.published);
}

/** Payload for relay disk backup. */
export function makePersistMessage({
  date,
  pending,
  published,
  previousRank,
  addedToday,
  env = resolveDataEnv(),
}) {
  const live = normalizeLive({
    pending,
    published,
    previousRank,
    updatedAt: new Date().toISOString(),
  });
  const day = normalizeDayLog({
    added: addedToday,
    updatedAt: live.updatedAt,
  });
  return {
    op: "persist",
    version: COUNTS_STORAGE_VERSION,
    env,
    date,
    live: {
      pending: live.pending,
      published: live.published,
      previousRank: live.previousRank,
      totalPending: live.totalPending,
      totalPublished: live.totalPublished,
      updatedAt: live.updatedAt,
    },
    addedToday: day.added,
    totalAddedToday: day.totalAdded,
    // Compat fields: ranking totals (live)
    pending: live.pending,
    published: live.published,
    previousRank: live.previousRank,
    totalPending: live.totalPending,
    totalPublished: live.totalPublished,
    updatedAt: live.updatedAt,
  };
}

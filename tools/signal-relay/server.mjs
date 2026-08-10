/**
 * Standalone WebSocket signal relay for Ultimate a-We.
 * Unity + display web both connect as clients; relay broadcasts add frames.
 * Auto-writes one store file per env: data/{dev|main}.json
 *
 * Usage: node tools/signal-relay/server.mjs
 * Env:   PORT=8765 (default)
 *        DATA_DIR=... (optional override)
 *
 * Default DATA_DIR:
 *   - repo:    <project>/data
 *   - deliver: <relay>/../data
 */
import { WebSocketServer } from "ws";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT) || 8765;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function defaultDataDir() {
  if (path.basename(path.dirname(__dirname)) === "tools") {
    return path.join(__dirname, "..", "..", "data");
  }
  return path.join(__dirname, "..", "data");
}

const DATA_DIR = process.env.DATA_DIR || defaultDataDir();

const TYPE_ORDER = [
  "absorb",
  "reflect",
  "withdraw",
  "transform",
  "diffuse",
];

function emptyCounts() {
  return Object.fromEntries(TYPE_ORDER.map((id) => [id, 0]));
}

function sanitizeCounts(raw) {
  const next = emptyCounts();
  if (!raw || typeof raw !== "object") return next;
  for (const id of TYPE_ORDER) {
    next[id] = Math.max(0, Math.floor(Number(raw[id]) || 0));
  }
  return next;
}

function sumCounts(counts) {
  return TYPE_ORDER.reduce((s, id) => s + (counts[id] || 0), 0);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function storeFile(env) {
  return path.join(DATA_DIR, `${env}.json`);
}

function readJson(file) {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeJsonAtomic(file, data) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, file);
}

function normalizeLive(raw) {
  const pending = sanitizeCounts(raw?.pending);
  const published = sanitizeCounts(raw?.published);
  return {
    pending,
    published,
    previousRank: raw?.previousRank ?? null,
    totalPending: sumCounts(pending),
    totalPublished: sumCounts(published),
    updatedAt: raw?.updatedAt ?? new Date().toISOString(),
  };
}

function normalizeDay(raw) {
  const added = sanitizeCounts(raw?.added);
  return {
    added,
    totalAdded: sumCounts(added),
    updatedAt: raw?.updatedAt ?? null,
  };
}

function emptyStore(env) {
  return {
    version: 4,
    env,
    live: normalizeLive({}),
    days: {},
    updatedAt: new Date().toISOString(),
  };
}

/** Migrate old multi-file layout: data/{env}/live.json + days + index. */
function migrateLegacyFolder(env) {
  const folder = path.join(DATA_DIR, env);
  const liveRaw = readJson(path.join(folder, "live.json"));
  if (!liveRaw) return null;

  const store = emptyStore(env);
  store.live = normalizeLive(liveRaw);

  try {
    for (const name of fs.readdirSync(folder)) {
      if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(name)) continue;
      const date = name.slice(0, 10);
      const day = readJson(path.join(folder, name));
      if (!day) continue;
      const n = normalizeDay(day);
      if (n.totalAdded > 0) store.days[date] = n;
    }
  } catch {
    /* ignore */
  }

  store.updatedAt = new Date().toISOString();
  writeJsonAtomic(storeFile(env), store);

  try {
    fs.rmSync(folder, { recursive: true, force: true });
    console.log(`[relay] migrated ${env}/ → ${env}.json`);
  } catch {
    console.log(`[relay] migrated ${env}.json (old folder left)`);
  }

  return store;
}

function loadStore(env) {
  const file = storeFile(env);
  const raw = readJson(file);
  if (raw?.version === 4 && raw.live) {
    const days = {};
    if (raw.days && typeof raw.days === "object") {
      for (const [date, day] of Object.entries(raw.days)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        const n = normalizeDay(day);
        if (n.totalAdded > 0) days[date] = n;
      }
    }
    return {
      version: 4,
      env,
      live: normalizeLive(raw.live),
      days,
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
    };
  }

  const migrated = migrateLegacyFolder(env);
  if (migrated) return migrated;
  return emptyStore(env);
}

function savePersist(msg) {
  const env = msg.env === "main" ? "main" : "dev";
  const date = String(msg.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const store = loadStore(env);
  const live = normalizeLive(msg.live ?? msg);
  const addedToday = sanitizeCounts(msg.addedToday ?? emptyCounts());
  const day = normalizeDay({
    added: addedToday,
    updatedAt: live.updatedAt,
  });

  store.live = live;
  if (day.totalAdded <= 0) {
    delete store.days[date];
  } else {
    store.days[date] = day;
  }
  store.updatedAt = new Date().toISOString();
  writeJsonAtomic(storeFile(env), store);

  console.log(
    `[relay] saved ${env}.json published=${live.totalPublished}` +
      (day.totalAdded > 0 ? ` ${date}+${day.totalAdded}` : ` cleared ${date}`),
  );

  return { env, date, live, addedToday, day };
}

function loadSnapshot(env, date) {
  const store = loadStore(env);
  const live = store.live;
  const day = store.days[date] ? normalizeDay(store.days[date]) : null;
  const dayTotals = {};
  for (const [d, entry] of Object.entries(store.days)) {
    const n = normalizeDay(entry);
    dayTotals[d] = {
      totalAdded: n.totalAdded,
      updatedAt: n.updatedAt,
    };
  }
  return {
    op: "snapshot",
    version: 4,
    env,
    date,
    live,
    addedToday: day?.added ?? emptyCounts(),
    pending: live.pending,
    published: live.published,
    previousRank: live.previousRank,
    totalPending: live.totalPending,
    totalPublished: live.totalPublished,
    dayTotals,
    updatedAt: live.updatedAt,
  };
}

function broadcast(raw, except) {
  for (const client of wss.clients) {
    if (client !== except && client.readyState === 1) {
      client.send(raw);
    }
  }
}

ensureDir(DATA_DIR);
// Eager-migrate legacy folders if present.
for (const env of ["dev", "main"]) {
  loadStore(env);
}

const wss = new WebSocketServer({ port: PORT, host: "0.0.0.0" });

wss.on("connection", (socket, req) => {
  const from = req.socket.remoteAddress;
  console.log(`[relay] + client ${from} (n=${wss.clients.size})`);

  socket.on("message", (data, isBinary) => {
    if (isBinary) return;
    const raw = String(data);
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || typeof msg.op !== "string") return;

    if (msg.op === "add") {
      broadcast(raw, socket);
      return;
    }

    if (msg.op === "persist") {
      const saved = savePersist(msg);
      if (!saved) return;
      socket.send(
        JSON.stringify({
          op: "persisted",
          env: saved.env,
          date: saved.date,
          live: saved.live,
          addedToday: saved.addedToday,
        }),
      );
      return;
    }

    if (msg.op === "getSnapshot") {
      const env = msg.env === "main" ? "main" : "dev";
      const date = String(msg.date || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      socket.send(JSON.stringify(loadSnapshot(env, date)));
    }
  });

  socket.on("close", () => {
    console.log(`[relay] - client ${from} (n=${wss.clients.size})`);
  });
});

console.log(`[relay] listening ws://0.0.0.0:${PORT}`);
console.log(`[relay] store ${DATA_DIR}/{dev|main}.json`);
console.log(`[relay] Unity:  ws://<this-machine-lan-ip>:${PORT}`);
console.log(`[relay] Web:    via Vite proxy /signal (or ?ws=...)`);

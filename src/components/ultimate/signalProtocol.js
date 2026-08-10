import { TYPE_ORDER } from "./ultimateData";

/** Default: same-origin `/signal` (Vite proxies to local relay). Override with `?ws=`. */
export function defaultSignalWsUrl() {
  if (typeof window === "undefined") return "ws://127.0.0.1:8765";
  const param = new URLSearchParams(window.location.search).get("ws");
  if (param) return param;
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/signal`;
}

export function parseAddMessage(raw) {
  let msg;
  try {
    msg = JSON.parse(String(raw));
  } catch {
    return null;
  }
  if (!msg || msg.op !== "add") return null;
  if (!TYPE_ORDER.includes(msg.typeId)) return null;
  const n = Math.max(0, Math.floor(Number(msg.n ?? 1)));
  if (n <= 0) return null;
  return {
    typeId: msg.typeId,
    n,
    id: msg.id != null ? String(msg.id) : null,
  };
}

export function buildAddMessage(typeId, n = 1, id) {
  const payload = { op: "add", typeId, n };
  if (id != null) payload.id = id;
  return JSON.stringify(payload);
}

export function parseSignalMessage(raw) {
  let msg;
  try {
    msg = JSON.parse(String(raw));
  } catch {
    return null;
  }
  if (!msg || typeof msg.op !== "string") return null;
  return msg;
}

export function buildGetSnapshotMessage(env, date) {
  return JSON.stringify({ op: "getSnapshot", env, date });
}

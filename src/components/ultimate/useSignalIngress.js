import { useEffect, useRef, useState } from "react";
import {
  buildGetSnapshotMessage,
  defaultSignalWsUrl,
  parseAddMessage,
  parseSignalMessage,
} from "./signalProtocol";

const RECONNECT_MIN_MS = 500;
const RECONNECT_MAX_MS = 8000;
const SEEN_ID_LIMIT = 200;
const PERSIST_DEBOUNCE_MS = 400;
const HYDRATE_WAIT_MS = 1500;

/**
 * Listen for Unity (or simulator) add events over WebSocket relay.
 * Also pushes day snapshots for disk backup and can pull when local is empty.
 */
export default function useSignalIngress({
  onAdd,
  url = defaultSignalWsUrl(),
  enabled = true,
  dataEnv = "dev",
  dateKey = null,
  requestHydrate = false,
  onSnapshot = null,
  onHydrateSettled = null,
} = {}) {
  const [status, setStatus] = useState("idle");
  const onAddRef = useRef(onAdd);
  const onSnapshotRef = useRef(onSnapshot);
  const onHydrateSettledRef = useRef(onHydrateSettled);
  const seenIdsRef = useRef(new Set());
  const seenQueueRef = useRef([]);
  const socketRef = useRef(null);
  const persistTimerRef = useRef(null);
  const pendingPersistRef = useRef(null);
  const hydrateAskedRef = useRef(false);

  onAddRef.current = onAdd;
  onSnapshotRef.current = onSnapshot;
  onHydrateSettledRef.current = onHydrateSettled;

  const sendPersist = (msg) => {
    pendingPersistRef.current = msg;
    if (persistTimerRef.current != null) {
      window.clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = window.setTimeout(() => {
      persistTimerRef.current = null;
      const payload = pendingPersistRef.current;
      const socket = socketRef.current;
      if (!payload || !socket || socket.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify(payload));
    }, PERSIST_DEBOUNCE_MS);
  };

  useEffect(() => {
    if (!enabled || !url) {
      setStatus("idle");
      return undefined;
    }

    let closed = false;
    let socket = null;
    let retryTimer = null;
    let hydrateTimer = null;
    let attempt = 0;
    hydrateAskedRef.current = false;

    const rememberId = (id) => {
      if (!id) return false;
      if (seenIdsRef.current.has(id)) return true;
      seenIdsRef.current.add(id);
      seenQueueRef.current.push(id);
      if (seenQueueRef.current.length > SEEN_ID_LIMIT) {
        const old = seenQueueRef.current.shift();
        seenIdsRef.current.delete(old);
      }
      return false;
    };

    const askHydrate = () => {
      if (!requestHydrate || !dateKey || hydrateAskedRef.current) return;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      hydrateAskedRef.current = true;
      socket.send(buildGetSnapshotMessage(dataEnv, dateKey));
      hydrateTimer = window.setTimeout(() => {
        onHydrateSettledRef.current?.();
      }, HYDRATE_WAIT_MS);
    };

    const connect = () => {
      if (closed) return;
      setStatus(attempt === 0 ? "connecting" : "reconnecting");
      socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        attempt = 0;
        setStatus("connected");
        askHydrate();
        // Flush any queued persist.
        if (pendingPersistRef.current) {
          sendPersist(pendingPersistRef.current);
        }
      };

      socket.onmessage = (event) => {
        const add = parseAddMessage(event.data);
        if (add) {
          if (rememberId(add.id)) return;
          onAddRef.current?.(add.typeId, add.n);
          return;
        }

        const msg = parseSignalMessage(event.data);
        if (!msg) return;

        if (msg.op === "snapshot") {
          onSnapshotRef.current?.(msg);
          if (hydrateTimer != null) {
            window.clearTimeout(hydrateTimer);
            hydrateTimer = null;
          }
          onHydrateSettledRef.current?.();
        }
      };

      socket.onerror = () => {
        // onclose will schedule reconnect
      };

      socket.onclose = () => {
        if (socketRef.current === socket) socketRef.current = null;
        if (closed) return;
        setStatus("disconnected");
        const delay = Math.min(
          RECONNECT_MAX_MS,
          RECONNECT_MIN_MS * 2 ** attempt,
        );
        attempt += 1;
        retryTimer = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer != null) window.clearTimeout(retryTimer);
      if (hydrateTimer != null) window.clearTimeout(hydrateTimer);
      if (persistTimerRef.current != null) {
        window.clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      if (socket) {
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        if (socket.readyState === WebSocket.CONNECTING) {
          socket.onopen = () => {
            socket.onopen = null;
            socket.close();
          };
        } else {
          socket.onopen = null;
          if (socket.readyState === WebSocket.OPEN) socket.close();
        }
      }
      if (socketRef.current === socket) socketRef.current = null;
      setStatus("idle");
    };
  }, [url, enabled, dataEnv, dateKey, requestHydrate]);

  return { status, url, sendPersist };
}

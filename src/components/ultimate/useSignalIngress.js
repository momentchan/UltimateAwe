import { useEffect, useRef, useState } from "react";
import { defaultSignalWsUrl, parseAddMessage } from "./signalProtocol";

const RECONNECT_MIN_MS = 500;
const RECONNECT_MAX_MS = 8000;
const SEEN_ID_LIMIT = 200;

/**
 * Listen for Unity (or simulator) add events over WebSocket relay.
 * @param {{ onAdd: (typeId: string, n?: number) => void, url?: string, enabled?: boolean }} options
 */
export default function useSignalIngress({
  onAdd,
  url = defaultSignalWsUrl(),
  enabled = true,
} = {}) {
  const [status, setStatus] = useState("idle");
  const onAddRef = useRef(onAdd);
  onAddRef.current = onAdd;
  const seenIdsRef = useRef(new Set());
  const seenQueueRef = useRef([]);

  useEffect(() => {
    if (!enabled || !url) {
      setStatus("idle");
      return undefined;
    }

    let closed = false;
    let socket = null;
    let retryTimer = null;
    let attempt = 0;

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

    const connect = () => {
      if (closed) return;
      setStatus(attempt === 0 ? "connecting" : "reconnecting");
      socket = new WebSocket(url);

      socket.onopen = () => {
        attempt = 0;
        setStatus("connected");
      };

      socket.onmessage = (event) => {
        const parsed = parseAddMessage(event.data);
        if (!parsed) return;
        if (rememberId(parsed.id)) return;
        onAddRef.current?.(parsed.typeId, parsed.n);
      };

      socket.onerror = () => {
        // onclose will schedule reconnect
      };

      socket.onclose = () => {
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
      if (socket) {
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        // Avoid "closed before the connection is established" on StrictMode/HMR.
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
      setStatus("idle");
    };
  }, [url, enabled]);

  return { status, url };
}

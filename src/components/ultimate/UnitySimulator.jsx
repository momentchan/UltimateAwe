import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TYPES } from "./assets";
import { TYPE_ORDER } from "./ultimateData";
import {
  buildAddMessage,
  defaultSignalWsUrl,
} from "./signalProtocol";
import "./unitySim.css";

/**
 * Browser stand-in for the Unity app: connects to the same relay and sends add events.
 * Open at /sim (second tab) while the display runs on /.
 */
export default function UnitySimulator() {
  const [url, setUrl] = useState(() => defaultSignalWsUrl());
  const [draftUrl, setDraftUrl] = useState(() => defaultSignalWsUrl());
  const [status, setStatus] = useState("idle");
  const [log, setLog] = useState([]);
  const socketRef = useRef(null);
  const closedRef = useRef(false);
  const attemptRef = useRef(0);
  const retryRef = useRef(null);

  const pushLog = useCallback((line) => {
    setLog((prev) => [`${new Date().toLocaleTimeString()}  ${line}`, ...prev].slice(0, 40));
  }, []);

  useEffect(() => {
    closedRef.current = false;
    attemptRef.current = 0;

    const connect = () => {
      if (closedRef.current) return;
      setStatus(attemptRef.current === 0 ? "connecting" : "reconnecting");
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        attemptRef.current = 0;
        setStatus("connected");
        pushLog(`connected → ${url}`);
      };

      socket.onclose = () => {
        if (closedRef.current) return;
        setStatus("disconnected");
        pushLog("disconnected");
        const delay = Math.min(8000, 500 * 2 ** attemptRef.current);
        attemptRef.current += 1;
        retryRef.current = window.setTimeout(connect, delay);
      };

      socket.onerror = () => {
        pushLog("socket error");
      };
    };

    connect();

    return () => {
      closedRef.current = true;
      if (retryRef.current != null) window.clearTimeout(retryRef.current);
      const socket = socketRef.current;
      if (socket) {
        socket.onopen = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
      }
    };
  }, [url, pushLog]);

  const sendAdd = useCallback(
    (typeId, n = 1) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        pushLog("not connected — cannot send");
        return;
      }
      const id = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const raw = buildAddMessage(typeId, n, id);
      socket.send(raw);
      pushLog(`sent ${raw}`);
    },
    [pushLog],
  );

  const applyUrl = useCallback(() => {
    setUrl(draftUrl.trim());
  }, [draftUrl]);

  const statusClass = useMemo(() => {
    if (status === "connected") return "is-ok";
    if (status === "connecting" || status === "reconnecting") return "is-wait";
    return "is-bad";
  }, [status]);

  return (
    <div className="ua-sim">
      <header className="ua-sim__header">
        <div>
          <h1>Unity signal simulator</h1>
          <p>Stand-in for the standalone Unity app. Sends the same JSON to the relay.</p>
        </div>
        <a className="ua-sim__link" href="/">
          ← Display
        </a>
      </header>

      <section className="ua-sim__card">
        <div className="ua-sim__label">Relay WebSocket</div>
        <div className="ua-sim__url-row">
          <input
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            spellCheck={false}
          />
          <button type="button" onClick={applyUrl}>
            Connect
          </button>
        </div>
        <div className={`ua-sim__status ${statusClass}`}>{status}</div>
      </section>

      <section className="ua-sim__card">
        <div className="ua-sim__label">Send add (+1)</div>
        <div className="ua-sim__types">
          {TYPE_ORDER.map((typeId, index) => {
            const t = TYPES[typeId];
            return (
              <button
                key={typeId}
                type="button"
                onClick={() => sendAdd(typeId, 1)}
                disabled={status !== "connected"}
              >
                <span
                  className="ua-sim__swatch"
                  style={{ background: t.color }}
                />
                <kbd>{index + 1}</kbd>
                <span>
                  {t.zh}
                  <small>{t.en}</small>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="ua-sim__card">
        <div className="ua-sim__label">Log</div>
        <pre className="ua-sim__log">{log.join("\n") || "—"}</pre>
      </section>
    </div>
  );
}

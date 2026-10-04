import { useCallback, useMemo, useRef, useState } from "react";
import { UIContext } from "./contexts.js";
import Modal from "../components/Modal.jsx";

let toastId = 0;

/** Toast notifications + a promise-based confirm dialog. */
export default function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const resolver = useRef(null);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (type, message) => {
      const id = ++toastId;
      setToasts((t) => [...t.slice(-3), { id, type, message }]);
      setTimeout(() => dismiss(id), type === "error" ? 5000 : 3200);
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push]
  );

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setConfirmState(typeof opts === "string" ? { message: opts } : opts);
      }),
    []
  );

  const answer = (value) => {
    resolver.current?.(value);
    resolver.current = null;
    setConfirmState(null);
  };

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <UIContext.Provider value={value}>
      {children}

      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon" aria-hidden="true">{t.type === "success" ? "✓" : t.type === "error" ? "!" : "i"}</span>
            <span className="toast-msg">{t.message}</span>
            <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">×</button>
          </div>
        ))}
      </div>

      {confirmState && (
        <Modal title={confirmState.title || "Are you sure?"} onClose={() => answer(false)} small>
          <p className="muted">{confirmState.message}</p>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => answer(false)}>Cancel</button>
            <button className={`btn ${confirmState.danger === false ? "btn-primary" : "btn-danger"}`} onClick={() => answer(true)} autoFocus>
              {confirmState.confirmLabel || "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </UIContext.Provider>
  );
}

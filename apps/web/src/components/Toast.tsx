"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import styles from "./Toast.module.css";

// ── Tipos ───────────────────────────────────────────────────────────────────

type ToastVariant = "error" | "success" | "info";

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastFn = (message: string, variant?: ToastVariant) => void;

const ToastContext = createContext<ToastFn | null>(null);

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Dispara um toast curto para o usuário.
 * O erro completo (stack/traceback) deve ir para console.error separadamente —
 * o toast mostra só a mensagem legível.
 */
export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

const AUTO_DISMISS_MS = 6000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastFn>((message, variant = "error") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={styles.container} role="region" aria-label="Notificações">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${styles.toast} ${styles[t.variant]}`}
            role={t.variant === "error" ? "alert" : "status"}
          >
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.message}>{t.message}</span>
            <button
              className={styles.close}
              onClick={() => dismiss(t.id)}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

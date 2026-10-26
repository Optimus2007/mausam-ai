import { useEffect, useRef, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, RefreshCw, WifiOff, X } from "lucide-react";
import type { ApiError } from "../../api/client";
import type { Status } from "../../api/types";
import { cx, toneClasses } from "../../lib/format";
import { useApp } from "../../state/AppState";

/** Bottom sheet on mobile, centred dialog on desktop. Closes on Escape and backdrop click. */
export function Sheet({ open, onClose, title, subtitle, children, wide }: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button className="animate-fade absolute inset-0 bg-[#0d2b5c]/35 backdrop-blur-[2px]" onClick={onClose} aria-label="Close" />
      <div ref={panel} tabIndex={-1}
        className={cx("animate-sheet relative flex max-h-[88dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl outline-none sm:rounded-3xl", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}>
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-3 sm:pt-5">
          <div>
            <h2 className="text-lg font-bold text-navy">{title}</h2>
            {subtitle && <div className="mt-0.5 text-[13px] text-ink-2">{subtitle}</div>}
          </div>
          <button className="icon-btn -mr-2 -mt-1 h-9 w-9" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

export function StatusPill({ status, className }: { status: Status; className?: string }) {
  return <span className={cx("pill", toneClasses[status.tone], className)}>{status.label}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} />;
}

export function ErrorState({ error, onRetry, compact }: { error: ApiError; onRetry: () => void; compact?: boolean }) {
  const offline = error.code === "network" || error.code === "timeout";
  const Icon = offline ? WifiOff : AlertTriangle;
  return (
    <div className={cx("card flex flex-col items-center text-center", compact ? "gap-2 p-4" : "gap-3 p-6")} role="alert">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-bad-soft text-bad-ink">
        <Icon size={22} />
      </span>
      <div>
        <p className="font-bold">{offline ? "Connection problem" : "Couldn't load weather"}</p>
        <p className="mt-1 text-[13px] text-ink-2">{error.message}</p>
        {error.code === "invalid_key" && (
          <p className="mt-1 text-[12px] text-ink-3">Check OPENWEATHER_API_KEY in the backend environment.</p>
        )}
      </div>
      <button className="btn-primary w-auto px-5" onClick={onRetry}>
        <RefreshCw size={16} /> Try again
      </button>
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-soft text-brand">{icon}</span>
      <p className="mt-1 font-bold">{title}</p>
      <p className="max-w-xs text-[13px] text-ink-2">{text}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function SlowNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl bg-sky-soft px-3 py-2 text-[12px] text-navy-2" role="status">
      <Loader2 size={14} className="animate-spin" />
      Still loading… if the server was asleep it can take up to a minute to wake up.
    </div>
  );
}

/** Persistent label so sample data is never mistaken for live weather. */
export function DataSourceBanner() {
  const { health, healthError } = useApp();
  if (healthError) return null;
  if (!health || health.mode !== "demo") return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-[#f8d9b5] bg-[#fff6ea] px-3 py-2 text-[12px] text-[#8a4b0f]" role="note">
      <Info size={15} className="mt-[1px] shrink-0" />
      <span>
        <b>Demo mode</b> — showing generated sample data, not live weather. Add an OpenWeather API key to the backend to go live.
      </span>
    </div>
  );
}

export function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id}
          className={cx("animate-sheet flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white shadow-lg",
            t.tone === "good" ? "bg-good" : t.tone === "bad" ? "bg-bad-ink" : "bg-navy")}>
          {t.tone === "good" ? <CheckCircle2 size={16} /> : t.tone === "bad" ? <AlertTriangle size={16} /> : <Info size={16} />}
          {t.text}
        </div>
      ))}
    </div>
  );
}

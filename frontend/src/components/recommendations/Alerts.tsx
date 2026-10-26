import { AlertTriangle, BadgeCheck, ChevronRight, CloudLightning, CloudRain, Eye, Megaphone, Snowflake, Sun, Thermometer, Wind, X } from "lucide-react";
import type { Advisory, OfficialAlert } from "../../api/types";
import { cx } from "../../lib/format";
import { useApp } from "../../state/AppState";
import { Sheet } from "../common/ui";

const ICONS = {
  rain: CloudRain, storm: CloudLightning, heat: Thermometer, uv: Sun, wind: Wind,
  visibility: Eye, cold: Snowflake, clear: BadgeCheck,
} as const;

const SEVERITY = {
  warning: { chip: "bg-bad-soft text-bad-ink", label: "Warning" },
  caution: { chip: "bg-warn-soft text-warn-ink", label: "Caution" },
  info: { chip: "bg-info-soft text-info-ink", label: "Heads-up" },
  ok: { chip: "bg-good-soft text-good-ink", label: "All clear" },
} as const;

function iconFor(kind: string) {
  return ICONS[kind as keyof typeof ICONS] ?? AlertTriangle;
}

/** Visible advisories after removing ones the user dismissed (critical ones can't be dismissed). */
export function useVisibleAdvisories(advisories: Advisory[] | undefined) {
  const { dismissed } = useApp();
  return (advisories ?? []).filter((a) => !a.dismissible || !dismissed.includes(a.id));
}

export function SmartAlertCard({ advisories, onOpen }: { advisories: Advisory[]; onOpen: () => void }) {
  const { dismiss } = useApp();
  const top = advisories[0];
  if (!top) {
    return (
      <button onClick={onOpen} className="card flex w-full items-center gap-3 p-3 text-left">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-good-soft text-good"><BadgeCheck size={24} /></span>
        <span className="flex-1 text-[13px] text-ink-2">No active weather alerts. You've dismissed the rest.</span>
        <ChevronRight size={18} className="text-ink-3" />
      </button>
    );
  }
  const Icon = iconFor(top.icon);
  return (
    <div className="relative flex items-center gap-3 rounded-2xl border border-[#d6e5fb] bg-sky-soft p-3 pr-2" role="status">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-brand shadow-sm">
        <Icon size={26} />
      </span>
      <button onClick={onOpen} className="min-w-0 flex-1 text-left" aria-label="Open all alerts">
        <span className="block text-[12px] font-semibold text-brand">
          Smart Weather Alert{advisories.length > 1 ? ` · ${advisories.length}` : ""}
        </span>
        <span className="block text-[15px] font-bold leading-snug">{top.title}</span>
        <span className="block text-[12px] text-ink-2">{top.message}</span>
      </button>
      <div className="flex flex-col items-center">
        {top.dismissible && (
          <button onClick={() => dismiss(top.id)} className="icon-btn h-8 w-8 text-ink-3" aria-label="Dismiss alert"><X size={16} /></button>
        )}
        <button onClick={onOpen} className="icon-btn h-8 w-8" aria-label="See all alerts"><ChevronRight size={18} /></button>
      </div>
    </div>
  );
}

export function OfficialAlertBanner({ alerts }: { alerts: OfficialAlert[] }) {
  if (!alerts.length) return null;
  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div key={a.event + a.start} className="rounded-2xl border border-[#f5c2c2] bg-bad-soft p-3 text-bad-ink" role="alert">
          <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide"><Megaphone size={14} /> Official alert · {a.sender}</p>
          <p className="mt-0.5 font-bold">{a.event}</p>
          <p className="mt-0.5 line-clamp-3 text-[12px]">{a.description}</p>
        </div>
      ))}
    </div>
  );
}

export function NotificationsSheet({ open, onClose, advisories, official }: {
  open: boolean;
  onClose: () => void;
  advisories: Advisory[];
  official: OfficialAlert[];
}) {
  const { dismissed, dismiss, restoreDismissed } = useApp();
  const hidden = advisories.filter((a) => a.dismissible && dismissed.includes(a.id)).length;
  const visible = advisories.filter((a) => !a.dismissible || !dismissed.includes(a.id));
  return (
    <Sheet open={open} onClose={onClose} title="Weather alerts" subtitle="Next 24 hours, generated from the forecast">
      <OfficialAlertBanner alerts={official} />
      <ul className="mt-1 space-y-2">
        {visible.map((a) => {
          const Icon = iconFor(a.icon);
          const sev = SEVERITY[a.severity];
          return (
            <li key={a.id} className="flex gap-3 rounded-2xl border border-line p-3">
              <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", sev.chip)}><Icon size={20} /></span>
              <div className="min-w-0 flex-1">
                <span className={cx("pill px-1.5 py-0.5 text-[10px]", sev.chip)}>{sev.label}</span>
                <p className="mt-1 font-bold leading-snug">{a.title}</p>
                <p className="text-[13px] text-ink-2">{a.message}</p>
                <p className="mt-1 text-[11px] text-ink-3">Based on: {a.basis}</p>
              </div>
              {a.dismissible && (
                <button onClick={() => dismiss(a.id)} className="icon-btn h-8 w-8 shrink-0 text-ink-3" aria-label={`Dismiss ${a.title}`}><X size={16} /></button>
              )}
            </li>
          );
        })}
      </ul>
      {visible.length === 0 && <p className="py-6 text-center text-[13px] text-ink-2">No alerts to show.</p>}
      <div className="mt-3 flex items-center justify-between pb-2 text-[12px] text-ink-3">
        <span>Mausam AI advisories are not official warnings.</span>
        {hidden > 0 && <button onClick={restoreDismissed} className="font-semibold text-brand">Show {hidden} dismissed</button>}
      </div>
    </Sheet>
  );
}

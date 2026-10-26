import { ChevronRight, Home } from "lucide-react";
import { Bar, BarChart, Cell, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { ActivitySuitability as Suit, ScorePoint } from "../../api/types";
import { ACTIVITIES } from "../../lib/activities";
import { cx } from "../../lib/format";
import { useApp } from "../../state/AppState";
import { EmptyState, Sheet, Skeleton } from "../common/ui";
import { SlidersHorizontal } from "lucide-react";

const LABEL_INK: Record<string, string> = {
  Good: "text-good-ink",
  Moderate: "text-warn-ink",
  Poor: "text-bad-ink",
  Unsuitable: "text-bad-ink",
};

export function ActivitySuitabilityGrid({ activities, onDetails }: { activities: Suit[]; onDetails: (id: Suit["id"]) => void }) {
  const { prefs, setFocus, openSheet } = useApp();
  const shown = activities.filter((a) => prefs.activities.includes(a.id));
  return (
    <section aria-label="Activity suitability">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="section-title">Activity Suitability</h2>
        <button className="link-btn" onClick={() => onDetails(prefs.focus_activity)}>See details <ChevronRight size={16} /></button>
      </div>
      {shown.length === 0 ? (
        <EmptyState icon={<SlidersHorizontal size={22} />} title="No activities selected" text="Choose the activities you care about to see suitability scores."
          action={<button className="btn-primary w-auto px-4" onClick={() => openSheet({ kind: "prefs" })}>Choose activities</button>} />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {shown.map((a) => {
            const m = ACTIVITIES[a.id];
            const selected = prefs.focus_activity === a.id;
            return (
              <button key={a.id} onClick={() => { setFocus(a.id); onDetails(a.id); }}
                aria-label={`${a.name}: ${a.label}, ${a.score}%`}
                className={cx("flex flex-col items-center rounded-2xl border p-3 text-center transition hover:-translate-y-0.5",
                  m.card, selected && "ring-2 ring-brand/60")}>
                <span className={cx("flex h-10 w-10 items-center justify-center rounded-full", m.chip)}><m.icon size={20} /></span>
                <span className="mt-1.5 text-[14px] font-bold">{a.name}</span>
                <span className={cx("text-[13px] font-semibold", LABEL_INK[a.label])}>{a.label}</span>
                <span className="mt-2 flex w-full items-center gap-2">
                  <span className="text-[11px] font-semibold text-ink-2">{a.score}%</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
                    <span className={cx("block h-full rounded-full", m.bar)} style={{ width: `${a.score}%` }} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function ActivitySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[132px] rounded-2xl" />)}
    </div>
  );
}

const statusColor = (score: number) => (score >= 75 ? "#2e9e5b" : score >= 55 ? "#ef8a2b" : "#d64545");

function ScoreTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as ScorePoint;
  return (
    <div className="max-w-[180px] rounded-lg bg-navy px-2.5 py-1.5 text-[11px] text-white shadow-lg">
      <p className="font-bold">{p.label} · score {p.score}</p>
      {p.reasons.length > 0 ? <p className="text-white/80">{p.reasons.join(", ")}</p> : <p className="text-white/80">No limiting factors</p>}
    </div>
  );
}

/** Hour-by-hour suitability bars (status colours + legend so colour is never the only cue). */
export function ScoreTimeline({ points }: { points: ScorePoint[] }) {
  const width = Math.max(points.length * 26, 300);
  return (
    <div>
      <div className="no-scrollbar overflow-x-auto">
        <BarChart width={width} height={150} data={points} margin={{ top: 8, right: 4, bottom: 0, left: -28 }} barCategoryGap={2}>
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#7c8aa3" }} tickLine={false} axisLine={{ stroke: "#e4ecf6" }} interval={1} />
          <YAxis domain={[0, 100]} ticks={[0, 55, 75, 100]} tick={{ fontSize: 10, fill: "#7c8aa3" }} tickLine={false} axisLine={false} />
          <Tooltip content={ScoreTooltip} cursor={{ fill: "#eaf3fe" }} />
          <Bar dataKey="score" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {points.map((p) => <Cell key={p.dt} fill={statusColor(p.score)} />)}
          </Bar>
        </BarChart>
      </div>
      <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-ink-2">
        {[["#2e9e5b", "Good 75+"], ["#ef8a2b", "Moderate 55–74"], ["#d64545", "Poor <55"]].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />{l}</span>
        ))}
      </div>
    </div>
  );
}

export function ActivityDetailSheet({ activity, onClose }: { activity: Suit | null; onClose: () => void }) {
  if (!activity) return null;
  const m = ACTIVITIES[activity.id];
  return (
    <Sheet open onClose={onClose} title={`${activity.name} · next 24 hours`} wide
      subtitle={<span className={cx("font-semibold", LABEL_INK[activity.label])}>{activity.label} overall · {activity.score}%</span>}>
      <div className="grid grid-cols-2 gap-2 text-[13px]">
        <div className={cx("rounded-xl border p-3", m.card)}>
          <p className="text-ink-2">Best time</p>
          <p className="font-bold">{activity.best_time ?? "No suitable window"}</p>
        </div>
        <div className="rounded-xl border border-line bg-page p-3">
          <p className="text-ink-2">Right now</p>
          <p className="font-bold">{activity.now_label ?? "—"} {activity.now_score != null && `· ${activity.now_score}`}</p>
        </div>
      </div>
      <h3 className="mb-1 mt-4 text-[13px] font-bold">Hour-by-hour suitability</h3>
      <ScoreTimeline points={activity.hourly} />
      <h3 className="mb-1 mt-4 text-[13px] font-bold">What limits it today</h3>
      {activity.limits.length ? (
        <ul className="list-inside list-disc text-[13px] text-ink-2">
          {activity.limits.map((l) => <li key={l} className="first-letter:uppercase">{l}</li>)}
        </ul>
      ) : <p className="text-[13px] text-ink-2">Nothing significant — conditions are within comfortable ranges.</p>}
      {activity.score < 55 && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-warn-soft p-3 text-[13px] text-warn-ink">
          <Home size={16} className="mt-0.5 shrink-0" /> {activity.indoor_alternative}
        </p>
      )}
      <p className="mt-4 pb-2 text-[11px] text-ink-3">Overall score blends the best 2-hour window with the average of waking hours.</p>
    </Sheet>
  );
}

import { useState } from "react";
import { Check, ChevronDown, Home, Info, Plus, Sparkles } from "lucide-react";
import type { FocusRecommendation, Location } from "../../api/types";
import { ACTIVITIES } from "../../lib/activities";
import { cx } from "../../lib/format";
import { useApp } from "../../state/AppState";
import { ParkScene } from "../illustrations/Illustrations";
import { Skeleton } from "../common/ui";

export function AIRecommendationCard({ focus, location, refreshing }: { focus: FocusRecommendation; location: Location; refreshing?: boolean }) {
  const { prefs, setFocus, addToItinerary, inItinerary, removeFromItinerary } = useApp();
  const [why, setWhy] = useState(false);
  const meta = ACTIVITIES[focus.activity];
  const itemId = focus.window ? `focus:${focus.activity}:${location.name}:${focus.window.start}` : "";
  const added = itemId && inItinerary(itemId);

  return (
    <section className={cx("relative overflow-hidden rounded-2xl border p-4 transition-opacity",
      focus.outdoor_ok ? "border-[#cdebd6] bg-[#f1faf3]" : "border-[#f8d9b5] bg-[#fff7ee]", refreshing && "opacity-70")}
      aria-label="AI recommendation">
      <div className="flex items-center gap-2">
        <span className={cx("flex h-9 w-9 items-center justify-center rounded-full text-white", focus.outdoor_ok ? "bg-good" : "bg-warn")}>
          <Sparkles size={18} />
        </span>
        <span className="text-[13px] font-semibold text-ink-2">AI Recommendation</span>
        <button className="text-ink-3 hover:text-navy" onClick={() => setWhy((w) => !w)} aria-label="How this recommendation works" aria-expanded={why}>
          <Info size={15} />
        </button>
      </div>

      {/* Activity switcher — the recommendation is recomputed for the chosen activity */}
      <div className="no-scrollbar -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1" role="tablist" aria-label="Activity">
        {prefs.activities.map((id) => (
          <button key={id} role="tab" aria-selected={prefs.focus_activity === id} onClick={() => setFocus(id)}
            className={cx("shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold transition",
              prefs.focus_activity === id ? "bg-navy-2 text-white" : "bg-white/80 text-navy-2 ring-1 ring-line hover:bg-white")}>
            {ACTIVITIES[id].name}
          </button>
        ))}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0 flex-1 py-2">
          <p className="text-[17px] font-bold leading-snug">{focus.headline}{focus.window ? ":" : ""}</p>
          {focus.window ? (
            <p className="text-[26px] font-extrabold leading-tight text-good sm:text-[28px]">{focus.window.label}</p>
          ) : (
            <p className="mt-1 flex items-center gap-1.5 text-[18px] font-extrabold text-warn-ink">
              <Home size={18} /> {meta.name}: go indoors
            </p>
          )}
          <p className="mt-1 text-[13px] text-ink-2">{focus.explanation}</p>
          {focus.indoor_suggestion && <p className="mt-1 text-[13px] font-semibold text-navy">{focus.indoor_suggestion}</p>}
          {focus.outside_preferred && (
            <p className="mt-1 text-[12px] text-warn-ink">No good slot in your preferred times — this is the best alternative.</p>
          )}
        </div>
        <ParkScene className="hidden w-28 shrink-0 min-[380px]:block" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {focus.window && (
          <button
            onClick={() => added ? removeFromItinerary(itemId) : addToItinerary({
              id: itemId, title: `${meta.name} · ${location.name}`, detail: focus.explanation,
              time_label: focus.window!.label, city: location.name, kind: "activity",
            })}
            className={cx("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold",
              added ? "bg-good text-white" : "bg-white text-good-ink ring-1 ring-[#cdebd6] hover:bg-good-soft")}>
            {added ? <Check size={14} /> : <Plus size={14} />} {added ? "In itinerary" : "Add to itinerary"}
          </button>
        )}
        <button onClick={() => setWhy((w) => !w)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-2 hover:text-navy">
          Why this? <ChevronDown size={14} className={cx("transition", why && "rotate-180")} />
        </button>
      </div>

      {why && (
        <div className="mt-3 rounded-xl bg-white/80 p-3 text-[12px] text-ink-2">
          <div className="flex flex-wrap gap-1.5">
            {focus.facts.map((f) => (
              <span key={f} className="rounded-md bg-page px-2 py-0.5 font-semibold text-navy-2">{f}</span>
            ))}
          </div>
          <p className="mt-2">
            Each hour of the forecast is scored 0–100 for {meta.name.toLowerCase()} using fixed rules (temperature,
            rain chance, wind, humidity, UV and visibility). Windows need a score of 65+ and are searched in your
            preferred times first. This is a recommendation, not an official forecast.
          </p>
        </div>
      )}
    </section>
  );
}

export function AIRecommendationSkeleton() {
  return <Skeleton className="h-[188px] rounded-2xl" />;
}

import { Check, Eye, Landmark as LandmarkIcon, MapPin, Plus, Umbrella, Wind } from "lucide-react";
import type { AccessibilityInsight, IndoorItem, Location, PlannerCard, RouteInsight, SlotBrief } from "../../api/types";
import { cx } from "../../lib/format";
import { useApp } from "../../state/AppState";
import { Sheet, StatusPill } from "../common/ui";
import { ScoreTimeline } from "../recommendations/ActivitySuitability";
import { WeatherGlyph } from "../weather/WeatherGlyph";
import { TimeChips } from "./PlannerCards";

function AddButton({ id, item }: { id: string; item: Parameters<ReturnType<typeof useApp>["addToItinerary"]>[0] }) {
  const { inItinerary, addToItinerary, removeFromItinerary } = useApp();
  const added = inItinerary(id);
  return (
    <button onClick={() => (added ? removeFromItinerary(id) : addToItinerary(item))}
      className={cx("inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold",
        added ? "bg-good text-white" : "bg-sky-soft text-navy-2 hover:bg-[#dbe9fc]")}
      aria-label={added ? `Remove ${item.title} from itinerary` : `Add ${item.title} to itinerary`}>
      {added ? <Check size={14} /> : <Plus size={14} />} {added ? "Added" : "Add"}
    </button>
  );
}

export function IndoorSheet({ open, onClose, items, recommended, location }: {
  open: boolean; onClose: () => void; items: IndoorItem[]; recommended: boolean; location: Location;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={`Indoor alternatives in ${location.name}`}
      subtitle={recommended ? "Outdoor conditions look poor — these are covered options." : "Covered options if the weather turns."}>
      <ul className="space-y-2 pb-2">
        {items.map((i) => (
          <li key={i.name} className="flex items-center gap-3 rounded-2xl border border-line p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f2edfc] text-[#7b5bd6]"><LandmarkIcon size={20} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-bold leading-snug">{i.name}</p>
              <p className="text-[12px] text-ink-2">{i.kind} · {i.note}</p>
            </div>
            <AddButton id={`indoor:${location.name}:${i.name}`}
              item={{ id: `indoor:${location.name}:${i.name}`, title: i.name, detail: `${i.kind} · indoor`, time_label: "Any time", city: location.name, kind: "indoor" }} />
          </li>
        ))}
      </ul>
      <p className="pb-2 text-[11px] text-ink-3">Check opening days and timings before visiting.</p>
    </Sheet>
  );
}

export function CardDetailSheet({ card, onClose, location, showSites }: {
  card: PlannerCard | null; onClose: () => void; location: Location; showSites?: boolean;
}) {
  if (!card) return null;
  return (
    <Sheet open onClose={onClose} wide title={showSites ? `Alternative ${card.title.toLowerCase()}` : card.title}
      subtitle={<span className="flex items-center gap-2"><StatusPill status={card.status} /> {card.summary}</span>}>
      {!showSites && (
        <>
          {card.best_times.length > 0 && (<><h3 className="mb-1.5 text-[13px] font-bold">Recommended visiting times</h3><TimeChips items={card.best_times} /></>)}
          {card.avoid && <p className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn-ink"><b>Avoid {card.avoid.label}.</b> {card.avoid.reasons}</p>}
          <h3 className="mb-1 mt-4 text-[13px] font-bold">Daylight suitability (next 24 hours)</h3>
          {card.hourly.length ? <ScoreTimeline points={card.hourly} /> : <p className="text-[13px] text-ink-2">No daylight hours in the forecast window.</p>}
        </>
      )}
      <h3 className="mb-1.5 mt-4 text-[13px] font-bold">{card.sites.length ? "Places" : "Places to consider"}</h3>
      {card.sites.length ? (
        <ul className="space-y-2 pb-2">
          {card.sites.map((s) => (
            <li key={s.name} className="flex items-center gap-3 rounded-2xl border border-line p-3">
              <MapPin size={18} className="shrink-0 text-brand" />
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-snug">{s.name}</p>
                <p className="text-[12px] text-ink-2">{s.note}</p>
              </div>
              <AddButton id={`site:${location.name}:${s.name}`}
                item={{ id: `site:${location.name}:${s.name}`, title: s.name, detail: s.note, time_label: card.best_times[0] ?? null,
                  city: location.name, kind: card.id === "heritage" ? "sightseeing" : "viewpoint" }} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="pb-2 text-[13px] text-ink-2">
          {location.name} isn't in the curated catalog yet, so specific places aren't listed — the timing advice above still applies to any open-air spot.
        </p>
      )}
    </Sheet>
  );
}

function SlotStrip({ slots }: { slots: SlotBrief[] }) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {slots.map((s) => (
        <div key={s.dt} className="flex w-[62px] shrink-0 flex-col items-center gap-0.5 rounded-xl bg-page py-2 text-[11px]">
          <span className="text-ink-2">{s.label}</span>
          <WeatherGlyph condition={s.condition} isDay={!s.condition.icon.endsWith("n")} size={24} />
          <span className="font-bold">{Math.round(s.temp)}°</span>
          <span className={cx((s.pop ?? 0) >= 0.3 ? "font-semibold text-brand" : "text-ink-3")}>{Math.round((s.pop ?? 0) * 100)}%</span>
          <span className={cx(s.visibility_km != null && s.visibility_km < 2 ? "font-semibold text-warn-ink" : "text-ink-3")}>
            {s.visibility_km != null ? `${s.visibility_km}km` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RouteSheet({ route, open, onClose }: { route: RouteInsight | null; open: boolean; onClose: () => void }) {
  if (!route) return null;
  return (
    <Sheet open={open} onClose={onClose} wide title={route.name} subtitle={`Next 12 hours along the route${route.label ? ` ${route.label}` : ""}`}>
      <div className="flex items-start gap-2 rounded-2xl bg-page p-3 text-[13px]">
        <StatusPill status={route.risk} />
        <p>{route.summary} {route.advice}</p>
      </div>
      <ol className="mt-3 space-y-3 pb-2">
        {route.segments.map((s, i) => (
          <li key={s.name} className="rounded-2xl border border-line p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold"><span className="mr-1.5 text-ink-3">{i + 1}.</span>{s.name} <span className="text-[12px] font-normal text-ink-3">· {s.note}</span></p>
              {s.risk && <StatusPill status={s.risk} />}
            </div>
            {s.error ? <p className="mt-1 text-[13px] text-bad-ink">{s.error}</p> : (
              <>
                <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-ink-2">
                  <span className="flex items-center gap-1"><Eye size={14} /> Min visibility {s.min_visibility_km ?? "—"} km</span>
                  <span className="flex items-center gap-1"><Umbrella size={14} /> Rain up to {Math.round((s.max_pop ?? 0) * 100)}%</span>
                  <span className="flex items-center gap-1"><Wind size={14} /> Wind up to {Math.round(s.max_wind_kmh ?? 0)} km/h</span>
                </div>
                {(s.fog_window || s.rain_window) && (
                  <p className="mt-1 text-[12px] font-semibold text-warn-ink">
                    {s.fog_window && `Low visibility ${s.fog_window}. `}{s.rain_window && `Rain possible ${s.rain_window}.`}
                  </p>
                )}
                <div className="mt-2"><SlotStrip slots={s.hourly ?? []} /></div>
              </>
            )}
          </li>
        ))}
      </ol>
      <p className="pb-2 text-[11px] text-ink-3">Risk levels are Mausam AI estimates from forecast visibility, rain and wind at points along the route — not traffic or official road advisories.</p>
    </Sheet>
  );
}

export function AttractionSheet({ access, open, onClose }: { access: AccessibilityInsight | null; open: boolean; onClose: () => void }) {
  if (!access) return null;
  return (
    <Sheet open={open} onClose={onClose} wide title={access.site} subtitle={access.note}>
      <div className="flex items-start gap-2 rounded-2xl bg-page p-3 text-[13px]">
        <StatusPill status={access.status} />
        <div>
          <p className="font-semibold">{access.conditions}</p>
          <p className="text-ink-2">{access.advice}</p>
        </div>
      </div>
      <h3 className="mb-1.5 mt-4 text-[13px] font-bold">Visiting hours forecast</h3>
      <SlotStrip slots={access.hourly} />
      <p className="mt-3 pb-2 text-[11px] text-ink-3">{access.disclaimer}</p>
    </Sheet>
  );
}

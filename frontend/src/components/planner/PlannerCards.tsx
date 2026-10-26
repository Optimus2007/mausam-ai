import { ArrowRight, Check, Clock, Plus, Search } from "lucide-react";
import type { AccessibilityInsight, Location, PlannerCard as Card, RouteInsight } from "../../api/types";
import { cx } from "../../lib/format";
import { useApp } from "../../state/AppState";
import { CarRainIllustration, FortIllustration, MinarIllustration, MountainIllustration } from "../illustrations/Illustrations";
import { StatusPill } from "../common/ui";

export function PlannerCard({ card, location, onSecondary, onDetails }: {
  card: Card;
  location: Location;
  onSecondary: () => void;
  onDetails: () => void;
}) {
  const { addToItinerary, inItinerary, removeFromItinerary } = useApp();
  const Illu = card.illustration === "fort" ? FortIllustration : MountainIllustration;
  const itemId = `plan:${location.name}:${card.id}:${card.suggestion?.title ?? card.title}`;
  const added = inItinerary(itemId);
  const isHeritage = card.id === "heritage";

  const toggle = () =>
    added
      ? removeFromItinerary(itemId)
      : addToItinerary({
          id: itemId,
          title: card.suggestion?.title ?? card.title,
          detail: `${card.title} · ${card.status.label.toLowerCase()}`,
          time_label: card.best_times[0] ?? null,
          city: location.name,
          kind: isHeritage ? "sightseeing" : "viewpoint",
        });

  return (
    <article className="flex flex-col rounded-2xl border border-line bg-white p-2.5 text-center sm:p-3" aria-label={card.title}>
      <button onClick={onDetails} className="flex flex-1 flex-col items-center rounded-xl" aria-label={`View details for ${card.title}`}>
        <h3 className="text-[13px] font-extrabold uppercase leading-tight tracking-wide sm:text-[14px]">{card.title}</h3>
        <p className="mt-0.5 text-[11px] text-ink-2 sm:text-[12px]">({card.subtitle})</p>
        <Illu className="my-2 h-[78px] w-full max-w-[170px]" />
        <StatusPill status={card.status} />
        <div className="mt-2 space-y-1 text-[12px] leading-snug sm:text-[13px]">
          {card.avoid ? (
            <>
              <p className="font-bold">Avoid {card.avoid.label}.</p>
              <p className="text-ink-2">{isHeritage ? card.avoid.reasons : card.summary}</p>
            </>
          ) : (
            <p className="text-ink-2">{card.summary}</p>
          )}
          <p className="font-bold">
            {card.best_times.length
              ? <>Best {isHeritage ? "time" : "view time"}: {card.best_times.join(" or ")}</>
              : "No comfortable window in daylight hours"}
          </p>
          {card.best_note && <p className="text-ink-2">({card.best_note})</p>}
        </div>
      </button>
      <div className="mt-3 space-y-2">
        <button className={cx("btn-primary gap-1 px-2 text-[12px] sm:text-[13px]", added && "bg-good hover:bg-good-ink")} onClick={toggle} disabled={!card.best_times.length && !added}>
          {added ? <>Added <Check size={16} /></> : <><span className="whitespace-nowrap">Add to itinerary</span> <Plus size={15} className="shrink-0" /></>}
        </button>
        <button className="btn-soft gap-1 px-2 text-[12px] leading-tight sm:text-[13px]" onClick={onSecondary}>
          {isHeritage ? <>Find indoor alternatives <Search size={14} className="shrink-0" /></> : <>View alternative spots <ArrowRight size={14} className="shrink-0" /></>}
        </button>
      </div>
    </article>
  );
}

export function RouteCard({ route, onOpen }: { route: RouteInsight | null; onOpen: () => void }) {
  return (
    <article className="flex flex-col rounded-2xl border border-line bg-white p-2.5 text-center sm:p-3">
      <h3 className="text-[13px] font-extrabold uppercase tracking-wide sm:text-[14px]">Driving Route Weather</h3>
      <p className="text-[11px] text-ink-2 sm:text-[12px]">{route ? `(${route.name}${route.label ? `, ${route.label}` : ""})` : "(No curated route)"}</p>
      <CarRainIllustration className="my-2 h-[78px] w-full" />
      {route ? (
        <>
          <StatusPill status={route.risk} className="self-center" />
          <p className="mt-2 flex-1 text-[12px] leading-snug sm:text-[13px]">
            {route.summary} {route.advice && <span className="text-ink-2">{route.advice}</span>}
          </p>
          <button className="btn-soft mt-3 gap-1 px-2 text-[12px] leading-tight sm:text-[13px]" onClick={onOpen}>View full route weather <ArrowRight size={15} /></button>
        </>
      ) : (
        <p className="flex-1 text-[12px] text-ink-2">Route weather is available for curated destinations such as New Delhi, Chandigarh, Jaipur, Mumbai and Agra.</p>
      )}
    </article>
  );
}

export function AccessibilityCard({ access, onOpen }: { access: AccessibilityInsight | null; onOpen: () => void }) {
  return (
    <article className="flex flex-col rounded-2xl border border-line bg-white p-2.5 text-center sm:p-3">
      <h3 className="text-[13px] font-extrabold uppercase tracking-wide sm:text-[14px]">Attraction Accessibility Predictions</h3>
      <p className="text-[11px] text-ink-2 sm:text-[12px]">{access ? `(${access.site})` : ""}</p>
      <MinarIllustration className="my-2 h-[78px] w-full" />
      {access ? (
        <>
          <p className="text-[12px] text-ink-2 sm:text-[13px]">{access.conditions}</p>
          <StatusPill status={access.status} className="mt-1.5 self-center" />
          <p className="mt-2 flex-1 text-[12px] leading-snug sm:text-[13px]">{access.advice}</p>
          <button className="btn-soft mt-3 gap-1 px-2 text-[12px] leading-tight sm:text-[13px]" onClick={onOpen}>View attraction details <ArrowRight size={15} /></button>
        </>
      ) : (
        <p className="flex-1 text-[12px] text-ink-2">No accessibility prediction available.</p>
      )}
    </article>
  );
}

export function TimeChips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-good-soft px-2.5 py-1 text-[12px] font-semibold text-good-ink">
          <Clock size={12} /> {t}
        </span>
      ))}
    </div>
  );
}

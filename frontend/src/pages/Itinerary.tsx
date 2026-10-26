import { useState } from "react";
import { Binoculars, Clock, Dumbbell, Landmark, ListChecks, MapPinned, Mountain, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { ItineraryItem } from "../api/types";
import { cx } from "../lib/format";
import { useApp } from "../state/AppState";
import { Header } from "../components/layout/Header";
import { EmptyState } from "../components/common/ui";

const KIND = {
  activity: { icon: Dumbbell, label: "Activity", cls: "bg-[#ecf8f0] text-[#23864a]" },
  sightseeing: { icon: Landmark, label: "Sightseeing", cls: "bg-[#fff3e6] text-[#c96a12]" },
  viewpoint: { icon: Mountain, label: "Viewpoint", cls: "bg-[#eaf2fe] text-[#1f5fc4]" },
  indoor: { icon: Binoculars, label: "Indoor", cls: "bg-[#f2edfc] text-[#6544c4]" },
} as const;

export default function Itinerary() {
  const { itinerary, removeFromItinerary, clearItinerary, toast } = useApp();
  const [confirm, setConfirm] = useState(false);
  const byCity = itinerary.reduce<Record<string, ItineraryItem[]>>((acc, i) => {
    (acc[i.city] ??= []).push(i);
    return acc;
  }, {});

  return (
    <>
      <Header back subtitle={false} />
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-1 lg:pb-12">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[20px] font-extrabold">My itinerary</h1>
            <p className="text-[13px] text-ink-2">{itinerary.length} saved {itinerary.length === 1 ? "plan" : "plans"} · stored on this device</p>
          </div>
          {itinerary.length > 0 && (confirm ? (
            <div className="flex gap-2">
              <button className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-ink-2" onClick={() => setConfirm(false)}>Cancel</button>
              <button className="rounded-full bg-bad-ink px-3 py-1.5 text-[12px] font-semibold text-white"
                onClick={() => { clearItinerary(); setConfirm(false); toast("Itinerary cleared"); }}>Clear all</button>
            </div>
          ) : (
            <button className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-bad-ink hover:bg-bad-soft" onClick={() => setConfirm(true)}>Clear all</button>
          ))}
        </div>

        {itinerary.length === 0 ? (
          <div className="mt-6">
            <EmptyState icon={<ListChecks size={24} />} title="Your itinerary is empty"
              text="Add recommended outdoor windows, monuments, viewpoints or indoor alternatives and they'll appear here."
              action={<Link to="/planner" className="btn-primary w-auto px-5"><MapPinned size={16} /> Open destination planner</Link>} />
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {Object.entries(byCity).map(([city, items]) => (
              <section key={city}>
                <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-2">{city}</h2>
                <ul className="space-y-2">
                  {items.map((i) => {
                    const k = KIND[i.kind] ?? KIND.activity;
                    return (
                      <li key={i.id} className="card flex items-center gap-3 p-3">
                        <span className={cx("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", k.cls)}><k.icon size={20} /></span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold leading-snug">{i.title}</p>
                          <p className="truncate text-[12px] text-ink-2">{k.label} · {i.detail}</p>
                          {i.time_label && (
                            <p className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold text-good-ink"><Clock size={12} /> {i.time_label}</p>
                          )}
                        </div>
                        <button className="icon-btn h-9 w-9 shrink-0 text-ink-3 hover:text-bad-ink" onClick={() => removeFromItinerary(i.id)}
                          aria-label={`Remove ${i.title}`}>
                          <Trash2 size={17} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            <p className="text-center text-[11px] text-ink-3">Times reflect the forecast when each item was added — re-check before you go.</p>
          </div>
        )}
      </main>
    </>
  );
}

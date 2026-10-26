import { CalendarDays, CloudSun, Info, ListChecks, MapPinned, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../state/AppState";
import { Sheet } from "../common/ui";

export function MenuSheet() {
  const { sheet, openSheet, health, healthError, itinerary } = useApp();
  const navigate = useNavigate();
  const go = (to: string) => {
    openSheet(null);
    navigate(to);
  };
  const items = [
    { icon: CloudSun, label: "Weather dashboard", to: "/" },
    { icon: MapPinned, label: "Destination planner", to: "/planner" },
    { icon: CalendarDays, label: "Detailed forecast", to: "/forecast" },
    { icon: ListChecks, label: `Itinerary${itinerary.length ? ` (${itinerary.length})` : ""}`, to: "/itinerary" },
  ];
  return (
    <Sheet open={sheet?.kind === "menu"} onClose={() => openSheet(null)} title="Mausam AI">
      <ul className="-mx-2">
        {items.map((i) => (
          <li key={i.to}>
            <button onClick={() => go(i.to)} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left font-semibold hover:bg-sky-soft">
              <i.icon size={20} className="text-brand" /> {i.label}
            </button>
          </li>
        ))}
        <li>
          <button onClick={() => openSheet({ kind: "prefs" })} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left font-semibold hover:bg-sky-soft">
            <SlidersHorizontal size={20} className="text-brand" /> Activity preferences
          </button>
        </li>
      </ul>
      <div className="mt-3 rounded-2xl bg-page p-4 text-[12px] text-ink-2">
        <p className="flex items-center gap-1.5 font-bold text-navy"><Info size={14} /> About the data</p>
        <p className="mt-1">
          {healthError ? "Server status unavailable." : health ? health.message : "Checking server…"}
        </p>
        <p className="mt-2">
          Forecasts come from the weather provider. Activity windows, suitability scores and alerts are
          Mausam AI recommendations computed from transparent rules
          {health ? ` (v${health.rules_version})` : ""} — not official warnings.
        </p>
      </div>
    </Sheet>
  );
}

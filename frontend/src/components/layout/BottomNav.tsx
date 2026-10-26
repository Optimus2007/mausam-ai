import { CloudSun, ListChecks, MapPinned, SlidersHorizontal } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cx } from "../../lib/format";
import { useApp } from "../../state/AppState";

export function BottomNav() {
  const { itinerary, openSheet } = useApp();
  const item = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold";
  const link = ({ isActive }: { isActive: boolean }) => cx(item, isActive ? "text-brand" : "text-ink-3");
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Main">
      <div className="mx-auto flex max-w-md">
        <NavLink to="/" end className={link}>
          <CloudSun size={22} /> Weather
        </NavLink>
        <NavLink to="/planner" className={link}>
          <MapPinned size={22} /> Planner
        </NavLink>
        <NavLink to="/itinerary" className={link}>
          <span className="relative">
            <ListChecks size={22} />
            {itinerary.length > 0 && (
              <span className="absolute -right-2.5 -top-1 rounded-full bg-brand px-1 text-[10px] leading-4 text-white">{itinerary.length}</span>
            )}
          </span>
          Itinerary
        </NavLink>
        <button className={cx(item, "text-ink-3")} onClick={() => openSheet({ kind: "prefs" })}>
          <SlidersHorizontal size={22} /> Preferences
        </button>
      </div>
    </nav>
  );
}

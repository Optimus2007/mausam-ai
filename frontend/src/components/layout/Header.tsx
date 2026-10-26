import { Bell, ChevronLeft, Menu } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { cx } from "../../lib/format";
import { useApp } from "../../state/AppState";

export function Logo({ subtitle }: { subtitle?: boolean }) {
  return (
    <div className="flex flex-col items-center leading-none">
      <span className="text-[24px] font-extrabold tracking-tight text-navy">
        Mausam <span className="text-brand-2">AI</span>
      </span>
      {subtitle && <span className="mt-1 whitespace-nowrap text-[11px] font-medium text-ink-2">Personalized Weather Intelligence</span>}
    </div>
  );
}

const NAV = [
  { to: "/", label: "Weather" },
  { to: "/planner", label: "Destination Planner" },
  { to: "/forecast", label: "Forecast" },
  { to: "/itinerary", label: "Itinerary" },
];

export function Header({ back, badge = 0, onBell, subtitle = true }: {
  back?: boolean;
  badge?: number;
  onBell?: () => void;
  subtitle?: boolean;
}) {
  const { openSheet, itinerary } = useApp();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 border-b border-transparent bg-page/90 backdrop-blur supports-[backdrop-filter]:bg-page/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
        <div className="flex w-12 items-center lg:w-auto">
          {back ? (
            <button className="icon-btn -ml-2 lg:hidden" onClick={() => (history.length > 1 ? navigate(-1) : navigate("/"))} aria-label="Back">
              <ChevronLeft size={26} />
            </button>
          ) : (
            <button className="icon-btn -ml-2 lg:hidden" onClick={() => openSheet({ kind: "menu" })} aria-label="Open menu">
              <Menu size={24} />
            </button>
          )}
          <div className="hidden lg:block">
            <Logo />
          </div>
        </div>

        <div className="lg:hidden">
          <Logo subtitle={subtitle} />
        </div>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end
              className={({ isActive }) => cx("rounded-full px-4 py-2 text-[14px] font-semibold transition",
                isActive ? "bg-navy-2 text-white" : "text-ink-2 hover:bg-sky-soft hover:text-navy")}>
              {n.label}
              {n.to === "/itinerary" && itinerary.length > 0 && (
                <span className="ml-1.5 rounded-full bg-brand-2 px-1.5 text-[11px] text-white">{itinerary.length}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex w-12 items-center justify-end gap-1 lg:w-auto">
          <button className="hidden rounded-full px-3 py-2 text-[13px] font-semibold text-ink-2 hover:bg-sky-soft lg:block"
            onClick={() => openSheet({ kind: "prefs" })}>
            Preferences
          </button>
          <button className="icon-btn -mr-2" onClick={onBell} aria-label={`Notifications${badge ? ` (${badge})` : ""}`} disabled={!onBell}>
            <Bell size={22} />
            {badge > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold text-white ring-2 ring-page">
                {badge}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

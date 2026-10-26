import { useState } from "react";
import { Home, MapPin, MapPinned, RefreshCw, Search, Sun } from "lucide-react";
import { api } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { countryName, cx } from "../lib/format";
import { useApp } from "../state/AppState";
import { Header } from "../components/layout/Header";
import { DataSourceBanner, ErrorState, Skeleton, SlowNotice } from "../components/common/ui";
import { Landmark } from "../components/illustrations/Illustrations";
import { WeatherGlyph } from "../components/weather/WeatherGlyph";
import { AccessibilityCard, PlannerCard, RouteCard } from "../components/planner/PlannerCards";
import { AttractionSheet, CardDetailSheet, IndoorSheet, RouteSheet } from "../components/planner/PlannerSheets";
import { NotificationsSheet, SmartAlertCard, useVisibleAdvisories } from "../components/recommendations/Alerts";

type Panel = null | "indoor" | "route" | "access" | "alerts" | { card: "heritage" | "nature"; sites?: boolean };

export default function Planner() {
  const { plannerLoc: loc, prefs, openSheet } = useApp();
  const plan = useAsync((signal) => api.planner(loc, prefs, signal), `${loc.lat},${loc.lon},${loc.name}|${prefs.heat_sensitivity}`);
  const [panel, setPanel] = useState<Panel>(null);
  const advisories = useVisibleAdvisories(plan.data?.advisories);
  const badge = advisories.filter((a) => a.severity !== "ok").length;
  const p = plan.data;
  const openCard = typeof panel === "object" && panel ? p?.cards.find((c) => c.id === panel.card) ?? null : null;

  return (
    <>
      <Header back subtitle={false} badge={badge} onBell={() => setPanel("alerts")} />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-1 lg:pb-12">
        <div className="space-y-3">
          <DataSourceBanner />
          <SlowNotice show={plan.slow} />
        </div>

        {/* Destination header */}
        <section className="relative mt-3 flex items-center justify-between gap-3 overflow-hidden">
          <div className="min-w-0">
            <button onClick={() => openSheet({ kind: "location", target: "planner" })}
              className="flex max-w-full items-center gap-1.5 text-left hover:text-brand" aria-label="Change destination">
              <MapPin size={22} className="shrink-0 fill-navy text-page" strokeWidth={2.5} />
              <span className="truncate text-[20px] font-extrabold uppercase tracking-tight">{loc.name}</span>
              {loc.country && <span className="shrink-0 text-[18px] font-semibold">, {countryName(loc.country)}</span>}
            </button>
            <p className="ml-7 text-[14px] text-ink-2">{p?.destination.tagline ?? "Sights & outdoor spots"}</p>
            <div className="ml-7 mt-2 flex flex-wrap items-center gap-2">
              <button onClick={() => openSheet({ kind: "location", target: "planner" })}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[12px] font-semibold text-navy-2 shadow-sm hover:bg-sky-soft">
                <Search size={14} /> Search destination
              </button>
              {p && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold shadow-sm ring-1 ring-line">
                  <WeatherGlyph condition={p.current.condition} isDay={p.current.is_day} size={18} /> {Math.round(p.current.temp)}°C now
                </span>
              )}
              <button onClick={() => plan.reload()} disabled={plan.refreshing} className="icon-btn h-8 w-8 text-brand" aria-label="Refresh plan">
                <RefreshCw size={15} className={cx(plan.refreshing && "animate-spin")} />
              </button>
            </div>
          </div>
          <Landmark kind={p?.destination.landmark ?? "skyline"} className="h-[92px] w-[150px] shrink-0 sm:h-[110px] sm:w-[180px]" />
        </section>

        {plan.error && !p ? (
          <div className="mt-4"><ErrorState error={plan.error} onRetry={() => plan.reload()} /></div>
        ) : !p ? (
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
            <Skeleton className="h-[460px] rounded-3xl" />
            <Skeleton className="h-[420px] rounded-3xl" />
          </div>
        ) : (
          <div className={cx("mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2 lg:items-start", plan.refreshing && "opacity-70")}>
            {/* Daily activity planner */}
            <section className="card bg-white/70 p-2.5 sm:p-4" aria-labelledby="planner-title">
              <div className="mb-3 flex items-center gap-2 px-1">
                <Sun size={22} className="text-[#f5a623]" />
                <div>
                  <h2 id="planner-title" className="text-[15px] font-extrabold uppercase tracking-wide">Daily Activity Planner</h2>
                  <p className="text-[12px] text-ink-2">Smart suggestions for a perfect day!</p>
                </div>
              </div>
              {p.indoor_alternatives.recommended && (
                <button onClick={() => setPanel("indoor")}
                  className="mb-3 flex w-full items-center gap-2 rounded-xl bg-warn-soft px-3 py-2 text-left text-[13px] font-semibold text-warn-ink">
                  <Home size={16} /> Outdoor conditions are poor today — see indoor alternatives
                </button>
              )}
              <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2.5 sm:gap-3">
                {p.cards.map((c) => (
                  <PlannerCard key={c.id} card={c} location={p.location}
                    onDetails={() => setPanel({ card: c.id })}
                    onSecondary={() => (c.id === "heritage" ? setPanel("indoor") : setPanel({ card: c.id, sites: true }))} />
                ))}
              </div>
            </section>

            <div className="space-y-4">
              {/* Location insights */}
              <section className="card bg-white/70 p-2.5 sm:p-4" aria-labelledby="insights-title">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <MapPinned size={20} className="text-navy-2" />
                  <h2 id="insights-title" className="text-[15px] font-extrabold uppercase tracking-wide">Location Insights (Next 24 hrs)</h2>
                </div>
                <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2.5 sm:gap-3">
                  <RouteCard route={p.insights.route} onOpen={() => setPanel("route")} />
                  <AccessibilityCard access={p.insights.accessibility} onOpen={() => setPanel("access")} />
                </div>
              </section>
              <SmartAlertCard advisories={advisories} onOpen={() => setPanel("alerts")} />
              <p className="text-center text-[11px] text-ink-3">{p.disclaimer}</p>
            </div>
          </div>
        )}
      </main>

      {p && (
        <>
          <IndoorSheet open={panel === "indoor"} onClose={() => setPanel(null)} items={p.indoor_alternatives.items}
            recommended={p.indoor_alternatives.recommended} location={p.location} />
          <CardDetailSheet card={openCard} location={p.location} onClose={() => setPanel(null)}
            showSites={typeof panel === "object" && !!panel?.sites} />
          <RouteSheet route={p.insights.route} open={panel === "route"} onClose={() => setPanel(null)} />
          <AttractionSheet access={p.insights.accessibility} open={panel === "access"} onClose={() => setPanel(null)} />
          <NotificationsSheet open={panel === "alerts"} onClose={() => setPanel(null)} advisories={p.advisories} official={[]} />
        </>
      )}
    </>
  );
}

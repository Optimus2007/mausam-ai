import { useState } from "react";
import { ArrowRight, MapPinned } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { ActivityId } from "../api/types";
import { useAsync } from "../hooks/useAsync";
import { useApp } from "../state/AppState";
import { Header } from "../components/layout/Header";
import { DataSourceBanner, ErrorState, Skeleton, SlowNotice } from "../components/common/ui";
import { CurrentWeatherCard, CurrentWeatherSkeleton, LocationBar } from "../components/weather/CurrentWeatherCard";
import { HourlyForecast } from "../components/weather/HourlyForecast";
import { AIRecommendationCard, AIRecommendationSkeleton } from "../components/recommendations/AIRecommendationCard";
import { ActivityDetailSheet, ActivitySkeleton, ActivitySuitabilityGrid } from "../components/recommendations/ActivitySuitability";
import { NotificationsSheet, OfficialAlertBanner, SmartAlertCard, useVisibleAdvisories } from "../components/recommendations/Alerts";

export default function Dashboard() {
  const { dashboardLoc: loc, prefs, openSheet, toast } = useApp();
  const locKey = `${loc.lat},${loc.lon},${loc.name}`;
  const weather = useAsync((signal, force) => api.weather(loc, force, signal), locKey);
  const recs = useAsync((signal) => api.recommendations(loc, prefs, signal), `${locKey}|${JSON.stringify(prefs)}`);
  const [detail, setDetail] = useState<ActivityId | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const advisories = useVisibleAdvisories(recs.data?.advisories);
  const badge = advisories.filter((a) => a.severity !== "ok").length + (recs.data?.official_alerts.length ?? 0);

  const refresh = async () => {
    const w = await weather.reload({ force: true });
    const r = await recs.reload();
    if (w && r) toast("Weather refreshed", "good");
  };

  const refreshing = weather.refreshing || recs.refreshing;

  return (
    <>
      <Header badge={badge} onBell={() => setAlertsOpen(true)} />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-1 lg:pb-12">
        <div className="space-y-4">
          <DataSourceBanner />
          <LocationBar location={loc} sub="Use current location" refreshing={refreshing}
            onPick={() => openSheet({ kind: "location", target: "dashboard" })} onRefresh={refresh} />
          <SlowNotice show={weather.slow || recs.slow} />
        </div>

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
          <div className="space-y-4">
            {weather.error && !weather.data ? (
              <ErrorState error={weather.error} onRetry={() => weather.reload()} />
            ) : weather.data ? (
              <CurrentWeatherCard weather={weather.data} />
            ) : (
              <CurrentWeatherSkeleton />
            )}

            {recs.data && <OfficialAlertBanner alerts={recs.data.official_alerts} />}

            {recs.error && !recs.data ? (
              <ErrorState compact error={recs.error} onRetry={() => recs.reload()} />
            ) : recs.data ? (
              <AIRecommendationCard focus={recs.data.focus} location={loc} refreshing={recs.refreshing} />
            ) : (
              <AIRecommendationSkeleton />
            )}
          </div>

          <div className="space-y-5">
            {weather.data ? <HourlyForecast weather={weather.data} /> : !weather.error && <Skeleton className="h-[200px]" />}

            {recs.data ? (
              <ActivitySuitabilityGrid activities={recs.data.activities} onDetails={setDetail} />
            ) : !recs.error && <ActivitySkeleton />}

            {recs.data && <SmartAlertCard advisories={advisories} onOpen={() => setAlertsOpen(true)} />}

            <Link to="/planner" className="card flex items-center gap-3 p-3 transition hover:-translate-y-0.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f2edfc] text-[#7b5bd6]"><MapPinned size={22} /></span>
              <span className="flex-1">
                <span className="block text-[14px] font-bold">Plan a destination day</span>
                <span className="block text-[12px] text-ink-2">Best times for monuments, viewpoints and routes</span>
              </span>
              <ArrowRight size={18} className="text-brand" />
            </Link>
          </div>
        </div>

        {recs.data && <p className="mt-6 text-center text-[11px] text-ink-3">{recs.data.disclaimer}</p>}
      </main>

      <ActivityDetailSheet activity={recs.data?.activities.find((a) => a.id === detail) ?? null} onClose={() => setDetail(null)} />
      <NotificationsSheet open={alertsOpen} onClose={() => setAlertsOpen(false)}
        advisories={recs.data?.advisories ?? []} official={recs.data?.official_alerts ?? []} />
    </>
  );
}

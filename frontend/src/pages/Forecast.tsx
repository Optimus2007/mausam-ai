import { Droplets, Eye, Sun, Umbrella, Wind } from "lucide-react";
import { api } from "../api/client";
import { useAsync } from "../hooks/useAsync";
import { cx, dayLabel, hourLabel, placeLabel } from "../lib/format";
import { useApp } from "../state/AppState";
import { Header } from "../components/layout/Header";
import { DataSourceBanner, ErrorState, Skeleton, SlowNotice } from "../components/common/ui";
import { HourlyForecast } from "../components/weather/HourlyForecast";
import { WeatherGlyph } from "../components/weather/WeatherGlyph";

export default function Forecast() {
  const { dashboardLoc: loc, openSheet } = useApp();
  const weather = useAsync((signal) => api.weather(loc, false, signal), `${loc.lat},${loc.lon},${loc.name}`);
  const w = weather.data;
  const tz = w?.meta.tz_offset ?? 0;
  const lo = w ? Math.min(...w.daily.map((d) => d.temp_min)) : 0;
  const hi = w ? Math.max(...w.daily.map((d) => d.temp_max)) : 1;

  return (
    <>
      <Header back subtitle={false} />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-1 lg:pb-12">
        <div className="space-y-3">
          <DataSourceBanner />
          <div className="flex items-end justify-between gap-2">
            <div>
              <h1 className="text-[20px] font-extrabold">Detailed forecast</h1>
              <button className="text-[13px] font-semibold text-brand" onClick={() => openSheet({ kind: "location", target: "dashboard" })}>
                {placeLabel(loc)} · change
              </button>
            </div>
          </div>
          <SlowNotice show={weather.slow} />
        </div>

        {weather.error && !w ? (
          <div className="mt-4"><ErrorState error={weather.error} onRetry={() => weather.reload()} /></div>
        ) : !w ? (
          <div className="mt-4 space-y-4"><Skeleton className="h-[200px]" /><Skeleton className="h-[320px]" /></div>
        ) : (
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
            <div className="space-y-5">
              <HourlyForecast weather={w} limit={w.hourly.length} />
              <section className="card overflow-hidden" aria-label="Hour by hour table">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-[13px]">
                    <thead className="bg-page text-[11px] uppercase tracking-wide text-ink-3">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Time</th>
                        <th className="px-2 py-2 font-semibold">Conditions</th>
                        <th className="px-2 py-2 font-semibold">Temp</th>
                        <th className="px-2 py-2 font-semibold"><Umbrella size={13} className="inline" /> Rain</th>
                        <th className="px-2 py-2 font-semibold"><Droplets size={13} className="inline" /> Hum.</th>
                        <th className="px-2 py-2 font-semibold"><Wind size={13} className="inline" /> Wind</th>
                        <th className="px-2 py-2 font-semibold"><Eye size={13} className="inline" /> Vis.</th>
                        <th className="px-2 py-2 font-semibold"><Sun size={13} className="inline" /> UV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {w.hourly.map((s) => (
                        <tr key={s.dt} className="border-t border-line">
                          <td className="whitespace-nowrap px-3 py-2 font-semibold">
                            {s.is_now ? "Now" : hourLabel(s.dt, tz)}
                            <span className="block text-[11px] font-normal text-ink-3">{dayLabel(s.dt, tz)}</span>
                          </td>
                          <td className="px-2 py-2">
                            <span className="flex items-center gap-1.5 capitalize">
                              <WeatherGlyph condition={s.condition} isDay={s.is_day} size={22} /> {s.condition.description}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2"><b>{Math.round(s.temp)}°</b> <span className="text-ink-3">/ {Math.round(s.feels_like)}°</span></td>
                          <td className={cx("px-2 py-2", (s.pop ?? 0) >= 0.5 && "font-semibold text-brand")}>{s.pop != null ? `${Math.round(s.pop * 100)}%` : "—"}</td>
                          <td className="px-2 py-2">{s.humidity}%</td>
                          <td className="whitespace-nowrap px-2 py-2">{Math.round(s.wind_kmh)} km/h</td>
                          <td className={cx("px-2 py-2", s.visibility_km != null && s.visibility_km < 2 && "font-semibold text-warn-ink")}>
                            {s.visibility_km != null ? `${s.visibility_km} km` : "—"}
                          </td>
                          <td className="px-2 py-2">{s.uvi != null ? Math.round(s.uvi) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <div className="space-y-4">
              <section className="card p-4" aria-label="Daily forecast">
                <h2 className="section-title mb-2">{w.daily.length}-day outlook</h2>
                <ul className="divide-y divide-line">
                  {w.daily.map((d) => {
                    const left = ((d.temp_min - lo) / (hi - lo || 1)) * 100;
                    const right = ((d.temp_max - lo) / (hi - lo || 1)) * 100;
                    return (
                      <li key={d.dt} className="flex items-center gap-3 py-2.5 text-[13px]">
                        <span className="w-[86px] shrink-0 font-semibold">{d.date_label}</span>
                        <WeatherGlyph condition={d.condition} isDay size={28} />
                        <span className={cx("w-9 shrink-0 text-[12px]", (d.pop ?? 0) >= 0.3 ? "font-semibold text-brand" : "text-ink-3")}>
                          {d.pop != null ? `${Math.round(d.pop * 100)}%` : ""}
                        </span>
                        <span className="w-8 text-right text-ink-2">{Math.round(d.temp_min)}°</span>
                        <span className="relative h-1.5 flex-1 rounded-full bg-page">
                          <span className="absolute h-full rounded-full bg-gradient-to-r from-[#5aaaf6] to-[#f5a623]" style={{ left: `${left}%`, right: `${100 - right}%` }} />
                        </span>
                        <span className="w-8 font-bold">{Math.round(d.temp_max)}°</span>
                      </li>
                    );
                  })}
                </ul>
                {w.daily.some((d) => d.derived) && <p className="mt-2 text-[11px] text-ink-3">Daily values are aggregated from 3-hour forecast data.</p>}
              </section>
              <section className="card p-4 text-[12px] text-ink-2" aria-label="Data source">
                <h2 className="section-title mb-1">Data source</h2>
                <p><b className="text-navy">{w.meta.provider}</b> · {w.meta.plan}</p>
                <ul className="mt-1 list-inside list-disc">
                  {w.meta.notes.map((n) => <li key={n}>{n}</li>)}
                </ul>
              </section>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

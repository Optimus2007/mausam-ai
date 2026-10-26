import { ChevronDown, Crosshair, Droplets, Eye, MapPin, RefreshCw, Sun, Wind } from "lucide-react";
import type { Location, WeatherBundle } from "../../api/types";
import { cx, localTime, placeLabel, uvLabel } from "../../lib/format";
import { Skeleton } from "../common/ui";
import { WeatherGlyph } from "./WeatherGlyph";

export function LocationBar({ location, sub, onPick, onRefresh, refreshing, onLocate }: {
  location: Location;
  sub: string;
  onPick: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  onLocate?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <button onClick={onPick} className="flex max-w-full items-center gap-1.5 rounded-lg text-[17px] font-bold hover:text-brand" aria-label="Change location">
          <MapPin size={18} className="shrink-0 fill-navy text-page" strokeWidth={2.5} />
          <span className="truncate">{placeLabel(location)}</span>
          <ChevronDown size={18} className="shrink-0" />
        </button>
        <button onClick={onLocate ?? onPick} className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-2 hover:text-brand">
          <Crosshair size={13} /> {sub}
        </button>
      </div>
      <button onClick={onRefresh} disabled={refreshing}
        className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[#cfe0f7] bg-white px-3 py-1.5 text-[13px] font-semibold text-brand shadow-sm hover:bg-sky-soft disabled:opacity-70">
        Refresh <RefreshCw size={14} className={cx(refreshing && "animate-spin")} />
      </button>
    </div>
  );
}

export function CurrentWeatherCard({ weather }: { weather: WeatherBundle }) {
  const c = weather.current;
  const uv = c.uvi != null ? uvLabel(c.uvi) : null;
  const uvTone = uv && { good: "text-[#9cf0b8]", ok: "text-[#cfe6ff]", warn: "text-[#ffd06b]", bad: "text-[#ffb4a8]", neutral: "" }[uv.tone];
  const stats = [
    { icon: Droplets, label: "Humidity", value: `${c.humidity}%` },
    { icon: Wind, label: "Wind", value: `${Math.round(c.wind_kmh)} km/h`, sub: c.wind_dir ?? undefined },
    {
      icon: Sun, label: "UV Index",
      value: c.uvi != null ? String(Math.round(c.uvi)) : "—",
      sub: uv ? uv.text : "N/A on plan",
      subClass: uv ? uvTone : "text-white/70",
    },
    { icon: Eye, label: "Visibility", value: c.visibility_km != null ? `${c.visibility_km} km` : "—" },
  ];
  return (
    <section className="relative overflow-hidden rounded-3xl p-5 text-white shadow-[var(--shadow-lift)]"
      style={{ background: "linear-gradient(135deg, #1a63d8 0%, #2f86ee 55%, #6db7fb 100%)" }}
      aria-label="Current weather">
      <div className="pointer-events-none absolute -right-10 -top-12 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="flex items-start text-[72px] font-bold leading-none tracking-tight sm:text-[80px]">
            {Math.round(c.temp)}
            <span className="mt-2 text-[28px] font-semibold">°C</span>
          </p>
          <p className="mt-2 text-[20px] font-semibold capitalize">{c.condition.description}</p>
          <p className="text-[14px] text-white/85">Feels like {Math.round(c.feels_like)}°</p>
        </div>
        <WeatherGlyph condition={c.condition} isDay={c.is_day} size={150} className="-mr-3 -mt-4 drop-shadow-xl" />
      </div>
      <div className="relative mt-4 grid grid-cols-4 gap-1 border-t border-white/25 pt-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-start gap-1.5">
            <s.icon size={18} className="mt-0.5 shrink-0 text-white/90" />
            <div className="min-w-0">
              <p className="text-[11px] text-white/80">{s.label}</p>
              <p className="whitespace-nowrap text-[14px] font-bold leading-tight sm:text-[15px]">{s.value}</p>
              {s.sub && <p className={cx("text-[11px] font-semibold leading-tight", s.subClass ?? "text-white/80")}>{s.sub}</p>}
            </div>
          </div>
        ))}
      </div>
      <p className="relative mt-3 text-[11px] text-white/70">
        {weather.meta.source === "demo" ? "Sample data" : `${weather.meta.provider} · updated ${localTime(weather.meta.fetched_at, weather.meta.tz_offset)} local time`}
      </p>
    </section>
  );
}

export function CurrentWeatherSkeleton() {
  return <Skeleton className="h-[290px] rounded-3xl" />;
}

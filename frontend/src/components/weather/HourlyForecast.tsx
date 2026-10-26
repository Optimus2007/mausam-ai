import { ChevronRight } from "lucide-react";
import { Line, LineChart, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { Link } from "react-router-dom";
import type { HourlySlot, WeatherBundle } from "../../api/types";
import { cx, hourLabel } from "../../lib/format";
import { WeatherGlyph } from "./WeatherGlyph";

const COL = 64; // px per forecast column; the chart shares the same grid so dots sit under each card

function TrendTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as { label: string; temp: number; feels: number; pop: number | null };
  return (
    <div className="rounded-lg bg-navy px-2.5 py-1.5 text-[11px] text-white shadow-lg">
      <p className="font-bold">{p.label} · {p.temp}°C</p>
      <p className="text-white/80">Feels {p.feels}°{p.pop != null ? ` · Rain ${Math.round(p.pop * 100)}%` : ""}</p>
    </div>
  );
}

export function HourlyForecast({ weather, limit = 12 }: { weather: WeatherBundle; limit?: number }) {
  const tz = weather.meta.tz_offset;
  const slots: HourlySlot[] = weather.hourly.slice(0, limit);
  const step = slots[1]?.slot_hours ?? 1;
  const data = slots.map((s) => ({
    label: s.is_now ? "Now" : hourLabel(s.dt, tz),
    temp: Math.round(s.temp),
    feels: Math.round(s.feels_like),
    pop: s.pop,
  }));
  const temps = data.map((d) => d.temp);
  const width = slots.length * COL;

  return (
    <section aria-label="Hourly forecast">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="section-title">Hourly Forecast</h2>
        <Link to="/forecast" className="link-btn">View all <ChevronRight size={16} /></Link>
      </div>
      <div className="card no-scrollbar overflow-x-auto px-1 py-3">
        <div style={{ width }} className="min-w-full">
          <ol className="flex">
            {slots.map((s, i) => (
              <li key={s.dt} style={{ width: COL }} className="shrink-0 px-1">
                <div className={cx("flex flex-col items-center gap-1 rounded-xl border py-2",
                  i === 0 ? "border-[#bcd6f8] bg-sky-soft" : "border-line bg-white")}>
                  <span className={cx("text-[12px]", i === 0 ? "font-bold text-brand" : "text-ink-2")}>{data[i].label}</span>
                  <WeatherGlyph condition={s.condition} isDay={s.is_day} size={30} />
                  <span className="text-[15px] font-bold">{data[i].temp}°</span>
                  <span className={cx("text-[10px] font-semibold", (s.pop ?? 0) >= 0.3 ? "text-brand" : "text-transparent")}>
                    {Math.round((s.pop ?? 0) * 100)}%
                  </span>
                </div>
              </li>
            ))}
          </ol>
          <LineChart width={width} height={72} data={data} margin={{ top: 10, right: 0, bottom: 14, left: 0 }}
            accessibilityLayer aria-label={`Temperature trend from ${Math.min(...temps)}° to ${Math.max(...temps)}°`}>
            <XAxis dataKey="label" hide padding={{ left: COL / 2, right: COL / 2 }} />
            <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
            <Tooltip content={TrendTooltip} cursor={{ stroke: "#b8cdea", strokeDasharray: "3 3" }} />
            <Line type="monotone" dataKey="temp" stroke="#3d7fe0" strokeWidth={2} isAnimationActive={false}
              dot={{ r: 4, fill: "#fff", stroke: "#3d7fe0", strokeWidth: 2 }} activeDot={{ r: 5, fill: "#3d7fe0" }}
              label={{ position: "bottom", offset: 8, fontSize: 10, fill: "#4f5f7a", formatter: (v: unknown) => `${v}°` }} />
          </LineChart>
        </div>
      </div>
      {step === 3 && <p className="mt-1.5 text-[11px] text-ink-3">3-hour steps on the free OpenWeather plan.</p>}
    </section>
  );
}

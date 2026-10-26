import type { Location, Tone } from "../api/types";

const COUNTRY: Record<string, string> = {
  IN: "India", GB: "United Kingdom", US: "United States", AE: "UAE", NP: "Nepal", SG: "Singapore",
  AU: "Australia", CA: "Canada", FR: "France", DE: "Germany", JP: "Japan", LK: "Sri Lanka", BD: "Bangladesh",
};

export function countryName(code?: string | null) {
  if (!code) return "";
  return COUNTRY[code] ?? code;
}

export function placeLabel(loc: Location) {
  const country = countryName(loc.country);
  return country ? `${loc.name}, ${country}` : loc.name;
}

export function placeDetail(loc: Location) {
  return [loc.state, countryName(loc.country)].filter(Boolean).join(", ");
}

/** Local time in the location's timezone, e.g. "9:41 AM". */
export function localTime(ts: number, tzOffset: number) {
  const d = new Date((ts + tzOffset) * 1000);
  const h = d.getUTCHours();
  return `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function hourLabel(ts: number, tzOffset: number) {
  const h = new Date((ts + tzOffset) * 1000).getUTCHours();
  return `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
}

export function dayLabel(ts: number, tzOffset: number) {
  return new Date((ts + tzOffset) * 1000).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
  });
}

export function pct(v: number | null | undefined) {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

export function uvLabel(uv: number) {
  if (uv < 3) return { text: "Low", tone: "good" as Tone };
  if (uv < 6) return { text: "Moderate", tone: "ok" as Tone };
  if (uv < 8) return { text: "High", tone: "warn" as Tone };
  if (uv < 11) return { text: "Very high", tone: "bad" as Tone };
  return { text: "Extreme", tone: "bad" as Tone };
}

export const toneClasses: Record<Tone, string> = {
  good: "bg-good-soft text-good-ink",
  ok: "bg-info-soft text-info-ink",
  warn: "bg-warn-soft text-warn-ink",
  bad: "bg-bad-soft text-bad-ink",
  neutral: "bg-slate-100 text-slate-600",
};

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

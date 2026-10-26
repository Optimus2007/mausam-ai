import { useId } from "react";
import type { Condition } from "../../api/types";

type Kind = "sun" | "moon" | "partly" | "partly-night" | "cloud" | "rain" | "storm" | "snow" | "fog";

export function glyphKind(c: Pick<Condition, "id">, isDay: boolean): Kind {
  const id = c.id;
  if (id >= 200 && id < 300) return "storm";
  if ((id >= 300 && id < 600) || id === 511) return "rain";
  if (id >= 600 && id < 700) return "snow";
  if (id >= 700 && id < 800) return "fog";
  if (id === 800) return isDay ? "sun" : "moon";
  if (id === 801 || id === 802) return isDay ? "partly" : "partly-night";
  return "cloud";
}

/** Multi-colour weather icon drawn in SVG (sun, moon, cloud, rain, storm, snow, fog). */
export function WeatherGlyph({
  condition,
  isDay,
  size = 32,
  className,
  title,
}: {
  condition: Pick<Condition, "id" | "description">;
  isDay: boolean;
  size?: number;
  className?: string;
  title?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const kind = glyphKind(condition, isDay);
  const sun = (cx: number, cy: number, r: number) => (
    <g>
      <circle cx={cx} cy={cy} r={r * 1.55} fill={`url(#glow${uid})`} />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <line key={i} x1={cx + Math.cos(a) * r * 1.25} y1={cy + Math.sin(a) * r * 1.25}
            x2={cx + Math.cos(a) * r * 1.6} y2={cy + Math.sin(a) * r * 1.6}
            stroke="#ffc53d" strokeWidth={r * 0.18} strokeLinecap="round" />
        );
      })}
      <circle cx={cx} cy={cy} r={r} fill={`url(#sun${uid})`} />
    </g>
  );
  const moon = (cx: number, cy: number, r: number) => (
    <path d={`M${cx + r * 0.3} ${cy - r} a${r} ${r} 0 1 0 ${r * 0.7} ${r * 1.55} a${r * 0.8} ${r * 0.8} 0 0 1 -${r * 0.7} -${r * 1.55}z`}
      fill="#ffd66b" stroke="#f5b82e" strokeWidth="0.8" />
  );
  const cloud = (x: number, y: number, s: number, dark = false) => (
    <path transform={`translate(${x} ${y}) scale(${s})`}
      d="M8 30a8 8 0 0 1 .9-15.95A11 11 0 0 1 30 12.5a8.75 8.75 0 0 1 1.5 17.4z"
      fill={dark ? `url(#cloudDark${uid})` : `url(#cloud${uid})`} stroke={dark ? "#9fb0c8" : "#d5e1ef"} strokeWidth={0.6 / s} />
  );
  const drops = (
    <g stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round">
      <line x1="17" y1="43" x2="15" y2="48" />
      <line x1="25" y1="43" x2="23" y2="48" />
      <line x1="33" y1="43" x2="31" y2="48" />
    </g>
  );

  return (
    <svg width={size} height={size} viewBox="0 0 50 50" className={className} role="img" aria-label={title ?? condition.description}>
      <defs>
        <radialGradient id={`sun${uid}`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fff3a8" />
          <stop offset="0.55" stopColor="#ffd23f" />
          <stop offset="1" stopColor="#ffa91f" />
        </radialGradient>
        <radialGradient id={`glow${uid}`}>
          <stop offset="0" stopColor="#ffd84d" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffd84d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`cloud${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe8f3" />
        </linearGradient>
        <linearGradient id={`cloudDark${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e3eaf3" />
          <stop offset="1" stopColor="#b7c5d8" />
        </linearGradient>
      </defs>
      {kind === "sun" && sun(25, 25, 11)}
      {kind === "moon" && moon(22, 24, 13)}
      {kind === "partly" && (<>{sun(31, 17, 8.5)}{cloud(4, 12, 0.95)}</>)}
      {kind === "partly-night" && (<>{moon(28, 15, 9)}{cloud(4, 12, 0.95)}</>)}
      {kind === "cloud" && (<>{cloud(14, 4, 0.75, true)}{cloud(3, 12, 1)}</>)}
      {kind === "rain" && (<>{cloud(4, 6, 1, true)}{drops}</>)}
      {kind === "storm" && (
        <>
          {cloud(4, 4, 1, true)}
          <path d="M26 33l-6 9h5l-3 7 9-11h-5l3-5z" fill="#ffc53d" stroke="#f0a500" strokeWidth="0.6" strokeLinejoin="round" />
        </>
      )}
      {kind === "snow" && (
        <>
          {cloud(4, 6, 1)}
          <g fill="#7fb3f5">
            <circle cx="16" cy="45" r="2" /><circle cx="25" cy="47" r="2" /><circle cx="34" cy="45" r="2" />
          </g>
        </>
      )}
      {kind === "fog" && (
        <>
          {cloud(4, 2, 0.95)}
          <g stroke="#9fb0c8" strokeWidth="2.4" strokeLinecap="round">
            <line x1="8" y1="38" x2="42" y2="38" />
            <line x1="12" y1="44" x2="38" y2="44" />
          </g>
        </>
      )}
    </svg>
  );
}

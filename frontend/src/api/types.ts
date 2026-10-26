// Mirrors the FastAPI response shapes (backend/app/schemas.py, engine/*.py).

export type ActivityId = "fitness" | "travel" | "gardening" | "family";
export type TimeOfDay = "morning" | "midday" | "evening" | "night";
export type Tone = "good" | "ok" | "warn" | "bad" | "neutral";
export type DataSource = "live" | "demo";

export interface Location {
  name: string;
  state?: string | null;
  country?: string | null;
  lat: number;
  lon: number;
}

export interface Condition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface CurrentWeather {
  dt: number;
  temp: number;
  feels_like: number;
  humidity: number;
  wind_kmh: number;
  wind_deg?: number | null;
  wind_dir?: string | null;
  uvi: number | null;
  visibility_km: number | null;
  pressure?: number | null;
  clouds?: number | null;
  condition: Condition;
  is_day: boolean;
  sunrise?: number | null;
  sunset?: number | null;
}

export interface HourlySlot {
  dt: number;
  slot_hours: number;
  temp: number;
  feels_like: number;
  humidity: number;
  wind_kmh: number;
  wind_deg?: number | null;
  pop: number | null;
  rain_mm: number;
  snow_mm: number;
  visibility_km: number | null;
  uvi: number | null;
  clouds?: number | null;
  condition: Condition;
  is_day: boolean;
  is_now: boolean;
}

export interface DailyForecast {
  dt: number;
  date_label: string;
  temp_min: number;
  temp_max: number;
  pop: number | null;
  rain_mm: number;
  uvi: number | null;
  condition: Condition;
  derived: boolean;
}

export interface OfficialAlert {
  sender: string;
  event: string;
  start: number;
  end: number;
  description: string;
}

export interface WeatherBundle {
  location: Location;
  current: CurrentWeather;
  hourly: HourlySlot[];
  daily: DailyForecast[];
  alerts: OfficialAlert[];
  meta: {
    source: DataSource;
    provider: string;
    plan: string;
    fetched_at: number;
    tz_offset: number;
    unavailable: string[];
    notes: string[];
  };
}

export interface Preferences {
  activities: ActivityId[];
  focus_activity: ActivityId;
  preferred_times: TimeOfDay[];
  heat_sensitivity: "low" | "normal" | "high";
}

export interface ScorePoint {
  dt: number;
  label: string;
  score: number;
  reasons: string[];
}

export interface FocusRecommendation {
  activity: ActivityId;
  outdoor_ok: boolean;
  headline: string;
  window: { label: string; start: number; end: number; score: number } | null;
  explanation: string;
  hint: string | null;
  facts: string[];
  outside_preferred: boolean;
  indoor_suggestion: string | null;
}

export interface ActivitySuitability {
  id: ActivityId;
  name: string;
  score: number;
  label: "Good" | "Moderate" | "Poor" | "Unsuitable";
  best_time: string | null;
  now_score: number | null;
  now_label: string | null;
  limits: string[];
  enabled: boolean;
  indoor_alternative: string;
  hourly: ScorePoint[];
}

export interface Advisory {
  id: string;
  kind: string;
  severity: "warning" | "caution" | "info" | "ok";
  title: string;
  message: string;
  basis: string;
  time_label: string | null;
  dismissible: boolean;
  icon: string;
}

export interface Recommendations {
  location: Location;
  source: DataSource;
  generated_at: number;
  focus: FocusRecommendation;
  activities: ActivitySuitability[];
  advisories: Advisory[];
  official_alerts: OfficialAlert[];
  rules_version: string;
  disclaimer: string;
}

export interface Status {
  label: string;
  tone: Tone;
}

export interface Site {
  name: string;
  note: string;
  lat: number;
  lon: number;
}

export interface PlannerCard {
  id: "heritage" | "nature";
  title: string;
  subtitle: string;
  illustration: "fort" | "mountain";
  status: Status;
  score: number | null;
  avoid: { label: string; reasons: string; start: number; end: number } | null;
  best_times: string[];
  best_note: string | null;
  summary: string;
  outdoor_suitable: boolean;
  suggestion?: { title: string; time_label: string | null };
  sites: Site[];
  hourly: ScorePoint[];
}

export interface SlotBrief {
  dt: number;
  label: string;
  temp: number;
  pop: number | null;
  visibility_km: number | null;
  wind_kmh: number;
  condition: Condition;
}

export interface RouteSegment {
  name: string;
  note: string;
  error?: string;
  risk?: Status;
  factors?: string[];
  min_visibility_km?: number | null;
  max_pop?: number;
  max_wind_kmh?: number;
  fog_window?: string | null;
  rain_window?: string | null;
  hourly?: SlotBrief[];
}

export interface RouteInsight {
  name: string;
  label: string | null;
  risk: Status;
  summary: string;
  advice: string | null;
  segments: RouteSegment[];
}

export interface AccessibilityInsight {
  site: string;
  note: string;
  status: Status;
  conditions: string;
  advice: string;
  disclaimer: string;
  hourly: SlotBrief[];
}

export interface IndoorItem {
  name: string;
  kind: string;
  note: string;
}

export interface Plan {
  location: Location;
  source: DataSource;
  generated_at: number;
  destination: { tagline: string; landmark: string; curated: boolean };
  current: { temp: number; condition: Condition; is_day: boolean };
  cards: PlannerCard[];
  indoor_alternatives: { recommended: boolean; items: IndoorItem[] };
  insights: { route: RouteInsight | null; accessibility: AccessibilityInsight | null };
  advisories: Advisory[];
  disclaimer: string;
}

export interface Health {
  status: string;
  mode: DataSource;
  provider: string;
  rules_version: string;
  message: string;
}

export interface ItineraryItem {
  id: string;
  title: string;
  detail: string;
  time_label: string | null;
  city: string;
  kind: "activity" | "sightseeing" | "viewpoint" | "indoor";
  added_at: number;
}

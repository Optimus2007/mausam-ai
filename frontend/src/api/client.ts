import type { Health, Location, Plan, Preferences, Recommendations, WeatherBundle } from "./types";

// Empty in development (Vite proxies /api) and for single-service deploys.
// Set VITE_API_BASE_URL when the frontend is hosted separately, e.g. on GitHub Pages.
const BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const TIMEOUT_MS = 70_000; // generous: free hosting tiers can take ~50s to wake up

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code = "error", status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit, signal?: AbortSignal): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new DOMException("timeout", "TimeoutError")), TIMEOUT_MS);
  signal?.addEventListener("abort", () => ctrl.abort(signal.reason));
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      signal: ctrl.signal,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const err = body?.error;
      if (err?.message) throw new ApiError(err.message, err.code, res.status);
      if (res.status === 422) throw new ApiError("Some request details were invalid.", "validation", 422);
      if (!body && [502, 503, 504].includes(res.status))
        throw new ApiError("The Mausam AI server is unavailable right now. It may be starting up — try again shortly.", "network", res.status);
      throw new ApiError(`Server error (${res.status}).`, "http", res.status);
    }
    return body as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (signal?.aborted) throw new ApiError("Request cancelled.", "aborted");
    if ((e as Error)?.name === "TimeoutError" || ctrl.signal.aborted)
      throw new ApiError("The server took too long to respond.", "timeout");
    throw new ApiError("Can't reach the Mausam AI server. Check your connection and try again.", "network");
  } finally {
    clearTimeout(timer);
  }
}

function locParams(loc: Location) {
  const p = new URLSearchParams({ lat: String(loc.lat), lon: String(loc.lon), name: loc.name });
  if (loc.state) p.set("state", loc.state);
  if (loc.country) p.set("country", loc.country);
  return p;
}

function locBody(loc: Location) {
  return { lat: loc.lat, lon: loc.lon, name: loc.name, state: loc.state ?? null, country: loc.country ?? null };
}

export const api = {
  health: (signal?: AbortSignal) => request<Health>("/api/health", undefined, signal),

  geocode: (q: string, signal?: AbortSignal) =>
    request<Location[]>(`/api/geocode?${new URLSearchParams({ q })}`, undefined, signal),

  reverse: (lat: number, lon: number) =>
    request<Location>(`/api/geocode/reverse?${new URLSearchParams({ lat: String(lat), lon: String(lon) })}`),

  weather: (loc: Location, refresh = false, signal?: AbortSignal) => {
    const p = locParams(loc);
    if (refresh) p.set("refresh", "true");
    return request<WeatherBundle>(`/api/weather?${p}`, undefined, signal);
  },

  recommendations: (loc: Location, preferences: Preferences, signal?: AbortSignal) =>
    request<Recommendations>(
      "/api/recommendations",
      { method: "POST", body: JSON.stringify({ ...locBody(loc), preferences }) },
      signal,
    ),

  planner: (loc: Location, preferences: Preferences, signal?: AbortSignal) =>
    request<Plan>("/api/planner", { method: "POST", body: JSON.stringify({ ...locBody(loc), preferences }) }, signal),
};

import { useEffect, useState } from "react";
import { Crosshair, Loader2, MapPin, Search } from "lucide-react";
import { api, ApiError } from "../../api/client";
import type { Location } from "../../api/types";
import { placeDetail } from "../../lib/format";
import { useApp } from "../../state/AppState";
import { Sheet } from "../common/ui";

const POPULAR: Location[] = [
  { name: "Chandigarh", state: "Chandigarh", country: "IN", lat: 30.7333, lon: 76.7794 },
  { name: "New Delhi", state: "Delhi", country: "IN", lat: 28.6139, lon: 77.209 },
  { name: "Jaipur", state: "Rajasthan", country: "IN", lat: 26.9124, lon: 75.7873 },
  { name: "Agra", state: "Uttar Pradesh", country: "IN", lat: 27.1767, lon: 78.0081 },
  { name: "Mumbai", state: "Maharashtra", country: "IN", lat: 19.076, lon: 72.8777 },
  { name: "Shimla", state: "Himachal Pradesh", country: "IN", lat: 31.1048, lon: 77.1734 },
];

export function LocationSheet() {
  const { sheet, openSheet, setDashboardLoc, setPlannerLoc, toast } = useApp();
  const open = sheet?.kind === "location";
  const target = open ? sheet.target : "dashboard";
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Location[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!open) {
      setQ("");
      setResults(null);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults(null);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        setResults(await api.geocode(query, ctrl.signal));
      } catch (e) {
        if (!ctrl.signal.aborted) setError(e instanceof ApiError ? e.message : "Search failed.");
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const choose = (loc: Location) => {
    (target === "planner" ? setPlannerLoc : setDashboardLoc)(loc);
    openSheet(null);
    toast(`Showing ${loc.name}`);
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      toast("Location isn't available in this browser", "bad");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const loc = await api.reverse(+pos.coords.latitude.toFixed(4), +pos.coords.longitude.toFixed(4));
          choose(loc);
        } catch (e) {
          toast(e instanceof ApiError ? e.message : "Couldn't look up your location", "bad");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        toast(err.code === err.PERMISSION_DENIED ? "Location permission denied" : "Couldn't get your location", "bad");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const list = results ?? (q.trim().length < 2 ? POPULAR : []);

  return (
    <Sheet open={open} onClose={() => openSheet(null)}
      title={target === "planner" ? "Choose a destination" : "Choose a location"}
      subtitle={target === "planner" ? "Plan sightseeing around the forecast" : "Weather and recommendations update instantly"}>
      <label className="flex items-center gap-2 rounded-xl border border-line bg-page px-3 py-2.5 focus-within:border-brand">
        <Search size={18} className="text-ink-3" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value.slice(0, 80))}
          placeholder="Search city, e.g. Jaipur" className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-3"
          aria-label="Search city" />
        {searching && <Loader2 size={16} className="animate-spin text-ink-3" />}
      </label>

      {target === "dashboard" && (
        <button onClick={useMyLocation} disabled={locating}
          className="mt-3 flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left font-semibold text-brand hover:bg-sky-soft">
          {locating ? <Loader2 size={18} className="animate-spin" /> : <Crosshair size={18} />}
          Use my current location
        </button>
      )}

      <p className="mb-1 mt-4 text-[12px] font-semibold uppercase tracking-wide text-ink-3">
        {results ? "Results" : q.trim().length < 2 ? "Popular" : ""}
      </p>
      {error && <p className="rounded-xl bg-bad-soft px-3 py-2 text-[13px] text-bad-ink">{error}</p>}
      {results && results.length === 0 && !error && (
        <p className="py-6 text-center text-[13px] text-ink-2">No places found for “{q.trim()}”. Try a nearby larger city.</p>
      )}
      <ul className="pb-2">
        {list.map((loc) => (
          <li key={`${loc.name}-${loc.lat}-${loc.lon}`}>
            <button onClick={() => choose(loc)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-sky-soft">
              <MapPin size={18} className="shrink-0 text-brand" />
              <span>
                <span className="block font-semibold">{loc.name}</span>
                <span className="block text-[12px] text-ink-3">{placeDetail(loc)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

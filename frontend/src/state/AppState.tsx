import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { ActivityId, Health, ItineraryItem, Location, Preferences } from "../api/types";
import { useLocalStorage } from "../hooks/useLocalStorage";

export const DEFAULT_DASHBOARD_LOCATION: Location = {
  name: "Chandigarh",
  state: "Chandigarh",
  country: "IN",
  lat: 30.7333,
  lon: 76.7794,
};
export const DEFAULT_PLANNER_LOCATION: Location = {
  name: "New Delhi",
  state: "Delhi",
  country: "IN",
  lat: 28.6139,
  lon: 77.209,
};
export const DEFAULT_PREFERENCES: Preferences = {
  activities: ["fitness", "travel", "gardening", "family"],
  focus_activity: "fitness",
  preferred_times: ["morning", "evening"],
  heat_sensitivity: "normal",
};

const ACTIVITY_IDS: ActivityId[] = ["fitness", "travel", "gardening", "family"];

const isLocation = (v: unknown): v is Location =>
  !!v && typeof (v as Location).lat === "number" && typeof (v as Location).lon === "number" && !!(v as Location).name;
const isPrefs = (v: unknown): v is Preferences =>
  !!v && Array.isArray((v as Preferences).activities) && ACTIVITY_IDS.includes((v as Preferences).focus_activity);
const isArray = <T,>(v: unknown): v is T[] => Array.isArray(v);

type Toast = { id: number; text: string; tone: "good" | "info" | "bad" };
export type GlobalSheet = null | { kind: "location"; target: "dashboard" | "planner" } | { kind: "prefs" } | { kind: "menu" };

interface AppState {
  health: Health | null;
  healthError: boolean;
  prefs: Preferences;
  setPrefs: (p: Preferences) => void;
  setFocus: (a: ActivityId) => void;
  dashboardLoc: Location;
  setDashboardLoc: (l: Location) => void;
  plannerLoc: Location;
  setPlannerLoc: (l: Location) => void;
  itinerary: ItineraryItem[];
  addToItinerary: (item: Omit<ItineraryItem, "added_at">) => void;
  removeFromItinerary: (id: string) => void;
  clearItinerary: () => void;
  inItinerary: (id: string) => boolean;
  dismissed: string[];
  dismiss: (id: string) => void;
  restoreDismissed: () => void;
  toasts: Toast[];
  toast: (text: string, tone?: Toast["tone"]) => void;
  sheet: GlobalSheet;
  openSheet: (s: GlobalSheet) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [prefs, setPrefs] = useLocalStorage<Preferences>("mausamai.prefs", DEFAULT_PREFERENCES, isPrefs);
  const [dashboardLoc, setDashboardLoc] = useLocalStorage<Location>("mausamai.loc.dashboard", DEFAULT_DASHBOARD_LOCATION, isLocation);
  const [plannerLoc, setPlannerLoc] = useLocalStorage<Location>("mausamai.loc.planner", DEFAULT_PLANNER_LOCATION, isLocation);
  const [itinerary, setItinerary] = useLocalStorage<ItineraryItem[]>("mausamai.itinerary", [], isArray);
  const [dismissed, setDismissed] = useLocalStorage<string[]>("mausamai.dismissed", [], isArray);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sheet, openSheet] = useState<GlobalSheet>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealthError(true));
  }, []);

  const toast = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      health,
      healthError,
      prefs,
      setPrefs,
      setFocus: (a) => setPrefs({ ...prefs, focus_activity: a }),
      dashboardLoc,
      setDashboardLoc,
      plannerLoc,
      setPlannerLoc,
      itinerary,
      addToItinerary: (item) => {
        if (itinerary.some((i) => i.id === item.id)) return;
        setItinerary([...itinerary, { ...item, added_at: Date.now() }]);
        toast(`Added “${item.title}” to itinerary`, "good");
      },
      removeFromItinerary: (id) => {
        setItinerary(itinerary.filter((i) => i.id !== id));
        toast("Removed from itinerary");
      },
      clearItinerary: () => setItinerary([]),
      inItinerary: (id) => itinerary.some((i) => i.id === id),
      // Keep the dismissed list bounded; ids include a timestamp so stale ones never match again.
      dismissed,
      dismiss: (id) => setDismissed([...dismissed.slice(-49), id]),
      restoreDismissed: () => setDismissed([]),
      toasts,
      toast,
      sheet,
      openSheet,
    }),
    [health, healthError, prefs, dashboardLoc, plannerLoc, itinerary, dismissed, toasts, sheet, toast,
     setPrefs, setDashboardLoc, setPlannerLoc, setItinerary, setDismissed],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppStateProvider");
  return ctx;
}

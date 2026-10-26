import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppStateProvider } from "./state/AppState";
import { BottomNav } from "./components/layout/BottomNav";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { Toasts } from "./components/common/ui";
import { LocationSheet } from "./components/sheets/LocationSheet";
import { MenuSheet } from "./components/sheets/MenuSheet";
import { PreferencesSheet } from "./components/sheets/PreferencesSheet";
import Dashboard from "./pages/Dashboard";
import Forecast from "./pages/Forecast";
import Itinerary from "./pages/Itinerary";
import Planner from "./pages/Planner";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// HashRouter keeps deep links working on static hosts such as GitHub Pages.
export default function App() {
  return (
    <ErrorBoundary>
    <AppStateProvider>
      <HashRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/itinerary" element={<Itinerary />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BottomNav />
        <LocationSheet />
        <PreferencesSheet />
        <MenuSheet />
        <Toasts />
      </HashRouter>
    </AppStateProvider>
    </ErrorBoundary>
  );
}

import { Component, type ReactNode } from "react";

/** Last-resort fallback so a rendering bug never leaves a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Mausam AI crashed:", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-xl font-bold">Something went wrong</p>
        <p className="text-sm text-ink-2">Reload the page to try again. Your preferences and itinerary are saved.</p>
        <button className="btn-primary w-auto px-5" onClick={() => location.reload()}>Reload</button>
      </div>
    );
  }
}

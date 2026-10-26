import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";

interface AsyncState<T> {
  data: T | null;
  error: ApiError | null;
  /** First load with no data yet. */
  loading: boolean;
  /** Reloading while previous data is still shown. */
  refreshing: boolean;
  /** Request has been pending for a while (e.g. a sleeping free-tier server). */
  slow: boolean;
  reload: (opts?: { force?: boolean }) => Promise<T | null>;
}

/**
 * Runs `fn` whenever `key` changes. Keeps the previous data visible while refreshing,
 * aborts stale requests, and flags slow requests so the UI can explain the wait.
 */
export function useAsync<T>(fn: (signal: AbortSignal, force: boolean) => Promise<T>, key: string): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);
  const [slow, setSlow] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const ctrlRef = useRef<AbortController | null>(null);

  const run = useCallback(async (force = false) => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setPending(true);
    setError(null);
    setSlow(false);
    const slowTimer = setTimeout(() => setSlow(true), 6000);
    try {
      const result = await fnRef.current(ctrl.signal, force);
      if (!ctrl.signal.aborted) setData(result);
      return result;
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof ApiError ? e : new ApiError(String(e)));
      return null;
    } finally {
      clearTimeout(slowTimer);
      if (ctrlRef.current === ctrl) {
        setPending(false);
        setSlow(false);
      }
    }
  }, []);

  useEffect(() => {
    run();
    return () => ctrlRef.current?.abort();
  }, [key, run]);

  return {
    data,
    error,
    loading: pending && data === null,
    refreshing: pending && data !== null,
    slow,
    reload: (opts) => run(opts?.force ?? false),
  };
}

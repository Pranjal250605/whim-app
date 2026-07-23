import { supabase } from './supabase';

// Lightweight, self-hosted instrumentation on top of Supabase — no third-party
// SDK, no native rebuild, no keys. `track` records funnel events; the global
// handler logs JS crashes. Both are fire-and-forget so they never block or
// throw into the app. (Upgrade to Sentry/PostHog later if you want richer data;
// native-level crashes still need Sentry — this catches JS errors.)

export function track(event: string, props: Record<string, unknown> = {}): void {
  supabase
    .from('analytics_events')
    .insert({ event, props })
    .then(() => {}, () => {});
}

export function logError(error: unknown, fatal = false, context: Record<string, unknown> = {}): void {
  const e = error as { message?: string; stack?: string } | undefined;
  supabase
    .from('error_logs')
    .insert({
      message: String(e?.message ?? error ?? 'unknown').slice(0, 500),
      stack: typeof e?.stack === 'string' ? e.stack.slice(0, 4000) : null,
      fatal,
      context,
    })
    .then(() => {}, () => {});
}

let installed = false;
/** Route uncaught JS errors to error_logs (keeps the app's own handler too). */
export function installErrorLogging(): void {
  if (installed) return;
  installed = true;
  const g = globalThis as unknown as {
    ErrorUtils?: { getGlobalHandler?: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler?: (h: (e: unknown, fatal?: boolean) => void) => void };
  };
  const prev = g.ErrorUtils?.getGlobalHandler?.();
  g.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
    logError(error, !!isFatal, { source: 'uncaught' });
    prev?.(error, isFatal);
  });
}

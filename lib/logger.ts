/**
 * logger.ts
 * Lightweight structured logger for production diagnostics.
 * Console-based now — designed to drop in Sentry or Datadog later
 * by replacing the sink functions below.
 *
 * Usage:
 *   import { logger } from "@/lib/logger"
 *   logger.info("Video loaded", { videoId, duration })
 *   logger.warn("Marker parse failed", { raw })
 *   logger.error("OpenAI timeout", { route: "/api/review-markers", err })
 */

type LogLevel = "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const ts = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  return context
    ? `${prefix} ${message} ${JSON.stringify(context)}`
    : `${prefix} ${message}`;
}

// ── Sink: replace this section to integrate Sentry / external logging ──
function sink(level: LogLevel, message: string, context?: LogContext) {
  const formatted = formatMessage(level, message, context);

  if (level === "error") {
    console.error(formatted);
    // TODO: Sentry.captureException(new Error(message), { extra: context })
  } else if (level === "warn") {
    console.warn(formatted);
  } else {
    if (process.env.NODE_ENV !== "production") {
      console.log(formatted);
    }
  }
}
// ───────────────────────────────────────────────────────────────────────

export const logger = {
  info(message: string, context?: LogContext) {
    sink("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    sink("warn", message, context);
  },
  error(message: string, context?: LogContext) {
    sink("error", message, context);
  },
};

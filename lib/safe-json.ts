/**
 * safe-json.ts
 * Safe JSON parsing utilities for AI responses.
 * Never throws — always returns a fallback on parse failure.
 */

import { logger } from "./logger";

/**
 * Parse JSON string safely.
 * Returns fallback if parsing fails.
 */
export function safeParseJSON<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (err) {
    logger.warn("safeParseJSON: failed to parse", { value: value?.slice(0, 100), err });
    return fallback;
  }
}

/**
 * Extract a JSON block from a string that may have surrounding text.
 * Useful for AI responses that sometimes include markdown fences or prose.
 */
export function extractJSON<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;

  // Try direct parse first
  try {
    return JSON.parse(text) as T;
  } catch {
    // Try to extract first JSON object or array from the string
    const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        return JSON.parse(match[1]) as T;
      } catch {
        // fall through
      }
    }
    logger.warn("extractJSON: no valid JSON found", { preview: text.slice(0, 120) });
    return fallback;
  }
}

/**
 * Safely access a nested property from a parsed AI result.
 * Returns fallback if the key is missing or value is wrong type.
 */
export function safeGet<T>(obj: unknown, key: string, fallback: T): T {
  if (obj && typeof obj === "object" && key in (obj as object)) {
    const val = (obj as Record<string, unknown>)[key];
    if (val !== undefined && val !== null) return val as T;
  }
  return fallback;
}

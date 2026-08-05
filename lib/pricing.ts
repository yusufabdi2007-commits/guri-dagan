// Guri Dagan pricing, confirmed August 2026 — separate parent/child rates.
// Africa: Parent $25/mo, Child $50/mo.
// Outside Africa: Parent $100/mo, Child $100/mo.

const AFRICAN_COUNTRIES = new Set([
  "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cameroon", "Central African Republic", "Chad", "Comoros",
  "Congo (Brazzaville)", "Congo (DRC)", "Djibouti", "Egypt",
  "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "Gabon", "Gambia",
  "Ghana", "Guinea", "Guinea-Bissau", "Ivory Coast", "Kenya", "Lesotho",
  "Liberia", "Libya", "Madagascar", "Malawi", "Mali", "Mauritania",
  "Mauritius", "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria",
  "Rwanda", "Sao Tome and Principe", "Senegal", "Seychelles", "Sierra Leone",
  "Somalia", "South Africa", "South Sudan", "Sudan", "Tanzania", "Togo",
  "Tunisia", "Uganda", "Zambia", "Zimbabwe",
]);

export type Track = "parent" | "child";

export interface PriceQuote {
  country: string;
  isAfrica: boolean;
  track: Track;
  monthlyPrice: number;
  currency: "USD";
  cadence: string;
}

/** Case-insensitive match against the known country list. Returns null if unrecognized. */
export function matchCountry(input: string, knownCountries: string[]): string | null {
  const normalized = input.trim().toLowerCase();
  return knownCountries.find(c => c.toLowerCase() === normalized) ?? null;
}

export function getPrice(country: string, track: Track): PriceQuote {
  const isAfrica = AFRICAN_COUNTRIES.has(country);
  const monthlyPrice = isAfrica ? (track === "parent" ? 25 : 50) : 100;
  return {
    country,
    isAfrica,
    track,
    monthlyPrice,
    currency: "USD",
    cadence: track === "parent" ? "1-on-1, once a week" : "structured program",
  };
}

/** Minimum age for the child coaching track. */
export const MIN_CHILD_AGE = 8;

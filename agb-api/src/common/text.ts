/**
 * The stored data spells "none" in several ways; the API says `null`.
 * `NOT_AVAILABE` (sic) is a real value in `genelists.longId`.
 */
const SENTINELS = new Set(['', 'NOT_AVAILABLE', 'NOT_AVAILABE', 'NOT NAMED']);

/** Matches the "no value" marker inside family, proxy and descendant columns. */
export const NOT_AVAILABLE_PATTERN = /NOT_AVAILABLE/;

export function orNull(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return SENTINELS.has(text) ? null : text;
}

/**
 * Numeric columns are stored as text (`"6.65"`, `"20851"`, `""`). Accepts
 * either form, so the mapping survives the data being re-imported with real
 * numbers.
 */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const text = String(value).trim();
  if (SENTINELS.has(text)) {
    return null;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toInt(value: unknown): number | null {
  const parsed = toNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

/** Comma-joined columns (`descent_ptns`, …) as arrays, sentinels dropped. */
export function splitList(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }
  const parts = Array.isArray(value) ? value : String(value).split(',');
  return parts
    .map((part) => orNull(part))
    .filter((part): part is string => part !== null);
}

/**
 * Reconstructed sequences carry alignment padding (`.`, `-`, `_`) and
 * lowercase insert states; the protein is the uppercase letters.
 */
export function cleanSequence(sequence: unknown): string | null {
  if (sequence === null || sequence === undefined) {
    return null;
  }
  const cleaned = String(sequence)
    .replace(/[\s._-]/g, '')
    .toUpperCase();
  return cleaned === '' ? null : cleaned;
}

/**
 * Escape a user-supplied string for literal use inside a RegExp, so a name
 * such as `.*` cannot match everything or hang the matcher. (From c-api's
 * `utils/util.ts`.)
 */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Every character that occurs in an ancestral species name — checked against
 * all 115 names in the live data on 2026-09-22 (`A–Z a–z _ / -`), digits added
 * for safety. Anything else separates names inside `ancestor_species`.
 */
const NAME_CHARS = 'A-Za-z0-9_/\\-';

/**
 * Matches `name` only as a whole name inside a delimited list, or as a whole
 * array element. The legacy gene-gain filter used `new RegExp(name)`, so
 * `rosids` also matched `eurosids` and dropped 87 Arabidopsis genes from
 * "gained since rosids". The delimiter in `ancestor_species` has not been
 * verified yet, so any non-name character counts as one.
 */
export function exactNameRegExp(name: string): RegExp {
  return new RegExp(
    `(?:^|[^${NAME_CHARS}])${escapeRegExp(name)}(?:[^${NAME_CHARS}]|$)`,
  );
}

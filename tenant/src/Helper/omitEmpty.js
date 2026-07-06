/**
 * Return a shallow copy of `obj` with "empty" optional keys removed so they are
 * never sent to the backend. A value is considered empty when it is:
 *   - undefined or null
 *   - an empty / whitespace-only string ("")
 *   - an empty array ([])
 *
 * Meaningful values are always kept, including `false`, `0`, and non-empty
 * objects/arrays. Nesting is intentionally left untouched (shallow) so required
 * sub-objects like `payroll` pass through as-is.
 *
 * Use this on CREATE payloads: optional fields the user left blank drop out of
 * the request body entirely instead of being sent as "", null or [].
 */
export default function omitEmpty(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => {
      if (v === undefined || v === null) return false;
      if (typeof v === "string" && v.trim() === "") return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    }),
  );
}

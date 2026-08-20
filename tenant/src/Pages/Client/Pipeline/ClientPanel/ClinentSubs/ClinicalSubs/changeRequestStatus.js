/**
 * Open/closed lifecycle for a clinical report's change requests.
 *
 * A change request is open from the moment a supervisor raises it until the
 * creator next submits the report for approval. It therefore stays open while
 * the report sits back in draft, and answering it closes it; raising another
 * one afterwards opens that new one.
 *
 * The API has no status field on a change request, so this is derived from
 * timestamps: anything raised after the last submission is still outstanding.
 */

/** Most recent SUBMITTED event in the report history, in ms, or null. */
export const lastSubmittedAtFrom = (history) => {
  const submissions = (history || [])
    .filter(
      (entry) =>
        String(entry?.action || "").toUpperCase() === "SUBMITTED" &&
        entry?.createdAt
    )
    .map((entry) => new Date(entry.createdAt).getTime())
    .filter((time) => !Number.isNaN(time));

  return submissions.length ? Math.max(...submissions) : null;
};

/**
 * Undated requests and reports that have never been submitted both count as
 * open — better to surface a request that may be live than to hide one.
 */
export const isChangeRequestOpen = (request, lastSubmittedAt) => {
  if (!request?.createdAt) return true;
  if (!lastSubmittedAt) return true;

  const raisedAt = new Date(request.createdAt).getTime();
  if (Number.isNaN(raisedAt)) return true;

  return raisedAt > lastSubmittedAt;
};

/** Newest first, so the request most in need of attention leads. */
export const sortNewestFirst = (requests) =>
  [...(requests || [])].sort(
    (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
  );

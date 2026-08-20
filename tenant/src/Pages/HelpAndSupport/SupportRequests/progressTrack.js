import { formatDateTime } from "../../../Helper/Formatters";

// Names arrive lowercase from the API ("ajibola oluwagbemileke").
const titleCase = (name) =>
  String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

/**
 * Shapes one activity log into the line a tenant sees on an issue's progress
 * track.
 *
 * The log carries plenty the tenant has no use for and some it should not see
 * at all: `ipAddress` and `userAgent` belong to the support agent handling the
 * issue, `location` is an internal endpoint path (/api/v1/issue/issue/reassign),
 * and `feature` is the same string on every row. `details` only repeats
 * `action`. All of that is dropped here rather than at the call site, so both
 * places that render the track stay in step.
 */
export const toProgressEntry = (log, dateFormat, timeFormat) => {
  const person =
    titleCase(log?.accessedBy) ||
    titleCase(
      [log?.admin?.firstName, log?.admin?.lastName].filter(Boolean).join(" ")
    ) ||
    "";

  const action = log?.action || log?.message || log?.details || "Updated";
  const outcome = String(log?.outcome || "").toUpperCase();

  return {
    person,
    action,
    reason: log?.reason || "",
    // Issues often move several times in a day, so the time earns its place.
    when: log?.createdAt
      ? formatDateTime(log.createdAt, dateFormat, timeFormat)
      : "",
    // Only worth calling out when something went wrong; a successful step is
    // the expected case and needs no badge.
    failed: outcome !== "" && outcome !== "SUCCESS",
  };
};

export default toProgressEntry;

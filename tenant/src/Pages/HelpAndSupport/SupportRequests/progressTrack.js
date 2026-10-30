import { formatDateTime } from "../../../Helper/Formatters";

const UUID =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/**
 * The API writes the raw record id into the action ("updated issue
 * 7ad4d5f8-bd19-48cc-8c98-b2b6f9cdc684"). Nobody reading a progress track
 * wants a UUID, so it becomes the issue's name where we know it, and is
 * dropped entirely where we don't.
 */
const readableAction = (action, issueName) =>
  String(action || "")
    .replace(UUID, issueName || "")
    .replace(/\s+/g, " ")
    .trim();

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
export const toProgressEntry = (log, dateFormat, timeFormat, issueName) => {
  const person =
    titleCase(log?.accessedBy) ||
    titleCase(
      [log?.admin?.firstName, log?.admin?.lastName].filter(Boolean).join(" ")
    ) ||
    "";

  const action =
    readableAction(log?.action || log?.message || log?.details, issueName) ||
    "Updated";
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

/**
 * Who raised a support request.
 *
 * `loggedBy` is null whenever no admin logged it — which means the tenant
 * raised it themselves, so their own name is the answer rather than "N/A".
 */
export const loggedByName = (request) => {
  const admin = [request?.loggedBy?.firstName, request?.loggedBy?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    admin ||
    request?.loggedBy?.fullName ||
    request?.tenant?.companyName ||
    "N/A"
  );
};

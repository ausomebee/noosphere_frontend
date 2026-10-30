// Shared display helpers for appointment rows.
//
// The appointments API returns a client as { firstName, lastName, preferredName }
// (no flat `fullName`), and each entry in `appointmentServices` carries its own
// nested `serviceCode`. Deriving from those here keeps every table/card
// consistent — and avoids the old hardcoded serviceCodeId → code maps, which
// rendered anything unmapped as "Unknown".

/** "First Last" for an appointment's client, with a safe fallback. */
export const clientDisplayName = (client, fallback = "N/A") => {
  if (!client) return fallback;
  const name = [client.firstName, client.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || client.fullName || fallback;
};

/**
 * Flatten a reschedule request into one row.
 *
 * The API wraps the appointment it refers to:
 *   { id, appointmentId, date/startTime/endTime (REQUESTED), appointment: {...} }
 * so the client, clinicians, session and services all live on the nested
 * appointment while the requested slot lives on the request itself. Reading it
 * flat (as the tables used to) left those columns blank.
 *
 * Also accepts a bare appointment — e.g. the single-appointment endpoint used
 * by the notification deep-link — in which case `proposed` supplies the
 * requested slot.
 */
export const normalizeRescheduleRequest = (raw, proposed = null) => {
  const appt = raw?.appointment || raw || {};
  const isWrapped = Boolean(raw?.appointment);

  // Requested slot: the request's own fields, else the caller-supplied proposal
  // (the notification carries it as metadata.proposed*).
  const requested = {
    date: (isWrapped ? raw.date : null) || proposed?.date || null,
    startTime: (isWrapped ? raw.startTime : null) || proposed?.startTime || null,
    endTime: (isWrapped ? raw.endTime : null) || proposed?.endTime || null,
  };

  // Previous slot: an explicit "previous" when the API sends one, otherwise the
  // slot the appointment still occupies.
  const previous = {
    date: appt.previousDate || appt.date || null,
    startTime: appt.previousStartTime || appt.startTime || null,
    endTime: appt.previousEndTime || appt.endTime || null,
  };

  return {
    requestId: isWrapped ? raw.id : null,
    appointmentId: raw?.appointmentId || appt.id || null,
    clientId: raw?.clientId || appt.clientId || null,
    client: appt.client || null,
    clinicians: appt.clinicians || [],
    session: appt.session || null,
    services: toServiceRows(appt.appointmentServices),
    previous,
    requested,
    reason: raw?.reasonForReschedule || appt.reasonForReschedule || "",
    status: raw?.status || null,
    appointment: appt,
  };
};

/** Map `appointmentServices` to the { serviceType, modifierType } rows tables use. */
export const toServiceRows = (appointmentServices) =>
  (appointmentServices || []).map((as) => {
    const modifier = as?.modifiers?.modifier || "";
    const code = as?.serviceCode?.code || "N/A";
    return {
      serviceType: `${code}${modifier ? ` (${modifier})` : ""}`,
      modifierType: modifier,
    };
  });

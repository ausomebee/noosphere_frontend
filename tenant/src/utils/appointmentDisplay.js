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

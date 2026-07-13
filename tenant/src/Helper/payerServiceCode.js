/*
 * Shape a payer's service code for the /payers create and update payloads.
 *
 * The backend distinguishes an existing service code from a custom one:
 *   - existing (has a serviceCodeId): send serviceCodeId and the modifiers as a
 *     plain array of codes, e.g. ["GT", "59"].
 *   - custom (no serviceCodeId): omit serviceCodeId and send the modifiers as
 *     objects, e.g. [{ modifier: "U3" }].
 *
 * A real config id is included only when updating an existing row (temp ids from
 * freshly added rows are dropped). isDeleted / isActive / payerId are not sent.
 */
export const toBackendServiceCode = (sc) => {
  const isExisting = Boolean(sc.serviceCodeId);
  const modifierCodes = (Array.isArray(sc.modifiers) ? sc.modifiers : [])
    .map((m) => (typeof m === "string" ? m : m?.modifier))
    .map((code) => (code || "").trim())
    .filter(Boolean);
  const hasRealId = sc.id && !String(sc.id).startsWith("temp-");
  return {
    ...(hasRealId ? { id: sc.id } : {}),
    ...(isExisting ? { serviceCodeId: sc.serviceCodeId } : {}),
    code: sc.code,
    description: sc.description,
    unitCurrency: sc.unitCurrency,
    ratePerUnit: sc.ratePerUnit,
    roundingRuleId: sc.roundingRuleId || sc.roundingRule || "",
    modifiers: isExisting
      ? modifierCodes
      : modifierCodes.map((code) => ({ modifier: code })),
    billable: sc.billable,
  };
};

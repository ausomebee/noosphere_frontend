// ---------------------------------------------------------------------------
// Control notification config: type → section label, display order, and the
// action (label + route) each notification maps to.
//
// The backend attaches `entityId` (the id of the related record) to every
// notification. Routes that take a single id use it directly to deep-link;
// destinations that only need to land on a section carry `entityId` in
// navigation state (as `focusId`) so the destination can focus the record.
//
// All paths below are verified against control/src/Components/Allroutes.jsx.
// ---------------------------------------------------------------------------

// The backend's NotificationEntityType enum, mirrored verbatim. ENTITY_FALLBACK
// keys are checked against this in dev — three modules had drifted onto names
// the backend never sends (DOCUMENT, REPORT, TICKET, FEATURE, PRODUCT), so
// those fallbacks silently never fired.
export const NOTIFICATION_ENTITY_TYPE = Object.freeze({
  APPOINTMENT: "APPOINTMENT",
  ISSUE: "ISSUE",
  SUBSCRIPTION: "SUBSCRIPTION",
  INVOICE: "INVOICE",
  PAYMENT: "PAYMENT",
  TENANT: "TENANT",
  PLAN: "PLAN",
  CLIENT: "CLIENT",
  DOCUMENT_REQUEST: "DOCUMENT_REQUEST",
  FORM: "FORM",
  AUTHORIZATION: "AUTHORIZATION",
  CLINICAL_REPORT: "CLINICAL_REPORT",
  LICENSE: "LICENSE",
  TIMESHEET: "TIMESHEET",
  PAYER: "PAYER",
  PAYROLL: "PAYROLL",
});

// Section header label per type.
export const TYPE_LABEL = {
  PAYMENT_MADE_FOR_PLAN: "PAYMENT MADE",
  PRODUCT_ACCESS: "PRODUCT ACCESS",
  TENANT_CREATED: "NEW TENANT",
  TENANT_DEACTIVATED: "TENANT DEACTIVATED",
  PLAN_CREATED: "PLAN CREATED",
  PLAN_DEACTIVATED: "PLAN DEACTIVATED",
  PLAN_DELETED: "PLAN DELETED",
  SUBSCRIPTION_PAUSED: "SUBSCRIPTION PAUSED",
  SUBSCRIPTION_CANCELLED: "SUBSCRIPTION CANCELLED",
  SUBSCRIPTION_AUTO_RENEWED: "SUBSCRIPTION AUTO-RENEWED",
  SUBSCRIPTION_CREATED: "SUBSCRIPTION CREATED",
  SUBSCRIPTION_RESUMED: "SUBSCRIPTION RESUMED",
  SUBSCRIPTION_CANCELLATION_SCHEDULED: "CANCELLATION SCHEDULED",
  SUBSCRIPTION_PAUSE_SCHEDULED: "PAUSE SCHEDULED",
  SUBSCRIPTION_RESUME_SCHEDULED: "RESUME SCHEDULED",
  ISSUE_SUBMITTED: "ISSUE SUBMITTED",
  ISSUE_ASSIGNED: "ISSUE ASSIGNED",
  ISSUE_ASSIGNED_ADMIN: "ISSUE ASSIGNED",
  ISSUE_IN_PROGRESS: "ISSUE IN PROGRESS",
  ISSUE_REASSIGNED: "ISSUE REASSIGNED",
  ISSUE_PRIORITY_CHANGED: "ISSUE PRIORITY CHANGED",
  ISSUE_CATEGORY_CHANGED: "ISSUE CATEGORY CHANGED",
  ISSUE_RESOLVED: "ISSUE RESOLVED",
};

// Display order for the grouped sections.
export const TYPE_ORDER = [
  "PAYMENT_MADE_FOR_PLAN",
  "PRODUCT_ACCESS",
  "TENANT_CREATED",
  "TENANT_DEACTIVATED",
  "PLAN_CREATED",
  "PLAN_DEACTIVATED",
  "PLAN_DELETED",
  "SUBSCRIPTION_PAUSED",
  "SUBSCRIPTION_CANCELLED",
  "SUBSCRIPTION_AUTO_RENEWED",
  "SUBSCRIPTION_CREATED",
  "SUBSCRIPTION_RESUMED",
  "SUBSCRIPTION_CANCELLATION_SCHEDULED",
  "SUBSCRIPTION_PAUSE_SCHEDULED",
  "SUBSCRIPTION_RESUME_SCHEDULED",
  "ISSUE_SUBMITTED",
  "ISSUE_ASSIGNED",
  "ISSUE_ASSIGNED_ADMIN",
  "ISSUE_IN_PROGRESS",
  "ISSUE_REASSIGNED",
  "ISSUE_PRIORITY_CHANGED",
  "ISSUE_CATEGORY_CHANGED",
  "ISSUE_RESOLVED",
];

// `entityId` is read defensively (flat field or nested data/metadata).
const entityIdOf = (n) =>
  n?.entityId ?? n?.data?.entityId ?? n?.metadata?.entityId ?? null;

// Map each type to its action. `resolve(id)` returns:
//   { label, path, state? }  → render a button that navigates there
//   null                     → no navigable action (mark-as-read only)
const ACTIONS = {
  // ---- Billing / payments ----
  PAYMENT_MADE_FOR_PLAN: () => ({ label: "View payment", path: "/billing-payments/invoice-payments" }),

  // ---- Features ----
  PRODUCT_ACCESS: () => ({ label: "View features", path: "/features" }),

  // ---- Tenants (deep-link by id, fallback to the list) ----
  TENANT_CREATED: (id) => (id
    ? { label: "View tenant", path: `/tenants/tenant-lists/overview/${id}` }
    : { label: "View tenant", path: "/tenants/tenant-list" }),
  TENANT_DEACTIVATED: (id) => (id
    ? { label: "View tenant", path: `/tenants/tenant-lists/overview/${id}` }
    : { label: "View tenant", path: "/tenants/tenant-list" }),

  // ---- Plans ----
  PLAN_CREATED: () => ({ label: "View plans", path: "/billing-payments/plans-pricing" }),
  PLAN_DEACTIVATED: () => ({ label: "View plans", path: "/billing-payments/plans-pricing" }),
  PLAN_DELETED: () => ({ label: "View plans", path: "/billing-payments/plans-pricing" }),

  // ---- Subscriptions ----
  SUBSCRIPTION_PAUSED: () => ({ label: "View subscription", path: "/billing-payments/subscription-manager" }),
  SUBSCRIPTION_CANCELLED: () => ({ label: "View subscription", path: "/billing-payments/subscription-manager" }),
  SUBSCRIPTION_AUTO_RENEWED: () => ({ label: "View subscription", path: "/billing-payments/subscription-manager" }),
  SUBSCRIPTION_CREATED: () => ({ label: "View subscription", path: "/billing-payments/subscription-manager" }),
  SUBSCRIPTION_RESUMED: () => ({ label: "View subscription", path: "/billing-payments/subscription-manager" }),
  SUBSCRIPTION_CANCELLATION_SCHEDULED: () => ({ label: "View subscription", path: "/billing-payments/subscription-manager" }),
  SUBSCRIPTION_PAUSE_SCHEDULED: () => ({ label: "View subscription", path: "/billing-payments/subscription-manager" }),
  SUBSCRIPTION_RESUME_SCHEDULED: () => ({ label: "View subscription", path: "/billing-payments/subscription-manager" }),

  // ---- Issues (land on the issues section, carry entityId as focusId) ----
  ISSUE_SUBMITTED: (id) => ({ label: "View issue", path: "/issues", state: { focusId: id } }),
  ISSUE_ASSIGNED: (id) => ({ label: "View issue", path: "/issues", state: { focusId: id } }),
  ISSUE_ASSIGNED_ADMIN: (id) => ({ label: "View issue", path: "/issues", state: { focusId: id } }),
  ISSUE_IN_PROGRESS: (id) => ({ label: "View issue", path: "/issues", state: { focusId: id } }),
  ISSUE_REASSIGNED: (id) => ({ label: "View issue", path: "/issues", state: { focusId: id } }),
  ISSUE_PRIORITY_CHANGED: (id) => ({ label: "View issue", path: "/issues", state: { focusId: id } }),
  ISSUE_CATEGORY_CHANGED: (id) => ({ label: "View issue", path: "/issues", state: { focusId: id } }),
  ISSUE_RESOLVED: (id) => ({ label: "View issue", path: "/issues", state: { focusId: id } }),
};

// Fallback by entityType, so a notification still gets a working "view" action
// even if its exact `type` string isn't in ACTIONS (new/renamed types).
// Keys must be members of NOTIFICATION_ENTITY_TYPE. The previous FEATURE and
// PRODUCT keys are not in the backend enum, so those fallbacks could never
// fire; INVOICE is in the enum and was missing. Entity types outside control's
// domain (APPOINTMENT, CLIENT, TIMESHEET, …) are deliberately absent — this app
// has no route for them.
const ENTITY_FALLBACK = {
  ISSUE: (id) => ({ label: "View issue", path: "/issues", state: { focusId: id } }),
  TENANT: (id) => (id
    ? { label: "View tenant", path: `/tenants/tenant-lists/overview/${id}` }
    : { label: "View tenant", path: "/tenants/tenant-list" }),
  PLAN: () => ({ label: "View plans", path: "/billing-payments/plans-pricing" }),
  SUBSCRIPTION: () => ({ label: "View subscription", path: "/billing-payments/subscription-manager" }),
  PAYMENT: () => ({ label: "View payment", path: "/billing-payments/invoice-payments" }),
  INVOICE: () => ({ label: "View invoice", path: "/billing-payments/invoice-payments" }),
};

// Dev-only guard: a fallback keyed on a name the backend never sends is dead
// code that looks alive, which is exactly how the previous keys survived.
if (import.meta.env.DEV) {
  Object.keys(ENTITY_FALLBACK)
    .filter((key) => !NOTIFICATION_ENTITY_TYPE[key])
    .forEach((key) =>
      console.error(
        `[notificationConfig] ENTITY_FALLBACK key "${key}" is not a NotificationEntityType; it will never match.`
      )
    );
}

// Resolve the action for a notification. Returns { label, path, state? } or null.
export const getNotificationAction = (notif) => {
  const id = entityIdOf(notif);
  const build = ACTIONS[notif?.type];
  if (build) {
    const action = build(id);
    if (action) return action;
  }
  const fallback = ENTITY_FALLBACK[notif?.entityType];
  if (fallback) return fallback(id);
  return null;
};

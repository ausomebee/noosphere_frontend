// ---------------------------------------------------------------------------
// Tenant notification config: type → section label, display order, and the
// action (label + route) each notification maps to.
//
// The backend attaches `entityId` (the id of the related record) to every
// notification. Routes that take a single id use it directly to deep-link;
// client-scoped destinations (which need both clientId and tenantClientId)
// land on the relevant section and carry `entityId` in navigation state so the
// destination can focus the record.
// ---------------------------------------------------------------------------

// Section header label per type.
export const TYPE_LABEL = {
  UPCOMING_APPOINTMENT: "UPCOMING APPOINTMENT",
  NEW_RESCHEDULE_REQUEST: "NEW RESCHEDULE REQUEST",
  RESCHEDULED_APPOINTMENT: "RESCHEDULED APPOINTMENT",
  APPOINTMENT_START_REMINDER: "APPOINTMENT START REMINDER",
  APPOINTMENT_STARTED: "APPOINTMENT STARTED",
  CANCELLED_APPOINTMENT: "CANCELLED APPOINTMENT",
  COMPLETED_APPOINTMENT: "COMPLETED APPOINTMENT",
  CLIENT_PROFILE_CREATION: "NEW CLIENT",
  DOCUMENT_REQUEST_CREATED: "DOCUMENT REQUEST",
  DOCUMENT_REQUEST_COMPLETED: "DOCUMENT REQUEST COMPLETED",
  DOCUMENT_REQUEST_NUDGE: "DOCUMENT REQUEST NUDGE",
  FORM_CREATED: "FORM CREATED",
  FORM_FILLED: "FORM FILLED",
  AUTHORIZATION_CREATION: "NEW AUTHORIZATION",
  AUTHORIZATION_EXPIRY_1_MONTH: "AUTHORIZATION EXPIRY - 1 MONTH",
  AUTHORIZATION_EXPIRY_1_WEEK: "AUTHORIZATION EXPIRY - 1 WEEK",
  AUTHORIZATION_UTILIZATION_80_PERCENT: "AUTHORIZATION UTILIZATION",
  AUTHORIZATION_UTILIZATION_ZERO: "AUTHORIZATION UTILIZATION",
  REPORT_APPROVAL_REQUEST_TO_SUPERVISOR: "REPORT APPROVAL REQUEST",
  REPORT_APPROVED_BY_SUPERVISOR: "REPORT APPROVED",
  CLIENT_REPORT_SIGNED: "CLIENT REPORT SIGNED",
  CLIENT_REPORT_CHANGE_REQUEST: "REPORT CHANGE REQUEST",
  ORGANIZATION_LICENSE_EXPIRY_SOON: "LICENSE EXPIRY",
  ORGANIZATION_LICENSE_EXPIRED: "LICENSE EXPIRED",
  ORGANIZATION_LICENSE_EXPIRY_1_MONTH: "LICENSE EXPIRY - 1 MONTH",
  TIMESHEET_CREATED: "NEW TIMESHEET",
  TIMESHEET_CHANGE_REQUESTED: "TIMESHEET CHANGE REQUEST",
  TIMESHEET_APPROVED: "TIMESHEET APPROVED",
  TIMESHEET_REJECTED: "TIMESHEET REJECTED",
  PAYER_AUTHORIZATION_EXPIRY_SOON: "PAYER AUTHORIZATION EXPIRY",
  PAYER_AUTHORIZATION_EXPIRY_1_MONTH: "PAYER AUTHORIZATION EXPIRY - 1 MONTH",
  UPCOMING_PAYROLL: "UPCOMING PAYROLL",
  NEW_PAYROLL_RUN: "NEW PAYROLL RUN",
  TICKET_SUBMITTED: "TICKET SUBMITTED",
  TICKET_STATUS_IN_PROGRESS: "TICKET IN PROGRESS",
  TICKET_STATUS_RESOLVED: "TICKET RESOLVED",
  TICKET_WITHDRAWN: "TICKET WITHDRAWN",
};

// Display order for the grouped sections.
export const TYPE_ORDER = [
  "UPCOMING_APPOINTMENT",
  "APPOINTMENT_START_REMINDER",
  "APPOINTMENT_STARTED",
  "NEW_RESCHEDULE_REQUEST",
  "RESCHEDULED_APPOINTMENT",
  "CANCELLED_APPOINTMENT",
  "COMPLETED_APPOINTMENT",
  "CLIENT_PROFILE_CREATION",
  "DOCUMENT_REQUEST_CREATED",
  "DOCUMENT_REQUEST_COMPLETED",
  "DOCUMENT_REQUEST_NUDGE",
  "FORM_CREATED",
  "FORM_FILLED",
  "AUTHORIZATION_CREATION",
  "AUTHORIZATION_EXPIRY_1_WEEK",
  "AUTHORIZATION_EXPIRY_1_MONTH",
  "AUTHORIZATION_UTILIZATION_80_PERCENT",
  "AUTHORIZATION_UTILIZATION_ZERO",
  "REPORT_APPROVAL_REQUEST_TO_SUPERVISOR",
  "REPORT_APPROVED_BY_SUPERVISOR",
  "CLIENT_REPORT_SIGNED",
  "CLIENT_REPORT_CHANGE_REQUEST",
  "ORGANIZATION_LICENSE_EXPIRY_SOON",
  "ORGANIZATION_LICENSE_EXPIRY_1_MONTH",
  "ORGANIZATION_LICENSE_EXPIRED",
  "TIMESHEET_CREATED",
  "TIMESHEET_CHANGE_REQUESTED",
  "TIMESHEET_APPROVED",
  "TIMESHEET_REJECTED",
  "PAYER_AUTHORIZATION_EXPIRY_SOON",
  "PAYER_AUTHORIZATION_EXPIRY_1_MONTH",
  "UPCOMING_PAYROLL",
  "NEW_PAYROLL_RUN",
  "TICKET_SUBMITTED",
  "TICKET_STATUS_IN_PROGRESS",
  "TICKET_STATUS_RESOLVED",
  "TICKET_WITHDRAWN",
];

// Appointment sub-tab keys on /scheduler/appointments (see Appointments.jsx).
const APPT = {
  upcoming: "upcomingAppointments",
  reschedule: "rescheduleRequests",
  past: "pastAppointments",
  cancelled: "cancelledAppointments",
};

// Map each type to its action. `resolve(notif)` returns:
//   { label, path, state? }  → render a button that navigates there
//   null                     → no navigable action (mark-as-read only)
// `entityId` is read defensively (flat field or nested data/metadata).
const entityIdOf = (n) =>
  n?.entityId ?? n?.data?.entityId ?? n?.metadata?.entityId ?? null;

const ACTIONS = {
  // ---- Appointments → /scheduler/appointments, focus the right sub-tab ----
  UPCOMING_APPOINTMENT: (id) => ({ label: "View appointment", path: "/scheduler/appointments", state: { focusTab: APPT.upcoming, focusId: id } }),
  APPOINTMENT_START_REMINDER: (id) => ({ label: "View appointment", path: "/scheduler/appointments", state: { focusTab: APPT.upcoming, focusId: id } }),
  APPOINTMENT_STARTED: (id) => ({ label: "View appointment", path: "/scheduler/appointments", state: { focusTab: APPT.upcoming, focusId: id } }),
  RESCHEDULED_APPOINTMENT: (id) => ({ label: "View appointment", path: "/scheduler/appointments", state: { focusTab: APPT.upcoming, focusId: id } }),
  NEW_RESCHEDULE_REQUEST: (id) => ({ label: "View request", path: "/scheduler/appointments", state: { focusTab: APPT.reschedule, focusId: id } }),
  CANCELLED_APPOINTMENT: (id) => ({ label: "View appointment", path: "/scheduler/appointments", state: { focusTab: APPT.cancelled, focusId: id } }),
  COMPLETED_APPOINTMENT: (id) => ({ label: "View appointment", path: "/scheduler/appointments", state: { focusTab: APPT.past, focusId: id } }),

  // ---- Clients (client-scoped: land on the clients section) ----
  CLIENT_PROFILE_CREATION: (id) => ({ label: "View client", path: "/clients/client-list", state: { focusId: id } }),
  DOCUMENT_REQUEST_CREATED: (id) => ({ label: "View documents", path: "/clients/client-list", state: { focusId: id, focusTab: "documents" } }),
  DOCUMENT_REQUEST_COMPLETED: (id) => ({ label: "View documents", path: "/clients/client-list", state: { focusId: id, focusTab: "documents" } }),
  DOCUMENT_REQUEST_NUDGE: (id) => ({ label: "View documents", path: "/clients/client-list", state: { focusId: id, focusTab: "documents" } }),
  AUTHORIZATION_CREATION: (id) => ({ label: "View authorization", path: "/clients/client-list", state: { focusId: id, focusTab: "authorization" } }),
  AUTHORIZATION_EXPIRY_1_MONTH: (id) => ({ label: "View authorization", path: "/clients/client-list", state: { focusId: id, focusTab: "authorization" } }),
  AUTHORIZATION_EXPIRY_1_WEEK: (id) => ({ label: "View authorization", path: "/clients/client-list", state: { focusId: id, focusTab: "authorization" } }),
  AUTHORIZATION_UTILIZATION_80_PERCENT: (id) => ({ label: "View authorization", path: "/clients/client-list", state: { focusId: id, focusTab: "authorization" } }),
  AUTHORIZATION_UTILIZATION_ZERO: (id) => ({ label: "View authorization", path: "/clients/client-list", state: { focusId: id, focusTab: "authorization" } }),
  REPORT_APPROVAL_REQUEST_TO_SUPERVISOR: (id) => ({ label: "View report", path: "/clients/client-list", state: { focusId: id, focusTab: "clinicalReports" } }),
  REPORT_APPROVED_BY_SUPERVISOR: (id) => ({ label: "View report", path: "/clients/client-list", state: { focusId: id, focusTab: "clinicalReports" } }),
  CLIENT_REPORT_SIGNED: (id) => ({ label: "View report", path: "/clients/client-list", state: { focusId: id, focusTab: "clinicalReports" } }),
  CLIENT_REPORT_CHANGE_REQUEST: (id) => ({ label: "View report", path: "/clients/client-list", state: { focusId: id, focusTab: "clinicalReports" } }),

  // ---- Forms (single-id deep links) ----
  FORM_CREATED: () => ({ label: "View forms", path: "/custom-forms/forms" }),
  FORM_FILLED: (id) => (id ? { label: "View responses", path: `/custom-forms/forms/responses/${id}` } : { label: "View forms", path: "/custom-forms/forms" }),

  // ---- Organisation licenses ----
  ORGANIZATION_LICENSE_EXPIRY_SOON: () => ({ label: "View licenses", path: "/organization/general" }),
  ORGANIZATION_LICENSE_EXPIRED: () => ({ label: "View licenses", path: "/organization/general" }),
  ORGANIZATION_LICENSE_EXPIRY_1_MONTH: () => ({ label: "View licenses", path: "/organization/general" }),

  // ---- Timesheets (single-id deep links) ----
  TIMESHEET_CREATED: (id) => (id ? { label: "View timesheet", path: `/billing/timesheets/${id}` } : { label: "View timesheets", path: "/billing/timesheets" }),
  TIMESHEET_CHANGE_REQUESTED: (id) => (id ? { label: "View timesheet", path: `/billing/timesheets/${id}` } : { label: "View timesheets", path: "/billing/timesheets" }),
  TIMESHEET_APPROVED: (id) => (id ? { label: "View timesheet", path: `/billing/timesheets/${id}` } : { label: "View timesheets", path: "/billing/timesheets" }),
  TIMESHEET_REJECTED: (id) => (id ? { label: "View timesheet", path: `/billing/timesheets/${id}` } : { label: "View timesheets", path: "/billing/timesheets" }),

  // ---- Payer authorization → practice settings (payer) ----
  PAYER_AUTHORIZATION_EXPIRY_SOON: () => ({ label: "View payers", path: "/organization/practice-settings" }),
  PAYER_AUTHORIZATION_EXPIRY_1_MONTH: () => ({ label: "View payers", path: "/organization/practice-settings" }),

  // ---- Payroll ----
  UPCOMING_PAYROLL: () => ({ label: "View payroll", path: "/payroll/payroll-setup" }),
  NEW_PAYROLL_RUN: () => ({ label: "View payroll", path: "/payroll/payroll-setup" }),

  // ---- Tickets → support request details (single-id deep links) ----
  TICKET_SUBMITTED: (id) => (id ? { label: "View request", path: `/help/support-requests/${id}` } : { label: "View requests", path: "/help/support-requests" }),
  TICKET_STATUS_IN_PROGRESS: (id) => (id ? { label: "View request", path: `/help/support-requests/${id}` } : { label: "View requests", path: "/help/support-requests" }),
  TICKET_STATUS_RESOLVED: (id) => (id ? { label: "View request", path: `/help/support-requests/${id}` } : { label: "View requests", path: "/help/support-requests" }),
  TICKET_WITHDRAWN: (id) => (id ? { label: "View request", path: `/help/support-requests/${id}` } : { label: "View requests", path: "/help/support-requests" }),
};

// Resolve the action for a notification. Returns { label, path, state? } or null.
export const getNotificationAction = (notif) => {
  const build = ACTIONS[notif?.type];
  if (!build) return null;
  const action = build(entityIdOf(notif));
  return action || null;
};

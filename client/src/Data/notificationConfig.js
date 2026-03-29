// ---------------------------------------------------------------------------
// Notification type → section header label
// ---------------------------------------------------------------------------
export const TYPE_LABEL = {
  APPOINTMENT_SCHEDULED:                   "NEW APPOINTMENT",
  APPOINTMENT_ABOUT_TO_START:              "UPCOMING APPOINTMENT",
  APPOINTMENT_RESCHEDULED:                 "RESCHEDULED APPOINTMENT",
  APPOINTMENT_STARTED:                     "APPOINTMENT START",
  APPOINTMENT_CANCELLED:                   "CANCELLED APPOINTMENTS",
  APPOINTMENT_COMPLETED_AWAITING_FEEDBACK: "COMPLETED APPOINTMENT AWAITING FEEDBACK",
  DOCUMENT_REQUESTED:                      "DOCUMENT REQUEST",
  DOCUMENT_REQUEST_NUDGE:                  "DOCUMENT REQUEST NUDGE",
  FORM_SHARED:                             "FORM REQUEST",
  AUTHORIZATION_EXPIRY_30_DAYS:            "AUTHORIZATION EXPIRY - 30 DAYS",
  AUTHORIZATION_EXPIRY_7_DAYS:             "AUTHORIZATION EXPIRY - 7 DAYS",
  AUTHORIZATION_EXPIRED:                   "AUTHORIZATION EXPIRED",
  AUTHORIZATION_UNITS_ALMOST_EXHAUSTED:    "AUTHORIZATION UTILIZATION",
  AUTHORIZATION_UNITS_EXHAUSTED:           "AUTHORIZATION UTILIZATION",
  SIGNATURE_REQUESTED:                     "CLIENT REPORT SIGNATURE REQUEST",
};

// ---------------------------------------------------------------------------
// Display order for notification type sections
// ---------------------------------------------------------------------------
export const TYPE_ORDER = [
  "APPOINTMENT_SCHEDULED",
  "APPOINTMENT_ABOUT_TO_START",
  "APPOINTMENT_RESCHEDULED",
  "APPOINTMENT_STARTED",
  "APPOINTMENT_CANCELLED",
  "APPOINTMENT_COMPLETED_AWAITING_FEEDBACK",
  "DOCUMENT_REQUESTED",
  "DOCUMENT_REQUEST_NUDGE",
  "FORM_SHARED",
  "AUTHORIZATION_EXPIRY_30_DAYS",
  "AUTHORIZATION_EXPIRY_7_DAYS",
  "AUTHORIZATION_EXPIRED",
  "AUTHORIZATION_UNITS_ALMOST_EXHAUSTED",
  "AUTHORIZATION_UNITS_EXHAUSTED",
  "SIGNATURE_REQUESTED",
];

// ---------------------------------------------------------------------------
// Notification preference items (used by NotificationSettings component)
// ---------------------------------------------------------------------------
export const notificationItems = [
  {
    key: "appointmentScheduled",
    label: "Notify me when a new appointment has been scheduled",
  },
  {
    key: "appointmentRescheduled",
    label: "Notify me when an appointment has been rescheduled",
  },
  {
    key: "appointmentAboutToStart",
    label: "Notify me when an appointment is about to start",
  },
  {
    key: "appointmentStarted",
    label: "Notify me when an appointment starts",
  },
  {
    key: "appointmentCancelled",
    label: "Notify me when an appointment has been cancelled",
  },
  {
    key: "appointmentCompletedAwaitingFeedback",
    label: "Notify me when an appointment is completed and awaiting my feedback",
  },
  {
    key: "documentRequested",
    label: "Notify me when a document has been requested from me",
  },
  {
    key: "formShared",
    label: "Notify me when a form has been shared with me",
  },
  {
    key: "authorizationAboutToExpire",
    label: "Notify me when one or more authorization are about to expire",
  },
  {
    key: "authorizationExpired",
    label: "Notify me when one or more authorizations expire",
  },
  {
    key: "authorizationUnitsAlmostExhausted",
    label: "Notify me when one or more authorization units are almost exhausted",
  },
  {
    key: "authorizationUnitsExhausted",
    label: "Notify me when one or more authorization units have been exhausted",
  },
  {
    key: "signatureRequested",
    label: "Notify me when my signature is requested for a clinical report",
  },
];

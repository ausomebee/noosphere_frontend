const ERROR_MESSAGES = {
  // ── Tenant ──────────────────────────────────────────────
  LOAD_TENANT: "Unable to load tenant details. Please refresh the page.",
  LOAD_TENANTS: "Unable to load tenants. Please refresh the page.",
  LOAD_TENANT_DATA: "Unable to load data. Please refresh the page.",
  UPDATE_TENANT: "Unable to update tenant. Please try again.",
  UPDATE_TENANT_EMAIL: "Unable to update email. Please try again.",
  UPDATE_TENANT_PHONE: "Unable to update phone number. Please try again.",
  RESET_TENANT_PASSWORD: "Unable to reset password. Please try again.",
  DEACTIVATE_TENANT: "Unable to deactivate tenant. Please try again.",
  CHANGE_ACCOUNT_OFFICER: "Unable to change account officer. Please try again.",
  LOAD_ACTIVITY_LOGS: "Unable to load activity logs. Please refresh the page.",
  LOAD_USAGE_STATISTICS: "Unable to load usage statistics. Please refresh the page.",
  LOAD_SERVER_REQUESTS: "Unable to load server requests. Please refresh the page.",

  // ── Billing & Payments ──────────────────────────────────
  LOAD_BILLING_DATA: "Unable to load billing data. Please refresh the page.",
  LOAD_INVOICE: "Unable to load invoice. Please try again.",
  LOAD_PAYMENT_DETAILS: "Unable to load payment details. Please try again.",
  DOWNLOAD_INVOICE: "Unable to download invoice. Please try again.",
  LOAD_PAYMENT_INVOICE: "Unable to load payment invoice. Please try again.",
  LOAD_SUBSCRIBERS: "Unable to load subscribers. Please refresh the page.",
  LOAD_PLANS: "Unable to load plans. Please refresh the page.",
  GENERATE_PAYMENT_LINK: "Unable to generate payment link. Please try again.",
  REGENERATE_PAYMENT_LINK: "Unable to regenerate payment link. Please try again.",
  LOAD_REPORT: "Unable to load report. Please refresh the page.",
  RECORD_PAYMENT: "Payment was processed but failed to record. Please contact support.",
  LOG_PAYMENT_FAILURE: "Unable to log payment. Please contact support.",
  UPDATE_SUBSCRIPTION: "Unable to update subscription. Please try again.",
  LOAD_PAYMENTS: "Unable to load payments. Please refresh the page.",
  UPDATE_PAYMENT: "Unable to update payment. Please try again.",
  LOAD_INVOICES: "Unable to load invoices. Please refresh the page.",
  UPDATE_INVOICE: "Unable to update invoice. Please try again.",

  // ── Issue Management ────────────────────────────────────
  LOAD_ISSUES: "Unable to load issues. Please refresh the page.",
  LOAD_ISSUE: "Unable to load issue details. Please try again.",
  ADD_ISSUE: "Unable to add issue. Please try again.",
  CREATE_ISSUE: "Unable to create issue. Please try again.",
  ADD_COMMENT: "Unable to add comment. Please try again.",
  EDIT_ISSUE: "Unable to edit issue. Please try again.",
  ADD_ATTACHMENT: "Unable to add attachment. Please try again.",
  CHANGE_CATEGORY: "Unable to change category. Please try again.",
  CHANGE_PRIORITY: "Unable to change priority. Please try again.",
  REASSIGN_ISSUE: "Unable to reassign issue. Please try again.",
  CHANGE_STATUS: "Unable to change status. Please try again.",
  SEND_EMAIL: "Unable to send email. Please try again.",
  RESOLVE_ISSUE: "Unable to resolve issue. Please try again.",
  CONTACT_TENANT: "Unable to send message. Please try again.",

  // ── Feature Management ──────────────────────────────────
  LOAD_FEATURES: "Unable to load features. Please refresh the page.",

  // ── Settings ────────────────────────────────────────────
  LOAD_STAFF: "Unable to load staff. Please refresh the page.",
  SAVE_STAFF: "Unable to save staff. Please try again.",
  UPDATE_STATUS: "Unable to update status. Please try again.",
  LOAD_ROLES: "Unable to load roles. Please refresh the page.",
  UPDATE_ROLE_STATUS: "Unable to update role status. Please try again.",
  LOAD_ROLE: "Unable to load role. Please try again.",
  SAVE_ROLE: "Unable to save role. Please try again.",
  LOAD_DEPARTMENTS: "Unable to load departments. Please refresh the page.",
  SAVE_DEPARTMENT: "Unable to save department. Please try again.",
  DELETE_DEPARTMENT: "Unable to delete department. Please try again.",
  CHANGE_PASSWORD: "Unable to change password. Please try again.",
  CHANGE_ADMIN_PASSWORD: "Unable to change administrative password. Please try again.",
  VERIFY_ADMIN_PASSWORD: "Unable to verify administrative password. Please try again.",

  // ── Pipeline ────────────────────────────────────────────
  MOVE_CANDIDATE: "Unable to move candidate. Please try again.",
  ASSIGN_STAFF: "Unable to assign staff. Please try again.",
  DELETE_PROSPECT: "Unable to delete prospect. Please try again.",
  DELETE_CANDIDATE: "Unable to delete candidate. Please try again.",
  DELETE_COLUMN: "Unable to delete column. Please try again.",
  UPDATE_CANDIDATE: "Unable to update candidate. Please try again.",
  CREATE_PIPELINE_STAGE: "Unable to create pipeline stage. Please try again.",

  // ── Authentication ──────────────────────────────────────
  VERIFY_2FA: "Verification failed. Please try again.",

  // ── Generic ─────────────────────────────────────────────
  DEFAULT: "Something went wrong. Please try again.",
};

export default ERROR_MESSAGES;

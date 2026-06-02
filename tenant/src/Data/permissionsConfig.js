/**
 * Roles & Permissions – module list, data access levels, and granular permissions.
 * Each module maps 1-to-1 with a "Select Module Access" checkbox on Basic Settings.
 * Each module contains subcategories, each with individual permission checkboxes.
 * Module keys match backend enum: DASHBOARD, SCHEDULER, CLIENTS, etc.
 */

export const MODULE_OPTIONS = [
  { key: "DASHBOARD", label: "Dashboard" },
  { key: "SCHEDULER", label: "Scheduler" },
  { key: "CLIENTS", label: "Clients" },
  { key: "MY_ORGANIZATION", label: "My Organization" },
  { key: "BILLINGS_PAYMENTS", label: "Billings & Payments" },
  { key: "PAYROLL", label: "Payroll" },
  { key: "PROGRAM_LIBRARY", label: "Program Library" },
  { key: "CUSTOM_FORMS", label: "Custom Forms" },
  { key: "REPORTS", label: "Reports" },
  { key: "HELP_SUPPORT", label: "Help & Support" },
  { key: "SETTINGS", label: "Settings" },
];

export const DATA_ACCESS_LEVELS = [
  { value: "GLOBAL", label: "Global data access" },
  { value: "TEAM", label: "Team-level data access" },
  { value: "INDIVIDUAL", label: "Individual access" },
];

export const PERMISSIONS_CONFIG = {
  /* ───────── DASHBOARD ───────── */
  DASHBOARD: {
    label: "DASHBOARD",
    subcategories: [
      {
        key: "dashboard",
        label: "Dashboard",
        permissions: [
          { key: "view_intake_pipeline_info", label: "View intake pipeline info" },
          { key: "view_session_information", label: "View session information" },
          { key: "view_authorization_information", label: "View authorization information" },
          { key: "view_productivity_information", label: "View productivity information" },
          { key: "view_upcoming_appointments", label: "View upcoming appointments" },
        ],
      },
    ],
  },

  /* ───────── SCHEDULER ───────── */
  SCHEDULER: {
    label: "SCHEDULER",
    subcategories: [
      {
        key: "calendar",
        label: "Calendar",
        permissions: [
          { key: "view_calendar", label: "View calendar" },
          { key: "view_calendar_filter", label: "View staff/client filter on calendar" },
          { key: "view_appointment_details_on_calendar", label: "View appointment details on calendar" },
          { key: "create_a_new_appointment", label: "Create a new appointment" },
          { key: "edit_appointments", label: "Edit appointments" },
          { key: "reschedule_appointments", label: "Reschedule appointments" },
          { key: "start_appointments", label: "Start appointments" },
          { key: "cancel_appointments", label: "Cancel appointments" },
        ],
      },
      {
        key: "appointments",
        label: "Appointments",
        permissions: [
          { key: "view_upcoming_appointments", label: "View upcoming appointments" },
          { key: "create_a_new_appointment", label: "Create a new appointment" },
          { key: "view_reschedule_request", label: "View reschedule request" },
          { key: "edit_appointments", label: "Edit appointments" },
          { key: "view_past_appointments", label: "View past appointments" },
          { key: "reschedule_appointments", label: "Reschedule appointments" },
          { key: "view_canceled_appointments", label: "View canceled appointments" },
          { key: "start_appointments", label: "Start appointments" },
          { key: "cancel_appointments", label: "Cancel appointments" },
        ],
      },
    ],
  },

  /* ───────── CLIENTS ───────── */
  CLIENTS: {
    label: "CLIENTS",
    subcategories: [
      {
        key: "client_pipeline",
        label: "Client Pipeline",
        permissions: [
          { key: "view_onboarding_pipeline", label: "View onboarding pipeline" },
          { key: "manage_pipeline_setup", label: "Manage pipeline setup (edit, move, disable)" },
          { key: "create_pipeline", label: "Create pipeline" },
          { key: "create_candidate_in_pipeline", label: "Create candidate in pipeline" },
          { key: "manage_candidate_in_pipeline", label: "Manage candidate in pipeline" },
        ],
      },
      {
        key: "client_list",
        label: "Client List",
        permissions: [
          { key: "view_client_list", label: "View client list" },
          { key: "view_client_profile", label: "View client profile" },
          { key: "view_client_program_list", label: "View client program list" },
          { key: "view_client_appointment_schedules_list", label: "View client appointment & schedules list" },
          { key: "view_client_authorization_list", label: "View client authorization list" },
          { key: "view_client_clinical_report_list", label: "View client clinical report list" },
          { key: "add_client", label: "Add client" },
          { key: "edit_client_basic_information", label: "Edit client basic information" },
          { key: "deactivate_client", label: "Deactivate client" },
          { key: "view_client_document_forms", label: "View client document & forms" },
          { key: "add_document", label: "Add document" },
          { key: "view_document", label: "View document" },
          { key: "delete_document", label: "Delete document" },
          { key: "view_document_request_list", label: "View document request list" },
          { key: "create_document_request", label: "Create document request" },
          { key: "view_uploaded_documents_in_request_table", label: "View uploaded documents in document request table" },
          { key: "nudge_client", label: "Nudge client" },
          { key: "cancel_document_request", label: "Cancel document request" },
          { key: "download_uploaded_document", label: "Download uploaded document" },
          { key: "view_client_forms_list", label: "View client forms list" },
          { key: "create_form", label: "Create form" },
          { key: "view_form_response", label: "View form response" },
          { key: "view_program", label: "View program" },
          { key: "add_new_program", label: "Add new program" },
          { key: "edit_program", label: "Edit program" },
          { key: "delete_program", label: "Delete program" },
          { key: "add_target", label: "Add target" },
          { key: "view_target_data_sheet", label: "View target data sheet" },
          { key: "remove_target", label: "Remove target" },
          { key: "view_authorization", label: "View authorization" },
          { key: "edit_authorization", label: "Edit authorization" },
          { key: "deactivate_authorization", label: "Deactivate authorization" },
          { key: "delete_authorization", label: "Delete authorization" },
          { key: "view_clinical_report", label: "View clinical report" },
          { key: "duplicate_clinical_report", label: "Duplicate clinical report" },
          { key: "approve_clinical_report", label: "Approve clinical report" },
        ],
      },
    ],
  },

  /* ───────── MY ORGANIZATION ───────── */
  MY_ORGANIZATION: {
    label: "MY ORGANIZATION",
    subcategories: [
      {
        key: "general",
        label: "General",
        permissions: [
          { key: "view_organization_information", label: "View organization information" },
          { key: "view_licenses", label: "View licenses" },
          { key: "view_files_documents_list", label: "View files & documents list" },
          { key: "edit_organization_information", label: "Edit organization information" },
          { key: "add_license", label: "Add license" },
          { key: "edit_license", label: "Edit license" },
          { key: "delete_license", label: "Delete license" },
          { key: "upload_document", label: "Upload document" },
          { key: "download_document", label: "Download document" },
          { key: "view_document", label: "View document" },
          { key: "delete_document", label: "Delete document" },
        ],
      },
      {
        key: "practice_settings",
        label: "Practice Settings",
        permissions: [
          { key: "view_diagnosis_codes", label: "View Diagnosis Codes" },
          { key: "view_session_types", label: "View Session Types" },
          { key: "add_diagnosis_codes", label: "Add Diagnosis Codes" },
          { key: "edit_diagnosis_codes", label: "Edit Diagnosis Codes" },
          { key: "deactivate_diagnosis_codes", label: "Deactivate Diagnosis Codes" },
          { key: "add_session_types", label: "Add Session Types" },
          { key: "edit_session_types", label: "Edit Session Types" },
          { key: "deactivate_session_types", label: "Deactivate Session Types" },
        ],
      },
      {
        key: "staff_teams",
        label: "Staff & Teams",
        permissions: [
          { key: "view_staff_list", label: "View staff list" },
          { key: "view_staff_profile", label: "View staff profile" },
          { key: "view_staff_profile_information", label: "View staff profile information" },
          { key: "view_staff_licenses_list", label: "View staff licenses list" },
          { key: "view_staff_document_list", label: "View staff document list" },
          { key: "view_staff_appointment_schedule", label: "View staff appointment & schedule" },
          { key: "view_staff_clients_list", label: "View staff clients list" },
          { key: "view_staff_payroll", label: "View staff payroll" },
          { key: "create_new_staff", label: "Create new staff" },
          { key: "edit_staff_basic_information", label: "Edit staff basic information" },
          { key: "add_staff_license", label: "Add staff license" },
          { key: "delete_staff_license", label: "Delete staff license" },
          { key: "upload_staff_document", label: "Upload staff document" },
          { key: "view_staff_document", label: "View staff document" },
          { key: "delete_staff_document", label: "Delete staff document" },
          { key: "set_staff_availability", label: "Set staff availability" },
          { key: "edit_staff_payroll_settings", label: "Edit staff payroll settings" },
          { key: "deactivate_staff", label: "Deactivate staff" },
          { key: "view_teams_list", label: "View teams list" },
          { key: "create_new_team", label: "Create new team" },
          { key: "edit_a_team", label: "Edit a team" },
          { key: "deactivate_a_team", label: "Deactivate a team" },
        ],
      },
      {
        key: "roles_permissions",
        label: "Roles & Permissions",
        permissions: [
          { key: "view_roles_list", label: "View roles list" },
          { key: "create_new_role", label: "Create new role" },
          { key: "edit_a_role", label: "Edit a role" },
          { key: "view_roles_permissions", label: "View roles permissions" },
          { key: "deactivate_a_role", label: "Deactivate a role" },
        ],
      },
    ],
  },

  /* ───────── BILLING & PAYMENTS ───────── */
  BILLINGS_PAYMENTS: {
    label: "BILLING & PAYMENTS",
    subcategories: [
      {
        key: "timesheets",
        label: "Timesheets",
        permissions: [
          { key: "view_timesheets_list", label: "View timesheets list" },
          { key: "view_timesheet_details", label: "View timesheet details" },
          { key: "view_timesheet_history_approvals", label: "View timesheet history & approvals" },
          { key: "nudge_client_for_approval", label: "Nudge client for approval" },
          { key: "approve_timesheet_convert_to_claim", label: "Approve timesheet & convert to claim" },
          { key: "export_timesheet_as_pdf", label: "Export timesheet as PDF" },
          { key: "delete_license", label: "Delete license" },
          { key: "upload_document", label: "Upload document" },
          { key: "reject_timesheet", label: "Reject timesheet" },
        ],
      },
      {
        key: "claims",
        label: "Claims",
        permissions: [
          { key: "can_view_claims", label: "Can view claims" },
        ],
      },
      {
        key: "settings",
        label: "Settings",
        permissions: [
          { key: "view_service_codes_list", label: "View service codes list" },
          { key: "view_rounding_rules_list", label: "View rounding rules list" },
          { key: "view_payers_list", label: "View payers list" },
          { key: "view_insurance_list", label: "View insurance list" },
          { key: "view_service_code", label: "View service code" },
          { key: "add_service_code", label: "Add service code" },
          { key: "edit_service_code", label: "Edit service code" },
          { key: "deactivate_service_code", label: "Deactivate service code" },
          { key: "add_rounding_rule", label: "Add rounding rule" },
          { key: "edit_rounding_rule", label: "Edit rounding rule" },
          { key: "deactivate_rounding_rule", label: "Deactivate rounding rule" },
          { key: "add_payer", label: "Add payer" },
          { key: "view_payer_information", label: "View payer information" },
          { key: "edit_payer", label: "Edit payer" },
          { key: "deactivate_payer", label: "Deactivate payer" },
          { key: "view_insurance_type_information", label: "View insurance type information" },
          { key: "add_insurance_type", label: "Add insurance type" },
          { key: "edit_insurance_type", label: "Edit insurance type" },
          { key: "deactivate_insurance_type", label: "Deactivate insurance type" },
        ],
      },
    ],
  },

  /* ───────── PAYROLL ───────── */
  PAYROLL: {
    label: "PAYROLL",
    subcategories: [
      {
        key: "payroll",
        label: "Payroll",
        permissions: [
          { key: "view_payroll_list", label: "View payroll list" },
          { key: "view_payroll_information", label: "View payroll information" },
          { key: "create_new_payroll", label: "Create new payroll" },
          { key: "edit_payroll_information", label: "Edit payroll information" },
        ],
      },
      {
        key: "payroll_settings",
        label: "Payroll settings",
        permissions: [
          { key: "view_compensation_type_list", label: "View compensation type list" },
          { key: "view_income_items_list", label: "View income items list" },
          { key: "view_deductions_list", label: "View deductions list" },
          { key: "view_payroll_cycles_list", label: "View payroll cycles list" },
          { key: "activate_deactivate_compensation_type", label: "Activate/deactivate compensation type" },
          { key: "add_income_item", label: "Add income item" },
          { key: "edit_income_item", label: "Edit income item" },
          { key: "deactivate_income_item", label: "Deactivate income item" },
          { key: "add_deductions", label: "Add deductions" },
          { key: "edit_deductions", label: "Edit deductions" },
          { key: "deactivate_deductions", label: "Deactivate deductions" },
          { key: "create_payroll_cycle", label: "Create payroll cycle" },
          { key: "edit_payroll_cycle", label: "Edit payroll cycle" },
          { key: "deactivate_payroll_cycle", label: "Deactivate payroll cycle" },
        ],
      },
    ],
  },

  /* ───────── PROGRAM LIBRARY ───────── */
  PROGRAM_LIBRARY: {
    label: "PROGRAM LIBRARY",
    subcategories: [
      {
        key: "program_library",
        label: "Program library",
        permissions: [
          { key: "view_program_library", label: "View program library" },
          { key: "create_domain", label: "Create domain" },
          { key: "edit_domain", label: "Edit domain" },
          { key: "delete_domain", label: "Delete domain" },
          { key: "create_program", label: "Create program" },
          { key: "edit_program", label: "Edit program" },
          { key: "delete_program", label: "Delete program" },
          { key: "create_target", label: "Create target" },
          { key: "edit_target", label: "Edit target" },
          { key: "delete_target", label: "Delete target" },
        ],
      },
    ],
  },

  /* ───────── CUSTOM FORMS ───────── */
  CUSTOM_FORMS: {
    label: "CUSTOM FORMS",
    subcategories: [
      {
        key: "forms",
        label: "Forms",
        permissions: [
          { key: "view_form_list", label: "View form list" },
          { key: "view_form", label: "View form" },
          { key: "create_form", label: "Create form" },
          { key: "edit_form", label: "Edit form" },
          { key: "duplicate_form", label: "Duplicate form" },
          { key: "delete_form", label: "Delete form" },
        ],
      },
      {
        key: "template_library",
        label: "Template Library",
        permissions: [
          { key: "view_template_list", label: "View template list" },
          { key: "view_template", label: "View template" },
          { key: "create_template", label: "Create template" },
          { key: "duplicate_template", label: "Duplicate template" },
          { key: "edit_template", label: "Edit template" },
          { key: "delete_template", label: "Delete template" },
        ],
      },
    ],
  },

  /* ───────── REPORTS ───────── */
  REPORTS: {
    label: "REPORTS",
    subcategories: [
      {
        key: "reports",
        label: "Reports",
        permissions: [
          { key: "view_report_list", label: "View report list" },
          { key: "view_report", label: "View report" },
          { key: "export_report", label: "Export report" },
        ],
      },
    ],
  },

  /* ───────── HELP & SUPPORT ───────── */
  HELP_SUPPORT: {
    label: "HELP & SUPPORT",
    subcategories: [
      {
        key: "support_requests",
        label: "Support Requests",
        permissions: [
          { key: "view_support_request_list", label: "View support request list" },
          { key: "view_support_request", label: "View support request" },
          { key: "create_support_request", label: "Create support request" },
          { key: "withdraw_support_request", label: "Withdraw support request" },
        ],
      },
      {
        key: "knowledge_base",
        label: "Knowledge base",
        permissions: [
          { key: "view_knowledge_base", label: "View knowledge base" },
        ],
      },
    ],
  },

  /* ───────── SETTINGS ───────── */
  SETTINGS: {
    label: "SETTINGS",
    subcategories: [
      {
        key: "general_settings",
        label: "General Settings",
        permissions: [
          { key: "view_general_settings", label: "View general settings" },
          { key: "edit_general_settings", label: "Edit general settings" },
          { key: "edit_security_settings", label: "Edit security settings" },
        ],
      },
      {
        key: "notification_settings",
        label: "Notification Settings",
        permissions: [
          { key: "view_notification_settings", label: "View notification settings" },
          { key: "edit_notification_settings", label: "Edit notification settings" },
        ],
      },
      {
        key: "clinical_reports_template_library",
        label: "Clinical Reports (Template Library)",
        permissions: [
          { key: "view_clinical_report_template_list", label: "View clinical report template list" },
          { key: "view_clinical_report_templates", label: "View clinical report templates" },
          { key: "create_clinical_report_template", label: "Create clinical report template" },
          { key: "edit_clinical_report_templates", label: "Edit clinical report templates" },
          { key: "duplicate_clinical_report_template", label: "Duplicate clinical report template" },
          { key: "delete_clinical_report_template", label: "Delete clinical report template" },
        ],
      },
    ],
  },
};

/**
 * Build a blank permissions object with every permission set to false.
 * Shape: { [moduleKey]: { [subcatKey]: { [permKey]: false } } }
 */
export const buildBlankPermissions = () => {
  const perms = {};
  for (const [moduleKey, module] of Object.entries(PERMISSIONS_CONFIG)) {
    perms[moduleKey] = {};
    for (const subcat of module.subcategories) {
      perms[moduleKey][subcat.key] = {};
      for (const perm of subcat.permissions) {
        perms[moduleKey][subcat.key][perm.key] = false;
      }
    }
  }
  return perms;
};

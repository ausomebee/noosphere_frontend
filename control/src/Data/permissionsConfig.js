// Module access options for Basic Settings tab
export const moduleAccessOptions = [
  { key: "tenant", label: "Tenant" },
  { key: "billing", label: "Billing & Payments" },
  { key: "issueManagement", label: "Issue Management" },
  { key: "featureManagement", label: "Feature Management" },
  { key: "performanceMonitoring", label: "Performance Monitoring" },
  { key: "settings", label: "Settings" },
];

// Data Access Level options for the dropdown (matches DataAccessLevel enum)
export const dataAccessLevelOptions = [
  { value: "", label: "Select Data Access Level" },
  { value: "GLOBAL", label: "Global" },
  { value: "TEAM", label: "Team" },
  { value: "INDIVIDUAL", label: "Individual" },
];

// Full permissions configuration organized by module > section > permissions
export const permissionsConfig = [
  {
    module: "TENANT",
    key: "tenant",
    backendKey: "TENANT",
    sections: [
      {
        name: "Pipeline",
        key: "pipeline",
        permissions: [
          { key: "view_pipeline", label: "View pipeline" },
          { key: "create_pipeline_stage", label: "Create pipeline stage" },
          { key: "edit_pipeline_stage", label: "Edit pipeline stage" },
          { key: "delete_pipeline_stage", label: "Delete pipeline stage" },
          { key: "add_prospect", label: "Add prospect to pipeline" },
          { key: "move_prospect", label: "Move prospect between stages" },
          { key: "remove_prospect", label: "Remove prospect from pipeline" },
          { key: "generate_payment_link", label: "Generate payment link" },
        ],
      },
      {
        name: "Tenant List",
        key: "tenant_list",
        permissions: [
          { key: "view_tenant_list", label: "View tenant list" },
          { key: "view_tenant_details", label: "View tenant details" },
          { key: "edit_tenant", label: "Edit tenant information" },
          { key: "deactivate_tenant", label: "Deactivate tenant" },
          { key: "reactivate_tenant", label: "Reactivate tenant" },
          { key: "delete_tenant", label: "Delete tenant" },
          { key: "view_tenant_billing", label: "View tenant billing" },
          { key: "view_tenant_features", label: "View tenant features" },
          { key: "manage_tenant_features", label: "Manage tenant features" },
          { key: "view_tenant_issues", label: "View tenant issues" },
          { key: "view_tenant_logs", label: "View tenant user logs" },
          { key: "view_tenant_security", label: "View tenant security settings" },
          { key: "manage_tenant_security", label: "Manage tenant security settings" },
          { key: "change_account_officer", label: "Change account officer" },
        ],
      },
    ],
  },
  {
    module: "BILLING & PAYMENTS",
    key: "billing",
    backendKey: "BILLING",
    sections: [
      {
        name: "Plans & Pricing",
        key: "plans_pricing",
        permissions: [
          { key: "view_plans", label: "View plans" },
          { key: "create_plan", label: "Create plan" },
          { key: "edit_plan", label: "Edit plan" },
          { key: "delete_plan", label: "Delete plan" },
          { key: "activate_plan", label: "Activate plan" },
          { key: "deactivate_plan", label: "Deactivate plan" },
          { key: "duplicate_plan", label: "Duplicate plan" },
          { key: "view_subscribers", label: "View subscriber list" },
        ],
      },
      {
        name: "Invoices & Payments",
        key: "invoices_payments",
        permissions: [
          { key: "view_invoices", label: "View invoices" },
          { key: "create_invoice", label: "Create invoice" },
          { key: "edit_invoice", label: "Edit invoice" },
          { key: "delete_invoice", label: "Delete invoice" },
          { key: "view_payments", label: "View payments" },
          { key: "process_payment", label: "Process payment" },
        ],
      },
      {
        name: "Subscription Management",
        key: "subscription_management",
        permissions: [
          { key: "view_subscriptions", label: "View subscriptions" },
          { key: "cancel_subscription", label: "Cancel subscription" },
          { key: "pause_subscription", label: "Pause subscription" },
          { key: "resume_subscription", label: "Resume subscription" },
          { key: "modify_subscription", label: "Modify subscription" },
        ],
      },
      {
        name: "Auto-billing Settings",
        key: "auto_billing",
        permissions: [
          { key: "view_auto_billing", label: "View auto-billing settings" },
          { key: "enable_auto_billing", label: "Enable auto-billing" },
          { key: "disable_auto_billing", label: "Disable auto-billing" },
          { key: "configure_auto_billing", label: "Configure auto-billing rules" },
        ],
      },
      {
        name: "Reports",
        key: "billing_reports",
        permissions: [
          { key: "view_billing_reports", label: "View billing reports" },
        ],
      },
    ],
  },
  {
    module: "ISSUE MANAGEMENT",
    key: "issueManagement",
    backendKey: "ISSUE_MANAGEMENT",
    sections: [
      {
        name: "Issue Management",
        key: "issue_management",
        permissions: [
          { key: "view_issues", label: "View issues" },
          { key: "create_issue", label: "Create issue" },
          { key: "edit_issue", label: "Edit issue" },
          { key: "delete_issue", label: "Delete issue" },
          { key: "assign_issue", label: "Assign issue" },
          { key: "reassign_issue", label: "Reassign issue" },
          { key: "change_issue_status", label: "Change issue status" },
          { key: "change_issue_priority", label: "Change issue priority" },
          { key: "add_issue_comment", label: "Add issue comment" },
          { key: "add_issue_attachment", label: "Add issue attachment" },
        ],
      },
    ],
  },
  {
    module: "FEATURE MANAGEMENT",
    key: "featureManagement",
    backendKey: "FEATURE_MANAGEMENT",
    sections: [
      {
        name: "Feature Management",
        key: "feature_management",
        permissions: [
          { key: "view_features", label: "View features" },
          { key: "create_feature", label: "Create feature" },
          { key: "edit_feature", label: "Edit feature" },
          { key: "delete_feature", label: "Delete feature" },
          { key: "activate_feature", label: "Activate feature" },
          { key: "deactivate_feature", label: "Deactivate feature" },
          { key: "view_feature_usage", label: "View feature usage statistics" },
        ],
      },
    ],
  },
  {
    module: "PERFORMANCE MONITORING",
    key: "performanceMonitoring",
    backendKey: "PERFORMANCE_MONITORING",
    sections: [
      {
        name: "Performance Monitoring",
        key: "performance_monitoring",
        permissions: [
          { key: "view_performance", label: "View performance monitoring" },
        ],
      },
    ],
  },
  {
    module: "SETTINGS",
    key: "settings",
    backendKey: "SETTINGS",
    sections: [
      {
        name: "Roles & Permissions",
        key: "roles_permissions",
        permissions: [
          { key: "view_roles", label: "View roles" },
          { key: "create_role", label: "Create role" },
          { key: "edit_role", label: "Edit role" },
          { key: "delete_role", label: "Delete role" },
          { key: "activate_role", label: "Activate role" },
          { key: "deactivate_role", label: "Deactivate role" },
          { key: "view_staff", label: "View staff" },
          { key: "create_staff", label: "Create staff" },
          { key: "edit_staff", label: "Edit staff" },
          { key: "delete_staff", label: "Delete staff" },
        ],
      },
      {
        name: "Security Settings",
        key: "security_settings",
        permissions: [
          { key: "view_security_settings", label: "View security settings" },
          { key: "manage_security_settings", label: "Manage security settings" },
        ],
      },
    ],
  },
];

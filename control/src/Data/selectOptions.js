// Centralized select/dropdown option arrays for the control module

// === Tenant / Prospect Options ===

export const orgTypeOptions = [
  { value: "", label: "Select" },
  { value: "Solo Provider / BCBA Private Practice", label: "Solo Provider / BCBA Private Practice" },
  { value: "ABA Clinic or Center", label: "ABA Clinic or Center" },
  { value: "Multi-Disciplinary Therapy Practice", label: "Multi-Disciplinary Therapy Practice" },
  { value: "In-Home / Telehealth ABA Provider", label: "In-Home / Telehealth ABA Provider" },
  { value: "School or Early Intervention Program", label: "School or Early Intervention Program" },
  { value: "Healthcare or Behavioral Health Organization", label: "Healthcare or Behavioral Health Organization" },
  { value: "Nonprofit / Government Program", label: "Nonprofit / Government Program" },
  { value: "Other", label: "Other" },
];

export const companySizeOptions = [
  { value: "", label: "Select" },
  { value: "1-5", label: "1–5 Employees" },
  { value: "5-10", label: "5–10 Employees" },
  { value: "10-50", label: "10–50 Employees" },
  { value: "50-100", label: "50–100 Employees" },
  { value: "100-500", label: "100–500 Employees" },
  { value: "500-1000", label: "500–1000 Employees" },
  { value: "1000+", label: "1000+ Employees" },
];


// === Issue Options ===

export const issueCategoryOptions = [
  { value: "", label: "Select" },
  { value: "Account & Access", label: "Account & Access" },
  { value: "Billing & Payments", label: "Billing & Payments" },
  { value: "Subscription & Plans", label: "Subscription & Plans" },
  { value: "Data Issues", label: "Data Issues" },
  { value: "User Management & Roles", label: "User Management & Roles" },
  { value: "Client/Patient Management Issues", label: "Client/Patient Management Issues" },
  { value: "Bug Report", label: "Bug Report" },
  { value: "Performance", label: "Performance" },
  { value: "Compliance & Security", label: "Compliance & Security" },
  { value: "Notifications & Emails", label: "Notifications & Emails" },
  { value: "Analytics & Reporting", label: "Analytics & Reporting" },
  { value: "Customization & Settings", label: "Customization & Settings" },
  { value: "Third-Party Integrations", label: "Third-Party Integrations" },
  { value: "Training & Onboarding", label: "Training & Onboarding" },
  { value: "Feature Request", label: "Feature Request" },
  { value: "Other / Miscellaneous", label: "Other / Miscellaneous" },
];

export const basePriorityOptions = [
  { value: "P1", label: "P1 - Critical" },
  { value: "P2", label: "P2 - High" },
  { value: "P3", label: "P3 - Medium" },
  { value: "P4", label: "P4 - Low" },
];

export const enterprisePriorityOptions = [
  { value: "EP1", label: "EP1 - Enterprise Critical" },
  { value: "EP2", label: "EP2 - Enterprise High" },
];

export const issueStatusOptions = [
  { value: "", label: "Select" },
  { value: "Unassigned", label: "Unassigned" },
  { value: "In Progress", label: "In-Progress" },
  { value: "Not Started", label: "Not Started" },
  { value: "Resolved", label: "Resolved" },
];

// === Plan Options ===

export const planOptions = [
  { value: "Basic", label: "Basic Plan" },
  { value: "Standard", label: "Standard Plan" },
  { value: "Pro", label: "Pro Plan" },
  { value: "Enterprise", label: "Enterprise Plan" },
];

// === Feature Options ===

export const featureStatusOptions = [
  { value: "true", label: "Active" },
  { value: "false", label: "Disabled" },
];

// === Chart / Analytics Options ===

export const chartPeriodOptions = [
  { key: "year",  label: "Year"  },
  { key: "month", label: "Month" },
  { key: "week",  label: "Week"  },
  { key: "day",   label: "Day"   },
];

export const chartDropdownOptions = ["Period", "Monthly", "Yearly"];

export const errorChartCategories = [
  { value: "by category", label: "by category" },
  { value: "by severity", label: "by severity" },
  { value: "by frequency", label: "by frequency" },
];

export const monthAbbreviations = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// === Prospect / Renewal Options ===

export const frequencyOptions = [
  { value: "", label: "Select frequency" },
  { value: "monthly", label: "Monthly" },
  { value: "1_year", label: "1 Year" },
  { value: "2_years", label: "2 Years" },
  { value: "3_years", label: "3 Years" },
  { value: "4_years", label: "4 Years" },
  { value: "5_years", label: "5 Years" },
  { value: "6_years", label: "6 Years" },
  { value: "7_years", label: "7 Years" },
  { value: "8_years", label: "8 Years" },
  { value: "9_years", label: "9 Years" },
  { value: "10_years", label: "10 Years" },
];

// === Pricing Options ===

export const clientOptions = [
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "30", label: "30" },
];

export const storageOptions = [
  { value: "1GB", label: "1GB" },
  { value: "2GB", label: "2GB" },
  { value: "5GB", label: "5GB" },
];

export const currencyOptions = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
];

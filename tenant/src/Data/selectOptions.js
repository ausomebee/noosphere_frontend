/**
 * Centralized select/dropdown option arrays used across tenant components.
 * Import from here instead of defining inline arrays in each component.
 */

// ─── Gender ───────────────────────────────────────────────
export const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];



// ─── Currency (with symbols) ─────────────────────────────
export const currencyOptions = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
];

// ─── Modifiers (most comprehensive — from AddSessionTypeModal) ───
export const modifierOptions = [
  { value: "", label: "No Modifier" },
  { value: "HO", label: "HO - Master's-level provider" },
  { value: "HP", label: "HP - Doctoral-level provider" },
  { value: "HN", label: "HN - Associate's-level provider" },
  { value: "HM", label: "HM - Bachelor's-level provider" },
  { value: "95", label: "95 - Synchronous telehealth" },
  { value: "GT", label: "GT - Via interactive audio and video (older telehealth modifier)" },
  { value: "KX", label: "KX - Documentation requirements met" },
  { value: "59", label: "59 - Distinct procedural service" },
  { value: "76", label: "76 - Repeat procedure/same provider" },
  { value: "77", label: "77 - Repeat procedure/different provider" },
];

// ─── Session Categories ──────────────────────────────────
export const categoryOptions = [
  { value: "Assessment", label: "Assessment" },
  { value: "Planning/Admin", label: "Planning/Admin" },
  { value: "Supervision", label: "Supervision" },
  { value: "Caregiver Training", label: "Caregiver Training" },
  { value: "Direct Service", label: "Direct Service" },
  { value: "Consultation", label: "Consultation" },
  { value: "Review/Monitoring", label: "Review/Monitoring" },
  { value: "Crisis", label: "Crisis" },
  { value: "Other", label: "Other" },
];

// ─── Location ─────────────────────────────────────────────
export const locationOptions = [
  { value: "Clinic/Center", label: "Clinic/Center" },
  { value: "Home", label: "Home" },
  { value: "School", label: "School" },
  { value: "Community", label: "Community" },
  { value: "Telehealth", label: "Telehealth" },
  { value: "Telephonic", label: "Telephonic" },
  { value: "Other", label: "Other" },
];

// ─── Teaching Procedures ─────────────────────────────────
export const teachingProcedureOptions = [
  { value: "Discrete Trial Training (DTT)", label: "Discrete Trial Training (DTT)" },
  { value: "Natural Environment Teaching (NET)", label: "Natural Environment Teaching (NET)" },
  { value: "Incidental Teaching", label: "Incidental Teaching" },
  { value: "Task Analysis", label: "Task Analysis" },
  { value: "Forward Chaining", label: "Forward Chaining" },
  { value: "Backward Chaining", label: "Backward Chaining" },
  { value: "Total Task Presentation", label: "Total Task Presentation" },
  { value: "Mand Training", label: "Mand Training" },
  { value: "Shaping", label: "Shaping" },
  { value: "Modeling", label: "Modeling" },
  { value: "Errorless Learning", label: "Errorless Learning" },
  { value: "Visual Supports", label: "Visual Supports" },
  { value: "Functional Communication Training (FCT)", label: "Functional Communication Training (FCT)" },
  { value: "Other (specify)", label: "Other (specify)" },
];

// ─── Prompt Strategies ───────────────────────────────────
export const promptStrategyOptions = [
  { label: "Most-to-Least Prompting (MTL)", value: "Most-to-Least Prompting (MTL)" },
  { label: "Least-to-Most Prompting (LTM)", value: "Least-to-Most Prompting (LTM)" },
  { label: "Graduated Guidance", value: "Graduated Guidance" },
  { label: "Time Delay Prompting", value: "Time Delay Prompting" },
  { label: "Simultaneous Prompting", value: "Simultaneous Prompting" },
  { label: "No-No-Prompt (2NP)", value: "No-No-Prompt (2NP)" },
  { label: "Prompt Fading", value: "Prompt Fading" },
  { label: "Error Correction Procedure", value: "Error Correction Procedure" },
  { label: "Constant Prompt Level", value: "Constant Prompt Level" },
  { label: "Flexible Prompting/Clinician Judgement", value: "Flexible Prompting/Clinician Judgement" },
  { label: "None (Independent)", value: "None (Independent)" },
  { label: "Other (specify)", value: "Other (specify)" },
];

// ─── Data Collection Types ───────────────────────────────
export const dataCollectionTypeOptions = [
  { label: "Frequency", value: "Frequency" },
  { label: "Rate", value: "Rate" },
  { label: "Duration", value: "Duration" },
  { label: "Latency", value: "Latency" },
  { label: "Percentage Correct", value: "Percentage Correct" },
  { label: "Trials/Opportunities", value: "Trials/Opportunities" },
  { label: "Task Analysis", value: "Task Analysis" },
];

// ─── Mastery Criteria ────────────────────────────────────
export const masteryCriteriaOptions = [
  { label: "Percentage Accuracy", value: "Percentage Accuracy" },
  { label: "Trials Correct", value: "Trials Correct" },
  { label: "Independent Responses", value: "Independent Responses" },
  { label: "Frequency Count", value: "Frequency Count" },
  { label: "Rate", value: "Rate" },
  { label: "Duration", value: "Duration" },
  { label: "Latency", value: "Latency" },
  { label: "Percentage of Steps Independent", value: "Percentage of Steps Independent" },
  { label: "Full Task Completion", value: "Full Task Completion" },
];

// ─── Target Status ───────────────────────────────────────
export const targetStatusOptions = [
  { label: "Not Introduced", value: "Not Introduced" },
  { label: "In Progress", value: "In Progress" },
  { label: "Mastered", value: "Mastered" },
  { label: "Maintaining", value: "Maintaining" },
  { label: "Discontinued", value: "Discontinued" },
  { label: "On Hold", value: "On Hold" },
];

// ─── Performance (Task Analysis) ─────────────────────────
export const performanceOptions = [
  { value: "I", label: "I - Independent" },
  { value: "VP", label: "VP - Verbal Prompt" },
  { value: "GP", label: "GP - Gesture Prompt" },
  { value: "MP", label: "MP - Model Prompt" },
  { value: "PPP", label: "PPP - Partial Physical Prompt" },
  { value: "FPP", label: "FPP - Full Physical Prompt" },
  { value: "NR", label: "NR - No Response" },
  { value: "Error", label: "Error" },
];

// ─── Prompt Levels (Task Analysis) ───────────────────────
export const promptLevelOptions = [
  { value: "I", label: "I - Independent" },
  { value: "VP", label: "VP - Verbal Prompt" },
  { value: "GP", label: "GP - Gesture Prompt" },
  { value: "MP", label: "MP - Model Prompt" },
  { value: "PPP", label: "PPP - Partial Physical Prompt" },
  { value: "FPP", label: "FPP - Full Physical Prompt" },
  { value: "VIS", label: "VIS - Visual Prompt" },
  { value: "POS", label: "POS - Positional Prompt" },
];

// ─── Payroll: Unit Types ─────────────────────────────────
export const unitTypeOptions = [
  { value: "Flat Rate", label: "Flat Rate" },
  { value: "Percentage based", label: "Percentage based" },
  { value: "Time based", label: "Time based" },
];

// ─── Payroll: Rounding Rules ─────────────────────────────
export const roundingRuleOptions = [
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
];

// ─── Billing: Standard Rounding Rules ────────────────────
export const standardRuleOptions = [
  { value: "8 Minute Rule", label: "8 Minute Rule" },
  { value: "Midpoint Rule", label: "Midpoint Rule" },
  { value: "Exact Time Reporting", label: "Exact Time Reporting" },
];

// ─── Clinical: Referral Sources ──────────────────────────
export const referralSourceOptions = [
  { value: "parent", label: "Parent/Guardian" },
  { value: "pediatrician", label: "Pediatrician" },
  { value: "psychologist", label: "Psychologist" },
  { value: "psychiatrist", label: "Psychiatrist" },
  { value: "school", label: "School/School District" },
  { value: "hospital", label: "Hospital/Clinic" },
  { value: "insurance-provider", label: "Insurance Provider" },
  { value: "self-referred", label: "Self-referred" },
  { value: "court-legal", label: "Court/Legal System" },
  { value: "other", label: "Other" },
];

// ─── Clinical: Service Locations ─────────────────────────
export const serviceLocationOptions = [
  { value: "client-home", label: "Client home" },
  { value: "clinic", label: "Clinic/Center" },
  { value: "school", label: "School" },
  { value: "community", label: "Community setting" },
  { value: "telehealth", label: "Telehealth" },
  { value: "hybrid", label: "Hybrid (multiple locations)" },
];

// ─── Generic: Yes / No ──────────────────────────────────
export const yesNoOptions = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
];

// ─── Billing: Per-Unit Options ──────────────────────────
export const perOptions = [
  { value: "SESSION", label: "Per Session" },
  { value: "DAY", label: "Per Day" },
  { value: "WEEK", label: "Per Week" },
  { value: "MONTH", label: "Per Month" },
  { value: "YEAR", label: "Per Year" },
];

// ─── Settings: Date Format Options ──────────────────────
export const DATE_FORMAT_OPTIONS = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
  { value: "MMM DD, YYYY", label: "MMM DD, YYYY" },
];

// ─── Settings: Time Format Options ──────────────────────
export const TIME_FORMAT_OPTIONS = [
  { value: "12-hour", label: "12-hour (AM/PM)" },
  { value: "24-hour", label: "24-hour" },
];

// ─── Settings: Currency Options ─────────────────────────
export const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "NGN", label: "NGN (₦)" },
  { value: "CAD", label: "CAD (C$)" },
];

// ─── Settings: Security Question Options ────────────────

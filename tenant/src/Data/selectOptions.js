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

// ─── Country ──────────────────────────────────────────────
export const countryOptions = [
  { value: "US", label: "United States" },
  { value: "UK", label: "United Kingdom" },
];

// ─── US States (all 50) ──────────────────────────────────
export const stateOptions = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
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

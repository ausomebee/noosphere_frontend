/**
 * The password policy, in one place.
 *
 * This lives outside `Components/Input/Inputs.jsx` so that the strength
 * checklist rendered there and the yup schema in `passwordValidation.js` can
 * both read the same rules without one importing the other. Keeping it in the
 * component file also tripped react-refresh, which wants a component module to
 * export only components.
 *
 * "Special" is any non-alphanumeric character.
 */
export const SPECIAL_CHAR_REGEX = /[^A-Za-z0-9]/;

/** The shared minimum. The administrator password raises it — see below. */
export const DEFAULT_PASSWORD_MIN_LENGTH = 8;

/**
 * Build the rule list that drives both the strength checklist and the schema.
 *
 * The minimum is a parameter because the administrator password holds a
 * stricter policy (12) than the rest of the app. Hardcoding 8 meant that
 * screen's checklist read "At least 8 characters" and turned Strong at 8 while
 * its schema rejected anything under 12 — the checklist lied. Any screen that
 * raises the minimum must pass the same value to both.
 *
 * @param {number} minLength minimum character count
 */
export const buildPasswordRules = (minLength = DEFAULT_PASSWORD_MIN_LENGTH) => [
  {
    test: (v) => (v || "").length >= minLength,
    label: `At least ${minLength} characters`,
  },
  { test: (v) => /[A-Z]/.test(v || ""), label: "One uppercase letter" },
  { test: (v) => /[a-z]/.test(v || ""), label: "One lowercase letter" },
  { test: (v) => /\d/.test(v || ""), label: "One number" },
  {
    test: (v) => SPECIAL_CHAR_REGEX.test(v || ""),
    label: "One special character",
  },
];

/** The rules at the shared default, for callers that need no override. */
export const PASSWORD_RULES = buildPasswordRules();

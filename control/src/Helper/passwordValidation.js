import * as yup from "yup";
import {
  SPECIAL_CHAR_REGEX,
  buildPasswordRules,
  DEFAULT_PASSWORD_MIN_LENGTH,
} from "./passwordPolicy";

/**
 * The single source of truth for password validation.
 *
 * These rules intentionally mirror the checklist built by `buildPasswordRules`
 * in `src/Helper/passwordPolicy.js` — both this schema and the checklist in
 * `Components/Input/Inputs.jsx` read that one module, so the two cannot drift. If they did,
 * the checklist would start lying: showing a rule as unmet for a password the
 * schema accepts, or vice versa.
 *
 * `minLength` is a parameter rather than a constant because the administrator
 * password holds a stricter policy (12) than the rest of the app (8). A screen
 * that raises it here must pass the same value to `PasswordInput`'s `minLength`
 * so the checklist it renders reflects the rule that will actually judge it.
 *
 * @param {string} fieldLabel used in the "is required" message
 * @param {number} minLength  minimum character count
 */
export const passwordSchema = (
  fieldLabel = "Password",
  minLength = DEFAULT_PASSWORD_MIN_LENGTH,
) =>
  yup
    .string()
    .required(`${fieldLabel} is required`)
    .min(minLength, `At least ${minLength} characters`)
    .matches(/[A-Z]/, "One uppercase letter")
    .matches(/[a-z]/, "One lowercase letter")
    .matches(/\d/, "One number")
    .matches(SPECIAL_CHAR_REGEX, "One special character");

/**
 * A confirm-password field must satisfy the SAME strength rules as the password
 * it confirms — not merely match it.
 *
 * @param {string} passwordField name of the password field to match against
 * @param {number} minLength     must match the password field's own minimum
 */
export const confirmPasswordSchema = (
  passwordField,
  minLength = DEFAULT_PASSWORD_MIN_LENGTH,
) =>
  passwordSchema("Confirm password", minLength).oneOf(
    [yup.ref(passwordField)],
    "Passwords must match",
  );

/**
 * For the handful of screens that validate passwords by hand instead of yup.
 * Returns the first unmet rule's label, or null when the password satisfies all
 * of them. Keeps those screens honest with the checklist they render.
 */
export const firstUnmetPasswordRule = (
  password,
  minLength = DEFAULT_PASSWORD_MIN_LENGTH,
) => {
  const unmet = buildPasswordRules(minLength).find(
    (rule) => !rule.test(password),
  );
  return unmet ? unmet.label : null;
};

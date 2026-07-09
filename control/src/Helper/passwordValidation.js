import * as yup from "yup";
import { SPECIAL_CHAR_REGEX, PASSWORD_RULES } from "../Components/Input/Inputs";

/**
 * The single source of truth for password validation.
 *
 * These rules intentionally mirror `PASSWORD_RULES` in
 * `src/Components/Input/Inputs.jsx`, which drives the strength checklist — the
 * special-character regex is imported from there so the two cannot drift. If
 * they did, the checklist would start lying: showing a rule as unmet for a
 * password the schema accepts, or vice versa.
 */
export const passwordSchema = (fieldLabel = "Password") =>
  yup
    .string()
    .required(`${fieldLabel} is required`)
    .min(8, "At least 8 characters")
    .matches(/[A-Z]/, "One uppercase letter")
    .matches(/[a-z]/, "One lowercase letter")
    .matches(/\d/, "One number")
    .matches(SPECIAL_CHAR_REGEX, "One special character");

/**
 * A confirm-password field must satisfy the SAME strength rules as the password
 * it confirms — not merely match it.
 *
 * @param {string} passwordField name of the password field to match against
 */
export const confirmPasswordSchema = (passwordField) =>
  passwordSchema("Confirm password").oneOf(
    [yup.ref(passwordField)],
    "Passwords must match",
  );

/**
 * For the handful of screens that validate passwords by hand instead of yup.
 * Returns the first unmet rule's label, or null when the password satisfies all
 * of them. Keeps those screens honest with the checklist they render.
 */
export const firstUnmetPasswordRule = (password) => {
  const unmet = PASSWORD_RULES.find((rule) => !rule.test(password));
  return unmet ? unmet.label : null;
};

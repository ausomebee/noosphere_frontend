import * as yup from "yup";
import { PASSWORD_RULES, SPECIAL_CHAR_REGEX } from "../Components/Input/Inputs";

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
 * The first rule a password fails, for handlers that validate outside yup.
 * Returns null when the password satisfies every rule.
 */
export const firstUnmetPasswordRule = (password) => {
  const unmet = PASSWORD_RULES.find((rule) => !rule.test(password));
  return unmet ? unmet.label : null;
};

/**
 * @fileoverview Yup validation schema for the Add/Edit Staff form.
 */
import * as yup from "yup";

export const addStaffSchema = yup.object().shape({
  fullName: yup.string().required("Full Name is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  phoneNumber: yup
    .string()
    .matches(/^\+?[\d\s-]{10,}$/, "Invalid phone number")
    .required("Phone Number is required"),
  // DOB, Gender and Address are optional (not mandatory).
  DOB: yup
    .date()
    .nullable()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue == null ? null : value,
    )
    .max(new Date(), "Date of Birth cannot be in the future")
    .optional(),
  gender: yup.string().optional(),
  practiceNPI: yup
    .string()
    .matches(/^\d{10}$/, "NPI must be a 10-digit number")
    .optional(),
  staffRole: yup.string().required("Staff Role is required"),
  address: yup.string().optional(),
  city: yup.string().optional(),
  state: yup.string().optional(),
  zip: yup.string().optional(),
  country: yup.string().optional(),
  active: yup.boolean().required("Active status is required"),
  // Licenses are optional. If a license row is added it must be complete, but
  // creating a staff member with no licenses is allowed.
  licenses: yup.array().of(
    yup.object().shape({
      licenseName: yup.string().required("License Name is required"),
      licenseNumber: yup.string().required("License Number is required"),
      expiryDate: yup.date().required("Expiration Date is required"),
      state: yup.string().required("State is required"),
    }),
  ),
  paymentSchedule: yup
    .string()
    // Treat the empty default as "not chosen" so the friendly required message
    // shows instead of yup's confusing "must be one of HOURLY, DAILY, SALARIED".
    .transform((value) => (value === "" ? undefined : value))
    .oneOf(["HOURLY", "DAILY", "SALARIED"], "Invalid compensation type")
    .required("Compensation type is required"),
  ratePerHour: yup
    .number()
    .typeError("Must be a valid number")
    .positive("Rate must be positive")
    .required("Pay rate is required"),

  minimumHours: yup
    .number()
    .typeError("Must be a valid number")
    .positive("Must be positive")
    .nullable()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue == null ? null : value,
    )
    .when("paymentSchedule", {
      is: "SALARIED",
      then: (schema) =>
        schema.required(
          "Minimum hours per month is required for Salaried staff",
        ),
      otherwise: (schema) => schema.notRequired().nullable(),
    }),
  // Other Pay & Deductions are optional. Empty rows are ignored on submit, so
  // the item `type` is not required — this prevents a blank row from blocking
  // the form when the section is left empty.
  otherPays: yup.array().of(
    yup.object().shape({
      type: yup.string(),
    }),
  ),
  deductions: yup.array().of(
    yup.object().shape({
      type: yup.string(),
    }),
  ),
  // Documents are optional (not mandatory).
  documents: yup.array().optional(),
});

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
  DOB: yup
    .date()
    .required("Date of Birth is required")
    .max(new Date(), "Date of Birth cannot be in the future"),
  gender: yup.string().required("Gender is required"),
  practiceNPI: yup
    .string()
    .matches(/^\d{10}$/, "NPI must be a 10-digit number")
    .optional(),
  staffRole: yup.string().required("Staff Role is required"),
  address: yup.string().required("Address is required"),
  city: yup.string().required("City is required"),
  state: yup.string().required("State is required"),
  zip: yup.string().required("ZIP code is required"),
  country: yup.string().required("Country is required"),
  active: yup.boolean().required("Active status is required"),
  licenses: yup
    .array()
    .of(
      yup.object().shape({
        licenseName: yup.string().required("License Name is required"),
        licenseNumber: yup.string().required("License Number is required"),
        expiryDate: yup.date().required("Expiration Date is required"),
        state: yup.string().required("State is required"),
      }),
    )
    .min(1, "At least one license is required"),
  paymentSchedule: yup
    .string()
    .oneOf(["HOURLY", "DAILY", "SALARIED"])
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
  documents: yup
    .array()
    .min(1, "At least one document is required")
    .required("At least one document is required"),
});

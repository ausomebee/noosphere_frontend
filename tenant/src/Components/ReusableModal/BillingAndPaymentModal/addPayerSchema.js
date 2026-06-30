/**
 * @fileoverview Yup validation schema and data transform for the Add/Edit Payer form.
 */
import * as yup from "yup";

export const payerSchema = yup.object().shape({
  mode: yup.string(),
  payerName: yup.string().when("mode", ([mode], schema) => {
    return mode === "view" ? schema.optional() : schema.required("Payer Name is required");
  }),
  email: yup.string().when("mode", ([mode], schema) => {
    return mode === "view"
      ? schema.optional()
      : schema.email("Invalid email").required("Email is required");
  }),
  phoneNumber: yup.string().when("mode", ([mode], schema) => {
    return mode === "view" ? schema.optional() : schema.required("Phone Number is required");
  }),
  insuranceType: yup.string().when("mode", ([mode], schema) => {
    return mode === "view" ? schema.optional() : schema.required("Insurance Type is required");
  }),
  tplCode: yup.string().when("mode", ([mode], schema) => {
    return mode === "view" ? schema.optional() : schema.required("TPL Code is required");
  }),
  carrierPayerId: yup.string().when("mode", ([mode], schema) => {
    return mode === "view" ? schema.optional() : schema.required("Carrier Payer ID is required");
  }),
  address: yup.string().when("mode", ([mode], schema) => {
    return mode === "view" ? schema.optional() : schema.required("Address is required");
  }),
  city: yup.string().when("mode", ([mode], schema) => {
    return mode === "view" ? schema.optional() : schema.required("City is required");
  }),
  state: yup.string().when("mode", ([mode], schema) => {
    return mode === "view" ? schema.optional() : schema.required("State is required");
  }),
  zip: yup.string().when("mode", ([mode], schema) => {
    return mode === "view" ? schema.optional() : schema.required("ZIP is required");
  }),
  country: yup.string().when("mode", ([mode], schema) => {
    return mode === "view" ? schema.optional() : schema.required("Country is required");
  }),
  serviceCodes: yup
    .array()
    .of(
      yup.object().shape({
        serviceCodeId: yup.mixed().nullable(),
        codeSelection: yup.string().when("mode", ([mode], schema) => {
          return mode === "view" ? schema.optional() : schema.required("Service Code is required");
        }),
        code: yup.string().when("mode", ([mode], schema) => {
          return mode === "view" ? schema.optional() : schema.required("Code is required");
        }),
        description: yup.string().when("mode", ([mode], schema) => {
          return mode === "view" ? schema.optional() : schema.required("Description is required");
        }),
        unitCurrency: yup.string().when("mode", ([mode], schema) => {
          return mode === "view" ? schema.optional() : schema.required("Unit Currency is required");
        }),
        ratePerUnit: yup
          .number()
          .typeError("Must be a number")
          .min(0, "Must be 0 or greater")
          .when("mode", ([mode], schema) => {
            return mode === "view" ? schema.optional() : schema.required("Rate per Unit is required");
          }),
        roundingRule: yup.string().when("mode", ([mode], schema) => {
          return mode === "view" ? schema.optional() : schema.required("Rounding Rule is required");
        }),
        // Modifiers are optional — a service code can have none.
        modifiers: yup
          .array()
          .of(
            yup.object().shape({
              modifier: yup.string().optional(),
              ratePerUnit: yup
                .number()
                .transform((value, originalValue) =>
                  typeof originalValue === "string" && originalValue === ""
                    ? undefined
                    : value
                )
                .typeError("Must be a number")
                .min(0, "Must be 0 or greater")
                .nullable()
                .optional(),
            })
          )
          .optional(),
        billable: yup.boolean().when("mode", ([mode], schema) => {
          return mode === "view" ? schema.optional() : schema.required("Billable is required");
        }),
      })
    )
    .min(1, "At least one service code is required"),
});

export const transformPayerToFormData = (data, mode) => ({
  mode,
  payerName: data.payerName || "",
  email: data.email || "",
  phoneNumber: data.phone || "",
  insuranceType: data.insuranceTypeId,
  tplCode: data.tplCode || "",
  carrierPayerId: data.carrierPayerId || "",
  address: data.address || "",
  city: data.city || "",
  state: data.state || "",
  zip: data.zip || "",
  country: data.country || "",
  serviceCodes:
    Array.isArray(data.serviceCodes) && data.serviceCodes.length > 0
      ? data.serviceCodes.map((sc) => ({
          serviceCodeId: sc.serviceCodeId || null,
          codeSelection: sc.code || "custom",
          code: sc.code || "",
          description: sc.description || "",
          unitCurrency: sc.unitCurrency || "",
          ratePerUnit: sc.ratePerUnit || 0,
          roundingRule: sc.roundingRuleId || "",
          modifiers: Array.isArray(sc.modifiers)
            ? sc.modifiers.map((m) => ({
                modifier: m.modifier || "",
                ratePerUnit: m.ratePerUnit || 0,
              }))
            : [{ modifier: "", ratePerUnit: 0 }],
          billable: sc.billable !== undefined ? sc.billable : false,
        }))
      : [
          {
            serviceCodeId: null,
            codeSelection: "",
            code: "",
            description: "",
            unitCurrency: "",
            ratePerUnit: 0,
            roundingRule: "",
            modifiers: [{ modifier: "", ratePerUnit: 0 }],
            billable: false,
          },
        ],
});

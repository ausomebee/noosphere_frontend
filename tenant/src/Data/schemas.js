import * as yup from "yup";

export const newPayrollSchema = yup.object({
  compensationType: yup.string().required("Compensation type is required"),
  from: yup.string().required("Start date is required"),
  to: yup
    .string()
    .required("End date is required")
    .test(
      "is-after-from",
      "End date must be after start date",
      function (value) {
        const { from } = this.parent;
        if (!from || !value) return true;
        return new Date(value) > new Date(from);
      }
    )
    .test(
      "not-future",
      "End date cannot be later than today",
      function (value) {
        if (!value) return true;
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return new Date(value) <= today;
      }
    ),
});

export const addIncomeSchema = yup.object({
  incomeItem: yup.string().required("Please select an income item"),
});

export const addDeductionSchema = yup.object({
  deductionItem: yup.string().required("Please select a deduction item"),
});

export const addStaffSchema = yup.object({
  selectedStaff: yup
    .array()
    .min(1, "At least one employee must be selected")
    .required("Please select employees"),
});

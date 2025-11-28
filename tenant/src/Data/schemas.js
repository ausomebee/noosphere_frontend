import * as yup from "yup";

export const newPayrollSchema = yup.object({
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
    ),
});

export const addIncomeSchema = yup.object({
  incomeItem: yup.string().required("Please select an income item"),
  unitType: yup.string().required("Please select a unit type"),
  amount: yup
    .number()
    .typeError("Amount must be a number")
    .required("Amount is required")
    .min(0, "Amount cannot be negative"),
});

export const addDeductionSchema = yup.object({
  deductionItem: yup.string().required("Please select a deduction item"),
  unitType: yup.string().required("Please select a unit type"),
  amount: yup
    .number()
    .typeError("Amount must be a number")
    .required("Amount is required")
    .min(0, "Amount cannot be negative"),
});

export const addStaffSchema = yup.object({
  selectedStaff: yup
    .array()
    .min(1, "At least one employee must be selected")
    .required("Please select employees"),
});
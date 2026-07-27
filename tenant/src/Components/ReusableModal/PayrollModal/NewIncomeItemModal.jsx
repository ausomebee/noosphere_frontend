import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import { SelectInput, TextInput, SwitchInput } from "../../Input/Inputs";
import { showToast } from "../../../Helper/ShowToast";
import { unitTypeOptions, roundingRuleOptions } from "../../../Data/selectOptions";
import useReduxFormDraft from "../../../hooks/useReduxFormDraft";

// Yup validation schema
const payrollItemSchema = yup.object().shape({
  name: yup.string().required("Name is required"),
  unitType: yup.string().required("Unit Type is required"),
  rate: yup.object().shape({
    rate: yup
      .number()
      .transform((value, originalValue) => (typeof originalValue === "string" && originalValue === "" ? undefined : value))
      .typeError("Rate must be a number")
      .when("unitType", {
        is: (unitType) => unitType === "Flat Rate",
        then: (schema) => schema.required("Rate is required").min(0, "Rate cannot be negative"),
        otherwise: (schema) => schema.nullable().notRequired(),
      }),
    unit: yup
      .number()
      .transform((value, originalValue) => (typeof originalValue === "string" && originalValue === "" ? undefined : value))
      .typeError("Unit must be a number")
      .when("unitType", {
        is: (unitType) => unitType === "Time based" || unitType === "Percentage based",
        then: (schema) => schema.required("Unit is required").min(0, "Unit cannot be negative"),
        otherwise: (schema) => schema.nullable().notRequired(),
      }),
    unitMinutes: yup
      .number()
      .transform((value, originalValue) => (typeof originalValue === "string" && originalValue === "" ? undefined : value))
      .typeError("Unit minutes must be a number")
      .when("unitType", {
        is: (unitType) => unitType === "Time based",
        then: (schema) => schema.required("Unit minutes is required").min(1, "Unit minutes must be at least 1"),
        otherwise: (schema) => schema.nullable().notRequired(),
      }),
    duration: yup
      .string()
      .when("unitType", {
        is: (unitType) => unitType === "Time based" || unitType === "Percentage based",
        then: (schema) => schema.required("Duration is required"),
        otherwise: (schema) => schema.nullable().notRequired(),
      }),
  }),
  status: yup.boolean().required("Status is required"),
});

// Find the first real (leaf) validation message, digging into nested field
// errors like rate.unit / rate.duration so the toast names the actual field
// instead of a generic "all fields" message.
const findFirstErrorMessage = (errs) => {
  if (!errs || typeof errs !== "object") return null;
  if (typeof errs.message === "string" && errs.message) return errs.message;
  for (const value of Object.values(errs)) {
    const message = findFirstErrorMessage(value);
    if (message) return message;
  }
  return null;
};

// Transform initial data to form data
const transformInitialData = (initialData) => {
  const rate = initialData.rate || {};
  const formData = {
    name: initialData.name || "",
    unitType: initialData.unitType || initialData.type || "",
    rate: {
      rate: rate.rate != null ? Number(rate.rate) : undefined,
      unit: rate.unit != null ? Number(rate.unit) : undefined,
      unitMinutes: rate.unitMinutes != null ? Number(rate.unitMinutes) : undefined,
      duration: rate.duration || "",
    },
    status: initialData.status !== undefined ? initialData.status : true,
  };
  return formData;
};

const PayrollItemModal = ({
  isOpen,
  onClose,
  onSave,
  mode = "add",
  initialData = {},
  isDeduction = false,
  existingItems = [],
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const defaultFormValues = {
    name: "",
    unitType: "",
    rate: {
      rate: undefined,
      unit: undefined,
      unitMinutes: undefined,
      duration: "",
    },
    status: true,
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    clearErrors,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(payrollItemSchema),
    defaultValues:
      mode === "add" ? defaultFormValues : transformInitialData(initialData, mode),
  });

  // Only persist/hydrate a draft for NEW items. In view/edit the draft's
  // deferred reset() would otherwise clobber the clicked item's values.
  const clearDraft = useReduxFormDraft("new-income-item", {
    watch,
    reset,
    isOpen: isOpen && mode === "add",
    exclude: [],
  });

  // Watch the unitType field
  const unitType = watch("unitType");

  // Clear stale rate errors when the unit type changes so switching to (or
  // selecting) a type doesn't flash "required" errors on fields the user
  // hasn't touched yet. Clear-only — it doesn't wipe any entered values.
  useEffect(() => {
    clearErrors("rate");
  }, [unitType, clearErrors]);

  useEffect(() => {
    if (isOpen) {
      // Pre-fill for both view and edit; only a brand-new "add" starts empty.
      reset(
        mode === "add" ? defaultFormValues : transformInitialData(initialData, mode)
      );
    }
  }, [isOpen, mode, initialData, reset]);

  const onValidationError = (formErrors) => {
    const message = findFirstErrorMessage(formErrors);
    showToast(message || "Please fill in all required fields", "error");
  };

  const handleSave = async (data) => {
    setIsLoading(true);
    try {
      await onSave(data);
      clearDraft();
      reset(defaultFormValues);
      setIsLoading(false);
      onClose();
    } catch (error) {
      console.error(`Error saving ${isDeduction ? "deduction" : "income item"}:`, error);
      showToast(`Failed to save ${isDeduction ? "deduction" : "income item"}`, "error");
      setIsLoading(false);
    }
  };

  const durationOptions = useMemo(() => {
    const options = existingItems
      .filter((item) => mode !== "edit" || item.id !== initialData.id)
      .map((item) => ({
        value: item.id,
        label: item.name,
      }));
    return [
      { value: "basic_pay", label: "Basic Pay" },
      ...options,
    ];
  }, [existingItems, mode, initialData.id]);

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        reset(defaultFormValues);
        onClose();
      }}
      title={`${
        mode === "view" ? "View" : mode === "edit" ? "Edit" : "Add"
      } ${isDeduction ? "Deduction" : "Income Item"}`}
      primaryButtonText={
        mode === "view"
          ? undefined
          : `Save ${isDeduction ? "Deduction" : "Income Item"}`
      }
      secondaryButtonText={mode === "view" ? "Close" : "Cancel"}
      primaryButtonDisabled={isLoading}
      onPrimaryButtonClick={handleSubmit(handleSave, onValidationError)}
      onSecondaryButtonClick={() => {
        reset(defaultFormValues);
        onClose();
      }}
      size="md"
      primaryButtonLoading={isLoading}
    >
      <div className="mt-5 space-y-4">
        <TextInput
          required
          label="Name"
          {...register("name")}
          error={errors.name?.message}
          placeholder="Enter Name"
          disabled={mode === "view"}
        />

        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <Controller
              name="unitType"
              control={control}
              render={({ field }) => (
                <SelectInput
                  required
                  label="Unit Type"
                  options={unitTypeOptions}
                  error={errors.unitType?.message}
                  disabled={mode === "view"}
                  {...field}
                />
              )}
            />
          </div>
        </div>

        {unitType === "Flat Rate" && (
          <div className="flex-1">
            <TextInput
              required
              label="Rate"
              type="number"
              {...register("rate.rate")}
              error={errors.rate?.rate?.message}
              placeholder="Enter Rate"
              disabled={mode === "view"}
            />
          </div>
        )}

        {unitType === "Time based" && (
          <div className="flex items-center gap-4 mt-4">
            <p className="text-sm text-gray-700">Pay</p>
            <div style={{ marginBottom: "-14px" }}>
              <TextInput
                type="number"
                {...register("rate.unit")}
                width="70"
                className="rounded-20px"
                placeholder="$"
                error={errors.rate?.unit?.message}
                disabled={mode === "view"}
              />
            </div>
            <p className="text-sm text-gray-700">for every</p>
            <div style={{ marginBottom: "-14px" }}>
              <TextInput
                type="number"
                {...register("rate.unitMinutes")}
                width="70"
                className="rounded-20px"
                placeholder="0"
                error={errors.rate?.unitMinutes?.message}
                disabled={mode === "view"}
              />
            </div>
            <div style={{ marginBottom: "-14px" }}>
              <Controller
                name="rate.duration"
                control={control}
                render={({ field }) => (
                  <SelectInput
                    width="150"
                    options={roundingRuleOptions}
                    error={errors.rate?.duration?.message}
                    placeholder="Select"
                    disabled={mode === "view"}
                    {...field}
                  />
                )}
              />
            </div>
          </div>
        )}

        {unitType === "Percentage based" && (
          <div className="flex items-center gap-4 mt-4">
            <p className="text-sm text-gray-700">Pay</p>
            <div style={{ marginBottom: "-14px" }}>
              <TextInput
                type="number"
                {...register("rate.unit")}
                width="70"
                className="rounded-20px"
                placeholder="%"
                error={errors.rate?.unit?.message}
                disabled={mode === "view"}
              />
            </div>
            <p className="text-sm text-gray-700">% of</p>
            <div style={{ marginBottom: "-14px" }}>
              <Controller
                name="rate.duration"
                control={control}
                render={({ field }) => (
                  <SelectInput
                    options={durationOptions}
                    error={errors.rate?.duration?.message}
                    placeholder="Select"
                    width="150"
                    disabled={mode === "view"}
                    {...field}
                  />
                )}
              />
            </div>
          </div>
        )}
        <div className="mt-6">
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <SwitchInput
                label={field.value ? "Active" : "Inactive"}
                checked={field.value}
                onChange={(checked) => field.onChange(checked)}
                disabled={mode === "view"}
              />
            )}
          />
        </div>
      </div>
    </ReusableModal>
  );
};

export default PayrollItemModal;
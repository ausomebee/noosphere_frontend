import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import { SelectInput, TextInput, SwitchInput } from "../../Input/Inputs";
import { showToast } from "../../../Helper/ShowToast";
import { unitTypeOptions, roundingRuleOptions } from "../../../Data/selectOptions";

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
        then: () => yup.number().required("Rate is required").min(0, "Rate cannot be negative"),
        otherwise: () => yup.number().nullable().notRequired(),
      }),
    unit: yup
      .number()
      .transform((value, originalValue) => (typeof originalValue === "string" && originalValue === "" ? undefined : value))
      .typeError("Unit must be a number")
      .when("unitType", {
        is: (unitType) => unitType === "Time based" || unitType === "Percentage based",
        then: () => yup.number().required("Unit is required").min(0, "Unit cannot be negative"),
        otherwise: () => yup.number().nullable().notRequired(),
      }),
    unitMinutes: yup
      .number()
      .transform((value, originalValue) => (typeof originalValue === "string" && originalValue === "" ? undefined : value))
      .typeError("Unit minutes must be a number")
      .when("unitType", {
        is: (unitType) => unitType === "Time based",
        then: () => yup.number().required("Unit minutes is required").min(1, "Unit minutes must be at least 1"),
        otherwise: () => yup.number().nullable().notRequired(),
      }),
    duration: yup
      .string()
      .when("unitType", {
        is: (unitType) => unitType === "Time based" || unitType === "Percentage based",
        then: () => yup.string().required("Duration is required"),
        otherwise: () => yup.string().nullable().notRequired(),
      }),
  }),
  status: yup.boolean().required("Status is required"),
});

// Transform initial data to form data
const transformInitialData = (initialData, mode) => {
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
    formState: { errors },
  } = useForm({
    resolver: yupResolver(payrollItemSchema),
    defaultValues: mode === "edit" ? transformInitialData(initialData, mode) : defaultFormValues,
  });

  // Watch the unitType field
  const unitType = watch("unitType");

  useEffect(() => {
    if (isOpen) {
      reset(mode === "edit" ? transformInitialData(initialData, mode) : defaultFormValues);
    }
  }, [isOpen, mode, initialData, reset]);

  const onValidationError = (errors) => {
    const firstError = Object.values(errors)[0];
    showToast(firstError?.message || "Please fill in all required fields", "error");
  };

  const handleSave = async (data) => {
    setIsLoading(true);
    try {
      await onSave(data);
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
      title={mode === "edit" ? `Edit ${isDeduction ? "Deduction" : "Income Item"}` : `Add ${isDeduction ? "Deduction" : "Income Item"}`}
      primaryButtonText={isLoading ? "Saving..." : `Save ${isDeduction ? "Deduction" : "Income Item"}`}
      secondaryButtonText="Cancel"
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
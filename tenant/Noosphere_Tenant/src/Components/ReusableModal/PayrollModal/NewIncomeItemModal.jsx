import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import { SelectInput, TextInput, SwitchInput } from "../../Input/Inputs";

// Yup validation schema
const payrollItemSchema = yup.object().shape({
  name: yup.string().required("Name is required"),
  unitType: yup.string().required("Unit Type is required"),
  rate: yup
    .number()
    .typeError("Rate must be a number")
    .when("unitType", {
      is: "Flat Rate",
      then: yup.number().required("Rate is required").min(0, "Rate cannot be negative"),
      otherwise: yup.number().notRequired(),
    }),
  unit: yup
    .number()
    .typeError("Unit must be a number")
    .when("unitType", {
      is: (val) => val === "Time based" || val === "Percentage based",
      then: yup.number().required("Unit is required").min(0, "Unit cannot be negative"),
      otherwise: yup.number().notRequired(),
    }),
  unitMinutes: yup
    .number()
    .typeError("Unit minutes must be a number")
    .when("unitType", {
      is: "Time based",
      then: yup.number().required("Unit minutes is required").min(1, "Unit minutes must be at least 1"),
      otherwise: yup.number().notRequired(),
    }),
  duration: yup
    .string()
    .when("unitType", {
      is: (val) => val === "Time based" || val === "Percentage based",
      then: yup.string().required("Duration is required"),
      otherwise: yup.string().notRequired(),
    }),
  status: yup.boolean().required("Status is required"),
});

const PayrollItemModal = ({ isOpen, onClose, onSave, mode = "add", initialData = {}, isDeduction = false }) => {
  const [isLoading, setIsLoading] = useState(false);

  const defaultFormValues = {
    name: "",
    unitType: "",
    rate: 0,
    unit: 0,
    unitMinutes: 0,
    duration: "",
    status: true, // Default to active
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
    defaultValues: mode === "edit" ? { ...defaultFormValues, ...initialData } : defaultFormValues,
  });

  // Watch the unitType field
  const unitType = watch("unitType");

  useEffect(() => {
    if (isOpen) {
      reset(mode === "edit" ? { ...defaultFormValues, ...initialData } : defaultFormValues);
    }
  }, [isOpen, mode, initialData, reset]);

  const handleSave = async (data) => {
    setIsLoading(true);
    try {
      await onSave(data);
      reset(defaultFormValues);
      onClose();
    } catch (error) {
      console.error(`Error saving ${isDeduction ? "deduction" : "income item"}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const unitTypeOptions = [
    { value: "Flat Rate", label: "Flat Rate" },
    { value: "Percentage based", label: "Percentage based" },
    { value: "Time based", label: "Time based" },
  ];

  const roundingRuleOptions = [
    { value: "minutes", label: "Minutes" },
    { value: "hours", label: "Hours" },
  ];

  const incomeItemOptions = [
    { value: "basic_pay", label: "Basic Pay" },
    { value: "overtime", label: "Overtime" },
  ];

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
      onPrimaryButtonClick={handleSubmit(handleSave)}
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
              {...register("rate")}
              error={errors.rate?.message}
              placeholder="Enter Rate"
            />
          </div>
        )}

        {unitType === "Time based" && (
          <div className="flex items-center gap-4 mt-4">
            <p className="text-sm text-gray-700">Pay</p>
            <div style={{ marginBottom: "-14px" }}>
              <TextInput
                type="number"
                {...register("unit")}
                width="70"
                className="rounded-20px"
                placeholder="$"
                error={errors.unit?.message}
                disabled={mode === "view"}
              />
            </div>
            <p className="text-sm text-gray-700">for every</p>
            <div style={{ marginBottom: "-14px" }}>
              <TextInput
                type="number"
                {...register("unitMinutes")}
                width="70"
                className="rounded-20px"
                placeholder="0"
                error={errors.unitMinutes?.message}
                disabled={mode === "view"}
              />
            </div>
            <div style={{ marginBottom: "-14px" }}>
              <Controller
                name="duration"
                control={control}
                render={({ field }) => (
                  <SelectInput
                    width="150"
                    options={roundingRuleOptions}
                    error={errors.duration?.message}
                    placeholder="Select"
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
                {...register("unit")}
                width="70"
                className="rounded-20px"
                placeholder="%"
                error={errors.unit?.message}
                disabled={mode === "view"}
              />
            </div>
            <p className="text-sm text-gray-700">% of</p>
            <div style={{ marginBottom: "-14px" }}>
              <Controller
                name="duration"
                control={control}
                render={({ field }) => (
                  <SelectInput
                    options={incomeItemOptions}
                    error={errors.duration?.message}
                    placeholder="Select"
                    width="150"
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
              />
            )}
          />
        </div>
      </div>
    </ReusableModal>
  );
};

export default PayrollItemModal;
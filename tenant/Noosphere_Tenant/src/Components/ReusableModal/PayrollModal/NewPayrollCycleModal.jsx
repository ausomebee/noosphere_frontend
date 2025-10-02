import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import { SelectInput, TextInput, CheckboxInput } from "../../Input/Inputs";

// Yup validation schema
const payrollCycleSchema = yup.object().shape({
  name: yup.string().required("Name is required"),
  appliesTo: yup.string().required("Applies To is required"),
  intervals: yup
    .number()
    .typeError("Interval must be a number")
    .required("Interval is required")
    .min(1, "Interval must be at least 1 day"),
  startDate: yup
    .string()
    .required("Start Date is required")
    .matches(
      /^\d{4}-\d{2}-\d{2}$/,
      "Start Date must be a valid date (YYYY-MM-DD)"
    ),
  autoRun: yup.boolean().required("Auto Run is required"),
});

const PayrollCycleModal = ({ isOpen, onClose, onSave, mode = "add", initialData = {} }) => {
  const [isLoading, setIsLoading] = useState(false);

  const defaultFormValues = {
    name: "",
    appliesTo: "",
    intervals: 1,
    startDate: "",
    autoRun: false,
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(payrollCycleSchema),
    defaultValues: mode === "edit" ? { ...defaultFormValues, ...initialData } : defaultFormValues,
  });

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
      console.error("Error saving payroll cycle:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const appliesToOptions = [
    { value: "All Employees", label: "All Employees" },
    { value: "Full-Time", label: "Full-Time" },
    { value: "Part-Time", label: "Part-Time" },
  ];

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        reset(defaultFormValues);
        onClose();
      }}
      title={mode === "edit" ? "Edit Payroll Cycle" : "Add Payroll Cycle"}
      primaryButtonText={isLoading ? "Saving..." : "Save Payroll Cycle"}
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
              name="appliesTo"
              control={control}
              render={({ field }) => (
                <SelectInput
                  label="Applies To"
                  options={appliesToOptions}
                  error={errors.appliesTo?.message}
                  placeholder="Select Payment Schedule"
                  {...field}
                />
              )}
            />
          </div>
        </div>

        <TextInput
          label="Interval (in Days)"
          type="number"
          {...register("intervals")}
          error={errors.intervals?.message}
          placeholder="Enter Interval"
        />

        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <TextInput
              label="Start Date"
              type="date"
              {...register("startDate")}
              error={errors.startDate?.message}
              placeholder="Select a Date"
            />
          </div>
        </div>

        <div className="py-2 px-2 rounded-md bg-gray-150 mt-6 mb-6">
          <Controller
            name="autoRun"
            control={control}
            render={({ field }) => (
              <CheckboxInput
                label="Run payroll automatically on due date"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            )}
          />
        </div>
      </div>
    </ReusableModal>
  );
};

export default PayrollCycleModal;
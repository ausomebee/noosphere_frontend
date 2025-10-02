import React, { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import {
  TextInput,
  SelectInput,
  CheckboxInput,
  SwitchInput,
  TextareaInput,
} from "../../Input/Inputs";
import Button from "../../Button/Button";
import { FaPlus, FaTrash } from "react-icons/fa";

// Validation schema
const serviceCodeSchema = yup.object().shape({
  code: yup.string().required("Service code is required"),
  description: yup.string().required("Description is required"),
  unitType: yup.string().required("Unit type is required"),
  unitDuration: yup
    .number()
    .typeError("Must be a number")
    .min(1, "Must be 1 or greater")
    .required("Unit duration is required"),
  unitCurrency: yup.string().required("Unit currency is required"),
  ratePerUnit: yup
    .number()
    .typeError("Must be a number")
    .min(0, "Must be 0 or greater")
    .required("Rate per unit is required"),
  roundingRule: yup.string().required("Rounding rule is required"),
  modifiers: yup.array().of(
    yup.object().shape({
      modifier: yup.string().required("Modifier is required"),
      ratePerUnit: yup
        .number()
        .typeError("Must be a number")
        .min(0, "Must be 0 or greater")
        .required("Rate per unit is required"),
    })
  ),
  billable: yup.boolean().default(false),
  status: yup.boolean().default(true),
});

// Dummy options
const unitTypeOptions = [
  { value: "Adaptive behavior treatment", label: "Adaptive behavior treatment" },
  {
    value: "Adaptive behavior treatment with protocol modification",
    label: "Adaptive behavior treatment with protocol modification",
  },
  {
    value: "Behavior Identification supporting assessment",
    label: "Behavior Identification supporting assessment",
  },
  { value: "Comprehensive adaptive behavior", label: "Comprehensive adaptive behavior" },
];

const currencyOptions = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
];

const roundingRuleOptions = [
  { value: "Nearest", label: "Nearest" },
  { value: "Up", label: "Up" },
  { value: "Down", label: "Down" },
];

const modifierOptions = [
  { value: "M23.9", label: "M23.9" },
  { value: "M45.9", label: "M45.9" },
  { value: "M67.8", label: "M67.8" },
];

// Utility function to transform dummy data to form data
const transformServiceCodeToFormData = (data) => ({
  code: data.serviceCodes || data.code || "",
  description: data.description || "",
  unitType: data.unitType || "",
  unitDuration: parseInt(data.unitTime?.split(" ")[0]) || 0,
  unitCurrency: data.unitCurrency || "",
  ratePerUnit: parseFloat(data.rates?.replace("$", "")) || 0,
  roundingRule: data.roundingRule || "",
  modifiers: Array.isArray(data.modifiers)
    ? data.modifiers.map((m) => ({
        modifier: m.modifier || "",
        ratePerUnit: parseFloat(m.ratePerUnit) || 0,
      }))
    : [{ modifier: data.modifiers || "", ratePerUnit: 0 }],
  billable: data.billable || false,
  status: data.isActive || true,
});

const AddServiceCodeModal = ({
  isOpen,
  onClose,
  onSave,
  mode = "add",
  initialData = {},
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const defaultFormValues = {
    code: "",
    description: "",
    unitType: "",
    unitDuration: 0,
    unitCurrency: "",
    ratePerUnit: 0,
    roundingRule: "",
    modifiers: [{ modifier: "", ratePerUnit: 0 }],
    billable: false,
    status: true,
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(serviceCodeSchema),
    defaultValues: defaultFormValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "modifiers",
  });

  // Reset form when isOpen, mode, or initialData changes
  useEffect(() => {
    if (isOpen) {
      const values =
        mode === "edit"
          ? transformServiceCodeToFormData(initialData)
          : defaultFormValues;
      reset(values);
    }
  }, [isOpen, mode, initialData, reset]);

  const handleSave = async (data) => {
    setIsLoading(true);
    try {
      await onSave(data);
      reset(defaultFormValues);
      onClose();
    } catch (error) {
      console.error("Error saving service code:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        reset(defaultFormValues);
        onClose();
      }}
      title={mode === "edit" ? "Edit Service Code" : "Add Service Code"}
      primaryButtonText={isLoading ? "Saving..." : "Save Service Code"}
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
          label="Service Code"
          {...register("code")}
          error={errors.code?.message}
          placeholder="Enter Service Code"
        />

        <TextareaInput
          label="Description"
          {...register("description")}
          error={errors.description?.message}
          placeholder="Enter a description"
        />

        <div className="flex gap-4 items-center mb-2">
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

          <div className="flex-1">
            <TextInput
              label="Unit Duration"
              type="number"
              {...register("unitDuration")}
              error={errors.unitDuration?.message}
              placeholder="Enter Unit Duration (mins)"
            />
          </div>
        </div>

        <div className="flex gap-4 items-center mb-2">
          <div className="">
            <Controller
              name="unitCurrency"
              control={control}
              render={({ field }) => (
                <SelectInput
                  label="Unit Currency"
                  options={currencyOptions}
                  error={errors.unitCurrency?.message}
                  {...field}
                  
                />
              )}
            />
          </div>

          <div className="flex-1">
            <TextInput
              label="Rate per Unit"
              type="number"
              {...register("ratePerUnit")}
              error={errors.ratePerUnit?.message}
              placeholder="Enter Rate per Unit"
            />
          </div>
        </div>

        <Controller
          name="roundingRule"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="Rounding Rule"
              options={roundingRuleOptions}
              error={errors.roundingRule?.message}
              placeholder="Select rounding rule"
              {...field}
            />
          )}
        />

        <p className="text-base text-gray-600 font-semibold">Modifiers</p>

        {fields.map((item, index) => (
          <div key={item.id} className="flex gap-4 items-center mb-2">
            <div className="flex-1">
              <Controller
                name={`modifiers[${index}].modifier`}
                control={control}
                render={({ field }) => (
                  <SelectInput
                    label="Modifier"
                    options={modifierOptions}
                    error={errors.modifiers?.[index]?.modifier?.message}
                    {...field}
                  />
                )}
              />
            </div>

            <div className="flex-1">
              <TextInput
                label="Rate per Unit"
                type="number"
                {...register(`modifiers[${index}].ratePerUnit`)}
                error={errors.modifiers?.[index]?.ratePerUnit?.message}
                placeholder="Enter Rate per Unit"
              />
            </div>

            {fields.length > 1 && (
              <button
                type="button"
                className="text-red-500 hover:text-red-700"
                onClick={() => remove(index)}
                aria-label="Remove Modifier"
              >
                <FaTrash />
              </button>
            )}
          </div>
        ))}

        <Button
          icon={<FaPlus />}
          variant="secondary"
          label="Add Modifier"
          onClick={() => append({ modifier: "", ratePerUnit: 0 })}
        />

        <div className="py-2 px-2 rounded-md bg-gray-150 mt-6 mb-6">
          <Controller
            name="billable"
            control={control}
            render={({ field }) => (
              <CheckboxInput
                label="This service is billable"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            )}
          />
        </div>

        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <SwitchInput
              label={field.value ? "Active" : "Inactive"}
              checked={field.value}
              onChange={(checked) => field.onChange(checked)}
              inputPosition="before"
            />
          )}
        />
      </div>
    </ReusableModal>
  );
};

export default AddServiceCodeModal;
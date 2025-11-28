// AddServiceCodeModal.jsx
import React, { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import {
  TextInput,
  SelectInput,
  SwitchInput,
  TextareaInput,
} from "../../Input/Inputs";
import Button from "../../Button/Button";
import { FaPlus, FaTrash } from "react-icons/fa";

// Validation schema
const serviceCodeSchema = yup.object().shape({
  code: yup.string().required("Service code is required"),
  description: yup.string().required("Description is required"),
  modifiers: yup.array().of(
    yup.object().shape({
      modifier: yup.string().required("Modifier is required"),
    })
  ),
  status: yup.boolean().default(true),
});

const modifierOptions = [
  { value: "HO", label: "HO" },
  { value: "HP", label: "HP" },
  { value: "HN", label: "HN" },
];

// Utility function to transform table data to form data
const transformServiceCodeToFormData = (data) => ({
  code: data.serviceCodes || "",
  description: data.description || "",
  modifiers: data.modifiers
    ? data.modifiers.split(", ").map((modifier) => ({ modifier }))
    : [{ modifier: "" }],
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
    modifiers: [{ modifier: "" }],
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
      onClose();
      reset(defaultFormValues);
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
          label="Add"
          onClick={() => append({ modifier: "" })}
        />
        <div className="mt-6">
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
      </div>
    </ReusableModal>
  );
};

export default AddServiceCodeModal;

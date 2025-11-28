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
} from "../../Input/Inputs";
import Button from "../../Button/Button";
import { FaPlus, FaTrash } from "react-icons/fa";

// Validation schema
const sessionTypeSchema = yup.object().shape({
  name: yup.string().required("Session name is required"),
  category: yup.string().required("Category is required"),
  billable: yup.boolean().default(false),
  hours: yup
    .number()
    .typeError("Must be a number")
    .min(0, "Must be 0 or greater")
    .optional(),
  minutes: yup
    .number()
    .typeError("Must be a number")
    .min(0, "Must be 0 or greater")
    .max(59, "Must be less than 60")
    .optional(),
  status: yup.boolean().default(true),
  service: yup.array().of(
    yup.object().shape({
      serviceType: yup.string().required("Service Type is required"),
      modifierType: yup.string().required("Modifier Type is required"),
    })
  ),
  location: yup.array().of(yup.string()).optional(),
  staffRole: yup.string().optional(),
});

// Dummy options
const serviceTypeOptions = [
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

const modifierOptions = [
  { value: "Modifier 1", label: "Modifier 1" },
  { value: "Modifier 2", label: "Modifier 2" },
  { value: "Modifier 3", label: "Modifier 3" },
];

const categoryOptions = [
  { value: "Assessment", label: "Assessment" },
  { value: "Planning/Admin", label: "Planning/Admin" },
  { value: "Supervision", label: "Supervision" },
  { value: "Caregiver Training", label: "Caregiver Training" },
  { value: "Direct Service", label: "Direct Service" },
  { value: "Consultation", label: "Consultation" },
  { value: "Review/Monitoring", label: "Review/Monitoring" },
  { value: "Crisis", label: "Crisis" },
  { value: "Other", label: "Other" },
];

const locationOptions = [
  { value: "Clinic/Center", label: "Clinic/Center" },
  { value: "Home", label: "Home" },
  { value: "School", label: "School" },
  { value: "Community", label: "Community" },
  { value: "Telehealth", label: "Telehealth" },
  { value: "Telephonic", label: "Telephonic" },
  { value: "Other", label: "Other" },
];

const staffRoleOptions = [
  { value: "Role 1", label: "Role 1" },
  { value: "Role 2", label: "Role 2" },
  { value: "Role 3", label: "Role 3" },
];

// Utility function to transform API data to form data
const transformSessionTypeToFormData = (data) => {
  const defaultDuration = data.defaultDuration || 0;
  const hours = Math.floor(defaultDuration / 60);
  const minutes = defaultDuration % 60;

  return {
    name: data.name || "",
    category: data.category || "",
    billable: data.isBillable || false,
    hours,
    minutes,
    status: data.isActive !== undefined ? data.isActive : true,
    service: Array.isArray(data.service)
      ? data.service.map((s) => ({
          serviceType: s.serviceType || "",
          modifierType: s.modifierType || "",
        }))
      : [{ serviceType: "", modifierType: "" }],
    location: Array.isArray(data.locationsAllowed) ? data.locationsAllowed : [],
    staffRole: Array.isArray(data.staffRolesAllowed) ? data.staffRolesAllowed[0] || "" : "",
  };
};

const AddSessionTypeModal = ({
  isOpen,
  onClose,
  onSave,
  mode = "add",
  initialData = {},
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const defaultFormValues = {
    name: "",
    category: "",
    billable: false,
    hours: 0,
    minutes: 0,
    status: true,
    service: [{ serviceType: "", modifierType: "" }],
    location: [],
    staffRole: "",
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(sessionTypeSchema),
    defaultValues: defaultFormValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "service",
  });

  // Reset form when isOpen, mode, or initialData changes
  useEffect(() => {
    if (isOpen) {
      const values = mode === "edit" ? transformSessionTypeToFormData(initialData) : defaultFormValues;
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
      console.error("Error saving session type:", error);
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
      title={mode === "edit" ? "Edit Session Type" : "Add Session Type"}
      primaryButtonText={isLoading ? "Saving..." : "Save Session Type"}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={isLoading}
      onPrimaryButtonClick={handleSubmit(handleSave)}
      onSecondaryButtonClick={() => {
        reset(defaultFormValues);
        onClose();
      }}
      size="lg"
       primaryButtonLoading={isLoading}s
    >
      <div className="mt-5 space-y-4">
        <TextInput
          label="Name"
          {...register("name")}
          error={errors.name?.message}
          placeholder="Enter session name"
        />

        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="Category"
              options={categoryOptions}
              error={errors.category?.message}
              placeholder="Select category"
              {...field}
            />
          )}
        />

        <p className="text-base text-gray-600 font-semibold">
          Service and CPT Code(s)
        </p>

        {fields.map((item, index) => (
          <div key={item.id} className="flex gap-4 items-center mb-2">
            <div className="flex-1">
              <Controller
                name={`service.${index}.serviceType`}
                control={control}
                render={({ field }) => (
                  <SelectInput
                    label="Service Type"
                    options={serviceTypeOptions}
                    error={errors.service?.[index]?.serviceType?.message}
                    {...field}
                  />
                )}
              />
            </div>

            <div className="flex-1">
              <Controller
                name={`service.${index}.modifierType`}
                control={control}
                render={({ field }) => (
                  <SelectInput
                    label="Modifier"
                    options={modifierOptions}
                    error={errors.service?.[index]?.modifierType?.message}
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
                aria-label="Remove Service"
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
          onClick={() => append({ serviceType: "", modifierType: "" })}
        />

        <div className="mt-4">
          <Controller
            name="staffRole"
            control={control}
            render={({ field }) => (
              <SelectInput
                label="Staff Role(s) Allowed"
                options={staffRoleOptions}
                error={errors.staffRole?.message}
                placeholder="Select staff role"
                {...field}
              />
            )}
          />
        </div>

        <Controller
          name="location"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="Location(s) Allowed"
              options={locationOptions}
              error={errors.location?.message}
              placeholder="Select location"
              isMulti="true"
              {...field}
            />
          )}
        />

        <p className="text-sm text-gray-700 mt-6">Default Duration</p>
        <div className="flex items-center gap-4 mt-2">
          <div style={{ marginBottom: "-14px" }}>
            <TextInput
              type="number"
              {...register("hours")}
              width="70"
              className="rounded-20px"
              placeholder="0"
              error={errors.hours?.message}
            />
          </div>
          <p className="text-sm text-gray-700">hour(s)</p>
          <div style={{ marginBottom: "-14px" }}>
            <TextInput
              type="number"
              {...register("minutes")}
              width="70"
              className="rounded-20px"
              placeholder="0"
              error={errors.minutes?.message}
            />
          </div>
          <p className="text-sm text-gray-700">minutes</p>
        </div>

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

export default AddSessionTypeModal;
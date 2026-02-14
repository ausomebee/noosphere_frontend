import React, { useCallback, useEffect, useState } from "react";
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
import api2 from "../../../api/billingAndPaymentsApi"; // For fetching service codes
import { useSelector } from "react-redux";
import { showToast } from "../../../Helper/ShowToast";

// Updated validation schema
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
  services: yup.array().of(
    yup.object().shape({
      serviceCodeId: yup.string().required("Service code is required"),
      modifier: yup.string().optional().nullable(),
    })
  ),
  location: yup.array().of(yup.string()).optional(),
  staffRole: yup.string().optional(),
});

// Modifier options from ABA billing standards
const modifierOptions = [
  { value: "", label: "No Modifier" },
  { value: "HO", label: "HO - Master's-level provider" },
  { value: "HP", label: "HP - Doctoral-level provider" },
  { value: "HN", label: "HN - Associate's-level provider" },
  { value: "HM", label: "HM - Bachelor's-level provider" },
  { value: "95", label: "95 - Synchronous telehealth" },
  { value: "GT", label: "GT - Via interactive audio and video (older telehealth modifier)" },
  { value: "KX", label: "KX - Documentation requirements met" },
  { value: "59", label: "59 - Distinct procedural service" },
  { value: "76", label: "76 - Repeat procedure/same provider" },
  { value: "77", label: "77 - Repeat procedure/different provider" },
];

// Category and other options (kept as before)
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

// Utility to transform initial data for edit mode
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
    services:
      data.service && Array.isArray(data.service)
        ? data.service.map((s) => ({
            serviceCodeId: s.serviceCodeId || "",
            modifier: s.modifiers?.modifier || "",
          }))
        : [{ serviceCodeId: "", modifier: "" }],
    location: Array.isArray(data.locationsAllowed) ? data.locationsAllowed : [],
    staffRole: Array.isArray(data.staffRolesAllowed)
      ? data.staffRolesAllowed[0] || ""
      : "",
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
  const [serviceCodes, setServiceCodes] = useState([]);
  const [loadingServiceCodes, setLoadingServiceCodes] = useState(false);

  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const accessToken = useSelector((s) => s.authentication?.user?.accessToken);
  const refreshToken = useSelector((s) => s.authentication?.user?.refreshToken);

  const defaultFormValues = {
    name: "",
    category: "",
    billable: false,
    hours: 0,
    minutes: 0,
    status: true,
    services: [{ serviceCodeId: "", modifier: "" }],
    location: [],
    staffRole: "",
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(sessionTypeSchema),
    defaultValues: defaultFormValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "services",
  });

  const services = watch("services");

  // Fetch service codes when modal opens
  const fetchServiceCodes = useCallback(async () => {
    if (!tenantId || !accessToken) return;
    setLoadingServiceCodes(true);
    try {
      const response = await api2.GetTenantServiceCodeByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const data = response?.data || [];
      const options = data
        .filter((item) => !item.isDeleted && item.isActive)
        .map((item) => ({
          value: item.id, // Use the UUID as value
          label: `${item.code} - ${item.description || "No description"}`,
        }));
      setServiceCodes(options);
    } catch (error) {
      console.error("Failed to load service codes:", error);
      showToast("Failed to load service codes", "error");
    } finally {
      setLoadingServiceCodes(false);
    }
  }, [tenantId, accessToken, refreshToken]);

  useEffect(() => {
    if (isOpen) {
      fetchServiceCodes();
      const values =
        mode === "edit"
          ? transformSessionTypeToFormData(initialData)
          : defaultFormValues;
      reset(values);
    }
  }, [isOpen, mode, initialData, reset, fetchServiceCodes]);

  const handleSave = async (data) => {
    setIsLoading(true);
    try {
      // Transform services to required backend format
      const transformedServices = data.services
        .filter((s) => s.serviceCodeId) // Remove empty rows
        .map((s) => ({
          serviceCodeId: s.serviceCodeId,
          modifiers: {
            modifier: s.modifier || "",
          },
        }));

      const payload = {
        name: data.name,
        category: data.category,
        service: transformedServices,
        staffRolesAllowed: data.staffRole ? [data.staffRole] : [],
        locationsAllowed: data.location || [],
        defaultDuration: (data.hours || 0) * 60 + (data.minutes || 0),
        isBillable: data.billable,
        isActive: data.status,
      };

      await onSave(payload);
      reset(defaultFormValues);
      onClose();
    } catch (error) {
      console.error("Error saving session type:", error);
      showToast("Failed to save session type", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const addServiceRow = () => {
    append({ serviceCodeId: "", modifier: "" });
  };

  const removeServiceRow = (index) => {
    if (fields.length > 1) {
      remove(index);
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
      primaryButtonLoading={isLoading}
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
          <div key={item.id} className="flex gap-4 items-end mb-4">
            <div className="flex-1">
              <Controller
                name={`services.${index}.serviceCodeId`}
                control={control}
                render={({ field }) => (
                  <SelectInput
                    label={index === 0 ? "Service Code (CPT/HCPCS)" : ""}
                    options={serviceCodes}
                    isLoading={loadingServiceCodes}
                    placeholder="Select a service code"
                    error={errors.services?.[index]?.serviceCodeId?.message}
                    {...field}
                  />
                )}
              />
            </div>

            <div className="flex-1">
              <Controller
                name={`services.${index}.modifier`}
                control={control}
                render={({ field }) => (
                  <SelectInput
                    label={index === 0 ? "Modifier" : ""}
                    options={modifierOptions}
                    placeholder="Select a modifier (optional)"
                    error={errors.services?.[index]?.modifier?.message}
                    {...field}
                  />
                )}
              />
            </div>

            {fields.length > 1 && (
              <Button
                type="button"
                variant="danger"
                icon={<FaTrash />}
                onClick={() => removeServiceRow(index)}
                className="mb-1"
              />
            )}
          </div>
        ))}

        <Button
          icon={<FaPlus />}
          variant="secondary"
          label="Add Another Service Code"
          onClick={addServiceRow}
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
              placeholder="Select location(s)"
              isMulti={true}
              {...field}
            />
          )}
        />

        <p className="text-sm text-gray-700 mt-6">Default Duration</p>
        <div className="flex items-center gap-4 mt-2">
          <div style={{ marginBottom: "-14px" }}>
            <TextInput
              type="number"
              {...register("hours", { valueAsNumber: true })}
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
              {...register("minutes", { valueAsNumber: true })}
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
                label="This session type is billable"
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
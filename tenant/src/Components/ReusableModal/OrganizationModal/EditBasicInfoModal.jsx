import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import useAuth from "../../../hooks/useAuth";
import roleApi from "../../../api/roleApi";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";
import { TextInput, SelectInput, SwitchInput } from "../../Input/Inputs";
import Button from "../../Button/Button";
import { showToast } from "../../../Helper/ShowToast";
import { genderOptions } from "../../../Data/selectOptions";
import {
  countryOptions,
  getStateOptions,
  normalizeCountryCode,
  normalizeStateCode,
} from "../../../Helper/geoOptions";
import useReduxFormDraft from "../../../hooks/useReduxFormDraft";

// Validation schema for Basic Information fields
const schema = yup.object().shape({
  fullName: yup.string().required("Full Name is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  phoneNumber: yup
    .string()
    .matches(/^\+?[\d\s-]{10,}$/, "Invalid phone number")
    .required("Phone Number is required"),
  DOB: yup
    .date()
    .required("Date of Birth is required")
    .max(new Date(), "Date of Birth cannot be in the future"),
  gender: yup.string().required("Gender is required"),
  practiceNPI: yup
    .string()
    .matches(/^\d{10}$/, "NPI must be a 10-digit number")
    .optional(),
  staffRole: yup.string().required("Staff Role is required"),
  address: yup.string().required("Address is required"),
  city: yup.string().required("City is required"),
  state: yup.string().required("State is required"),
  zip: yup.string().required("ZIP code is required"),
  country: yup.string().required("Country is required"),
  active: yup.boolean().required("Active status is required"),
});


const BasicInfoModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  tenantStaffId,
}) => {
  const { accessToken, refreshToken, tenantId } = useAuth();
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [staffRoleOptions, setStaffRoleOptions] = useState([]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await roleApi.GetAllRolesByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const roles = res.data?.data || res.data || [];
      setStaffRoleOptions(
        roles.map((role) => ({ value: role.id, label: role.name })),
      );
    } catch {
      setStaffRoleOptions([]);
    }
  }, [tenantId, accessToken, refreshToken]);

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen, fetchRoles]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      DOB: "",
      gender: "",
      practiceNPI: "",
      staffRole: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      active: true,
    },
  });

  const country = watch("country");
  const stateOptions = useMemo(() => getStateOptions(country), [country]);

  const clearDraft = useReduxFormDraft("edit-basic-info", { watch, reset, isOpen, exclude: [] });

  // Initialize form with initialData
  useEffect(() => {
    if (isOpen && initialData) {
      reset({
        fullName: initialData.fullName || "",
        email: initialData.email || "",
        phoneNumber: initialData.phoneNumber || "",
        DOB: initialData.DOB
          ? new Date(initialData.DOB).toISOString().split("T")[0]
          : "",
        gender: initialData.gender || "",
        practiceNPI: initialData.practiceNPI || "",
        staffRole: initialData.staffRole || "",
        address: initialData.address || "",
        city: initialData.city || "",
        state: normalizeStateCode(
          initialData.state,
          normalizeCountryCode(initialData.country),
        ),
        zip: initialData.zip || "",
        country: normalizeCountryCode(initialData.country),
        active: initialData.active ?? true,
      });
      setSubmitError("");
    } else {
      reset({
        fullName: "",
        email: "",
        phoneNumber: "",
        DOB: "",
        gender: "",
        practiceNPI: "",
        staffRole: "",
        address: "",
        city: "",
        state: "",
        zip: "",
        country: "",
        active: true,
      });
    }
  }, [isOpen, initialData, reset]);

  const onValidationError = (errors) => {
    const firstError = Object.values(errors)[0];
    showToast(firstError?.message || "Please fill in all required fields", "error");
  };

  const handleFormSubmit = async (data) => {
    if (!isDirty) {
      onClose(); // No changes, close modal
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = {
        id: tenantStaffId,
        ...data,
        accessToken,
        refreshToken,
      };
      await onSave(payload);
      clearDraft();
      reset(); // Reset form after successful save
      onClose();
    } catch (e) {
      const errorMessage =
        e.response?.data?.message ||
        e.message ||
        "Failed to save basic information";
      setSubmitError(errorMessage);
      console.error("Save error:", {
        message: errorMessage,
        response: e.response?.data,
        status: e.response?.status,
        stack: e.stack,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setSubmitError("");
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Basic Information"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(handleFormSubmit, onValidationError)}
      onSecondaryButtonClick={handleClose}
      size="lg"
      primaryButtonLoading={submitting}
      primaryButtonDisabled={submitting || !isDirty}
    >
      <div className="p-4 space-y-4">
        {submitError && (
          <div className="mb-4 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded">
            {submitError}
          </div>
        )}
        <TextInput
          required
          label="Full Name"
          {...register("fullName")}
          error={errors.fullName?.message}
          placeholder="Enter Full Name"
        />
        <TextInput
          required
          label="Email"
          type="email"
          {...register("email")}
          error={errors.email?.message}
          placeholder="Enter Email"
        />
        <TextInput
          required
          label="Phone Number"
          type="tel"
          {...register("phoneNumber")}
          error={errors.phoneNumber?.message}
          placeholder="Enter Phone Number"
        />
        <TextInput
          required
          label="Date of Birth"
          type="date"
          {...register("DOB")}
          error={errors.DOB?.message}
        />
        <Controller
          name="gender"
          control={control}
          render={({ field }) => (
            <SelectInput
              required
              label="Gender"
              placeholder="Select gender"
              options={genderOptions}
              width="full"
              isSearchable={false}
              error={errors.gender?.message}
              {...field}
            />
          )}
        />
        <TextInput
          label="NPI"
          {...register("practiceNPI")}
          error={errors.practiceNPI?.message}
          placeholder="Enter NPI"
        />
        <Controller
          name="staffRole"
          control={control}
          render={({ field }) => (
            <SelectInput
              required
              label="Staff Role"
              placeholder="Select staff role"
              options={staffRoleOptions}
              emptyHint="No roles found. Create one in Organisation → Role & Permissions."
              width="full"
              isSearchable={false}
              error={errors.staffRole?.message}
              {...field}
            />
          )}
        />
        <div className="flex gap-4">
          <div className="flex-1">
            <TextInput
              required
              label="Address"
              {...register("address")}
              error={errors.address?.message}
              placeholder="Enter Address"
            />
          </div>
          <TextInput
            required
            label="City"
            {...register("city")}
            error={errors.city?.message}
            placeholder="Enter City"
          />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <Controller
              name="state"
              control={control}
              render={({ field }) => (
                <SelectInput
                  required
                  label="State"
                  options={stateOptions}
                  disabled={!country}
                  emptyHint={
                    country
                      ? "This country has no states/provinces."
                      : "Select a country first."
                  }
                  error={errors.state?.message}
                  placeholder="Select state"
                  {...field}
                />
              )}
            />
          </div>
          <div className="flex-1">
            <TextInput
              required
              label="ZIP"
              {...register("zip")}
              error={errors.zip?.message}
              placeholder="Enter ZIP"
            />
          </div>
          <div className="flex-1">
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <SelectInput
                  required
                  label="Country"
                  options={countryOptions}
                  error={errors.country?.message}
                  placeholder="Select country"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    // The old state belongs to the old country.
                    setValue("state", "");
                  }}
                />
              )}
            />
          </div>
        </div>
        <Controller
          name="active"
          control={control}
          render={({ field }) => (
            <SwitchInput
              label="Active Status"
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              error={errors.active?.message}
            />
          )}
        />
      </div>
    </ReusableModal>
  );
};

export default BasicInfoModal;

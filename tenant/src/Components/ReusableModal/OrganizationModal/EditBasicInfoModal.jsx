import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import useAuth from "../../../hooks/useAuth";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";
import { TextInput, SelectInput, SwitchInput } from "../../Input/Inputs";
import Button from "../../Button/Button";
import { showToast } from "../../../Helper/ShowToast";

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

// Options for select inputs
const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

const staffRoleOptions = [
  { value: "8285a9a5-0455-447d-9dbe-00ad68d6a0e5", label: "Admin" },
  { value: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", label: "Therapist" },
  { value: "b2c3d4e5-f6a7-8901-bcde-f23456789012", label: "Supervisor" },
  { value: "d4e5f6a7-b8c9-0123-def0-456789012345", label: "Assistant" },
];

const countryOptions = [
  { value: "US", label: "United States" },
  { value: "UK", label: "United Kingdom" },
];

const stateOptions = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

const BasicInfoModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  tenantStaffId,
}) => {
  const { accessToken, refreshToken } = useAuth();
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm({
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
        state: initialData.state || "",
        zip: initialData.zip || "",
        country: initialData.country || "",
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
          label="Full Name"
          {...register("fullName")}
          error={errors.fullName?.message}
          placeholder="Enter Full Name"
        />
        <TextInput
          label="Email"
          type="email"
          {...register("email")}
          error={errors.email?.message}
          placeholder="Enter Email"
        />
        <TextInput
          label="Phone Number"
          type="tel"
          {...register("phoneNumber")}
          error={errors.phoneNumber?.message}
          placeholder="Enter Phone Number"
        />
        <TextInput
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
              label="Staff Role"
              placeholder="Select staff role"
              options={staffRoleOptions}
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
              label="Address"
              {...register("address")}
              error={errors.address?.message}
              placeholder="Enter Address"
            />
          </div>
          <TextInput
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
                  label="State"
                  options={stateOptions}
                  error={errors.state?.message}
                  placeholder="Select state"
                  {...field}
                />
              )}
            />
          </div>
          <div className="flex-1">
            <TextInput
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
                  label="Country"
                  options={countryOptions}
                  error={errors.country?.message}
                  placeholder="Select country"
                  {...field}
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

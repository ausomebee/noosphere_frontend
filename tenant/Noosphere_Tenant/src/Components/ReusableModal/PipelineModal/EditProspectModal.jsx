import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { Controller, useForm, useWatch } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import ReusableModal from "../ReusableModal";
import { TextInput, SelectInput, CheckboxInput } from "../../Input/Inputs";
import api from "../../../api/AppointmentApi";
import { showToast } from "../../../Helper/ShowToast";
import { FiEdit3 } from "react-icons/fi";
import { useSelector } from "react-redux";

const schema = yup.object().shape({
  firstName: yup.string().required("First Name is required").trim(),
  lastName: yup.string().required("Last Name is required").trim(),
  preferredName: yup.string().optional(),
  email: yup
    .string()
    .email("Invalid email format")
    .required("Email is required")
    .trim(),
  phoneNumber: yup.string().optional(),
  gender: yup.string().optional(),
  DOB: yup.string().optional(),
  caregiverName: yup.string().optional(),
  relationshipToCaregiver: yup.string().optional(),
  streetAddress: yup.string().optional(),
  city: yup.string().optional(),
  state: yup.string().optional(),
  country: yup.string().optional(),
  zipCode: yup.string().optional(),
  assignToClinician: yup.string().optional(),
  clientPortalAccess: yup.boolean().optional(),
});

const EditProspectModal = ({ isOpen, onClose, onSave, formData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [clinicians, setClinicians] = useState([]);
  const tenantId = useSelector((state) => state.authentication?.user?.tenantId);
  const token = useSelector((state) => state.authentication?.user?.token);
  const accessToken = token;
  const refreshToken = token;
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      preferredName: "",
      email: "",
      phoneNumber: "",
      gender: "",
      DOB: "",
      caregiverName: "",
      relationshipToCaregiver: "",
      streetAddress: "",
      city: "",
      state: "",
      country: "",
      zipCode: "",
      assignToClinician: "",
      clientPortalAccess: false,
    },
  });

  // Fetch clinicians
  useEffect(() => {
    const fetchClinicians = async () => {
      try {
        const response = await api.GetTenantStaffByTenantId({ 
          tenantId, 
          accessToken, 
          refreshToken 
        });
        const cliniciansData = response.data.data || [];
        setClinicians(cliniciansData.map(clinician => ({
          value: clinician.id,
          label: clinician.fullName || `${clinician.firstName} ${clinician.lastName}`
        })));
      } catch (error) {
        console.error("Failed to fetch clinicians:", error);
        showToast("Failed to load clinicians", "error");
      }
    };

    if (isOpen && tenantId) {
      fetchClinicians();
    }
  }, [isOpen, tenantId, accessToken, refreshToken]);

  // Set form values when modal opens
  useEffect(() => {
    if (isOpen && formData) {
      // Handle both firstName/lastName and fullName formats for backward compatibility
      let firstName = formData.firstName || "";
      let lastName = formData.lastName || "";
      
      // If firstName/lastName are not available, try to split fullName
      if (!firstName && !lastName && formData.fullName) {
        const nameParts = formData.fullName.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }

      // Reset form with all values
      reset({
        id: formData.id || "",
        firstName: firstName,
        lastName: lastName,
        preferredName: formData.preferredName || "",
        email: formData.email || "",
        phoneNumber: formData.phoneNumber || "",
        gender: formData.gender || "",
        DOB: formData.DOB || "",
        caregiverName: formData.caregiverName || "",
        relationshipToCaregiver: formData.relationshipToCaregiver || "",
        streetAddress: formData.streetAddress || "",
        city: formData.city || "",
        state: formData.state || "",
        country: formData.country || "",
        zipCode: formData.zipCode || "",
        assignToClinician: formData.assignToClinician || "",
        clientPortalAccess: formData.clientPortalAccess || false,
      });
    }
  }, [isOpen, formData, reset, setValue]);

  const countryOptions = useMemo(
    () => [
      { value: "", label: "Select Country" },
      { value: "US", label: "United States" },
      { value: "UK", label: "United Kingdom" },
    ],
    []
  );

  const stateOptions = useMemo(
    () => [
      { value: "", label: "Select State" },
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
    ],
    []
  );

  const genderOptions = [
    { value: "", label: "Select Gender" },
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Other", label: "Other" },
  ];

  const clinicianOptions = [
    { value: "", label: "Select a Clinician" },
    ...clinicians
  ];

  const handleSave = async (formData) => {
    const updatedData = {
      id: formData.id,
      firstName: formData.firstName,
      lastName: formData.lastName,
      preferredName: formData.preferredName,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      gender: formData.gender,
      DOB: formData.DOB,
      caregiverName: formData.caregiverName,
      relationshipToCaregiver: formData.relationshipToCaregiver,
      streetAddress: formData.streetAddress,
      city: formData.city,
      state: formData.state,
      country: formData.country,
      zipCode: formData.zipCode,
      assignToClinician: formData.assignToClinician,
      clientPortalAccess: formData.clientPortalAccess,
      tenantId,
      accessToken,
      refreshToken,
    };

    setIsLoading(true);
    try {
      const response = await api.UpdateCandidate(updatedData);
      if (response.data.status === "ok") {
        showToast("Candidate updated successfully", "success");
        onSave(updatedData);
        onClose();
      } else {
        throw new Error(
          response.data.message || "Invalid response from server"
        );
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to update candidate";
      showToast(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Candidate"
      titleIcon={<FiEdit3 />}
      primaryButtonText={isLoading ? "Saving..." : "Save changes"}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={isLoading}
      onPrimaryButtonClick={handleSubmit(handleSave)}
      onSecondaryButtonClick={handleClose}
    >
      <form className="mt-5">
        <input type="hidden" {...register("id")} />
        
        <TextInput
          label="First Name"
          {...register("firstName")}
          error={errors.firstName?.message}
          placeholder="Type something"
        />
        <TextInput
          label="Last Name"
          {...register("lastName")}
          error={errors.lastName?.message}
          placeholder="Type something"
        />
        <TextInput
          label="Preferred Name"
          {...register("preferredName")}
          error={errors.preferredName?.message}
          placeholder="Type something"
        />
        <TextInput
          label="Email"
          type="email"
          {...register("email")}
          error={errors.email?.message}
          placeholder="Type something"
        />
        <TextInput
          label="Phone Number"
          {...register("phoneNumber")}
          error={errors.phoneNumber?.message}
          placeholder="Type something"
        />
        <Controller
          name="gender"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="Gender"
              options={genderOptions}
              error={errors.gender?.message}
              {...field}
            />
          )}
        />
        <TextInput
          label="Date of Birth"
          type="date"
          {...register("DOB")}
          error={errors.DOB?.message}
        />
        <TextInput
          label="Caregiver's Full Name"
          {...register("caregiverName")}
          error={errors.caregiverName?.message}
          placeholder="Type something"
        />
        <TextInput
          label="Relationship to Caregiver"
          {...register("relationshipToCaregiver")}
          error={errors.relationshipToCaregiver?.message}
          placeholder="Type something"
        />

        <TextInput
          label="Street Address"
          {...register("streetAddress")}
          error={errors.streetAddress?.message}
          placeholder="Street address"
        />
        <div className="flex gap-4 w-full">
          <div className="flex-1">
            <TextInput
              label="City"
              {...register("city")}
              error={errors.city?.message}
              placeholder="City"
              width="full"
            />
          </div>
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
        </div>

        <div className="flex gap-4 w-full">
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
          <div className="flex-1">
            <TextInput
              label="Zip Code"
              {...register("zipCode")}
              error={errors.zipCode?.message}
              placeholder="ZIP or Postal Code"
            />
          </div>
        </div>
        <Controller
          name="assignToClinician"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="Assign To Clinician(s)"
              options={clinicianOptions}
              error={errors.assignToClinician?.message}
              placeholder="Select a Clinician"
              {...field}
            />
          )}
        />
        <div className="mb-16px">
          <CheckboxInput
            {...register("clientPortalAccess")}
            label="Allow Client Portal Access"
          />
        </div>
      </form>
    </ReusableModal>
  );
};

EditProspectModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  formData: PropTypes.shape({
    id: PropTypes.string,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    fullName: PropTypes.string,
    preferredName: PropTypes.string,
    gender: PropTypes.string,
    DOB: PropTypes.string,
    email: PropTypes.string,
    phoneNumber: PropTypes.string,
    caregiverName: PropTypes.string,
    relationshipToCaregiver: PropTypes.string,
    streetAddress: PropTypes.string,
    city: PropTypes.string,
    state: PropTypes.string,
    country: PropTypes.string,
    zipCode: PropTypes.string,
    assignToClinician: PropTypes.string,
    clientPortalAccess: PropTypes.bool,
  }).isRequired,
};

export default React.memo(EditProspectModal);
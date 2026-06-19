import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "./ReusableModal";
import { TextInput, SelectInput } from "../Input/Inputs";
import { useDispatch } from "react-redux";
import useAuth from "../../hooks/useAuth";
import { updateCandidate } from "../../ReduxStore/features/PipelineSlice";
import { showToast } from "../../Helper/ShowToast";
import { useNavigate } from "react-router-dom";
import { orgTypeOptions as organizationTypeOptions, companySizeOptions } from "../../Data/selectOptions";
import useReduxFormDraft from "../../hooks/useReduxFormDraft";
import "./ReusableModal.css";

const validationSchema = yup.object().shape({
  company: yup.string().required("Company name is required"),
  contactPerson: yup.string().required("Contact person is required"),
  email: yup
    .string()
    .email("Invalid email address")
    .required("Email is required"),
  phone: yup
    .string()
    .required("Phone number is required")
    .matches(/^[0-9+()\-\s]{7,}$/, {
      message: "Enter a valid phone number (digits only)",
      excludeEmptyString: true,
    }),
  companySize: yup.string().nullable(),
  organizationType: yup.string().nullable(),
  location: yup.string().required("Address is required"),
  city: yup.string().nullable(),
  state: yup.string().nullable(),
  zipCode: yup
    .string()
    .nullable()
    .matches(/^[0-9]{3,10}$/, {
      message: "Zip code must be digits only",
      excludeEmptyString: true,
    }),
  country: yup.string().nullable(),
  leadSource: yup.string().nullable(),
  assignToStaff: yup.string().nullable(),
  onboardStage: yup.string().nullable(),
});

const EditProspectModal = ({
  isOpen,
  onClose,
  onSave,
  formData: initialFormData,
  staffList = [],
  stages = [],
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { accessToken, refreshToken, userId: adminId } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: initialFormData,
    resolver: yupResolver(validationSchema),
  });

  const clearDraft = useReduxFormDraft("edit-prospect", { watch, reset, isOpen, exclude: [] });

  const staffOptions = [
    { value: "", label: staffList.length ? "Select" : "No staff available" },
    ...staffList.map((staff) => ({ value: staff.staffId, label: staff.name })),
  ];

  const stageOptions = [
    { value: "", label: stages.length ? "Select" : "No stages available" },
    ...stages.map((stage) => ({ value: stage.stageId, label: stage.name })),
  ];


  useEffect(() => {
    if (isOpen) {
      reset(initialFormData);
    }
  }, [isOpen, initialFormData, reset]);

  const onSubmit = async (data) => {
    try {
      const updatedData = {
        companyName: data.company,
        fullName: data.contactPerson,
        contactPerson: data.contactPerson,
        email: data.email,
        phoneNumber: data.phone,
        companySize: data.companySize,
        organizationType: data.organizationType,
        location: {
          address: data.location,
          city: data.city,
          stateProvince: data.state,
          zip: data.zipCode,
          country: data.country,
        },
        leadSource: data.leadSource,
        assignToAdmin: data.assignToStaff,
        pipelineStageId: data.onboardStage,
        createdBy: adminId,
        stage: "DEFAULT",
      };

      const response = await dispatch(
        updateCandidate({
          id: initialFormData.id,
          ...updatedData,
          accessToken,
          refreshToken,
        })
      ).unwrap();

      if (response.status === "ok") {
        showToast("Candidate updated successfully!", "success");

        clearDraft();
        onSave(updatedData);
        window.location.reload();
        onClose();
      } else {
        throw new Error("Failed to update candidate.");
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Failed to update candidate:", error);
      showToast(
        error?.response?.data?.message || "Failed to update candidate.",
        "error"
      );
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit information"
      primaryButtonText="Save candidate"
      secondaryButtonText="Cancel"
      primaryButtonColor="#000000"
      secondaryButtonColor="#ffffff"
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      onSecondaryButtonClick={onClose}
      primaryButtonLoading={isSubmitting}
    >
      <form className="no-scrollbar::-webkit-scrollbar no-scrollbar">
        <TextInput
          label="Company Name"
          {...register("company")}
          error={errors.company?.message}
          placeholder="Type something"
        />
        <TextInput
          label="Contact person"
          {...register("contactPerson")}
          error={errors.contactPerson?.message}
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
          label="Phone"
          {...register("phone")}
          error={errors.phone?.message}
          placeholder="Type something"
        />
        <SelectInput
          label="Company Size"
          {...register("companySize")}
          options={companySizeOptions}
          error={errors.companySize?.message}
        />
        <SelectInput
          label="Organization Type"
          {...register("organizationType")}
          options={organizationTypeOptions}
          error={errors.organizationType?.message}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput
            label="Address"
            {...register("location")}
            error={errors.location?.message}
            placeholder="Street address"
          />
          <TextInput
            label="City"
            {...register("city")}
            error={errors.city?.message}
            placeholder="City"
          />
          <TextInput
            label="State / Province"
            {...register("state")}
            error={errors.state?.message}
            placeholder="State or Province"
          />
          <TextInput
            label="ZIP / Postal Code"
            {...register("zipCode")}
            error={errors.zipCode?.message}
            placeholder="ZIP or Postal Code"
          />
          <TextInput
            label="Country"
            {...register("country")}
            error={errors.country?.message}
            placeholder="Country"
          />
        </div>

        <TextInput
          label="Lead Source"
          {...register("leadSource")}
          error={errors.leadSource?.message}
          placeholder="Type something"
        />
        <SelectInput
          label="Assign to Staff"
          {...register("assignToStaff")}
          options={staffOptions}
          error={errors.assignToStaff?.message}
          disabled={staffList.length === 0}
        />
        <SelectInput
          label="Select Onboarding Stage"
          {...register("onboardStage")}
          options={stageOptions}
          error={errors.onboardStage?.message}
          disabled={stages.length === 0}
        />
      </form>
    </ReusableModal>
  );
};

export default EditProspectModal;

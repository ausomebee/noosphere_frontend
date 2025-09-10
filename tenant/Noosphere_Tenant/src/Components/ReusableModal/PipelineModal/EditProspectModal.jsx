
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import ReusableModal from "../ReusableModal";
import { TextInput, SelectInput, CheckboxInput } from "../../Input/Inputs";
import api from "../../../api/TenantApis";
import { showToast } from "../../../Helper/ShowToast";
import { FiEdit3 } from "react-icons/fi";
import { useSelector } from "react-redux";

const schema = yup.object().shape({
  fullName: yup.string().required("Full Name is required").trim(),
  email: yup
    .string()
    .email("Invalid email format")
    .required("Email is required")
    .trim(),
  phoneNumber: yup.string().optional(),
  streetAddress: yup.string().optional(),
  city: yup.string().optional(),
  state: yup.string().optional(),
  country: yup.string().optional(),
  zipCode: yup.string().optional(),
  gender: yup.string().optional(),
  DOB: yup.string().optional(),
  pipelineStageId: yup.string().required("Pipeline Stage is required"),
  dbAccess: yup.boolean().optional(),
});

const EditProspectModal = ({ isOpen, onClose, onSave, formData, stages }) => {
  const [isLoading, setIsLoading] = useState(false);
  const tenantId = useSelector((state) => state.authentication?.user?.tenantId);
  const staffId = useSelector((state) => state.authentication?.user?.id);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      streetAddress: "",
      city: "",
      state: "",
      country: "",
      zipCode: "",
      gender: "",
      DOB: "",
      pipelineStageId: "",
      dbAccess: false,
    },
  });

  useEffect(() => {
    if (isOpen) {
      setValue("id", formData.id || "");
      setValue("fullName", formData.fullName || "");
      setValue("email", formData.email || "");
      setValue("phoneNumber", formData.phoneNumber || "");
      setValue("streetAddress", formData.streetAddress || "");
      setValue("city", formData.city || "");
      setValue("state", formData.state || "");
      setValue("country", formData.country || "");
      setValue("zipCode", formData.zipCode || "");
      setValue("gender", formData.gender || "");
      setValue("DOB", formData.DOB || "");
      setValue("pipelineStageId", formData.pipelineStageId || (stages?.length > 0 ? stages[0].stageId : ""));
      setValue("dbAccess", formData.dbAccess || false);
    }
  }, [isOpen, formData, setValue, stages]);

  const stageOptions = [
    { value: "", label: stages.length ? "Select" : "No stages available" },
    ...stages.map((stage) => ({
      value: stage.stageId,
      label: stage.name,
    })),
  ];

  const genderOptions = [
    { value: "", label: "Select Gender" },
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Other", label: "Other" },
  ];

  const handleSave = async (formData) => {
    const updatedData = {
      id: formData.id,
      fullName: formData.fullName,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      streetAddress: formData.streetAddress,
      city: formData.city,
      state: formData.state,
      country: formData.country,
      zipCode: formData.zipCode,
      gender: formData.gender.toLowerCase(),
      DOB: formData.DOB,
      pipelineStageId: formData.pipelineStageId,
      tenantId,
      assignToTenantStaff: staffId,
      dbAccess: formData.dbAccess,
    };

    setIsLoading(true);
    try {
      const response = await api.UpdateCandidate(updatedData);
      if (response.data.status === "ok") {
        showToast("Candidate updated successfully", "success");
        onSave(updatedData);
        reset(updatedData);
        onClose();
      } else {
        throw new Error(response.data.message || "Invalid response from server");
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

  if (!isOpen) return null;

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        reset({
          id: formData.id || "",
          fullName: formData.fullName || "",
          email: formData.email || "",
          phoneNumber: formData.phoneNumber || "",
          streetAddress: formData.streetAddress || "",
          city: formData.city || "",
          state: formData.state || "",
          country: formData.country || "",
          zipCode: formData.zipCode || "",
          gender: formData.gender || "",
          DOB: formData.DOB || "",
          pipelineStageId: formData.pipelineStageId || "",
          dbAccess: formData.dbAccess || false,
        });
        onClose();
      }}
      title="Edit Candidate"
      titleIcon={<FiEdit3 />}
      primaryButtonText={isLoading ? "Saving..." : "Save changes"}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={isLoading}
      onPrimaryButtonClick={handleSubmit(handleSave)}
      onSecondaryButtonClick={() => {
        reset({
          id: formData.id || "",
          fullName: formData.fullName || "",
          email: formData.email || "",
          phoneNumber: formData.phoneNumber || "",
          streetAddress: formData.streetAddress || "",
          city: formData.city || "",
          state: formData.state || "",
          country: formData.country || "",
          zipCode: formData.zipCode || "",
          gender: formData.gender || "",
          DOB: formData.DOB || "",
          pipelineStageId: formData.pipelineStageId || "",
          dbAccess: formData.dbAccess || false,
        });
        onClose();
      }}
    >
      <form className="mt-5">
        <TextInput
          label="Full Name"
          {...register("fullName")}
          error={errors.fullName?.message}
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

        <SelectInput
          label="Gender"
          {...register("gender")}
          options={genderOptions}
          error={errors.gender?.message}
        />
        <TextInput
          label="Date of Birth"
          type="date"
          {...register("DOB")}
          error={errors.DOB?.message}
        />
        <SelectInput
          label="Pipeline Stage"
          {...register("pipelineStageId")}
          options={stageOptions}
          error={errors.pipelineStageId?.message}
          disabled={stages.length === 0}
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
            <TextInput
              label="State"
              {...register("state")}
              error={errors.state?.message}
              placeholder="State"
              width="full"
              className="flex-1"
            />
          </div>
        </div>

        <div className="flex gap-4 w-full">
          <div className="flex-1">
            <TextInput
              label="Country"
              {...register("country")}
              error={errors.country?.message}
              placeholder="Country"
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
        {/* <div className="mb-16px">
          <CheckboxInput
            {...register("dbAccess")}
            label="Grant Database Access"
          />
        </div> */}
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
    fullName: PropTypes.string,
    gender: PropTypes.string,
    DOB: PropTypes.string,
    email: PropTypes.string,
    phoneNumber: PropTypes.string,
    streetAddress: PropTypes.string,
    city: PropTypes.string,
    state: PropTypes.string,
    country: PropTypes.string,
    zipCode: PropTypes.string,
    pipelineStageId: PropTypes.string,
    dbAccess: PropTypes.bool,
  }).isRequired,
  stages: PropTypes.arrayOf(
    PropTypes.shape({
      stageId: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
};

export default React.memo(EditProspectModal);

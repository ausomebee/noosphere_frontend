import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Controller, useForm, useWatch } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import ReusableModal from "../ReusableModal";
import { TextInput, SelectInput, CheckboxInput } from "../../Input/Inputs";
import api from "../../../api/TenantApis";
import { showToast } from "../../../Helper/ShowToast";
import { FaUserPlus } from "react-icons/fa";
import { useSelector } from "react-redux";

const schema = yup.object().shape({
  fullName: yup.string().required("Full Name is required").trim(),
  email: yup
    .string()
    .email("Invalid email format")
    .required("Email is required")
    .trim(),
  phoneNumber: yup.string().optional(),
  streetAdress: yup.string().optional(),
  city: yup.string().optional(),
  state: yup.string().optional(),
  country: yup.string().optional(),
  zipCode: yup.string().optional(),
  gender: yup.string().optional(),
  DOB: yup.string().optional(),
  pipelineStageId: yup.string().required("Pipeline Stage is required"),
  dbAccess: yup.boolean().optional(),
});

const defaultFormValues = {
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
};

const AddProspectModal = ({ isOpen, onClose, onSave, stages, pipelineId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const tenantId = useSelector((state) => state.authentication?.user?.tenantId);
  const staffId = useSelector((state) => state.authentication?.user?.id);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: defaultFormValues,
  });

  const values = useWatch({ control });

  useEffect(() => {
    if (stages?.length > 0 && !defaultFormValues.pipelineStageId) {
      setValue("pipelineStageId", stages[0].stageId);
    }
  }, [stages, setValue]);

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
    const prospectData = {
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
      stage: "onboarding",
      tenantId,
      assignToTenantStaff: staffId,
      createdBy: staffId,
      dbAccess: formData.dbAccess,
    };

    setIsLoading(true);
    try {
      const response = await api.CreateCandidate(prospectData);
      if (response.data.status === "ok" && response.data.data?.id) {
        showToast("Candidate created successfully", "success");
        onSave({
          ...prospectData,
          id: response.data.data.id,
          createdAt: new Date().toISOString(),
        });
        reset(defaultFormValues);
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
        "Failed to create candidate";
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
        reset(defaultFormValues);
        onClose();
      }}
      title="Add a new candidate"
      titleIcon={<FaUserPlus />}
      primaryButtonText={isLoading ? "Saving..." : "Save candidate"}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={isLoading}
      onPrimaryButtonClick={handleSubmit(handleSave)}
      onSecondaryButtonClick={() => {
        reset(defaultFormValues);
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
        <Controller
          name="gender"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="Gender"
              {...register("gender")}
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
        <Controller
          name="pipelineStageId"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="Pipeline Stage"
              {...register("pipelineStageId")}
              options={stageOptions}
              error={errors.pipelineStageId?.message}
              disabled={stages.length === 0}
              {...field}
            />
          )}
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
        {/* <div className=" mb-16px">
          <CheckboxInput
            {...register("dbAccess")}
            label="Grant Database Access"
          />
        </div> */}
      </form>
    </ReusableModal>
  );
};

AddProspectModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  stages: PropTypes.arrayOf(
    PropTypes.shape({
      stageId: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
  pipelineId: PropTypes.string,
};

export default React.memo(AddProspectModal);

import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import ReusableModal from "./ReusableModal";
import { TextInput, SelectInput } from "../Input/Inputs";
import api from "../../api/TenantApis";
import { showToast } from "../../Helper/ShowToast";
import { useSelector } from "react-redux";

const schema = yup.object().shape({
  companyName: yup.string().required("Company Name is required").trim(),
  contactPerson: yup.string().optional(),
  email: yup
    .string()
    .email("Invalid email format")
    .required("Email is required")
    .trim(),
  phone: yup.string().optional(),
  companySize: yup.string().optional(),
  organizationType: yup.string().optional(),
  location: yup.object().shape({
    address: yup.string().optional(),
    city: yup.string().optional(),
    stateProvince: yup.string().optional(),
    zip: yup.string().optional(),
    country: yup.string().optional(),
  }),
  leadSource: yup.string().optional(),
  assignToStaff: yup.string().required("Assign to Staff is required"),
  pipelineStageId: yup.string().required("Onboarding Stage is required"),
});

const defaultFormValues = {
  companyName: "",
  contactPerson: "",
  email: "",
  phone: "",
  companySize: "",
  organizationType: "",
  location: {
    address: "",
    city: "",
    stateProvince: "",
    zip: "",
    country: "",
  },
  leadSource: "",
  assignToStaff: "",
  pipelineStageId: "",
};

const AddProspectModal = ({
  isOpen,
  onClose,
  onSave,
  staffList = [],
  stages = [],
  pipelineStageId, // Added to preselect the current stage
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const adminId = useSelector((state) => state.authentication?.user?.id);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      ...defaultFormValues,
      pipelineStageId, // Preselect the current stage
    },
  });

  // Set default pipelineStageId when modal opens
  React.useEffect(() => {
    if (pipelineStageId) {
      setValue("pipelineStageId", pipelineStageId);
    }
  }, [pipelineStageId, setValue]);

  const organizationTypeOptions = useMemo(
    () => [
      { value: "", label: "Select" },
      { value: "Solo Provider / BCBA Private Practice", label: "Solo Provider / BCBA Private Practice" },
      { value: "ABA Clinic or Center", label: "ABA Clinic or Center" },
      { value: "Multi-Disciplinary Therapy Practice", label: "Multi-Disciplinary Therapy Practice" },
      { value: "In-Home / Telehealth ABA Provider", label: "In-Home / Telehealth ABA Provider" },
      { value: "School or Early Intervention Program", label: "School or Early Intervention Program" },
      { value: "Healthcare or Behavioral Health Organization", label: "Healthcare or Behavioral Health Organization" },
      { value: "Nonprofit / Government Program", label: "Nonprofit / Government Program" },
      { value: "Other", label: "Other" },
    ],
    []
  );

  const companySizeOptions = useMemo(
    () => [
      { value: "", label: "Select" },
      { value: "1-5", label: "1–5 Employees" },
      { value: "5-10", label: "5–10 Employees" },
      { value: "10-50", label: "10–50 Employees" },
      { value: "50-100", label: "50–100 Employees" },
      { value: "100-500", label: "100–500 Employees" },
      { value: "500-1000", label: "500–1000 Employees" },
      { value: "1000+", label: "1000+ Employees" },
    ],
    []
  );

  const staffOptions = useMemo(
    () => [
      { value: "", label: staffList.length ? "Select" : "No staff available" },
      ...staffList.map((staff) => ({
        value: staff.staffId,
        label: staff.name,
      })),
    ],
    [staffList]
  );

  const stageOptions = useMemo(
    () => [
      { value: "", label: stages.length ? "Select" : "No stages available" },
      ...stages.map((stage) => ({
        value: stage.stageId,
        label: stage.name,
      })),
    ],
    [stages]
  );

  const handleSave = async (formData) => {
    const prospectData = {
      fullName: formData.contactPerson || formData.companyName,
      email: formData.email,
      phoneNumber: formData.phone,
      stage: "DEFAULT",
      pipelineStageId: formData.pipelineStageId,
      companyName: formData.companyName,
      contactPerson: formData.contactPerson,
      companySize: formData.companySize,
      organizationType: formData.organizationType,
      location: formData.location,
      leadSource: formData.leadSource,
      assignToAdmin: formData.assignToStaff,
      createdBy: adminId,
    };

    setIsLoading(true);
    try {
      const response = await api.CreateCandidate(prospectData);
      if (response.data.status === "ok" && response.data.data?.id) {
        showToast("Candidate created successfully", "success");
        // Pass the created candidate data to the parent
        onSave({
          ...prospectData,
          id: response.data.data.id,
          createdAt: new Date().toISOString(),
        });
        reset(defaultFormValues);
        onClose();
      } else {
        throw new Error(response.data.message || "Invalid response from server");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to create candidate";
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
      title="Add a new prospect"
      primaryButtonText={isLoading ? "Saving..." : "Save candidate"}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={isLoading}
      onPrimaryButtonClick={handleSubmit(handleSave)}
      onSecondaryButtonClick={() => {
        reset(defaultFormValues);
        onClose();
      }}
    >
      <form className="space-y-4 max-h-[60vh] overflow-y-auto p-4">
        <TextInput
          label="Company Name"
          {...register("companyName")}
          error={errors.companyName?.message}
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
            {...register("location.address")}
            error={errors.location?.address?.message}
            placeholder="Street address"
          />
          <TextInput
            label="City"
            {...register("location.city")}
            error={errors.location?.city?.message}
            placeholder="City"
          />
          <TextInput
            label="State / Province"
            {...register("location.stateProvince")}
            error={errors.location?.stateProvince?.message}
            placeholder="State or Province"
          />
          <TextInput
            label="ZIP / Postal Code"
            {...register("location.zip")}
            error={errors.location?.zip?.message}
            placeholder="ZIP or Postal Code"
          />
          <TextInput
            label="Country"
            {...register("location.country")}
            error={errors.location?.country?.message}
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
          {...register("pipelineStageId")}
          options={stageOptions}
          error={errors.pipelineStageId?.message}
          disabled={stages.length === 0}
        />
      </form>
    </ReusableModal>
  );
};

AddProspectModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  staffList: PropTypes.arrayOf(
    PropTypes.shape({
      staffId: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
  stages: PropTypes.arrayOf(
    PropTypes.shape({
      stageId: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
  pipelineStageId: PropTypes.string,
};

export default React.memo(AddProspectModal);
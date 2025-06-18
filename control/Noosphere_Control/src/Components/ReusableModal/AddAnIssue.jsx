import React, { useState, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import ReusableModal from "./ReusableModal";
import { TextInput, SelectInput, TextareaInput } from "../Input/Inputs";
import { showToast } from "../../Helper/ShowToast";
import { useSelector } from "react-redux";
import { BsCloudUpload } from "react-icons/bs";

// Yup schema for AddIssueModal
const schema = yup.object().shape({
  tenant: yup.string().required("Company Name is required").trim(),
  issueTitle: yup.string().required("Issue Title is required").trim(),
  description: yup.string().required("Issue Description is required").trim(),
  category: yup.string().required("Category is required").trim(),
  priority: yup.string().required("Priority is required").trim(),
  assignToStaff: yup.string().required("Assign to Staff is required"),
  resolutionTime: yup.object().shape({
    value: yup.string().required("Resolution Time is required"),
    duration: yup.string().required("Duration is required"),
  }),
  attachmentUpload: yup.string().optional(),
});

const defaultFormValues = {
  tenant: "",
  issueTitle: "",
  description: "",
  category: "",
  priority: "",
  assignToStaff: "",
  resolutionTime: { value: "", duration: "" },
  attachmentUpload: "",
};

// AddIssueModal Component
const AddIssueModal = ({
  isOpen,
  onClose,
  onSave,
  tenantList = [],
  staffList = [],
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const adminId = useSelector((state) => state.auth?.adminId); // Adjusted to match previous versions

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { ...defaultFormValues },
  });

  const tenantValue = watch("tenant");

  useEffect(() => {
    const tenant = tenantList.find((t) => t.tenantId === tenantValue);
    setSelectedTenant(tenant || null);
  }, [tenantValue, tenantList]);

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "Select" },
      { value: "Account & Access", label: "Account & Access" },
      { value: "Billing & Payments", label: "Billing & Payments" },
      { value: "Subscription & Plans", label: "Subscription & Plans" },
      { value: "Data Issues", label: "Data Issues" },
      { value: "User Management & Roles", label: "User Management & Roles" },
      {
        value: "Client/Patient Management Issues",
        label: "Client/Patient Management Issues",
      },
      { value: "Bug Report", label: "Bug Report" },
      { value: "Performance", label: "Performance" },
      { value: "Compliance & Security", label: "Compliance & Security" },
      { value: "Notifications & Emails", label: "Notifications & Emails" },
      { value: "Analytics & Reporting", label: "Analytics & Reporting" },
      { value: "Customization & Settings", label: "Customization & Settings" },
      { value: "Third-Party Integrations", label: "Third-Party Integrations" },
      { value: "Training & Onboarding", label: "Training & Onboarding" },
      { value: "Feature Request", label: "Feature Request" },
      { value: "Other / Miscellaneous", label: "Other / Miscellaneous" },
    ],
    []
  );

  const priorityOptions = useMemo(() => {
    const baseOptions = [
      { value: "", label: "Select" },
      { value: "Critical", label: "P1 - Critical" },
      { value: "High", label: "P2 - High" },
      { value: "Medium", label: "P3 - Medium" },
      { value: "Low", label: "P4 - Low" },
    ];
    if (selectedTenant?.isEnterprise) {
      return [
        { value: "", label: "Select" },
        { value: "Enterprise Critical", label: "EP1 - Enterprise Critical" },
        { value: "Enterprise High", label: "EP1 - Enterprise High" },
        ...baseOptions.slice(1),
      ];
    }
    return baseOptions;
  }, [selectedTenant]);

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

  const tenantOptions = useMemo(
    () => [
      {
        value: "",
        label: tenantList.length ? "Select" : "No tenant available",
      },
      ...tenantList.map((tenant) => ({
        value: tenant.tenantId,
        label: tenant.name,
      })),
    ],
    [tenantList]
  );

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files).map((file) => {
      const sizeInMB = file.size / 1024 / 1024;
      const sizeDisplay =
        sizeInMB < 1
          ? (file.size / 1024).toFixed(0) + " KB"
          : sizeInMB.toFixed(1) + " MB";

      if (sizeInMB > 50) {
        return {
          name: file.name,
          size: sizeDisplay,
          progress: 0,
          error: true,
          errorMessage: "File size exceeds 50MB limit",
        };
      }

      return {
        name: file.name,
        size: sizeDisplay,
        progress: 0,
        error: false,
      };
    });

    setFiles((prev) => [...prev, ...newFiles]);

    setUploading(true);
    newFiles.forEach((file, index) => {
      if (file.error) return;

      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setFiles((prev) =>
          prev.map((f, i) =>
            i === index + files.length - newFiles.length
              ? { ...f, progress }
              : f
          )
        );
        if (progress >= 100) {
          clearInterval(interval);
          if (file.name.includes("Unable")) {
            setFiles((prev) =>
              prev.map((f, i) =>
                i === index + files.length - newFiles.length
                  ? {
                      ...f,
                      error: true,
                      errorMessage: "Unable to upload. Please try again",
                    }
                  : f
              )
            );
          }
        }
      }, 300);
    });

    setValue("attachmentUpload", newFiles.map((file) => file.name).join(", "));
  };

  const calculateResolutionDate = () => {
    const { value, duration } = watch("resolutionTime");
    if (!value || !duration) return null; // Return null if either field is empty

    const now = new Date();
    let resolutionDate = new Date(now);
    const numValue = parseInt(value, 10);

    if (duration === "hours") {
      resolutionDate.setHours(now.getHours() + numValue);
    } else if (duration === "days") {
      resolutionDate.setDate(now.getDate() + numValue);
    } else if (duration === "business days") {
      let daysAdded = 0;
      while (daysAdded < numValue) {
        resolutionDate.setDate(resolutionDate.getDate() + 1);
        if (resolutionDate.getDay() !== 0 && resolutionDate.getDay() !== 6) {
          daysAdded++;
        }
      }
    }

    return `Expected resolution: ${resolutionDate.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })} (within ${value} ${duration})`;
  };

  const handleSave = async (formData) => {
    const issueData = {
      tenantId: formData.tenant,
      issueTitle: formData.issueTitle,
      description: formData.description,
      category: formData.category,
      priority: formData.priority,
      assignToStaff: formData.assignToStaff,
      resolutionTime: formData.resolutionTime,
      attachmentUpload: formData.attachmentUpload,
      createdBy: adminId,
    };

    setIsLoading(true);
    try {
      const response = await api2.CreateIssue(issueData);
      if (response.data.status === "ok" && response.data.data?.id) {
        showToast("Issue created successfully", "success");
        onSave({
          ...issueData,
          id: response.data.data.id,
          createdAt: new Date().toISOString(),
        });
        reset(defaultFormValues);
        setFiles([]);
        onClose();
      } else {
        throw new Error(response.data.message || "Invalid response from server");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to create issue";
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
        setFiles([]);
        onClose();
      }}
      title="Log an Issue"
      primaryButtonText={isLoading ? "Saving..." : "Save Issue"}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={isLoading}
      onPrimaryButtonClick={handleSubmit(handleSave)}
      onSecondaryButtonClick={() => {
        reset(defaultFormValues);
        setFiles([]);
        onClose();
      }}
    >
      <form className="modal-form">
        <SelectInput
          label="Tenant"
          {...register("tenant")}
          options={tenantOptions}
          error={errors.tenant?.message}
          disabled={tenantList.length === 0}
        />
        <TextInput
          label="Issue Title"
          {...register("issueTitle")}
          error={errors.issueTitle?.message}
          placeholder="Type something"
        />
        <TextareaInput
          label="Issue Description"
          {...register("description")}
          error={errors.description?.message}
          placeholder="Enter a detailed description of the issue"
        />
        <SelectInput
          label="Category"
          {...register("category")}
          options={categoryOptions}
          error={errors.category?.message}
        />
        <SelectInput
          label="Priority"
          {...register("priority")}
          options={priorityOptions}
          error={errors.priority?.message}
        />
        <SelectInput
          label="Assign to Staff"
          {...register("assignToStaff")}
          options={staffOptions}
          error={errors.assignToStaff?.message}
          disabled={staffList.length === 0}
        />
        <div className="resolution-time">
          <h3>Estimated Time to Resolution (SLA)</h3>
          <div className="resolution-inputs">
            <h4>For</h4>
            <div className="resolution-selects-one">
              <SelectInput
                {...register("resolutionTime.value")}
                options={[
                  { value: "", label: "Select" },
                  ...Array.from({ length: 30 }, (_, i) => ({
                    value: `${i + 1}`,
                    label: `${i + 1}`,
                  })),
                ]}
                error={errors.resolutionTime?.value?.message}
                className="sla-select-one"
              />
            </div>
            <div className="resolution-selects">
              <SelectInput
                {...register("resolutionTime.duration")}
                options={[
                  { value: "", label: "Select" },
                  { value: "hours", label: "Hours" },
                  { value: "days", label: "Days" },
                  { value: "business days", label: "Business Days" },
                ]}
                error={errors.resolutionTime?.duration?.message}
                className="sla-select"
              />
            </div>
          </div>
          {calculateResolutionDate() && (
            <p className="resolution-date">{calculateResolutionDate()}</p>
          )}
        </div>
        <div className="upload-content">
          <h3>Upload and attach files (optional)</h3>
          <h4>Upload and attach files to this issue</h4>
          <div className="upload-area">
            <div className="upload-icon">
              <BsCloudUpload size={24} />
            </div>
            <p>
              Click to upload or drag and drop
              <br />
              SVG, PNG, JPG, GIF (max. 800x400px, 50MB)
            </p>
            <input
              type="file"
              multiple
              accept="image/svg+xml,image/png,image/jpeg,image/gif"
              onChange={handleFileChange}
              className="upload-input"
            />
          </div>
          {files.length > 0 && (
            <div className="file-list">
              {files.map((file, index) => (
                <div key={index} className="file-item">
                  <span>
                    {file.name} ({file.size})
                  </span>
                  {file.error ? (
                    <span className="file-error">{file.errorMessage}</span>
                  ) : (
                    <div className="progress-bar">
                      <div
                        className="progress"
                        style={{ width: `${file.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </ReusableModal>
  );
};

AddIssueModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  tenantList: PropTypes.arrayOf(
    PropTypes.shape({
      tenantId: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      isEnterprise: PropTypes.bool,
    })
  ),
  staffList: PropTypes.arrayOf(
    PropTypes.shape({
      staffId: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
};

export default React.memo(AddIssueModal);
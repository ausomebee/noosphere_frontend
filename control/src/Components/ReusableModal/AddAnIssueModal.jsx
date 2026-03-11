import React, { useState, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import ReusableModal from "./ReusableModal";
import { TextInput, SelectInput, TextareaInput } from "../Input/Inputs";
import { showToast } from "../../Helper/ShowToast";
import useAuth from "../../hooks/useAuth";
import { BsCloudUpload } from "react-icons/bs";


// Yup schema for AddIssueModal
const schema = yup.object().shape({
  tenant: yup.string().required("Company Name is required").trim(),
  title: yup.string().required("Issue Title is required").trim(),
  description: yup.string().required("Issue Description is required").trim(),
  category: yup.string().required("Category is required").trim(),
  priority: yup.string().required("Priority is required").trim(),
  assignToStaff: yup.string().optional(),
  resolutionTime: yup.object().shape({
    value: yup.string().required("Resolution Time is required"),
    duration: yup.string().required("Duration is required"),
  }),
  attachmentUpload: yup.string().optional(),
});

const defaultFormValues = {
  tenant: "",
  title: "",
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
  const [selectedTenant, setSelectedTenant] = useState(null);
  const { userId: adminId } = useAuth();

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
      { value: "Client/Patient Management Issues", label: "Client/Patient Management Issues" },
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
      { value: "P1", label: "P1 - Critical" },
      { value: "P2", label: "P2 - High" },
      { value: "P3", label: "P3 - Medium" },
      { value: "P4", label: "P4 - Low" },
    ];
    if (selectedTenant?.isEnterprise) {
      return [
        { value: "", label: "Select" },
        { value: "EP1", label: "EP1 - Enterprise Critical" },
        { value: "EP2", label: "EP2 - Enterprise High" }, // Fixed typo
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
      { value: "", label: tenantList.length ? "Select" : "No tenant available" },
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
          file,
          name: file.name,
          size: sizeDisplay,
          progress: 0,
          error: true,
          errorMessage: "File size exceeds 50MB limit",
        };
      }

      return {
        file,
        name: file.name,
        size: sizeDisplay,
        progress: 0,
        error: false,
      };
    });

    setFiles((prev) => [...prev, ...newFiles]);

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
                  ? { ...f, error: true, errorMessage: "Unable to upload. Please try again" }
                  : f
              )
            );
          }
        }
      }, 300);
    });

    setValue("attachmentUpload", newFiles.map((file) => file.name).join(", "));
  };

  const calculateResolutionDeadline = () => {
    const { value, duration } = watch("resolutionTime");
    if (!value || !duration) return { iso: null, display: null };

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

    // Set time to 23:59:59 for consistency
    resolutionDate.setHours(23, 59, 59, 0);

    const isoString = resolutionDate.toISOString();
    const displayString = `Expected resolution: ${resolutionDate.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })} (within ${value} ${duration})`;

    return { iso: isoString, display: displayString };
  };

  const handleSave = async (formData) => {
    setIsLoading(true);
    try {
      const { iso: resolutionDeadline } = calculateResolutionDeadline();
      if (!resolutionDeadline) {
        throw new Error("Invalid resolution deadline");
      }

      const issueData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        tenantId: formData.tenant,
        adminId: formData.assignToStaff,
        resolutionDeadline,
        adminLoggedById: adminId,
        assignToStaff: formData.assignToStaff,
        createdBy: adminId,
        image: files.find((f) => !f.error)?.file || null,
      };

      await onSave(issueData, () => {
        reset(defaultFormValues);
        setFiles([]);
        onClose();
      });
    } catch (err) {
      showToast(`Failed to create issue: ${err.message}`, "error");
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
      primaryButtonText="Save Issue"
      secondaryButtonText="Cancel"
      primaryButtonLoading={isLoading}
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
          {...register("title")}
          error={errors.title?.message}
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
          {calculateResolutionDeadline().display && (
            <p className="resolution-date">{calculateResolutionDeadline().display}</p>
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
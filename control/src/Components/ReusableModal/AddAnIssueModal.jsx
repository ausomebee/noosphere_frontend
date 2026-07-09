import React, { useState, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import ReusableModal from "./ReusableModal";
import { TextInput, SelectInput, TextareaInput } from "../Input/Inputs";
import { showToast, showApiError } from "../../Helper/ShowToast";
import useAuth from "../../hooks/useAuth";
import { BsCloudUpload } from "react-icons/bs";
import { issueCategoryOptions as categoryOptions, basePriorityOptions, enterprisePriorityOptions } from "../../Data/selectOptions";
import useReduxFormDraft from "../../hooks/useReduxFormDraft";


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
  timezone: yup.string().required("Timezone is required"),
  attachmentUpload: yup.string().optional(),
});

// The viewer's own zone, used as the default so the picker starts somewhere sane.
const BROWSER_TIME_ZONE =
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const TIME_ZONE_OPTIONS = (() => {
  const zones =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : ["UTC"];
  const unique = Array.from(new Set([BROWSER_TIME_ZONE, "UTC", ...zones]));
  return unique.map((zone) => ({
    value: zone,
    label: zone.replace(/_/g, " "),
  }));
})();

// ─── Timezone-aware date helpers ─────────────────────────
// Wall-clock parts of `date` as they read in `timeZone`.
const getZonedParts = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const read = (type) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    // hourCycle h23 can report 24 for midnight in some engines.
    hour: read("hour") % 24,
    minute: read("minute"),
    second: read("second"),
  };
};

// Offset of `timeZone` (ms east of UTC) at the instant `date`.
const getZoneOffsetMs = (date, timeZone) => {
  const p = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - (date.getTime() - date.getMilliseconds());
};

// Interpret wall-clock parts as a time in `timeZone` and return the real instant.
// Applied twice because the offset can differ across a DST boundary.
const zonedPartsToDate = (parts, timeZone) => {
  const guess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  let offset = getZoneOffsetMs(new Date(guess), timeZone);
  offset = getZoneOffsetMs(new Date(guess - offset), timeZone);
  return new Date(guess - offset);
};

const defaultFormValues = {
  tenant: "",
  title: "",
  description: "",
  category: "",
  priority: "",
  assignToStaff: "",
  resolutionTime: { value: "", duration: "" },
  timezone: BROWSER_TIME_ZONE,
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

  const clearDraft = useReduxFormDraft("add-issue", { watch, reset, isOpen, exclude: ["attachmentUpload"] });

  const tenantValue = watch("tenant");

  useEffect(() => {
    const tenant = tenantList.find((t) => t.tenantId === tenantValue);
    setSelectedTenant(tenant || null);
  }, [tenantValue, tenantList]);

  const priorityOptions = useMemo(() => {
    const baseOptions = [
      { value: "", label: "Select" },
      ...basePriorityOptions,
    ];
    if (selectedTenant?.isEnterprise) {
      return [
        { value: "", label: "Select" },
        ...enterprisePriorityOptions,
        ...basePriorityOptions,
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

  // The deadline is exactly `now + N <duration>` — it is NOT snapped to the end
  // of the day. Calendar arithmetic (days / business days) is done in the
  // timezone the user picked, since day boundaries, weekends and DST all depend
  // on it. Only the resulting absolute instant (ISO/UTC) is sent to the backend;
  // the timezone itself never leaves the client.
  const calculateResolutionDeadline = () => {
    const { value, duration } = watch("resolutionTime");
    const timeZone = watch("timezone") || BROWSER_TIME_ZONE;
    if (!value || !duration) return { iso: null, display: null };

    const numValue = parseInt(value, 10);
    if (!Number.isFinite(numValue) || numValue <= 0) {
      return { iso: null, display: null };
    }

    const now = new Date();
    let resolutionDate;

    if (duration === "hours") {
      // Elapsed time — an absolute offset, so it's timezone-independent and
      // stays N hours even across a DST change.
      resolutionDate = new Date(now.getTime() + numValue * 60 * 60 * 1000);
    } else if (duration === "days" || duration === "business days") {
      const parts = getZonedParts(now, timeZone);
      if (duration === "days") {
        parts.day += numValue;
      } else {
        let daysAdded = 0;
        while (daysAdded < numValue) {
          parts.day += 1;
          // Date.UTC normalises day overflow, so this is the real weekday.
          const weekday = new Date(
            Date.UTC(parts.year, parts.month - 1, parts.day),
          ).getUTCDay();
          if (weekday !== 0 && weekday !== 6) daysAdded++;
        }
      }
      resolutionDate = zonedPartsToDate(parts, timeZone);
    } else {
      return { iso: null, display: null };
    }

    const isoString = resolutionDate.toISOString();
    const formatted = resolutionDate.toLocaleString("en-US", {
      timeZone,
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
    const displayString = `Expected resolution: ${formatted} · ${timeZone} (within ${value} ${duration})`;

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
        clearDraft();
        reset(defaultFormValues);
        setFiles([]);
        onClose();
      });
    } catch (err) {
      showApiError(err, "CREATE_ISSUE");
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
          required
          label="Tenant"
          {...register("tenant")}
          options={tenantOptions}
          error={errors.tenant?.message}
          disabled={tenantList.length === 0}
        />
        <TextInput
          required
          label="Issue Title"
          {...register("title")}
          error={errors.title?.message}
          placeholder="Type something"
        />
        <TextareaInput
          required
          label="Issue Description"
          {...register("description")}
          error={errors.description?.message}
          placeholder="Enter a detailed description of the issue"
        />
        <SelectInput
          required
          label="Category"
          {...register("category")}
          options={categoryOptions}
          error={errors.category?.message}
        />
        <SelectInput
          required
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
          emptyHint="No staff found. Create one in Settings → Staff."
        />
        <div className="resolution-time">
          <h3>Estimated Time to Resolution (SLA)</h3>
          <div className="resolution-inputs">
            <h4>For</h4>
            <div className="resolution-selects-one">
              <SelectInput
                required
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
                required
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

          {/* Timezone the deadline is calculated in. Defaults to the viewer's
              own zone. Client-side only — never sent to the backend. */}
          <SelectInput
            required
            label="Timezone"
            {...register("timezone")}
            options={TIME_ZONE_OPTIONS}
            error={errors.timezone?.message}
          />
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
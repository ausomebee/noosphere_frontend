import React, { useState } from "react";
import PropTypes from "prop-types";
import ReusableModal from "../ReusableModal";
import { TextareaInput, SwitchInput, RequiredMark } from "../../Input/Inputs";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { BsCloudUpload } from "react-icons/bs";
import { showToast, showApiError } from "../../../Helper/ShowToast";

const MarkAsResolvedModal = ({ isOpen, onClose, onSave, issueId, adminId, accessToken, refreshToken }) => {
  const schema = yup.object().shape({
    resolution: yup
      .string()
      .trim()
      .required("Resolution description is required")
      .max(1000, "Resolution must not exceed 1000 characters"),
    tenantApproval: yup
      .boolean()
      .oneOf([true], "You must confirm with the tenant that the issue is resolved before proceeding."),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      resolution: "",
      tenantApproval: false,
    },
  });

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    setUploading(true);

    newFiles.forEach((file, index) => {
      if (file.error) return;

      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setFiles((prev) =>
          prev.map((f, i) =>
            i === index + prev.length - newFiles.length
              ? { ...f, progress: Math.min(progress, 100) }
              : f
          )
        );
        if (progress >= 100) {
          clearInterval(interval);
          if (file.name.includes("Unable")) {
            setFiles((prev) =>
              prev.map((f, i) =>
                i === index + prev.length - newFiles.length
                  ? { ...f, error: true, errorMessage: "Unable to upload. Please try again" }
                  : f
              )
            );
          }
        }
      }, 300);
    });
  };

  const onSubmit = async (data) => {
    const validFile = files.find((f) => !f.error && f.progress === 100);
    if (data.resolution.trim() && data.tenantApproval) {
      setIsSaving(true);
      try {
        await onSave({
          resolution: data.resolution,
          attachmentFile: validFile ? validFile.file : null,
        });
        reset();
        setFiles([]);
        setUploading(false);
        onClose();
      } catch (err) {
        showApiError(err, "RESOLVE_ISSUE");
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        reset();
        setFiles([]);
        setUploading(false);
        onClose();
      }}
      title="Mark as Resolved"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      primaryButtonDisabled={isSaving || (uploading && !files.some((f) => !f.error && f.progress === 100))}
      primaryButtonLoading={isSaving}
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      onSecondaryButtonClick={() => {
        reset();
        setFiles([]);
        setUploading(false);
        onClose();
      }}
    >
      <form className="modal-form" onSubmit={handleSubmit(onSubmit)}>
        <TextareaInput
          required
          label="Resolution Description"
          {...register("resolution")}
          error={errors.resolution?.message}
          placeholder="Enter resolution details"
          rows={5}
        />
        <label>Upload and attach files (optional)</label>
        <div className="upload-content">
          <h3>Upload and attach files</h3>
          <h4>Upload and attach files to this issue</h4>
          <div className="upload-area">
            <div className="upload-icon">
              <BsCloudUpload size={24} />
            </div>
            <p>
              Click to upload or drag and drop
              <br />
              SVG, PNG, JPG, GIF, PDF, DOC, DOCX (max. 50MB)
            </p>
            <input
              type="file"
              accept="image/svg+xml,image/png,image/jpeg,image/gif,application/pdf,.doc,.docx"
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
                      <div className="progress" style={{ width: `${file.progress}%` }}></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
          <label>
            Confirm tenant’s approval
            <RequiredMark required />
          </label>
          <SwitchInput
            {...register("tenantApproval")}
            error={errors.tenantApproval?.message}
          />
        </div>
        {errors.tenantApproval && (
          <p style={{ color: "red", marginTop: "10px" }}>
            {errors.tenantApproval.message}
          </p>
        )}
      </form>
    </ReusableModal>
  );
};

MarkAsResolvedModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  issueId: PropTypes.string.isRequired,
  adminId: PropTypes.string.isRequired,
  accessToken: PropTypes.string.isRequired,
  refreshToken: PropTypes.string.isRequired,
};

export default MarkAsResolvedModal;
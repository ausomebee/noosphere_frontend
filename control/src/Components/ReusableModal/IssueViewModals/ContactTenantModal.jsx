import React, { useState } from "react";
import PropTypes from "prop-types";
import ReusableModal from "../ReusableModal";
import { TextInput, TextareaInput } from "../../Input/Inputs";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { BsCloudUpload } from "react-icons/bs";

const ContactTenantModal = ({ isOpen, onClose, onSave, issueId, accessToken, refreshToken }) => {
  const schema = yup.object().shape({
    header: yup.string().trim().required("Header is required").max(100, "Header must not exceed 100 characters"),
    body: yup.string().trim().required("Body is required").max(1000, "Body must not exceed 1000 characters"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      header: "",
      body: "",
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
    if (data.header.trim() && data.body.trim()) {
      setIsSaving(true);
      try {
        await onSave({ header: data.header, body: data.body, attachmentFile: validFile ? validFile.file : null });
        reset();
        setFiles([]);
        setUploading(false);
        onClose();
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
      title="Contact tenant by email"
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
        <label>Header</label>
        <TextInput
          {...register("header")}
          error={errors.header?.message}
          placeholder="Type something"
        />
        <label>Body</label>
        <TextareaInput
          {...register("body")}
          error={errors.body?.message}
          placeholder="Type something"
        />
        <label>Upload and attach files (optional)</label>
        <div className="upload-content">
          <h3>Upload and attach files</h3>
          <h4>Upload and attach files to this email</h4>
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
      </form>
    </ReusableModal>
  );
};

ContactTenantModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  issueId: PropTypes.string.isRequired,
  accessToken: PropTypes.string.isRequired,
  refreshToken: PropTypes.string.isRequired,
};

export default ContactTenantModal;
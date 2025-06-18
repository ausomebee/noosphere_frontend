import React, { useEffect } from "react";
import ReusableModal from "../ReusableModal";
import { TextareaInput, SwitchInput } from "../../Input/Inputs"; // Adjust the import path as needed
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { BsCloudUpload } from "react-icons/bs"; // Ensure this is installed: npm install react-icons

const MarkAsResolvedModal = ({ isOpen, onClose, onSave }) => {
  // Define validation schema with yup
  const schema = yup.object().shape({
    resolution: yup.string().trim().required("Resolution is required").max(1000, "Resolution must not exceed 1000 characters"),
    tenantApproval: yup.boolean().oneOf([true], "You must confirm with the tenant that the issue is resolved before proceeding."),
  });

  // Initialize useForm with yup resolver and initial values
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      resolution: "",
      tenantApproval: false,
    },
  });

  // State for file management
  const [files, setFiles] = React.useState([]);
  const [uploading, setUploading] = React.useState(false);

  // Handle file change and upload progress
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

    // Update form value for attachment (optional, for form submission)
    setValue("attachmentUpload", newFiles.filter(f => !f.error).map(f => f.name).join(", "));
  };

  // Handle form submission
  const onSubmit = (data) => {
    if (data.resolution.trim()) {
      const validFiles = files.filter(f => !f.error && f.progress === 100);
      onSave({ resolution: data.resolution, attachmentFile: validFiles.length ? validFiles : null, tenantApproval: data.tenantApproval });
      reset(); // Reset form
      setFiles([]); // Clear files
      setUploading(false); // Reset uploading state
      onClose();
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        reset(); // Reset form on close
        setFiles([]); // Clear files on close
        setUploading(false); // Reset uploading state
        onClose();
      }}
      title="Mark as Resolved"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      onSecondaryButtonClick={() => {
        reset(); // Reset form on cancel
        setFiles([]); // Clear files on cancel
        setUploading(false); // Reset uploading state
        onClose();
      }}
    >
      <div>
        <label>Describe resolution applied</label>
        <TextareaInput
          {...register("resolution")}
          error={errors.resolution?.message}
          placeholder="Enter a description..."
        />
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
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
          <p>Confirm tenant’s approval</p>
          <SwitchInput
            {...register("tenantApproval")}
            error={errors.tenantApproval?.message}
          />
        </div>
        {errors.tenantApproval && (
          <p style={{ color: "red", marginTop: "20px" }}>
            {errors.tenantApproval.message}
          </p>
        )}
      </div>
    </ReusableModal>
  );
};

export default MarkAsResolvedModal;
import React, { useEffect } from "react";
import ReusableModal from "../ReusableModal";
import { TextInput, TextareaInput } from "../../Input/Inputs"; // Adjust the import path as needed
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { BsCloudUpload } from "react-icons/bs"; // Ensure this is installed: npm install react-icons

const ContactTenantModal = ({ isOpen, onClose, onSave }) => {
  // Define validation schema with yup
  const schema = yup.object().shape({
    header: yup.string().trim().required("Header is required").max(100, "Header must not exceed 100 characters"),
    body: yup.string().trim().required("Body is required").max(1000, "Body must not exceed 1000 characters"),
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
      header: "",
      body: "",
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
    if (data.header.trim() && data.body.trim()) {
      const validFiles = files.filter(f => !f.error && f.progress === 100);
      onSave({ header: data.header, body: data.body, attachmentFile: validFiles.length ? validFiles : null });
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
      title="Contact tenant by email"
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
        <label>Upload and attach files</label>
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

export default ContactTenantModal;
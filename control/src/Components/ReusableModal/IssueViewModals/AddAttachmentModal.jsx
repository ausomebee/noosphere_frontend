import React, { useState } from "react";
import PropTypes from "prop-types";
import ReusableModal from "../ReusableModal";
import { BsCloudUpload } from "react-icons/bs";

const AddAttachmentModal = ({ isOpen, onClose, onSave, issueId, adminId, accessToken, refreshToken }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

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

  const handleSave = async () => {
    const validFile = files.find((f) => !f.error && f.progress === 100);
    if (validFile) {
      await onSave(validFile.file);
      setFiles([]);
      setUploading(false);
      onClose();
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        setFiles([]);
        setUploading(false);
        onClose();
      }}
      title="Add an attachment"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      primaryButtonDisabled={uploading || !files.some((f) => !f.error && f.progress === 100)}
      onPrimaryButtonClick={handleSave}
      onSecondaryButtonClick={() => {
        setFiles([]);
        setUploading(false);
        onClose();
      }}
    >
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
            SVG, PNG, JPG, GIF (max. 800x400px, 50MB)
          </p>
          <input
            type="file"
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
                    <div className="progress" style={{ width: `${file.progress}%` }}></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ReusableModal>
  );
};

AddAttachmentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  issueId: PropTypes.string.isRequired,
  adminId: PropTypes.string.isRequired,
  accessToken: PropTypes.string.isRequired,
  refreshToken: PropTypes.string.isRequired,
};

export default AddAttachmentModal;
import React, { useState } from "react";
import ReusableModal from "../ReusableModal";
import { BsCloudUpload } from "react-icons/bs";

const AddAttachmentModal = ({ isOpen, onClose, onSave }) => {
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [files, setFiles] = useState([]);
  const handleSave = () => {
    if (attachmentFile) {
      onSave(attachmentFile);
      setAttachmentFile(null);
      onClose();
    }
  };
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
  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        setAttachmentFile(null);
        onClose();
      }}
      title="Add an attachment"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSave}
      onSecondaryButtonClick={() => {
        setAttachmentFile(null);
        onClose();
      }}
    >
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
    </ReusableModal>
  );
};

export default AddAttachmentModal;

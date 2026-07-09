
import React, { useState } from "react";
import ReusableModal from "../ReusableModal"; // Adjust the path as needed
import {
  BsCloudUpload,
  BsFileEarmarkPdf,
  BsFileEarmarkPlay,
} from "react-icons/bs";
import { FaRegFile, FaPhotoVideo, FaImage, FaCheckCircle } from "react-icons/fa";
import { RiDeleteBin6Line } from "react-icons/ri";
import "../ReusableModal.css";

const UploadDocumentModal = ({ isOpen, onClose, onUpload, loading = false }) => {
  const [files, setFiles] = useState([]);

  const getFileIcon = (fileName) => {
    const extension = fileName.split(".").pop().toLowerCase();
    if (extension === "pdf") return <BsFileEarmarkPdf size={16} className="file-icon" />;
    if (["mp4", "avi", "mov"].includes(extension)) return <FaPhotoVideo size={16} className="file-icon" />;
    if (["gif"].includes(extension)) return <BsFileEarmarkPlay size={16} className="file-icon" />;
    if (["png", "jpg", "jpeg", "webp"].includes(extension)) return <FaImage size={16} className="file-icon" />;
    return <FaRegFile size={16} className="file-icon" />; // Default icon for unknown types
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files).map((file) => {
      const sizeInMB = file.size / 1024 / 1024; // Convert bytes to MB
      const sizeDisplay =
        sizeInMB < 1
          ? (file.size / 1024).toFixed(0) + " KB"
          : sizeInMB.toFixed(1) + " MB";

      // Check if file size exceeds 50MB
      if (sizeInMB > 50) {
        return {
          name: file.name,
          size: sizeDisplay,
          progress: 100,
          error: true,
          errorMessage: "File size exceeds 50MB limit",
        };
      }

      return {
        name: file.name,
        size: sizeDisplay,
        progress: 100, // Immediate 100% since not client-side
        error: false,
      };
    });

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAttachFiles = () => {
    const validFiles = files.filter((file) => !file.error).map((file) => {
      const { name, ...rest } = file;
      return new File([file], name, { type: file.type || "application/octet-stream" }); // Reconstruct File object
    });
    onUpload(validFiles);
    setFiles([]);
    onClose();
  };

  const handleClose = () => {
    setFiles([]);
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload a document"
      primaryButtonText="Attach files"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleAttachFiles}
      onSecondaryButtonClick={handleClose}
      primaryButtonLoading={loading}
      primaryButtonDisabled={files.length === 0 || files.some((file) => file.error)}
    >
      <div className="upload-modal-content">
        <div className="upload-area">
          <div className="upload-icon">
            <BsCloudUpload size={24} />
          </div>
          <p>
            Click to upload or drag and drop
            <br />
            SVG, PNG, JPG or GIF (max. 800x400px)
          </p>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="upload-input"
          />
        </div>
        {files.length > 0 && (
          <div className="file-list">
            {files.map((file, index) => (
              <div key={index} className="file-item">
                <div className="file-header">
                  <div className="file-info">
                    {getFileIcon(file.name)}
                    <span className="file-name">
                      {file.name} • {file.size}
                    </span>
                  </div>
                  <div className="file-actions">
                    {file.progress === 100 && !file.error && (
                      <FaCheckCircle size={16} className="file-success" />
                    )}
                    <button
                      className="remove-file"
                      onClick={() => handleRemoveFile(index)}
                    >
                      <RiDeleteBin6Line size={16} className="file-success" />
                    </button>
                  </div>
                </div>
                {file.error ? (
                  <span className="file-error">
                    {file.errorMessage || "Unable to upload. Please try again"}
                  </span>
                ) : (
                  <div className="progress-bar">
                    <div
                      className="progress"
                      style={{ width: `${file.progress}%` }}
                    ></div>
                    <span className="progress-text">{file.progress}%</span>
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

export default UploadDocumentModal;

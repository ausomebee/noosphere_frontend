// src/components/common/FileUploadArea.jsx
import React, { useState, useRef, useEffect, memo } from "react";
import {
  BsCloudUpload,
  BsFileEarmarkPdf,
  BsFileEarmarkPlay,
} from "react-icons/bs";
import { FaImage, FaPhotoVideo, FaCheckCircle } from "react-icons/fa";
import { RiDeleteBin6Line } from "react-icons/ri";
import uploadApi from "../../api/ImageUpload";
import { showToast } from "../../Helper/ShowToast";
import { useSelector } from "react-redux";

const FileUploadArea = memo(
  ({
    onUploadComplete,
    initialFiles = [],
    accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp4",
    maxSizeMB = 50,
    disabled = false,
  }) => {
    const [files, setFiles] = useState([]);
    const fileInputRef = useRef(null);

    const { accessToken, refreshToken } = useSelector(
      (s) => s.authentication?.user || {}
    );

    // Load existing files
    useEffect(() => {
      if (initialFiles.length > 0) {
        const formatted = initialFiles.map((f, i) => ({
          id: f.id || `existing-${i}`,
          name: f.filename || "Unknown File",
          url: f.url || f.fileUrl,
          size: "Uploaded",
          progress: 100,
          isExisting: true,
        }));
        setFiles(formatted);
      }
    }, [initialFiles]);

    const getFileIcon = (name) => {
      const ext = name?.split(".").pop()?.toLowerCase();
      if (ext === "pdf")
        return <BsFileEarmarkPdf size={20} className="text-red-600" />;
      if (["jpg", "jpeg", "png"].includes(ext))
        return <FaImage size={20} className="text-green-600" />;
      if (["mp4", "mov", "avi"].includes(ext))
        return <FaPhotoVideo size={20} className="text-purple-600" />;
      if (["doc", "docx"].includes(ext))
        return <BsFileEarmarkPlay size={20} className="text-blue-600" />;
      return <BsFileEarmarkPdf size={20} className="text-gray-600" />;
    };

    const formatSize = (bytes) => {
      if (!bytes) return "Unknown";
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const handleFiles = async (selectedFiles) => {
      const newFiles = selectedFiles
        .map((file) => {
          const sizeInMB = file.size / (1024 * 1024);
          if (sizeInMB > maxSizeMB) {
            showToast({ message: `${file.name} is too large`, type: "error" });
            return null;
          }
          return {
            file,
            name: file.name,
            size: formatSize(file.size),
            progress: 0,
            id: Math.random().toString(36).substr(2, 9), // temporary id
          };
        })
        .filter(Boolean);

      // Add new files to state immediately
      setFiles((prev) => [...prev, ...newFiles]);

      // Track newly uploaded files for callback
      const newlyUploaded = [];

      for (let i = 0; i < newFiles.length; i++) {
        const item = newFiles[i];
        const currentIndex = files.length + i; // correct index after prev state

        // Simulate progress
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === currentIndex ? { ...f, progress } : f
            )
          );
          if (progress >= 100) clearInterval(interval);
        }, 150);

        try {
          const formData = new FormData();
          formData.append("images", item.file);

          const res = await uploadApi.UploadImage({
            formData,
            accessToken,
            refreshToken,
          });

          if (res.success && res.data?.[0]) {
            const uploaded = res.data[0];

            // Update this specific file with real URL
            setFiles((prev) =>
              prev.map((f, idx) =>
                idx === currentIndex
                  ? {
                      ...f,
                      progress: 100,
                      url: uploaded.url,
                      filename: uploaded.filename,
                    }
                  : f
              )
            );

            // Collect for parent callback
            newlyUploaded.push({
              filename: uploaded.filename,
              url: uploaded.url,
            });
          }
        } catch (err) {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === currentIndex
                ? {
                    ...f,
                    progress: 0,
                    error: true,
                    errorMessage: err.message || "Upload failed",
                  }
                : f
            )
          );
          showToast({
            message: `Failed to upload ${item.name}`,
            type: "error",
          });
        }
      }

      // Only now — after all uploads — trigger parent callback
      if (newlyUploaded.length > 0) {
        onUploadComplete(newlyUploaded);
      }
    };

    const handleRemoveFile = (idx) => {
      setFiles((prev) => {
        const removedFile = prev[idx];
        showToast({
          message: `File ${removedFile.name} removed`,
          type: "info",
        });
        return prev.filter((_, i) => i !== idx);
      });
    };

    const handleRetryFile = (idx) => {
      setFiles((prev) => {
        const retryFile = prev[idx];
        showToast({
          message: `Retrying upload for ${retryFile.name}`,
          type: "info",
        });
        return prev.map((f, i) =>
          i === idx
            ? { ...f, progress: 0, error: false, errorMessage: null }
            : f
        );
      });
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setFiles((prev) =>
          prev.map((f, i) => (i === idx ? { ...f, progress } : f))
        );
        if (progress >= 100) {
          clearInterval(interval);
          showToast({
            message: `Retry upload simulation completed for ${files[idx].name}`,
            type: "success",
          });
        }
      }, 300);
    };

    return (
      <div className="w-full space-y-6">
        {/* Upload Area - Hidden Input */}
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDrop={(e) => {
            e.preventDefault();
            if (!disabled) handleFiles(Array.from(e.dataTransfer.files));
          }}
          onDragOver={(e) => e.preventDefault()}
          className="upload-area"
        >
          <div className="text-gray-400 mb-3 flex justify-center">
            <BsCloudUpload size={48} />
          </div>
          <p className="text-sm font-medium text-blue-600">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-gray-500 mt-1">
            PDF, DOCX, JPG or PNG (max. 800x400px)
          </p>

          {/* Hidden Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple
            onChange={(e) =>
              e.target.files?.length && handleFiles(Array.from(e.target.files))
            }
            className="hidden"
          />
        </div>

        {/* File List - Exactly like your screenshot */}
        {files.length > 0 && (
          <div className="file-list mt-3">
            {files.map((file, idx) => (
              <div key={idx} className="file-item">
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
                      onClick={() => handleRemoveFile(idx)}
                    >
                      <RiDeleteBin6Line size={16} />
                    </button>
                    {file.error && (
                      <button
                        className="retry-file"
                        onClick={() => handleRetryFile(idx)}
                      >
                        <IoMdRefresh size={16} />
                      </button>
                    )}
                  </div>
                </div>
                {file.error ? (
                  <span className="file-error">{file.errorMessage}</span>
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
    );
  }
);

FileUploadArea.displayName = "FileUploadArea";
export default FileUploadArea;

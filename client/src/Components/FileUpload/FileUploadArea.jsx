// src/components/common/FileUploadArea.jsx
import React, { useState, useRef, useEffect, memo } from "react";
import {
  BsCloudUpload,
  BsFileEarmarkPdf,
  BsFileEarmarkPlay,
} from "react-icons/bs";
import { FaImage, FaPhotoVideo, FaCheckCircle } from "react-icons/fa";
import { RiDeleteBin6Line } from "react-icons/ri";
import { IoMdRefresh } from "react-icons/io";
import uploadApi from "../../api/ImageUpload";
import { showToast } from "../../Helper/ShowToast";
import { useSelector } from "react-redux";

const FileUploadArea = memo(
  ({
    onUploadStart,
    onUploadComplete,
    onUploadError,
    onRemove = () => {},
    initialFiles = [],
    accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp4",
    maxSizeMB = 50,
    hint = "PDF, DOCX, JPG or PNG",
    multiple = true,
    disabled = false,
  }) => {
    const [files, setFiles] = useState([]);
    const fileInputRef = useRef(null);

    const { token: accessToken, refreshToken } = useSelector(
      (s) => s.authentication?.user || {}
    );

    /* ---------------- Load existing files ---------------- */
    useEffect(() => {
      if (initialFiles.length > 0) {
        setFiles(
          initialFiles.map((f, i) => ({
            id: f.id || `existing-${i}`,
            name: f.filename,
            url: f.url,
            size: "Uploaded",
            progress: 100,
            isExisting: true,
          }))
        );
      }
    }, [initialFiles]);

    /* ---------------- Helpers ---------------- */
    const formatSize = (bytes) => {
      if (!bytes) return "Unknown";
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

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

    // Files are matched by id rather than array index: index maths went stale
    // as soon as a file was removed mid-upload, so progress landed on the
    // wrong row.
    const patchFile = (id, changes) =>
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...changes } : f))
      );

    /* ---------------- Core Upload Logic ---------------- */
    const handleFiles = async (selectedFiles) => {
      if (!selectedFiles?.length) return;

      // A single-file picker still receives several on drag-and-drop, so cap
      // it here rather than trusting the input's `multiple` attribute.
      const incoming = multiple ? selectedFiles : selectedFiles.slice(0, 1);

      const validFiles = incoming
        .map((file) => {
          if (file.size / (1024 * 1024) > maxSizeMB) {
            showToast(`${file.name} is too large`, "error");
            return null;
          }
          return {
            file,
            name: file.name,
            size: formatSize(file.size),
            progress: 0,
            id: Math.random().toString(36).slice(2),
          };
        })
        .filter(Boolean);

      if (!validFiles.length) return;

      onUploadStart?.();
      setFiles((prev) => [...prev, ...validFiles]);

      const uploadedResults = [];
      let failed = 0;

      for (const item of validFiles) {
        // Creep the bar forward while the request is in flight so the upload
        // doesn't look frozen, then let the real result finish it off.
        let progress = 0;
        const interval = setInterval(() => {
          progress = Math.min(progress + 10, 90);
          patchFile(item.id, { progress });
        }, 150);

        try {
          const formData = new FormData();
          formData.append("images", item.file);

          const res = await uploadApi.UploadImage({
            formData,
            accessToken,
            refreshToken,
          });

          clearInterval(interval);

          if (res?.success && res.data?.[0]) {
            const uploaded = res.data[0];
            patchFile(item.id, {
              progress: 100,
              url: uploaded.url,
              filename: uploaded.filename,
            });
            uploadedResults.push({
              filename: uploaded.filename,
              url: uploaded.url,
            });
          } else {
            failed += 1;
            patchFile(item.id, {
              progress: 0,
              error: true,
              errorMessage: "Upload failed",
            });
            showToast(`Failed to upload ${item.name}`, "error");
          }
        } catch (err) {
          clearInterval(interval);
          failed += 1;
          patchFile(item.id, {
            progress: 0,
            error: true,
            errorMessage: err?.message || "Upload failed",
          });
          showToast(`Failed to upload ${item.name}`, "error");
        }
      }

      // Always report back, even when everything failed — the modal keeps its
      // buttons disabled until it hears the upload finished one way or another.
      if (failed) onUploadError?.();
      onUploadComplete?.(uploadedResults);
    };

    /* ---------------- Remove / Retry ---------------- */
    const handleRemoveFile = (idx) => {
      setFiles((prev) => {
        const removed = prev[idx];
        if (removed) onRemove(removed);
        return prev.filter((_, i) => i !== idx);
      });
    };

    const handleRetryFile = (idx) => {
      const target = files[idx];
      if (!target?.file) return;
      setFiles((prev) => prev.filter((_, i) => i !== idx));
      handleFiles([target.file]);
    };

    /* ---------------- Render ---------------- */
    return (
      <div className="w-full space-y-6">
        <div
          className={`upload-area ${disabled ? "is-disabled" : ""}`}
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDrop={(e) => {
            e.preventDefault();
            if (!disabled) handleFiles(Array.from(e.dataTransfer.files));
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="text-gray-400 mb-3 flex justify-center">
            <BsCloudUpload size={48} />
          </div>
          <p className="text-sm font-medium text-blue-600">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-gray-500 mt-1">{hint}</p>

          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            hidden
            disabled={disabled}
            onChange={(e) =>
              e.target.files?.length && handleFiles(Array.from(e.target.files))
            }
          />
        </div>

        {files.length > 0 && (
          <div className="file-list mt-3">
            {files.map((file, idx) => (
              <div key={file.id} className="file-item">
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
                    {file.error && (
                      <button
                        type="button"
                        className="retry-file"
                        onClick={() => handleRetryFile(idx)}
                        aria-label="Retry upload"
                      >
                        <IoMdRefresh size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="remove-file"
                      onClick={() => handleRemoveFile(idx)}
                      aria-label="Remove file"
                    >
                      <RiDeleteBin6Line size={16} />
                    </button>
                  </div>
                </div>

                {file.error ? (
                  <span className="file-error">{file.errorMessage}</span>
                ) : (
                  <div
                    className="progress-bar"
                    role="progressbar"
                    aria-valuenow={file.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="progress-track">
                      <div
                        className="progress"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
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

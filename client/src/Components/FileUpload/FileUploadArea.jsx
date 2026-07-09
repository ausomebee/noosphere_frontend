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
    initialFiles = [],
    accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp4",
    maxSizeMB = 50,
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
      if (ext === "pdf") return <BsFileEarmarkPdf className="text-red-600" />;
      if (["jpg", "jpeg", "png"].includes(ext))
        return <FaImage className="text-green-600" />;
      if (["mp4", "mov"].includes(ext))
        return <FaPhotoVideo className="text-purple-600" />;
      if (["doc", "docx"].includes(ext))
        return <BsFileEarmarkPlay className="text-blue-600" />;
      return <BsFileEarmarkPdf className="text-gray-600" />;
    };

    /* ---------------- Core Upload Logic ---------------- */
    const handleFiles = async (selectedFiles) => {
      if (!selectedFiles?.length) return;

      onUploadStart?.();

      const validFiles = selectedFiles
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

      setFiles((prev) => [...prev, ...validFiles]);

      const uploadedResults = [];

      for (let i = 0; i < validFiles.length; i++) {
        const item = validFiles[i];
        const index = files.length + i;

        try {
          const formData = new FormData();
          formData.append("images", item.file);

          const res = await uploadApi.UploadImage({
            formData,
            accessToken,
            refreshToken,
          });

          if (res?.success && res.data?.[0]) {
            const uploaded = res.data[0];

            setFiles((prev) =>
              prev.map((f, idx) =>
                idx === index
                  ? {
                      ...f,
                      progress: 100,
                      url: uploaded.url,
                      filename: uploaded.filename,
                    }
                  : f
              )
            );

            uploadedResults.push({
              filename: uploaded.filename,
              url: uploaded.url,
            });
          }
        } catch {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === index
                ? {
                    ...f,
                    error: true,
                    errorMessage: "Upload failed",
                    progress: 0,
                  }
                : f
            )
          );

          onUploadError?.();
          showToast(`Failed to upload ${item.name}`, "error");
          return;
        }
      }

      onUploadComplete?.(uploadedResults);
    };

    /* ---------------- Remove / Retry ---------------- */
    const handleRemoveFile = (idx) => {
      setFiles((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleRetryFile = (idx) => {
      setFiles((prev) =>
        prev.map((f, i) =>
          i === idx ? { ...f, error: false, progress: 0 } : f
        )
      );
    };

    /* ---------------- Render ---------------- */
    return (
      <div className="w-full space-y-6">
        <div
          className={`upload-area ${disabled ? "is-disabled" : ""}`}
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDrop={(e) => {
            e.preventDefault();
            !disabled && handleFiles(Array.from(e.dataTransfer.files));
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <BsCloudUpload size={48} className="mx-auto text-gray-400" />
          <p className="text-sm text-blue-600 mt-2">
            Click to upload or drag and drop
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple
            hidden
            onChange={(e) =>
              e.target.files && handleFiles(Array.from(e.target.files))
            }
          />
        </div>

        {files.length > 0 && (
          <div className="file-list">
            {files.map((file, idx) => (
              <div key={file.id} className="file-item">
                <div className="file-header">
                  {getFileIcon(file.name)}
                  <span>{file.name} • {file.size}</span>
                  {file.progress === 100 && !file.error && (
                    <FaCheckCircle className="text-green-600" />
                  )}
                  <button type="button" aria-label="Remove file" onClick={() => handleRemoveFile(idx)}>
                    <RiDeleteBin6Line />
                  </button>
                  {file.error && (
                    <button type="button" aria-label="Retry upload" onClick={() => handleRetryFile(idx)}>
                      <IoMdRefresh />
                    </button>
                  )}
                </div>

                {!file.error && (
                  <div className="progress-bar">
                    <div
                      className="progress"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}

                {file.error && (
                  <p className="text-xs text-red-500">
                    {file.errorMessage}
                  </p>
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

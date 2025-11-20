// src/components/common/FileUploadArea.jsx
import React, { useState, useRef, useEffect, memo } from "react";
import {
  BsCloudUpload,
  BsFileEarmarkPdf,
  BsFileEarmarkPlay,
} from "react-icons/bs";
import {
  FaRegFile,
  FaImage,
  FaPhotoVideo,
  FaCheckCircle,
} from "react-icons/fa";
import { RiDeleteBin6Line } from "react-icons/ri";
import { IoMdRefresh } from "react-icons/io";
import uploadApi from "../../api/ImageUpload";
import { showToast } from "../../Helper/ShowToast";
import { useSelector } from "react-redux";

const FileUploadArea = memo(
  ({
    onUploadComplete, // Required: (uploadedFiles: [{filename, url}]) => void
    initialFiles = [], // For edit mode: [{ filename: "doc.pdf", url: "https://..." }]
    accept = ".pdf,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov,.doc,.docx",
    maxSizeMB = 50,
    disabled = false,
  }) => {
    const [files, setFiles] = useState([]);
    const fileInputRef = useRef(null);

    const accessToken = useSelector((s) => s.authentication?.token);
    const refreshToken = useSelector((s) => s.authentication?.refreshToken);

    // Load initial files (from edit mode)
    useEffect(() => {
      if (initialFiles.length > 0) {
        const formatted = initialFiles.map((f) => ({
          id: f.id || f.filename,
          name: f.filename || "Unknown File",
          url: f.url || f.documentsUrl?.url,
          size: "Uploaded",
          progress: 100,
          error: false,
          isExisting: true,
        }));
        setFiles(formatted);
      }
    }, [initialFiles]);

    const getFileIcon = (name) => {
      const ext = name?.split(".").pop()?.toLowerCase();
      if (["pdf"].includes(ext))
        return <BsFileEarmarkPdf size={20} className="text-red-600" />;
      if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
        return <FaImage size={20} className="text-green-600" />;
      if (["mp4", "avi", "mov", "mkv"].includes(ext))
        return <FaPhotoVideo size={20} className="text-purple-600" />;
      if (["doc", "docx"].includes(ext))
        return <BsFileEarmarkPlay size={20} className="text-blue-600" />;
      return <FaRegFile size={20} className="text-gray-500" />;
    };

    const formatFileSize = (bytes) => {
      if (!bytes) return "Unknown";
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const handleFiles = async (selectedFiles) => {
      const newFiles = selectedFiles.map((file) => {
        const sizeInMB = file.size / (1024 * 1024);
        const sizeDisplay = formatFileSize(file.size);

        if (sizeInMB > maxSizeMB) {
          showToast({
            message: `${file.name} exceeds ${maxSizeMB}MB limit`,
            type: "error",
          });
          return {
            file,
            name: file.name,
            size: sizeDisplay,
            progress: 0,
            error: true,
            errorMessage: `File too large (> ${maxSizeMB}MB)`,
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

      const validFiles = newFiles.filter((f) => !f.error && f.file);
      if (validFiles.length === 0) return;

      // Simulate progress + real upload
      for (let i = 0; i < validFiles.length; i++) {
        const fileObj = validFiles[i];
        const indexInList = files.length + i;

        let progress = 0;
        const interval = setInterval(() => {
          progress += 15;
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === indexInList ? { ...f, progress: Math.min(progress, 90) } : f
            )
          );
          if (progress >= 90) clearInterval(interval);
        }, 200);

        try {
          const formData = new FormData();
          formData.append("images", fileObj.file);

          const res = await uploadApi.UploadImage({
            formData,
            accessToken,
            refreshToken,
          });

          if (res.success && res.data?.[0]) {
            const uploaded = res.data[0];
            setFiles((prev) =>
              prev.map((f, idx) =>
                idx === indexInList
                  ? {
                      ...f,
                      progress: 100,
                      url: uploaded.url,
                      filename: uploaded.filename,
                      error: false,
                    }
                  : f
              )
            );

            // Send back to parent
            onUploadComplete([
              {
                filename: uploaded.filename,
                url: uploaded.url,
              },
            ]);
          } else {
            throw new Error(res.error || "Upload failed");
          }
        } catch (err) {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === indexInList
                ? { ...f, progress: 0, error: true, errorMessage: err.message }
                : f
            )
          );
          showToast({ message: `Upload failed: ${fileObj.name}`, type: "error" });
        }
      }
    };

    const removeFile = (index) => {
      setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const retryFile = (index) => {
      const file = files[index];
      if (!file?.file) return;

      setFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, progress: 0, error: false, errorMessage: null } : f
        )
      );
      handleFiles([file.file]);
    };

    return (
      <div className="w-full">
        {/* Upload Area */}
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDrop={(e) => {
            e.preventDefault();
            if (disabled) return;
            const dropped = Array.from(e.dataTransfer.files);
            if (dropped.length) handleFiles(dropped);
          }}
          onDragOver={(e) => e.preventDefault()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
            ${disabled ? "bg-gray-50 border-gray-300" : "bg-gray-50 border-gray-400 hover:bg-gray-100 hover:border-gray-500"}
          `}
        >
          <BsCloudUpload size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-700 font-medium">Click to upload or drag and drop</p>
          <p className="text-xs text-gray-500 mt-1">
            PDF, Images, Videos, Documents (max {maxSizeMB}MB)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple
            disabled={disabled}
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(Array.from(e.target.files));
              e.target.value = null;
            }}
            className="hidden"
          />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            {files.map((file, index) => (
              <div
                key={file.id || index}
                className="flex items-center justify-between bg-white border rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-center gap-4 flex-1">
                  {getFileIcon(file.name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">{file.size}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {file.progress === 100 && !file.error && (
                    <FaCheckCircle size={20} className="text-green-600" />
                  )}
                  {file.error && (
                    <button
                      onClick={() => retryFile(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <IoMdRefresh size={20} />
                    </button>
                  )}
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <RiDeleteBin6Line size={20} />
                  </button>
                </div>

                {/* Progress Bar */}
                {!file.isExisting && file.progress < 100 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
                {file.error && (
                  <p className="text-xs text-red-600 mt-1 col-span-2">
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
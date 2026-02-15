import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useSelector } from "react-redux";
import ReusableModal from "../ReusableModal";
import {
  BsCloudUpload,
  BsFileEarmarkPdf,
  BsFileEarmarkPlay,
} from "react-icons/bs";
import {
  FaRegFile,
  FaPhotoVideo,
  FaImage,
  FaCheckCircle,
} from "react-icons/fa";
import { RiDeleteBin6Line } from "react-icons/ri";
import { IoMdRefresh } from "react-icons/io";
import { TextInput } from "../../Input/Inputs";
import uploadApi from "../../../api/ImageUpload";

// Yup validation schema
const schema = yup.object().shape({
  documentName: yup.string().required("Document Name is required"),
  document: yup
    .mixed()
    .test(
      "file-required",
      "A document is required",
      (value) => value && value.length === 1,
    ),
});

// FileUploadArea Component
const FileUploadArea = React.memo(
  ({
    onFileChange,
    accept = ".pdf,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov",
    maxSizeMB = 50,
    initialFile = null,
  }) => {
    const [file, setFile] = useState(null);
    const fileInputRef = useRef(null);

    // Initialize file from initialFile
    useEffect(() => {
      if (initialFile && (initialFile.documentsUrl || initialFile.filename)) {
        const newFile = {
          name:
            initialFile.documentsUrl?.filename ||
            initialFile.filename ||
            "Unknown File",
          url: initialFile.documentsUrl?.url || initialFile.url,
          size: initialFile.size || "Unknown",
          progress: 100,
          error: false,
        };
        setFile(newFile);
      } else if (file !== null) {
        setFile(null);
      }
    }, [initialFile]);

    const getFileIcon = (fileName) => {
      if (!fileName || typeof fileName !== "string") {
        return <FaRegFile size={16} className="file-icon" />;
      }
      const ext = fileName.split(".").pop()?.toLowerCase();
      if (ext === "pdf")
        return <BsFileEarmarkPdf size={16} className="file-icon" />;
      if (["mp4", "avi", "mov"].includes(ext))
        return <FaPhotoVideo size={16} className="file-icon" />;
      if (["gif"].includes(ext))
        return <BsFileEarmarkPlay size={16} className="file-icon" />;
      if (["png", "jpg", "jpeg", "webp"].includes(ext))
        return <FaImage size={16} className="file-icon" />;
      return <FaRegFile size={16} className="file-icon" />;
    };

    const handleFileChange = (e) => {
      e.preventDefault();
      const selectedFile = e.target.files[0];
      if (!selectedFile) return;

      const sizeInMB = selectedFile.size / 1024 / 1024;
      const sizeDisplay =
        sizeInMB < 1
          ? (selectedFile.size / 1024).toFixed(0) + " KB"
          : sizeInMB.toFixed(1) + " MB";

      let newFile;
      if (sizeInMB > maxSizeMB) {
        newFile = {
          file: selectedFile,
          name: selectedFile.name || "Unknown File",
          size: sizeDisplay,
          progress: 0,
          error: true,
          errorMessage: "File size exceeds 50MB limit",
        };
      } else if (
        ![
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/gif",
          "video/mp4",
          "video/avi",
          "video/quicktime",
        ].includes(selectedFile.type)
      ) {
        newFile = {
          file: selectedFile,
          name: selectedFile.name || "Unknown File",
          size: sizeDisplay,
          progress: 0,
          error: true,
          errorMessage:
            "Supported formats: PDF, JPG, JPEG, PNG, GIF, MP4, AVI, MOV",
        };
      } else {
        newFile = {
          file: selectedFile,
          name: selectedFile.name || "Unknown File",
          size: sizeDisplay,
          progress: 0,
          error: false,
        };
      }

      setFile(newFile);
      onFileChange([newFile]);

      if (!newFile.error) {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          setFile((prev) => (prev ? { ...prev, progress } : prev));
          if (progress >= 100) clearInterval(interval);
        }, 300);
      }

      if (fileInputRef.current) fileInputRef.current.value = null;
    };

    const handleRemoveFile = () => {
      setFile(null);
      onFileChange([]);
    };

    const handleRetryFile = () => {
      if (!file) return;
      const newFile = {
        ...file,
        progress: 0,
        error: false,
        errorMessage: null,
      };
      setFile(newFile);
      onFileChange([newFile]);
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setFile((prev) => (prev ? { ...prev, progress } : prev));
        if (progress >= 100) clearInterval(interval);
      }, 300);
    };

    return (
      <div className="mb-6">
        <p className="text-sm text-gray-700 font-semibold mb-2">
          Upload Document
        </p>
        <div className="upload-area">
          <div className="upload-icon">
            <BsCloudUpload size={24} />
          </div>
          <p>Click to upload or drag and drop</p>
          <p className="text-xs text-gray-500">
            PDF, JPG, PNG, GIF, MP4, AVI, MOV (max. {maxSizeMB} MB)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="upload-input"
          />
        </div>

        {file && (
          <div className="file-list mt-3">
            <div className="file-item">
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
                  <button className="remove-file" onClick={handleRemoveFile}>
                    <RiDeleteBin6Line size={16} />
                  </button>
                  {file.error && (
                    <button className="retry-file" onClick={handleRetryFile}>
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
          </div>
        )}
      </div>
    );
  },
);

// Main Modal Component
const UploadTenantStaffDocumentModal = ({
  isOpen,
  onClose,
  onSave,
  tenantStaffId,
  initialValues,
  mode = "add",
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileResult, setFileResult] = useState(null);
  const user = useSelector((s) => s.authentication?.user);
  const accessToken = user?.accessToken;
  const refreshToken = user?.refreshToken;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      documentName: "",
      document: [],
    },
  });

  const handleFileUpload = useCallback(
    async (fileObj) => {
      if (!fileObj || fileObj.error) {
        setFileResult({
          filename: fileObj?.name || "Unknown File",
          url: null,
          error: fileObj?.errorMessage || "No file selected",
        });
        setUploadingFile(false);
        return;
      }

      setUploadingFile(true);
      if (!accessToken || !refreshToken) {
        setSubmitError("Authentication tokens missing.");
        setFileResult({
          filename: fileObj.name,
          url: null,
          error: "Authentication tokens missing",
        });
        setUploadingFile(false);
        return;
      }

      try {
        const formData = new FormData();
        formData.append("images", fileObj.file);
        const res = await uploadApi.UploadImage({
          formData,
          accessToken,
          refreshToken,
        });
        if (res.success && res.data[0]?.url && res.data[0]?.filename) {
          setFileResult({
            filename: res.data[0].filename,
            url: res.data[0].url,
            error: null,
          });
          setValue("document", [
            {
              ...fileObj,
              url: res.data[0].url,
              filename: res.data[0].filename,
            },
          ]);
        } else {
          throw new Error(res.error || "Upload failed");
        }
      } catch (e) {
        setFileResult({
          filename: fileObj.name,
          url: null,
          error: e.message || "Upload failed",
        });
      } finally {
        setUploadingFile(false);
      }
    },
    [accessToken, refreshToken, setValue],
  );

  useEffect(() => {
    if (!isOpen) {
      reset({
        documentName: "",
        document: [],
      });
      setSubmitError("");
      setFileResult(null);
    } else if (mode === "edit" && initialValues?.documentsUrl) {
      reset({
        documentName: initialValues.documentName || "",
        document: [
          {
            name: initialValues.documentsUrl.filename || "Unknown File",
            url: initialValues.documentsUrl.url,
            size: "Unknown",
            progress: 100,
            error: false,
          },
        ],
      });
      setFileResult({
        filename: initialValues.documentsUrl.filename || "Unknown File",
        url: initialValues.documentsUrl.url,
        error: null,
      });
    }
  }, [isOpen, mode, initialValues, reset]);

  const handleFormSubmit = useCallback(
    async (data) => {
      if (Object.keys(errors).length) {
        setSubmitError("Please fix form errors");
        return;
      }
      if (uploadingFile) {
        setSubmitError("Please wait until upload finishes");
        return;
      }
      if (fileResult?.error) {
        setSubmitError("File upload failed");
        return;
      }
      if (!fileResult && mode !== "edit") {
        setSubmitError("No valid file uploaded");
        return;
      }

      setSubmitting(true);
      setSubmitError("");

      try {
        const payload = {
          id: initialValues?.id || Date.now() + Math.random(),
          documentName: data.documentName,
          date: new Date().toLocaleDateString(),
          uploadBy: user?.email || "Unknown User",
          documentsUrl: fileResult || initialValues?.documentsUrl,
          tenantStaffId,
        };
        await onSave(payload);
        reset({
          documentName: "",
          document: [],
        });
        setFileResult(null);
        onClose();
      } catch (e) {
        setSubmitError(e.message || "Failed to save document");
      } finally {
        setSubmitting(false);
      }
    },
    [
      errors,
      uploadingFile,
      fileResult,
      user,
      tenantStaffId,
      initialValues,
      onSave,
      reset,
      onClose,
    ],
  );

  const handleClose = useCallback(() => {
    reset({
      documentName: "",
      document: [],
    });
    setSubmitError("");
    setFileResult(null);
    onClose();
  }, [reset, onClose]);

  const content = (
    <div className="space-y-4">
      <TextInput
        label="Document Name"
        {...register("documentName")}
        error={errors.documentName?.message}
        placeholder="Enter document name"
      />
      <Controller
        name="document"
        control={control}
        render={({ field }) => (
          <FileUploadArea
            onFileChange={(files) => {
              field.onChange(files);
              if (files.length > 0) handleFileUpload(files[0]);
            }}
            accept=".pdf,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov"
            maxSizeMB={50}
            initialFile={field.value?.[0] || null}
          />
        )}
      />
      {errors.document?.message && (
        <p className="text-red-500 text-sm">{errors.document.message}</p>
      )}
      {submitError && (
        <div className="mb-4 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded">
          {submitError}
        </div>
      )}
    </div>
  );

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === "edit" ? "Edit Document" : "Upload Document"}
      primaryButtonText={submitting || uploadingFile ? "Saving..." : "Save"}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={submitting || uploadingFile || fileResult?.error}
      primaryButtonLoading={submitting || uploadingFile}
      onPrimaryButtonClick={handleSubmit(handleFormSubmit)}
      onSecondaryButtonClick={handleClose}
      size="lg"
    >
      {content}
    </ReusableModal>
  );
};

export default React.memo(UploadTenantStaffDocumentModal);

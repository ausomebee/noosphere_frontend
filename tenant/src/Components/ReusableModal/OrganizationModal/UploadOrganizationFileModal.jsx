import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import { TextInput, RequiredMark } from "../../Input/Inputs";
import { BsCloudUpload } from "react-icons/bs";
import useAuth from "../../../hooks/useAuth";
import { showToast } from "../../../Helper/ShowToast";

// Validation schema
const documentSchema = yup.object({
  documentName: yup.string().required("Document name is required"),
  document: yup
    .mixed()
    .required("A file is required")
    .test("fileSize", "File must be ≤ 50 MB", (value) => {
      return value && value.size <= 50 * 1024 * 1024; // 50 MB
    })
    .test("fileType", "Supported formats: PDF, JPG, JPEG, PNG, GIF", (value) => {
      return value && ["application/pdf", "image/jpeg", "image/png", "image/gif"].includes(value.type);
    }),
});

/* ---------- FileUploadArea Component ---------- */
const FileUploadArea = ({
  onFiles,
  accept = ".pdf,.jpg,.jpeg,.png,.gif",
  maxSizeMB = 50,
}) => {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const sizeMB = selected.size / 1024 / 1024;
    if (sizeMB > maxSizeMB) {
      alert(`File must be ≤ ${maxSizeMB} MB`);
      return;
    }

    setFile(selected);
    setProgress(0);

    let p = 0;
    const t = setInterval(() => {
      p += 10;
      setProgress(p);
      if (p >= 100) {
        clearInterval(t);
        onFiles([selected]);
      }
    }, 200);
  };

  return (
    <div className="mb-6">
      <p className="text-sm text-gray-700 font-semibold mb-2">
        Upload Attachments
      </p>
      <div className="upload-area">
        <div className="upload-icon">
          <BsCloudUpload size={24} />
        </div>
        <p>Click to upload or drag and drop</p>
        <p className="text-xs text-gray-500">
          PDF, JPG, JPEG, PNG, GIF (max. 800x400px, 50 MB)
        </p>
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="upload-input"
        />
      </div>

      {file && (
        <div className="file-list mt-3">
          <div className="file-item">
            <span>
              {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
            </span>
            <div className="progress-bar">
              <div className="progress" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UploadOrganizationFileModal = ({ isOpen, onClose, onSave }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(documentSchema),
    defaultValues: {
      documentName: "",
      document: null,
    },
  });

  const handleSave = async (data) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("tenantId", user?.tenantId);
      formData.append("documentName", data.documentName);
      formData.append("document", data.document);
      formData.append("uploadedBy", user?.fullName || user?.email || "Unknown User");

      await onSave(formData);
      reset({ documentName: "", document: null });
      onClose();
    } catch (error) {
      console.error("Error saving document:", error);
      showToast("Failed to save document", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        reset({ documentName: "", document: null });
        onClose();
      }}
      title="Upload document"
      primaryButtonText={isLoading ? "Saving..." : "Save"}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={isLoading}
      onPrimaryButtonClick={handleSubmit(handleSave)}
      onSecondaryButtonClick={() => {
        reset({ documentName: "", document: null });
        onClose();
      }}
      size="lg"
       primaryButtonLoading={isLoading}
    >
      <div className="mt-5 space-y-4">
        <TextInput
          required
          label="Document Name"
          {...register("documentName")}
          error={errors.documentName?.message}
          placeholder="Enter document name"
        />

        <label className="input-group-label">
          Document
          <RequiredMark required />
        </label>
        <Controller
          name="document"
          control={control}
          render={() => (
            <FileUploadArea
              onFiles={(files) => {
                setValue("document", files[0], { shouldValidate: true });
              }}
              accept=".pdf,.jpg,.jpeg,.png,.gif"
              maxSizeMB={50}
            />
          )}
        />
        {errors.document && (
          <p className="text-red-500 text-sm">{errors.document.message}</p>
        )}
      </div>
    </ReusableModal>
  );
};

export default UploadOrganizationFileModal;
import React, { useState, useRef } from "react";
import useAuth from "../../../hooks/useAuth";
import { FiChevronDown, FiUploadCloud, FiX, FiFile, FiLoader } from "react-icons/fi";
import uploadApi from "../../../api/ImageUpload";
import "./ReportInput.css";
// Text Input Component
const ReportTextInput = ({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}) => {
  return (
    <div className="report-builder-field">
      <label className="report-builder-label">{label}</label>
      <input
        type={type}
        className="report-builder-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
};

// Select Component
const ReportSelect = ({ label, placeholder, options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="report-builder-field">
      <label className="report-builder-label">{label}</label>
      <div className="report-builder-select-wrapper">
        <button
          type="button"
          className={`report-builder-select-button ${isOpen ? "open" : ""}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className={selectedOption ? "" : "placeholder"}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <FiChevronDown
            className={`report-builder-select-icon ${isOpen ? "rotate" : ""}`}
          />
        </button>

        {isOpen && (
          <>
            <div
              className="report-builder-select-overlay"
              onClick={() => setIsOpen(false)}
            />
            <div className="report-builder-select-dropdown">
              {options.map((option) => (
                <div
                  key={option.value}
                  className={`report-builder-select-option ${
                    value === option.value ? "selected" : ""
                  }`}
                  onClick={() => {
                    onChange?.(option.value);
                    setIsOpen(false);
                  }}
                >
                  {option.label}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Multi-Select Dropdown Component
const ReportMultiSelect = ({
  label,
  placeholder = "Select options",
  options,
  value = [],
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange?.(newValue);
  };

  const selectedLabels = options
    .filter((opt) => value.includes(opt.value))
    .map((opt) => opt.label)
    .join(", ");

  return (
    <div className="report-builder-field">
      <label className="report-builder-label">{label}</label>
      <div className="report-builder-select-wrapper">
        <button
          type="button"
          className={`report-builder-select-button ${isOpen ? "open" : ""}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className={selectedLabels ? "" : "placeholder"}>
            {selectedLabels || placeholder}
          </span>
          <FiChevronDown
            className={`report-builder-select-icon ${isOpen ? "rotate" : ""}`}
          />
        </button>

        {isOpen && (
          <>
            <div
              className="report-builder-select-overlay"
              onClick={() => setIsOpen(false)}
            />
            <div className="report-builder-multi-select-dropdown">
              {options.map((option) => (
                <label
                  key={option.value}
                  className="report-builder-multi-select-option"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    className="report-builder-multi-checkbox-input"
                    checked={value.includes(option.value)}
                    onChange={() => handleToggle(option.value)}
                  />
                  <span className="report-builder-multi-checkbox-custom"></span>
                  <span className="report-builder-multi-checkbox-text">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Checkbox Grid Component (for the layout you showed in image 3)
const ReportCheckboxGrid = ({
  label,
  options,
  value,
  onChange,
  layout = "single",
}) => {
  const handleToggle = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange?.(newValue);
  };

  return (
    <div className="report-builder-field">
      <label className="report-builder-label">{label}</label>
      <div
        className={`report-builder-checkbox-grid ${
          layout === "double" ? "double" : "single"
        }`}
      >
        {options.map((option) => (
          <label key={option.value} className="report-builder-checkbox-label">
            <input
              type="checkbox"
              className="report-builder-checkbox-input"
              checked={value.includes(option.value)}
              onChange={() => handleToggle(option.value)}
            />
            <span className="report-builder-checkbox-custom"></span>
            <span className="report-builder-checkbox-text">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

const ReportRadioGroup = ({ label, options, value, onChange }) => {
   return (
    <div className="report-builder-field">
      <label className="report-builder-label">{label}</label>
      <div className="report-builder-radio-group inline">
        {options.map((option) => (
          <label key={option.value} className="report-builder-radio-label">
            <input
              type="radio"
              className="report-builder-radio-input"
              checked={value === option.value}
              onChange={() => onChange?.(option.value)}
            />
            <span className="report-builder-radio-custom"></span>
            <span className="report-builder-radio-text">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

const ReportFileUpload = ({
  label,
  acceptedFormats,
  value = [],
  onChange,
  onUpload,
  multiple = false,
  readOnly = false,
}) => {
  const { accessToken, refreshToken } = useAuth();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  // Build accept string from acceptedFormats like "PDF, DOCX, PNG, JPG"
  const acceptString = acceptedFormats
    ? acceptedFormats
        .split(",")
        .map((f) => `.${f.trim().toLowerCase()}`)
        .join(",")
    : "";

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("images", file));

      const res = await uploadApi.UploadImage({
        formData,
        accessToken,
        refreshToken,
      });

      if (res.success && res.data?.length > 0) {
        const uploaded = res.data.map((item) => ({
          filename: item.filename,
          url: item.url,
        }));
        const currentFiles = Array.isArray(value) ? value : [];
        const newValue = multiple
          ? [...currentFiles, ...uploaded]
          : uploaded;
        onChange?.(newValue);
        onUpload?.(newValue);
      }
    } catch (err) {
      console.error("File upload failed:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = (index) => {
    const currentFiles = Array.isArray(value) ? value : [];
    const newValue = currentFiles.filter((_, i) => i !== index);
    onChange?.(newValue);
    onUpload?.(newValue);
  };

  const displayFiles = Array.isArray(value) ? value : [];

  return (
    <div className="report-builder-field">
      <label className="report-builder-label">{label}</label>

      {!readOnly && (
        <div
          className={`report-builder-file-upload-wrapper ${uploading ? "uploading" : ""}`}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="report-builder-file-input"
            onChange={handleFileChange}
            multiple={multiple}
            accept={acceptString}
            style={{ display: "none" }}
          />
          <div className="report-builder-file-upload-area">
            {uploading ? (
              <>
                <FiLoader className="report-builder-upload-icon report-builder-spin" />
                <div className="report-builder-upload-text-primary">
                  Uploading...
                </div>
              </>
            ) : (
              <>
                <FiUploadCloud className="report-builder-upload-icon" />
                <div className="report-builder-upload-text-primary">
                  Click to upload
                </div>
                <div className="report-builder-upload-text-secondary">
                  {acceptedFormats}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {displayFiles.length > 0 && (
        <div className="report-builder-uploaded-list">
          {displayFiles.map((file, index) => (
            <div key={file.url || index} className="report-builder-uploaded-file">
              <FiFile size={14} />
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="report-builder-uploaded-link"
                onClick={(e) => e.stopPropagation()}
              >
                {file.filename || `File ${index + 1}`}
              </a>
              {!readOnly && (
                <button
                  type="button"
                  className="report-builder-file-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                >
                  <FiX size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export {
  ReportTextInput,
  ReportSelect,
  ReportMultiSelect,
  ReportRadioGroup,
  ReportFileUpload,
  ReportCheckboxGrid,
};

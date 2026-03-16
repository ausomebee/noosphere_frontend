import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import useAuth from "../../hooks/useAuth";
import { FiUpload, FiTrash2, FiFile } from "react-icons/fi";
import SignatureCanvas from "react-signature-canvas";
import "./FormRenderer.css";
import { showToast } from "../../Helper/ShowToast";
import api from "../../api/documentsAndFormsApis";
import api2 from "../../api/ImageUpload";
import { useNavigate, useParams } from "react-router-dom";
import {
  initializeResponse,
  setResponse,
  addFilesToField,
  setFilesForField,
  setFileUploadStatus,
  setSignature,
  setSignatureMode,
  setCurrentPage,
  clearAllResponses,
  markAsSubmitted,
} from "../../ReduxStore/features/formResponseSlice";
import { loadForm } from "../../ReduxStore/features/formBuilderSlice";

const FormRenderer = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const formId = id;
  const { tenantId, tenantClientId, accessToken, refreshToken } = useAuth();
  const { formName, elements } = useSelector((s) => s.formBuilder);
  const {
    responses,
    files,
    signatures,
    signatureMode: savedSignatureMode,
    currentPage: savedCurrentPage,
    submitted,
  } = useSelector((s) => s.formResponse);
  const [isLoading, setIsLoading] = useState(false);
  const [formLoaded, setFormLoaded] = useState(false);
  const [dragOver, setDragOver] = useState({});
  const sigRefs = useRef({});

  const parseFileSize = (sizeString) => {
    if (!sizeString && sizeString !== 0) return 10;
    if (typeof sizeString === "number") return sizeString;
    const match = sizeString
      ?.toString()
      .match(/^(\d+(?:\.\d+)?)\s*(MB|KB|GB)?$/i);
    if (!match) return 10;
    const size = parseFloat(match[1]);
    const unit = (match[2] || "MB").toUpperCase();
    return unit === "KB" ? size / 1024 : unit === "GB" ? size * 1024 : size;
  };

  const getAllowedTypes = (allowedTypes) => {
    if (
      !allowedTypes ||
      !Array.isArray(allowedTypes) ||
      allowedTypes.length === 0
    ) {
      return "*"; // allow all if no restriction
    }
    const mimeMap = {
      PDF: ".pdf",
      IMAGE: "image/*",
      DOCX: ".doc,.docx",
      SPREADSHEET: ".xls,.xlsx,.csv",
      VIDEO: "video/*",
      AUDIO: "audio/*",
      TEXT: ".txt",
      ALL: "*",
    };
    const acceptParts = allowedTypes.map((type) => {
      const upper = type.toUpperCase().trim();
      return mimeMap[upper] || `.${upper.toLowerCase()}`;
    });
    return [...new Set(acceptParts)].join(",");
  };

  useEffect(() => {
    if (formId && tenantId && accessToken && !formLoaded) {
      loadFormData();
    }
  }, [formId, tenantId, accessToken, formLoaded]);

  useEffect(() => {
    if (formLoaded) {
      Object.entries(signatures).forEach(([fid, sig]) => {
        if (sig?.startsWith("data:") && sigRefs.current[fid]) {
          sigRefs.current[fid].fromDataURL(sig);
        }
      });
    }
  }, [formLoaded, signatures]);

  const loadFormData = async () => {
    setIsLoading(true);
    try {
      const res = await api.GetFormWithItsFields({
        formId,
        accessToken,
        refreshToken,
      });
      if (!res?.data) {
        throw new Error("No data in API response");
      }
      const responseBody = res;
      if (responseBody.status !== "ok") {
        throw new Error(
          responseBody.message || "API returned non-success status",
        );
      }
      if (!responseBody.data) {
        throw new Error("Missing 'data' object in successful response");
      }
      const formData = responseBody.data;
      if (!Array.isArray(formData.fields)) {
        console.warn("Form has no fields or fields is not array", formData);
      }
      const transformedElements = (formData.fields || []).map((field) => {
        const base = {
          id: field.id,
          type: field.fieldType,
          label: field.label || "",
          placeholder: field.placeholder || "",
          required: !!field.isRequired,
          options: field.options || [],
          order: field.order || 0,
        };
        if (field.fieldType === "fileUpload") {
          const cfg = field.fileUpload?.[0] || {};
          return {
            ...base,
            maxFiles: Number(cfg.maxFiles) || 1,
            maxFileSize: parseFileSize(cfg.maxSize) || 10,
            allowedFileTypes: Array.isArray(cfg.allowedTypes)
              ? cfg.allowedTypes
              : ["Image", "PDF"],
          };
        }
        if (field.fieldType === "starRating") {
          return {
            ...base,
            maxStars: Number(field.starRating?.[0]) || 5,
          };
        }
        if (field.fieldType === "signature") {
          return {
            ...base,
            allowSignatureUpload: field.signature?.[0]?.allowUpload === true,
          };
        }
        return base;
      });
      dispatch(
        loadForm({
          formName: formData.name || "Untitled Form",
          elements: transformedElements,
          status: formData.isDraft ? "draft" : "published",
          formId: formData.id,
          tenantId: formData.tenantId,
          isPublished: !formData.isDraft,
          isTemplate: formData.isTemplate || false,
          tenantClientId: formData.tenantClientId,
          createdAt: formData.createdAt,
          updatedAt: formData.updatedAt,
        }),
      );
      dispatch(
        initializeResponse({
          formId: formData.id,
          tenantId: formData.tenantId,
          submittedBy: tenantClientId,
        }),
      );
      if (savedCurrentPage > 0) {
        dispatch(setCurrentPage(savedCurrentPage));
      }
      setFormLoaded(true);
    } catch (err) {
      console.error("Form loading failed:", err);
      showToast(
        err.message ||
          "Failed to load form. Please check the link or try again.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelection = async (fieldId, selectedFilesList) => {
    const el = elements.find((e) => e.id === fieldId);
    if (!el) return;

    const maxFiles = el.maxFiles || 1;
    const maxSizeMB = el.maxFileSize || 10;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    // Always get the latest state
    const getLatestState = () =>
      dispatch((d, getState) => getState().formResponse);

    const currentState = getLatestState();
    const currentFiles = currentState.files[fieldId] || [];

    const selectedFiles = Array.from(selectedFilesList);

    if (currentFiles.length + selectedFiles.length > maxFiles) {
      showToast(
        `Maximum ${maxFiles} file${maxFiles > 1 ? "s" : ""} allowed`,
        "error",
      );
      return;
    }

    const tooBig = selectedFiles.some((f) => f.size > maxSizeBytes);
    if (tooBig) {
      showToast(`One or more files exceed ${maxSizeMB}MB limit`, "error");
      return;
    }

    // No preview — just basic file tracking
    const newFileItems = selectedFiles.map((file) => ({
      file,
      filename: file.name,
      size: file.size,
      progress: 0,
      url: null,
      error: false,
      errorMessage: null,
    }));

    dispatch(addFilesToField({ fieldId, fileItems: newFileItems }));

    try {
      const formData = new FormData();
      newFileItems.forEach((item) => formData.append("images", item.file));

      showToast(
        `Uploading ${newFileItems.length} file${newFileItems.length !== 1 ? "s" : ""}...`,
        "info",
      );

      const uploadResult = await api2.UploadImage({
        formData,
        accessToken,
        refreshToken,
      });

      if (!uploadResult?.success || !Array.isArray(uploadResult.data)) {
        throw new Error(
          uploadResult?.error || "Upload failed - invalid response",
        );
      }

      const uploadedFiles = uploadResult.data;

      // Get latest state after upload completes
      const latestState = getLatestState();
      const currentAfterAdd = latestState.files[fieldId] || [];
      const startIndex = currentAfterAdd.length - newFileItems.length;

      const updatedFiles = currentAfterAdd.map((item, idx) => {
        if (idx < startIndex) return item;
        const uploaded = uploadedFiles[idx - startIndex];
        if (uploaded?.url) {
          return {
            ...item,
            file: null,
            progress: 100,
            url: uploaded.url,
            filename: uploaded.filename || item.filename,
            error: false,
            errorMessage: null,
          };
        }
        return {
          ...item,
          progress: 0,
          error: true,
          errorMessage: "Upload result not found",
        };
      });

      dispatch(setFilesForField({ fieldId, fileItems: updatedFiles }));

      const successCount = uploadedFiles.filter((f) => f?.url).length;
      showToast(
        `${successCount} file${successCount !== 1 ? "s" : ""} uploaded successfully`,
        "success",
      );
    } catch (err) {
      console.error("Batch upload error:", err);

      const latestState = getLatestState();
      const currentAfterAdd = latestState.files[fieldId] || [];
      const startIndex = currentAfterAdd.length - newFileItems.length;

      const failedFiles = currentAfterAdd.map((item, idx) => {
        if (idx >= startIndex) {
          return {
            ...item,
            progress: 0,
            error: true,
            errorMessage: err.message || "Batch upload failed",
          };
        }
        return item;
      });

      dispatch(setFilesForField({ fieldId, fileItems: failedFiles }));
      showToast(
        `Failed to upload files: ${err.message || "Unknown error"}`,
        "error",
      );
    }
  };

  const handleFileRemove = (fieldId, index) => {
    const current = files[fieldId] || [];
    if (index < 0 || index >= current.length) return;

    const updated = current.filter((_, i) => i !== index);
    dispatch(setFilesForField({ fieldId, fileItems: updated }));
  };

  const handleSubmit = async () => {
    const missingFields = [];
    elements.forEach((el) => {
      if (!el.required || ["sectionHeader", "bodyText"].includes(el.type))
        return;
      let hasValue = false;
      if (el.type === "checkbox") {
        hasValue =
          Array.isArray(responses[el.id]) && responses[el.id].length > 0;
      } else if (el.type === "starRating") {
        hasValue = typeof responses[el.id] === "number" && responses[el.id] > 0;
      } else if (el.type === "fileUpload") {
        hasValue = (files[el.id] || []).some((item) => item.url);
      } else if (el.type === "signature") {
        hasValue = !!signatures[el.id];
      } else {
        const val = responses[el.id];
        hasValue = typeof val === "string" && val.trim() !== "";
      }
      if (!hasValue) {
        missingFields.push(el.label || `Question ${el.id}`);
      }
    });
    if (missingFields.length > 0) {
      showToast(
        `Please complete required fields: ${missingFields.join(", ")}`,
        "error",
      );
      return;
    }
    setIsLoading(true);
    const responseFields = [];
    Object.entries(responses).forEach(([fid, value]) => {
      if (!value) return;
      const finalValue = Array.isArray(value)
        ? value.join(", ")
        : String(value).trim();
      if (finalValue) {
        responseFields.push({ formFieldId: fid, value: finalValue });
      }
    });
    Object.entries(files || {}).forEach(([fid, fileItems]) => {
      if (!Array.isArray(fileItems)) return;
      fileItems.forEach((item) => {
        if (item.url) {
          responseFields.push({ formFieldId: fid, value: item.url });
        }
      });
    });
    Object.entries(signatures).forEach(([fid, sig]) => {
      if (sig) {
        responseFields.push({ formFieldId: fid, value: sig });
      }
    });
    try {
      const result = await api.CreateFormResponseField({
        formId,
        tenantId,
        submittedBy: tenantClientId,
        responseFields,
        accessToken,
        refreshToken,
      });
      dispatch(
        markAsSubmitted({
          submissionId: result?.data?.id || result?.data?.data?.id,
        }),
      );
      showToast("Form submitted successfully!", "success");
      setTimeout(() => {
     navigate("/documents");
      }, 1800);
    } catch (err) {
      showToast(err.message || "Submission failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (fieldId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver((prev) => ({ ...prev, [fieldId]: true }));
  };

  const handleDragLeave = (fieldId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver((prev) => ({ ...prev, [fieldId]: false }));
  };

  const handleDrop = (fieldId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver((prev) => ({ ...prev, [fieldId]: false }));
    if (e.dataTransfer.files?.length) {
      handleFileSelection(fieldId, e.dataTransfer.files);
    }
  };

  const questionsPerPage = 10;
  const paginatedElements = [];
  let currentPageElements = [];
  let questionCount = 0;
  elements.forEach((el) => {
    const isQuestion = !["sectionHeader", "bodyText"].includes(el.type);
    if (isQuestion) {
      questionCount++;
      if (questionCount > questionsPerPage) {
        paginatedElements.push(currentPageElements);
        currentPageElements = [el];
        questionCount = 1;
      } else {
        currentPageElements.push(el);
      }
    } else {
      currentPageElements.push(el);
    }
  });
  if (currentPageElements.length > 0)
    paginatedElements.push(currentPageElements);
  const totalPages = paginatedElements.length;
  const currentElements = paginatedElements[savedCurrentPage] || [];

  const handleResponseChange = (fieldId, value) => {
    dispatch(setResponse({ fieldId, value }));
  };

  const handlePageChange = (newPage) => {
    dispatch(setCurrentPage(newPage));
  };

  const handleSignatureModeChange = (fieldId, mode) => {
    dispatch(setSignatureMode({ fieldId, mode }));
  };

  const handleSignatureDrawEnd = (fieldId) => {
    const dataUrl = sigRefs.current[fieldId]?.toDataURL();
    if (dataUrl) {
      dispatch(setSignature({ fieldId, signature: dataUrl }));
    }
  };

  const handleClear = () => {
    if (window.confirm("Clear all data? This cannot be undone.")) {
      dispatch(clearAllResponses());
      Object.values(sigRefs.current).forEach((ref) => ref?.clear());
      showToast("All responses cleared", "info");
    }
  };

  if (submitted) {
    return (
      <div className="form-renderer">
        <div className="form-container">
          <h2>Form Submitted Successfully! ✅</h2>
          <p>Thank you for your submission.</p>
          <button
            onClick={() => (window.location.href = "/forms")}
            className="submit-btn"
          >
            Back to Forms
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !formLoaded) {
    return (
      <div className="form-renderer">
        <div className="form-container">
          <div className="loading-spinner">Loading form...</div>
        </div>
      </div>
    );
  }

  if (elements.length === 0) {
    return (
      <div className="form-renderer">
        <div className="form-container">
          <h2>Form is empty or could not be loaded</h2>
          <p>Please check the form link or contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-renderer">
      <div className="form-container">
        <h1 className="form-title">{formName || "Untitled Form"}</h1>
        {totalPages > 1 && (
          <div className="progress-indicator">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${((savedCurrentPage + 1) / totalPages) * 100}%`,
                }}
              ></div>
            </div>
            <div className="progress-text">
              Page {savedCurrentPage + 1} of {totalPages}
            </div>
          </div>
        )}
        {currentElements.map((el) => {
          const questionNumber = elements
            .slice(0, elements.findIndex((e) => e.id === el.id) + 1)
            .filter(
              (e) => !["sectionHeader", "bodyText"].includes(e.type),
            ).length;
          return (
            <div key={el.id} className="form-field">
              {el.type === "sectionHeader" && (
                <h2 className="section-header">
                  {el.label || "Section Header"}
                </h2>
              )}
              {el.type === "bodyText" && (
                <p className="body-text">{el.label}</p>
              )}
              {el.type === "shortText" && (
                <div className="question-block">
                  <label className="question-label">
                    {questionNumber}. {el.label || "Question"}
                    {el.required && (
                      <span className="required-indicator">*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    className="text-input"
                    placeholder={el.placeholder || "Your answer"}
                    value={responses[el.id] || ""}
                    onChange={(e) =>
                      handleResponseChange(el.id, e.target.value)
                    }
                  />
                  {el.required && (
                    <span className="required-label">Required</span>
                  )}
                </div>
              )}
              {el.type === "paragraph" && (
                <div className="question-block">
                  <label className="question-label">
                    {questionNumber}. {el.label || "Question"}
                    {el.required && (
                      <span className="required-indicator">*</span>
                    )}
                  </label>
                  <textarea
                    className="textarea-input"
                    rows={4}
                    placeholder={el.placeholder || "Your answer"}
                    value={responses[el.id] || ""}
                    onChange={(e) =>
                      handleResponseChange(el.id, e.target.value)
                    }
                  />
                  {el.required && (
                    <span className="required-label">Required</span>
                  )}
                </div>
              )}
              {el.type === "radio" && (
                <div className="question-block">
                  <label className="question-label">
                    {questionNumber}. {el.label || "Question"}
                    {el.required && (
                      <span className="required-indicator">*</span>
                    )}
                  </label>
                  <div className="radio-group">
                    {el.options?.map((option, index) => (
                      <label key={index} className="radio-option">
                        <input
                          type="radio"
                          name={`radio-${el.id}`}
                          value={option}
                          checked={responses[el.id] === option}
                          onChange={(e) =>
                            handleResponseChange(el.id, e.target.value)
                          }
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  {el.required && (
                    <span className="required-label">Required</span>
                  )}
                </div>
              )}
              {el.type === "checkbox" && (
                <div className="question-block">
                  <label className="question-label">
                    {questionNumber}. {el.label || "Question"}
                    {el.required && (
                      <span className="required-indicator">*</span>
                    )}
                  </label>
                  <div className="checkbox-group">
                    {el.options?.map((option, index) => (
                      <label key={index} className="checkbox-option">
                        <input
                          type="checkbox"
                          value={option}
                          checked={(responses[el.id] || []).includes(option)}
                          onChange={(e) => {
                            const currentValues = responses[el.id] || [];
                            const newValues = e.target.checked
                              ? [...currentValues, option]
                              : currentValues.filter((val) => val !== option);
                            handleResponseChange(el.id, newValues);
                          }}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  {el.required && (
                    <span className="required-label">Required</span>
                  )}
                </div>
              )}
              {el.type === "dropdown" && (
                <div className="question-block">
                  <label className="question-label">
                    {questionNumber}. {el.label || "Question"}
                    {el.required && (
                      <span className="required-indicator">*</span>
                    )}
                  </label>
                  <select
                    className="dropdown-input"
                    value={responses[el.id] || ""}
                    onChange={(e) =>
                      handleResponseChange(el.id, e.target.value)
                    }
                  >
                    <option value="">Select an option</option>
                    {el.options?.map((option, index) => (
                      <option key={index} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {el.required && (
                    <span className="required-label">Required</span>
                  )}
                </div>
              )}
              {el.type === "starRating" && (
                <div className="question-block">
                  <label className="question-label">
                    {questionNumber}. {el.label || "Question"}
                    {el.required && (
                      <span className="required-indicator">*</span>
                    )}
                  </label>
                  <div className="star-rating">
                    {[...Array(el.maxStars || 5)].map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`star ${index < (responses[el.id] || 0) ? "filled" : ""}`}
                        onClick={() => handleResponseChange(el.id, index + 1)}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <div className="rating-text">
                    {responses[el.id]
                      ? `You rated: ${responses[el.id]} stars`
                      : "Click to rate"}
                  </div>
                  {el.required && (
                    <span className="required-label">Required</span>
                  )}
                </div>
              )}
              {el.type === "fileUpload" && (
                <div className="question-block">
                  <label className="question-label">
                    {questionNumber}. {el.label || "Upload files"}
                    {el.required && (
                      <span className="required-indicator">*</span>
                    )}
                  </label>
                  <div className="file-upload-container">
                    <input
                      type="file"
                      id={`file-${el.id}`}
                      multiple={el.maxFiles > 1}
                      accept={getAllowedTypes(el.allowedFileTypes)}
                      className="file-input-hidden"
                      onChange={(e) => {
                        if (e.target.files?.length) {
                          handleFileSelection(el.id, e.target.files);
                        }
                        e.target.value = ""; // Allows selecting same file again
                      }}
                    />
                    <label
                      htmlFor={`file-${el.id}`}
                      className={`upload-trigger ${dragOver[el.id] ? "dragover" : ""}`}
                      onDragOver={(e) => handleDragOver(el.id, e)}
                      onDragLeave={(e) => handleDragLeave(el.id, e)}
                      onDrop={(e) => handleDrop(el.id, e)}
                    >
                      <FiUpload className="upload-icon-big" />
                      <div>
                        <span className="upload-text-big">
                          Click or drag files here
                        </span>
                      </div>
                      <small>
                        {el.allowedFileTypes?.join(", ") || "All files"} (max{" "}
                        {el.maxFileSize}MB, max {el.maxFiles} files)
                      </small>
                    </label>

                    {(files[el.id] || []).map((item, index) => (
                      <div key={index} className="uploaded-file-card">
                        <div className="file-preview">
                          <FiFile size={32} />
                        </div>
                        <div className="file-info">
                          <div className="file-name">{item.filename}</div>
                          <div className="file-size">
                            {item.size
                              ? `${(item.size / 1024).toFixed(1)} KB`
                              : "—"}
                          </div>

                          {item.progress > 0 && item.progress < 100 && (
                            <div className="progress-bar">
                              <div
                                className="progress-fill"
                                style={{ width: `${item.progress}%` }}
                              />
                              <span>{item.progress}%</span>
                            </div>
                          )}

                          {item.error && (
                            <div className="error-message">
                              {item.errorMessage || "Upload failed"}
                            </div>
                          )}

                          {item.url && (
                            <div className="success-message">
                              Uploaded successfully
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleFileRemove(el.id, index)}
                          className="remove-btn"
                          disabled={item.progress > 0 && item.progress < 100}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {el.type === "signature" && (
                <div className="question-block">
                  <label className="question-label">
                    {questionNumber}. {el.label || "Signature"}
                    {el.required && (
                      <span className="required-indicator">*</span>
                    )}
                  </label>
                  <div className="signature-container">
                    <div className="signature-tabs">
                      <button
                        type="button"
                        className={`tab ${
                          savedSignatureMode[el.id] === "type" ? "active" : ""
                        }`}
                        onClick={() => handleSignatureModeChange(el.id, "type")}
                      >
                        Type
                      </button>
                      <button
                        type="button"
                        className={`tab ${
                          !savedSignatureMode[el.id] ||
                          savedSignatureMode[el.id] === "draw"
                            ? "active"
                            : ""
                        }`}
                        onClick={() => handleSignatureModeChange(el.id, "draw")}
                      >
                        Draw
                      </button>
                      {el.allowSignatureUpload === true && (
                        <button
                          type="button"
                          className={`tab ${
                            savedSignatureMode[el.id] === "image"
                              ? "active"
                              : ""
                          }`}
                          onClick={() =>
                            handleSignatureModeChange(el.id, "image")
                          }
                        >
                          Image
                        </button>
                      )}
                    </div>
                    <div className="signature-area">
                      {(!savedSignatureMode[el.id] ||
                        savedSignatureMode[el.id] === "draw") && (
                        <>
                          <SignatureCanvas
                            ref={(ref) => (sigRefs.current[el.id] = ref)}
                            canvasProps={{
                              className: "sig-canvas",
                            }}
                            onEnd={() => handleSignatureDrawEnd(el.id)}
                          />
                          <button
                            type="button"
                            className="clear-signature-btn"
                            onClick={() => {
                              if (sigRefs.current[el.id]) {
                                sigRefs.current[el.id].clear();
                                dispatch(
                                  setSignature({
                                    fieldId: el.id,
                                    signature: null,
                                  }),
                                );
                              }
                            }}
                          >
                            Clear
                          </button>
                        </>
                      )}
                      {savedSignatureMode[el.id] === "type" && (
                        <input
                          type="text"
                          className="type-signature-input"
                          placeholder="Type your full name"
                          value={signatures[el.id] || ""}
                          onChange={(e) =>
                            dispatch(
                              setSignature({
                                fieldId: el.id,
                                signature: e.target.value,
                              }),
                            )
                          }
                        />
                      )}
                      {savedSignatureMode[el.id] === "image" && (
                        <div className="signature-image-upload">
                          <input
                            type="file"
                            accept="image/*"
                            id={`sig-image-${el.id}`}
                            className="file-input-hidden"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const url = URL.createObjectURL(file);
                                dispatch(
                                  setSignature({
                                    fieldId: el.id,
                                    signature: url,
                                  }),
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor={`sig-image-${el.id}`}
                            className="signature-image-trigger"
                          >
                            {signatures[el.id] ? (
                              <img
                                src={signatures[el.id]}
                                alt="Signature"
                                className="signature-preview"
                              />
                            ) : (
                              <>
                                <FiUpload className="sig-upload-icon" />
                                <p>Click to upload signature image</p>
                              </>
                            )}
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                  {el.required && (
                    <span className="required-label">Required</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              disabled={savedCurrentPage === 0}
              onClick={() => handlePageChange(savedCurrentPage - 1)}
              className="page-btn"
            >
              ← Previous page
            </button>
            <span className="page-info">
              Page {savedCurrentPage + 1} of {totalPages}
            </span>
            <button
              disabled={savedCurrentPage === totalPages - 1}
              onClick={() => handlePageChange(savedCurrentPage + 1)}
              className="page-btn"
            >
              Next page →
            </button>
          </div>
        )}
        {currentElements.length > 0 && savedCurrentPage === totalPages - 1 && (
          <div className="form-actions">
            <button onClick={() => handleClear()} className="clear-btn">
              Clear Form
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="submit-btn"
            >
              {isLoading ? "Submitting..." : "Submit Form"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormRenderer;

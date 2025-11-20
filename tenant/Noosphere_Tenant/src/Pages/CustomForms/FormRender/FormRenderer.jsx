import React, { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { FiUpload, FiTrash2, FiFile } from "react-icons/fi";
import SignatureCanvas from "react-signature-canvas";
import "./FormRenderer.css";

const FormRenderer = () => {
  const { formName, elements } = useSelector((s) => s.formBuilder);
  const [currentPage, setCurrentPage] = useState(0);
  const [responses, setResponses] = useState({});
  const [files, setFiles] = useState({});
  const [signatures, setSignatures] = useState({});
  const [signatureMode, setSignatureMode] = useState({});
  const sigRefs = useRef({});

  // Pagination (10 questions per page)
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
  const currentElements = paginatedElements[currentPage] || [];

  const handleFileUpload = (fieldId, uploadedFiles) => {
    setFiles((prev) => ({
      ...prev,
      [fieldId]: [...(prev[fieldId] || []), ...Array.from(uploadedFiles)],
    }));
  };

  const handleFileRemove = (fieldId, index) => {
    setFiles((prev) => ({
      ...prev,
      [fieldId]: prev[fieldId].filter((_, i) => i !== index),
    }));
  };

  const handleSignatureClear = (fieldId) => {
    if (sigRefs.current[fieldId]) sigRefs.current[fieldId].clear();
    setSignatures((prev) => ({ ...prev, [fieldId]: null }));
  };

  const handleSubmit = () => {
    console.log("Submitted:", { responses, files, signatures });
    alert("Form submitted successfully!");
  };

  const handleClear = () => {
    if (window.confirm("Clear all data?")) {
      setResponses({});
      setFiles({});
      setSignatures({});
      setSignatureMode({});
      Object.values(sigRefs.current).forEach((ref) => ref?.clear());
    }
  };

  return (
    <div className="form-renderer">
      <div className="form-container">
        <h1 className="form-title">{formName || "Untitled Form"}</h1>

        {currentElements.map((el) => {
          const questionNumber = elements
            .slice(0, elements.findIndex((e) => e.id === el.id) + 1)
            .filter(
              (e) => !["sectionHeader", "bodyText"].includes(e.type)
            ).length;

          return (
            <div key={el.id} className="form-field">
              {/* Section Header */}
              {el.type === "sectionHeader" && (
                <h2 className="section-header">
                  {el.label || "Section Header"}
                </h2>
              )}

              {/* Body Text */}
              {el.type === "bodyText" && (
                <p className="body-text">{el.label}</p>
              )}

              {/* Short Text / Paragraph */}
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
                    placeholder="Your answer"
                    value={responses[el.id] || ""}
                    onChange={(e) =>
                      setResponses((prev) => ({
                        ...prev,
                        [el.id]: e.target.value,
                      }))
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
                    placeholder="Your answer"
                    value={responses[el.id] || ""}
                    onChange={(e) =>
                      setResponses((prev) => ({
                        ...prev,
                        [el.id]: e.target.value,
                      }))
                    }
                  />
                  {el.required && (
                    <span className="required-label">Required</span>
                  )}
                </div>
              )}

              {/* FILE UPLOAD - EXACT MATCH */}
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
                      accept={el.allowedFileTypes
                        ?.map((t) =>
                          t === "PDF"
                            ? ".pdf"
                            : t === "Image"
                            ? "image/*"
                            : t === "DOCX"
                            ? ".doc,.docx"
                            : t === "Spreadsheet"
                            ? ".xls,.xlsx,.csv"
                            : t === "Video"
                            ? "video/*"
                            : "*"
                        )
                        .join(",")}
                      className="file-input-hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        const maxFiles = el.maxFiles || 1;
                        const maxSize = (el.maxFileSize || 10) * 1024 * 1024;
                        const current = files[el.id] || [];

                        if (current.length + files.length > maxFiles) {
                          alert(`Max ${maxFiles} files allowed`);
                          return;
                        }
                        const tooBig = files.find((f) => f.size > maxSize);
                        if (tooBig) {
                          alert(
                            `File too large (max ${el.maxFileSize || 10}MB)`
                          );
                          return;
                        }

                        handleFileUpload(el.id, files);
                        e.target.value = "";
                      }}
                    />

                    {/* Upload Trigger */}
                    {!files[el.id]?.length && (
                      <label
                        htmlFor={`file-${el.id}`}
                        className="upload-trigger"
                      >
                        <FiUpload className="upload-icon-big" />
                        <div>
                          <span className="upload-text-big">
                            Click to upload
                          </span>{" "}
                          or drag and drop
                        </div>
                        <small className="upload-hint-big">
                          {el.allowedFileTypes?.join(", ") ||
                            "SVG, PNG, JPG or GIF"}{" "}
                          (max. {el.maxFileSize || 10}MB)
                        </small>
                      </label>
                    )}

                    {/* Uploaded Files List */}
                    {files[el.id]?.map((file, i) => {
                      const isComplete = true; // Simulating upload complete
                      const progress = 100; // or use real upload progress

                      return (
                        <div key={i} className="uploaded-file-card">
                          <div className="file-icon-wrapper">
                            {file.type.includes("image") ? (
                              <img
                                src={URL.createObjectURL(file)}
                                alt=""
                                className="file-preview-thumb"
                              />
                            ) : (
                              <FiFile className="file-icon-large" />
                            )}
                          </div>

                          <div className="file-info">
                            <div className="file-name">{file.name}</div>
                            <div className="file-size">
                              {(file.size / 1024).toFixed(0)} KB
                            </div>

                            <div className="progress-wrapper">
                              <div className="progress-track">
                                <div
                                  className="progress-fill"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="progress-text">{progress}%</span>
                            </div>
                          </div>

                          <div className="file-actions">
                            {isComplete ? (
                              <div className="completed-check">✓</div>
                            ) : (
                              <button
                                onClick={() => handleFileRemove(el.id, i)}
                                className="remove-file-x"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {el.required && (
                    <span className="required-label">Required</span>
                  )}
                </div>
              )}

              {/* SIGNATURE – EXACT MATCH */}
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
                        className={`tab ${
                          signatureMode[el.id] === "type" ? "active" : ""
                        }`}
                        onClick={() =>
                          setSignatureMode((prev) => ({
                            ...prev,
                            [el.id]: "type",
                          }))
                        }
                      >
                        Type
                      </button>
                      <button
                        className={`tab ${
                          !signatureMode[el.id] ||
                          signatureMode[el.id] === "draw"
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          setSignatureMode((prev) => ({
                            ...prev,
                            [el.id]: "draw",
                          }))
                        }
                      >
                        Draw
                      </button>
                      {el.allowFileUpload !== false && (
                        <button
                          className={`tab ${
                            signatureMode[el.id] === "image" ? "active" : ""
                          }`}
                          onClick={() =>
                            setSignatureMode((prev) => ({
                              ...prev,
                              [el.id]: "image",
                            }))
                          }
                        >
                          Image
                        </button>
                      )}
                    </div>

                    <div className="signature-area">
                      {(!signatureMode[el.id] ||
                        signatureMode[el.id] === "draw") && (
                        <>
                          <SignatureCanvas
                            ref={(ref) => (sigRefs.current[el.id] = ref)}
                            canvasProps={{ className: "sig-canvas" }}
                            onEnd={() => {
                              const dataUrl =
                                sigRefs.current[el.id]?.toDataURL();
                              if (dataUrl)
                                setSignatures((prev) => ({
                                  ...prev,
                                  [el.id]: dataUrl,
                                }));
                            }}
                          />
                          <div className="draw-placeholder">Draw Something</div>
                          <button
                            className="clear-signature-btn"
                            onClick={() => handleSignatureClear(el.id)}
                          >
                            Clear
                          </button>
                        </>
                      )}

                      {signatureMode[el.id] === "type" && (
                        <input
                          type="text"
                          className="type-signature-input"
                          placeholder="Type your full name"
                          onChange={(e) =>
                            setSignatures((prev) => ({
                              ...prev,
                              [el.id]: e.target.value,
                            }))
                          }
                        />
                      )}

                      {signatureMode[el.id] === "image" && (
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
                                setSignatures((prev) => ({
                                  ...prev,
                                  [el.id]: url,
                                }));
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="page-btn"
            >
              ← Previous page
            </button>
            <span className="page-info">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages - 1}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="page-btn"
            >
              Next page →
            </button>
          </div>
        )}

        {/* Submit */}
        {currentPage === totalPages - 1 && (
          <div className="form-actions">
            <button onClick={handleClear} className="clear-btn">
              Clear form
            </button>
            <button onClick={handleSubmit} className="submit-btn">
              Submit
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormRenderer;

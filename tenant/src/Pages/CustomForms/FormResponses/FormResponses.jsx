import React, { useEffect, useState } from "react";
import LoadingSpinner from "../../../Components/LoadingSpinner";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiChevronLeft,
  FiChevronDown,
  FiChevronUp,
  FiFile,
  FiDownload,
  FiStar,
} from "react-icons/fi";
import api from "../../../api/customFormsApi";
import useAuth from "../../../hooks/useAuth";
import { showApiError } from "../../../Helper/ShowToast";
import { formatDateTime } from "../../../Helper/Formatters";
import useFormatSettings from "../../../hooks/useFormatSettings";
import useDocumentViewer from "../../../hooks/useDocumentViewer";
import "./FormResponses.css";

const FormResponses = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { accessToken, refreshToken } = useAuth();
  const { dateFormat, timeFormat } = useFormatSettings();
  const { openDocument } = useDocumentViewer();

  const [responses, setResponses] = useState([]);
  const [, setOriginalFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedResponse, setExpandedResponse] = useState(null);

  useEffect(() => {
    if (!formId) return;

    const fetchResponses = async () => {
      setLoading(true);
      try {
        const res = await api.GetFormResponsesByFormId({
          formId,
          accessToken,
          refreshToken,
        });
        const data = res?.data?.data ?? {};
        setResponses(data.responses ?? []);
        setOriginalFields(data.originalFields ?? []);
      } catch (err) {
        console.error(err);
        showApiError(err, "LOAD_FORM_RESPONSES");
      } finally {
        setLoading(false);
      }
    };

    fetchResponses();
  }, [formId, accessToken, refreshToken]);

  const toggleResponse = (id) => {
    setExpandedResponse((prev) => (prev === id ? null : id));
  };


  const getFileName = (url) => {
    try {
      const decoded = decodeURIComponent(url.split("/").pop());
      // Remove timestamp prefix (e.g. "1770815330358-")
      return decoded.replace(/^\d+-/, "");
    } catch {
      return "File";
    }
  };

  const isImageUrl = (url) => {
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(url);
  };

  const isBase64Image = (value) => {
    return value && value.startsWith("data:image/");
  };

  // Sort fields by order
  const sortByOrder = (fields) => {
    return [...fields].sort((a, b) => (a.formField?.order ?? 0) - (b.formField?.order ?? 0));
  };

  const renderFieldValue = (field) => {
    const { value, formField } = field;
    const { fieldType } = formField;

    switch (fieldType) {
      case "shortText":
      case "paragraph":
      case "dropdown":
        return <p className="fr-value-text">{value}</p>;

      case "radio":
        return (
          <div className="fr-value-radio">
            {formField.options?.map((opt) => (
              <label key={opt} className="fr-radio-option">
                <input type="radio" checked={value === opt} readOnly />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        );

      case "checkbox":
        {
          const selected = value.split(", ");
          return (
            <div className="fr-value-checkbox">
              {formField.options?.map((opt) => (
                <label key={opt} className="fr-checkbox-option">
                  <input type="checkbox" checked={selected.includes(opt)} readOnly />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          );
        }

      case "starRating":
        {
          const rating = parseInt(value, 10);
          const maxStars = formField.starRating?.[0] || 5;
          return (
            <div className="fr-value-stars">
              {Array.from({ length: maxStars }, (_, i) => (
                <FiStar
                  key={i}
                  className={`fr-star ${i < rating ? "fr-star-filled" : ""}`}
                />
              ))}
              <span className="fr-star-count">{rating}/{maxStars}</span>
            </div>
          );
        }

      case "fileUpload":
        return (
          <div className="fr-value-file">
            {isImageUrl(value) ? (
              <div className="fr-file-preview">
                <img src={value} alt="Upload" className="fr-file-image" loading="lazy" />
                <span className="fr-file-name">{getFileName(value)}</span>
              </div>
            ) : (
              <button type="button" onClick={() => openDocument(value, getFileName(value))} className="fr-file-link cursor-pointer" aria-label={`Open ${getFileName(value)}`}>
                <FiFile className="fr-file-icon" aria-hidden="true" />
                <span className="fr-file-name">{getFileName(value)}</span>
                <FiDownload className="fr-download-icon" aria-hidden="true" />
              </button>
            )}
          </div>
        );

      case "signature":
        return (
          <div className="fr-value-signature">
            {isBase64Image(value) ? (
              <img src={value} alt="Signature" className="fr-signature-image" loading="lazy" />
            ) : (
              <p className="fr-signature-typed">{value}</p>
            )}
          </div>
        );

      default:
        return <p className="fr-value-text">{value}</p>;
    }
  };

  if (loading) {
    return (
      <LoadingSpinner />
    );
  }

  return (
    <div className="fr-container">
      <div className="fr-header">
        <button className="fr-back-btn cursor-pointer" onClick={() => navigate(-1)}>
          <FiChevronLeft /> Back
        </button>
        <div>
          <h1 className="fr-title">Form Responses</h1>
          <p className="fr-subtitle">
            {responses.length} response{responses.length !== 1 ? "s" : ""} submitted
          </p>
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="fr-empty">
          <p>No responses have been submitted yet.</p>
        </div>
      ) : (
        <div className="fr-responses-list">
          {responses.map((response, idx) => {
            const isExpanded = expandedResponse === response.id;
            const sortedFields = sortByOrder(response.fields || []);

            // Group file uploads by formFieldId to show together
            const groupedFields = [];
            const fileGroups = {};
            sortedFields.forEach((field) => {
              if (field.formField.fieldType === "fileUpload") {
                if (!fileGroups[field.formFieldId]) {
                  fileGroups[field.formFieldId] = {
                    ...field,
                    values: [field.value],
                  };
                  groupedFields.push(fileGroups[field.formFieldId]);
                } else {
                  fileGroups[field.formFieldId].values.push(field.value);
                }
              } else {
                groupedFields.push(field);
              }
            });

            return (
              <div key={response.id} className="fr-response-card">
                <button
                  className="fr-response-header cursor-pointer"
                  onClick={() => toggleResponse(response.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="fr-response-summary">
                    <span className="fr-response-number">#{idx + 1}</span>
                    <span className="fr-response-date">
                      Submitted: {formatDateTime(response.submittedAt, dateFormat, timeFormat)}
                    </span>
                  </div>
                  {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                </button>

                {isExpanded && (
                  <div className="fr-response-body">
                    {groupedFields.map((field) => {
                      // Multi-file upload
                      if (field.values) {
                        return (
                          <div key={field.id} className="fr-field-block">
                            <label className="fr-field-label">
                              {field.formField.label}
                            </label>
                            <div className="fr-multi-files">
                              {field.values.map((url, i) => (
                                <div key={i} className="fr-value-file">
                                  {isImageUrl(url) ? (
                                    <div className="fr-file-preview">
                                      <img src={url} alt="Upload" className="fr-file-image" loading="lazy" />
                                      <span className="fr-file-name">{getFileName(url)}</span>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => openDocument(url, getFileName(url))} className="fr-file-link cursor-pointer" aria-label={`Open ${getFileName(url)}`}>
                                      <FiFile className="fr-file-icon" aria-hidden="true" />
                                      <span className="fr-file-name">{getFileName(url)}</span>
                                      <FiDownload className="fr-download-icon" aria-hidden="true" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      // Skip sectionHeader and bodyText from originalFields context
                      if (["sectionHeader", "bodyText"].includes(field.formField.fieldType)) {
                        return null;
                      }

                      return (
                        <div key={field.id} className="fr-field-block">
                          <label className="fr-field-label">
                            {field.formField.label}
                            {field.formField.isRequired && (
                              <span className="required-indicator">*</span>
                            )}
                          </label>
                          {renderFieldValue(field)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FormResponses;

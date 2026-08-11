import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiFile, FiDownload, FiChevronLeft, FiCalendar } from "react-icons/fi";
import { FaStar, FaRegStar } from "react-icons/fa";
import api from "../../../api/customFormsApi";
import useAuth from "../../../hooks/useAuth";
import { showToast, showApiError } from "../../../Helper/ShowToast";
import { formatDate, formatDateTime } from "../../../Helper/Formatters";
import useFormatSettings from "../../../hooks/useFormatSettings";
import useDocumentViewer from "../../../hooks/useDocumentViewer";
import "./FormRenderer.css";
import SectionLoader from "../../../Components/SectionLoader";

const FormRenderer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken, refreshToken } = useAuth();
  const { dateFormat, timeFormat } = useFormatSettings();
  const { openDocument } = useDocumentViewer();

  const [formName, setFormName] = useState("");
  const [response, setResponse] = useState(null);
  const [originalFields, setOriginalFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch form details for the name
        const formRes = await api.GetFormsByFormId({
          formId: id,
          accessToken,
          refreshToken,
        });
        setFormName(formRes?.data?.data?.name ?? "");

        // Fetch form responses
        const responsesRes = await api.GetFormResponsesByFormId({
          formId: id,
          accessToken,
          refreshToken,
        });
        const data = responsesRes?.data?.data ?? {};
        setResponse(data.responses?.[0] ?? null);
        setOriginalFields(data.originalFields ?? []);
      } catch (err) {
        console.error(err);
        showApiError(err, "LOAD_FORM");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, accessToken, refreshToken]);

  const getFileName = (url) => {
    try {
      const decoded = decodeURIComponent(url.split("/").pop());
      return decoded.replace(/^\d+-/, "");
    } catch {
      return "File";
    }
  };

  const isImageUrl = (url) => /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(url);
  const isBase64Image = (value) => value && value.startsWith("data:image/");

  const handleDownloadPDF = async () => {
    if (!response) return;
    setDownloading(true);

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF("p", "mm", "a4");

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      const rightEdge = pageWidth - margin;
      let y = 0;

      // Colors
      const blue = [37, 99, 235];
      const darkText = [15, 23, 42];
      const medText = [51, 65, 85];
      const lightText = [100, 116, 139];
      const mutedText = [148, 163, 184];
      const borderColor = [226, 232, 240];
      const bgLight = [245, 247, 250];
      const white = [255, 255, 255];
      const red = [220, 38, 38];
      const amber = [245, 158, 11];


      // Draw a 5-point star shape
      const drawStar = (cx, cy, outerR, innerR, filled) => {
        const points = [];
        for (let i = 0; i < 5; i++) {
          const outerAngle = (Math.PI / 2) + (i * 2 * Math.PI / 5);
          points.push([cx + outerR * Math.cos(outerAngle), cy - outerR * Math.sin(outerAngle)]);
          const innerAngle = outerAngle + Math.PI / 5;
          points.push([cx + innerR * Math.cos(innerAngle), cy - innerR * Math.sin(innerAngle)]);
        }
        doc.setLineWidth(0.3);
        if (filled) {
          doc.setFillColor(...amber);
          doc.setDrawColor(...amber);
        } else {
          doc.setFillColor(...white);
          doc.setDrawColor(...borderColor);
        }
        // Draw path manually
        const [first, ...rest] = points;
        let path = `${first[0]} ${first[1]} m `;
        rest.forEach(([px, py]) => { path += `${px} ${py} l `; });
        path += "h";
        // Use triangle approach instead for compatibility
        // Draw as filled polygon via triangles from center
        if (filled) {
          doc.setFillColor(...amber);
        } else {
          doc.setFillColor(230, 230, 230);
        }
        for (let i = 0; i < points.length; i++) {
          const p1 = points[i];
          const p2 = points[(i + 1) % points.length];
          doc.triangle(cx, cy, p1[0], p1[1], p2[0], p2[1], "F");
        }
      };

      // Draw a checkmark using lines
      const drawCheckmark = (x, cy, size) => {
        doc.setDrawColor(...white);
        doc.setLineWidth(0.6);
        // Short leg
        doc.line(x + size * 0.2, cy, x + size * 0.4, cy + size * 0.25);
        // Long leg
        doc.line(x + size * 0.4, cy + size * 0.25, x + size * 0.8, cy - size * 0.25);
      };

      const checkPageBreak = (needed = 20) => {
        if (y + needed > pageHeight - 22) {
          doc.addPage();
          y = margin;
        }
      };

      // ===== HEADER BANNER =====
      doc.setFillColor(...blue);
      doc.rect(0, 0, pageWidth, 50, "F");
      // Subtle gradient effect - darker strip at top
      doc.setFillColor(30, 80, 200);
      doc.rect(0, 0, pageWidth, 3, "F");

      // CONFIDENTIAL badge
      doc.setFillColor(...white);
      doc.roundedRect(margin, 9, 36, 6.5, 1.5, 1.5, "F");
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...red);
      doc.text("CONFIDENTIAL", margin + 18, 13.5, { align: "center" });

      // Form name
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...white);
      const titleLines = doc.splitTextToSize(formName || "Untitled Form", contentWidth);
      doc.text(titleLines, margin, 28);

      // Submitted date
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(190, 210, 255);
      doc.text("Submitted: " + formatDateTime(response.submittedAt, dateFormat, timeFormat), margin, 42);

      y = 58;

      // ===== FIELDS =====
      const sorted = [...originalFields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const valMap = {};
      (response.fields || []).forEach((f) => {
        if (!valMap[f.formFieldId]) valMap[f.formFieldId] = [];
        valMap[f.formFieldId].push(f);
      });

      let qNum = 0;

      for (const field of sorted) {
        const { id: fieldId, fieldType, label } = field;

        // ---- SECTION HEADER ----
        if (fieldType === "sectionHeader") {
          checkPageBreak(16);
          y += 5;

          // Blue bar + background
          doc.setFillColor(...blue);
          doc.rect(margin, y - 3, 3, 12, "F");
          doc.setFillColor(239, 246, 255);
          doc.rect(margin + 3, y - 3, contentWidth - 3, 12, "F");

          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...darkText);
          doc.text(label, margin + 8, y + 5);
          y += 16;
          continue;
        }

        // ---- BODY TEXT ----
        if (fieldType === "bodyText") {
          checkPageBreak(12);
          doc.setFontSize(9);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(...lightText);
          const lines = doc.splitTextToSize(label, contentWidth - 8);
          doc.text(lines, margin + 8, y);
          y += lines.length * 4.5 + 3;
          continue;
        }

        qNum++;
        const matched = valMap[fieldId] || [];

        // ---- FIELD ROW ----
        // Pre-calculate height
        let estH = 18;
        if ((fieldType === "checkbox" || fieldType === "radio") && matched.length > 0) {
          estH = 14 + (field.options?.length || 1) * 9;
        }
        if (fieldType === "starRating") estH = 22;
        if (fieldType === "signature" && matched[0] && isBase64Image(matched[0].value)) estH = 42;
        if (fieldType === "fileUpload") estH = 12 + matched.length * 11;
        checkPageBreak(estH);

        // Light separator
        doc.setDrawColor(...borderColor);
        doc.setLineWidth(0.2);
        doc.line(margin, y - 1, rightEdge, y - 1);

        // Question number badge
        doc.setFillColor(...blue);
        doc.roundedRect(margin, y + 1, 7, 5.5, 1.2, 1.2, "F");
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...white);
        doc.text(String(qNum), margin + 3.5, y + 5, { align: "center" });

        // Label
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...medText);
        const labelLines = doc.splitTextToSize(label, contentWidth - 12);
        doc.text(labelLines, margin + 10, y + 5);
        y += labelLines.length * 5 + 6;

        const valueX = margin + 10;

        if (matched.length === 0) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(...mutedText);
          doc.text("-- No response --", valueX, y);
          y += 8;
          continue;
        }

        // ---- RENDER BY TYPE ----

        if (fieldType === "shortText" || fieldType === "paragraph" || fieldType === "dropdown") {
          const val = matched[0].value;
          const valLines = doc.splitTextToSize(val, contentWidth - 18);
          const boxH = valLines.length * 5 + 6;
          checkPageBreak(boxH + 2);

          // Answer container
          doc.setFillColor(...bgLight);
          doc.roundedRect(valueX, y - 2, contentWidth - 14, boxH, 2, 2, "F");
          // Left accent
          doc.setFillColor(...blue);
          doc.rect(valueX, y - 2, 1.5, boxH, "F");

          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...darkText);
          doc.text(valLines, valueX + 6, y + 3);
          y += boxH + 3;

        } else if (fieldType === "radio") {
          const selectedVal = matched[0].value;
          (field.options || []).forEach((opt) => {
            checkPageBreak(10);
            const isSel = selectedVal === opt;

            // Option row background
            if (isSel) {
              doc.setFillColor(239, 246, 255);
              doc.roundedRect(valueX, y - 3.5, contentWidth - 14, 8, 1.5, 1.5, "F");
            }

            // Outer circle
            const cx = valueX + 4;
            const cy = y + 0.5;
            doc.setDrawColor(isSel ? blue[0] : 180, isSel ? blue[1] : 180, isSel ? blue[2] : 180);
            doc.setLineWidth(0.5);
            doc.circle(cx, cy, 2.2, "S");

            // Inner dot if selected
            if (isSel) {
              doc.setFillColor(...blue);
              doc.circle(cx, cy, 1.2, "F");
            }

            // Option text
            doc.setFontSize(9.5);
            doc.setFont("helvetica", isSel ? "bold" : "normal");
            doc.setTextColor(isSel ? darkText[0] : lightText[0], isSel ? darkText[1] : lightText[1], isSel ? darkText[2] : lightText[2]);
            doc.text(opt, valueX + 10, y + 1);
            y += 8;
          });
          y += 2;

        } else if (fieldType === "checkbox") {
          const selected = matched[0].value.split(", ");
          (field.options || []).forEach((opt) => {
            checkPageBreak(10);
            const isChk = selected.includes(opt);

            // Option row background
            if (isChk) {
              doc.setFillColor(239, 246, 255);
              doc.roundedRect(valueX, y - 3.5, contentWidth - 14, 8, 1.5, 1.5, "F");
            }

            // Checkbox square
            const bx = valueX + 1.5;
            const by = y - 2;
            const bSize = 4.5;

            if (isChk) {
              doc.setFillColor(...blue);
              doc.roundedRect(bx, by, bSize, bSize, 0.8, 0.8, "F");
              // Draw checkmark with lines
              drawCheckmark(bx, y + 0.2, bSize);
            } else {
              doc.setDrawColor(180, 180, 180);
              doc.setLineWidth(0.4);
              doc.roundedRect(bx, by, bSize, bSize, 0.8, 0.8, "S");
            }

            // Option text
            doc.setFontSize(9.5);
            doc.setFont("helvetica", isChk ? "bold" : "normal");
            doc.setTextColor(isChk ? darkText[0] : lightText[0], isChk ? darkText[1] : lightText[1], isChk ? darkText[2] : lightText[2]);
            doc.text(opt, valueX + 10, y + 1);
            y += 8;
          });
          y += 2;

        } else if (fieldType === "starRating") {
          const rating = parseInt(matched[0].value, 10);
          const max = field.starRating?.[0] || 5;
          const starSize = 3.2;
          const gap = 9;

          for (let i = 0; i < max; i++) {
            const cx = valueX + 4 + i * gap;
            const cy = y + 1;
            drawStar(cx, cy, starSize, starSize * 0.4, i < rating);
          }

          // Rating text
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...darkText);
          doc.text(`${rating} / ${max}`, valueX + max * gap + 6, y + 2);

          // Rating bar
          const barX = valueX + max * gap + 20;
          const barW = 30;
          const barH = 3;
          const fillW = (rating / max) * barW;
          doc.setFillColor(230, 230, 230);
          doc.roundedRect(barX, y - 0.5, barW, barH, 1, 1, "F");
          doc.setFillColor(...amber);
          doc.roundedRect(barX, y - 0.5, fillW, barH, 1, 1, "F");

          y += 10;

        } else if (fieldType === "fileUpload") {
          matched.forEach((f) => {
            checkPageBreak(11);
            const name = getFileName(f.value);

            // File card
            doc.setFillColor(239, 246, 255);
            doc.roundedRect(valueX, y - 3, contentWidth - 14, 9, 2, 2, "F");
            doc.setDrawColor(190, 210, 245);
            doc.setLineWidth(0.3);
            doc.roundedRect(valueX, y - 3, contentWidth - 14, 9, 2, 2, "S");

            // File icon (simple rectangle)
            doc.setFillColor(...blue);
            doc.roundedRect(valueX + 2, y - 1.5, 4, 5, 0.5, 0.5, "F");
            doc.setFillColor(...white);
            doc.rect(valueX + 3, y - 0.5, 2, 0.5, "F");
            doc.rect(valueX + 3, y + 0.8, 2, 0.5, "F");
            doc.rect(valueX + 3, y + 2.1, 2, 0.5, "F");

            // File name
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...blue);
            const truncName = name.length > 45 ? name.substring(0, 42) + "..." : name;
            doc.textWithLink(truncName, valueX + 9, y + 2, { url: f.value });

            // Download text
            doc.setFontSize(7);
            doc.setTextColor(...lightText);
            doc.text("DOWNLOAD", rightEdge - 6, y + 2, { align: "right" });

            y += 11;
          });

        } else if (fieldType === "signature") {
          const val = matched[0].value;
          checkPageBreak(35);

          // Signature label
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...lightText);
          doc.text("SIGNATURE", valueX, y);
          y += 4;

          // Dashed border box
          doc.setDrawColor(...borderColor);
          doc.setLineWidth(0.4);
          doc.setLineDashPattern([1.5, 1.5], 0);

          if (isBase64Image(val)) {
            const boxW = 65;
            const boxH = 28;
            doc.roundedRect(valueX, y - 2, boxW, boxH, 2, 2, "S");
            doc.setLineDashPattern([], 0);
            try {
              doc.addImage(val, "PNG", valueX + 3, y, boxW - 6, boxH - 4);
            } catch {
              doc.setTextColor(...mutedText);
              doc.setFontSize(8);
              doc.text("(Signature attached)", valueX + 12, y + 12);
            }
            y += boxH + 4;
          } else {
            const boxH = 14;
            doc.roundedRect(valueX, y - 2, contentWidth - 14, boxH, 2, 2, "S");
            doc.setLineDashPattern([], 0);
            doc.setFontSize(16);
            doc.setFont("courier", "normal");
            doc.setTextColor(...darkText);
            doc.text(val, valueX + 6, y + 7);
            y += boxH + 4;
          }

        } else {
          // Fallback text
          const val = matched[0].value;
          const valLines = doc.splitTextToSize(val, contentWidth - 18);
          const boxH = valLines.length * 5 + 6;
          checkPageBreak(boxH + 2);

          doc.setFillColor(...bgLight);
          doc.roundedRect(valueX, y - 2, contentWidth - 14, boxH, 2, 2, "F");
          doc.setFillColor(...blue);
          doc.rect(valueX, y - 2, 1.5, boxH, "F");

          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...darkText);
          doc.text(valLines, valueX + 6, y + 3);
          y += boxH + 3;
        }

        y += 2;
      }

      // ===== WATERMARK ON ALL PAGES =====
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Diagonal watermark
        doc.setFontSize(55);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 220, 220);
        doc.setGState(new doc.GState({ opacity: 0.05 }));
        doc.text("CONFIDENTIAL", pageWidth / 2, pageHeight / 2, {
          align: "center",
          angle: 45,
        });
        doc.setGState(new doc.GState({ opacity: 1 }));

        // Footer
        doc.setDrawColor(...borderColor);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 14, rightEdge, pageHeight - 14);

        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...red);
        doc.text("CONFIDENTIAL", margin, pageHeight - 9);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(...lightText);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 9, { align: "center" });

        doc.setFontSize(7);
        doc.text(
          formatDate(new Date(), dateFormat),
          rightEdge, pageHeight - 9, { align: "right" }
        );
      }

      const safeName = (formName || "form-response").replace(/[^a-zA-Z0-9]/g, "_");
      doc.save(`${safeName}.pdf`);
    } catch (err) {
      console.error(err);
      showToast("Failed to generate PDF", "error");
    } finally {
      setDownloading(false);
    }
  };

  // Build field value lookup from response
  const fieldValueMap = {};
  if (response) {
    (response.fields || []).forEach((field) => {
      if (!fieldValueMap[field.formFieldId]) {
        fieldValueMap[field.formFieldId] = [];
      }
      fieldValueMap[field.formFieldId].push(field);
    });
  }

  const sortedFields = [...originalFields].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );

  // Compute question number for a given field
  const getQuestionNumber = (fieldId) => {
    let count = 0;
    for (const f of sortedFields) {
      if (["sectionHeader", "bodyText"].includes(f.fieldType)) continue;
      count++;
      if (f.id === fieldId) return count;
    }
    return 0;
  };

  const renderFieldValue = (value, formField) => {
    const { fieldType } = formField;

    switch (fieldType) {
      case "shortText":
      case "paragraph":
        return <div className="fr-answer-box">{value}</div>;

      case "dropdown":
        return <div className="fr-answer-chip">{value}</div>;

      case "radio":
        return (
          <div className="fr-options-list">
            {formField.options?.map((opt) => (
              <div key={opt} className={`fr-option-item ${value === opt ? "fr-option-selected" : ""}`}>
                <div className={`fr-radio-circle ${value === opt ? "fr-radio-checked" : ""}`}>
                  {value === opt && <div className="fr-radio-dot" />}
                </div>
                <span>{opt}</span>
              </div>
            ))}
          </div>
        );

      case "checkbox": {
        const selected = value.split(", ");
        return (
          <div className="fr-options-list">
            {formField.options?.map((opt) => (
              <div key={opt} className={`fr-option-item ${selected.includes(opt) ? "fr-option-selected" : ""}`}>
                <div className={`fr-check-box ${selected.includes(opt) ? "fr-check-checked" : ""}`}>
                  {selected.includes(opt) && <span>&#10003;</span>}
                </div>
                <span>{opt}</span>
              </div>
            ))}
          </div>
        );
      }

      case "starRating": {
        const rating = parseInt(value, 10);
        const maxStars = formField.starRating?.[0] || 5;
        return (
          <div className="fr-stars-row">
            {Array.from({ length: maxStars }, (_, i) =>
              i < rating ? (
                <FaStar key={i} className="fr-star-icon fr-star-active" />
              ) : (
                <FaRegStar key={i} className="fr-star-icon" />
              )
            )}
            <span className="fr-star-label">{rating} out of {maxStars}</span>
          </div>
        );
      }

      case "fileUpload":
        // Handled separately for multi-file
        return null;

      case "signature":
        return (
          <div className="fr-signature-box">
            {isBase64Image(value) ? (
              <img src={value} alt="Signature" className="fr-sig-img" loading="lazy" />
            ) : (
              <p className="fr-sig-typed">{value}</p>
            )}
          </div>
        );

      default:
        return <div className="fr-answer-box">{value}</div>;
    }
  };

  if (loading) {
    return <SectionLoader />;
  }

  return (
    <div className="fr-page">
      {/* Top bar */}
      <div className="fr-topbar">
        <button className="fr-back cursor-pointer" onClick={() => navigate(-1)}>
          <FiChevronLeft size={18} aria-hidden="true" />
          <span>Back</span>
        </button>
        {response && (
          <button
            className="fr-download-btn cursor-pointer"
            onClick={handleDownloadPDF}
            disabled={downloading}
          >
            <FiDownload size={16} aria-hidden="true" />
            <span>{downloading ? "Downloading..." : "Download PDF"}</span>
          </button>
        )}
      </div>

      {/* Form card */}
      <div className="fr-card">
        {/* Card header with form name */}
        <div className="fr-card-header">
          <h1 className="fr-form-name">{formName || "Untitled Form"}</h1>
          {response && (
            <div className="fr-meta-row">
              <div className="fr-meta-item">
                <FiCalendar size={14} />
                <span>{formatDateTime(response.submittedAt, dateFormat, timeFormat)}</span>
              </div>
            </div>
          )}
        </div>

        {!response ? (
          <div className="fr-no-response">
            <div className="fr-no-response-icon">
              <FiFile size={40} />
            </div>
            <h3>No Response Yet</h3>
            <p>This form has not been submitted yet.</p>
          </div>
        ) : (
          <div className="fr-fields">
            {sortedFields.map((origField) => {
              const { id: fieldId, fieldType, label, isRequired } = origField;

              // Section Header
              if (fieldType === "sectionHeader") {
                return (
                  <div key={fieldId} className="fr-section">
                    <div className="fr-section-bar" />
                    <h2 className="fr-section-title">{label}</h2>
                  </div>
                );
              }

              // Body Text
              if (fieldType === "bodyText") {
                return (
                  <div key={fieldId} className="fr-body-desc">
                    <p>{label}</p>
                  </div>
                );
              }

              const matchedFields = fieldValueMap[fieldId] || [];
              const qNum = getQuestionNumber(fieldId);

              // File upload (supports multiple files)
              if (fieldType === "fileUpload") {
                return (
                  <div key={fieldId} className="fr-field">
                    <div className="fr-field-top">
                      <span className="fr-q-num">{qNum}</span>
                      <label className="fr-label">
                        {label}
                        {isRequired && <span className="required-indicator">*</span>}
                      </label>
                    </div>
                    {matchedFields.length === 0 ? (
                      <p className="fr-no-answer">--</p>
                    ) : (
                      <div className="fr-files-grid">
                        {matchedFields.map((f, i) => (
                          <div key={i} className="fr-file-card">
                            {isImageUrl(f.value) ? (
                              <>
                                <img src={f.value} alt="Upload" className="fr-file-thumb" loading="lazy" />
                                <span className="fr-file-label">{getFileName(f.value)}</span>
                              </>
                            ) : (
                              <button type="button" onClick={() => openDocument(f.value, getFileName(f.value))} className="fr-file-doc cursor-pointer" aria-label={`Open ${getFileName(f.value)}`}>
                                <FiFile size={24} aria-hidden="true" />
                                <span className="fr-file-label">{getFileName(f.value)}</span>
                                <FiDownload size={16} className="fr-dl-icon" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              // All other field types
              const value = matchedFields[0]?.value;

              return (
                <div key={fieldId} className="fr-field">
                  <div className="fr-field-top">
                    <span className="fr-q-num">{qNum}</span>
                    <label className="fr-label">
                      {label}
                      {isRequired && <span className="required-indicator">*</span>}
                    </label>
                  </div>
                  {!value ? (
                    <p className="fr-no-answer">--</p>
                  ) : (
                    renderFieldValue(value, origField)
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FormRenderer;

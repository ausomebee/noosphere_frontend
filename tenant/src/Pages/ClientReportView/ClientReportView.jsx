import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import DOMPurify from "dompurify";
import {
  FiType,
  FiEdit,
  FiImage,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiFileText,
  FiChevronDown,
  FiChevronUp,
  FiTrash2,
  FiCalendar,
  FiUser,
  FiLoader,
} from "react-icons/fi";
import api from "../../api/TemplateAndReportApi";
import "./ClientReportView.css";

// ─── Helpers ──────────────────────────────────────────────
const SKIP_KEYS = ["id", "clinicalReportId"];

const formatLabel = (key) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();

const isHTMLString = (str) =>
  typeof str === "string" && /<[a-z][\s\S]*>/i.test(str);

const formatDateString = (dateStr) => {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

const SIGNATURE_TYPES = [
  { value: "type", label: "Type", icon: <FiType size={20} /> },
  { value: "draw", label: "Draw", icon: <FiEdit size={20} /> },
  { value: "image", label: "Upload Image", icon: <FiImage size={20} /> },
];

// ─── Section Content Renderer ─────────────────────────────
const renderContentValue = (key, value) => {
  if (value === null || value === undefined || value === "") return null;
  if (SKIP_KEYS.includes(key)) return null;

  const label = formatLabel(key);

  // Array of objects (e.g. diagnoses)
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") {
    return (
      <div key={key} className="crv-field crv-field-full">
        <span className="crv-field-label">{label}</span>
        <div className="crv-nested-items">
          {value.map((item, idx) => (
            <div key={item.id || idx} className="crv-nested-card">
              {Object.entries(item).map(([k, v]) => renderContentValue(k, v))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Array of strings
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <div key={key} className="crv-field">
        <span className="crv-field-label">{label}</span>
        <span className="crv-field-value">{value.join(", ")}</span>
      </div>
    );
  }

  // HTML string
  if (isHTMLString(value)) {
    return (
      <div key={key} className="crv-field crv-field-full">
        <span className="crv-field-label">{label}</span>
        <div
          className="crv-html-content"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }}
        />
      </div>
    );
  }

  // Boolean
  if (typeof value === "boolean") {
    return (
      <div key={key} className="crv-field">
        <span className="crv-field-label">{label}</span>
        <span className="crv-field-value">{value ? "Yes" : "No"}</span>
      </div>
    );
  }

  // Plain string / number
  return (
    <div key={key} className="crv-field">
      <span className="crv-field-label">{label}</span>
      <span className="crv-field-value">{String(value)}</span>
    </div>
  );
};

const SectionCard = ({ section }) => {
  const [expanded, setExpanded] = useState(true);
  const { content } = section;

  if (!content) return null;

  const hasItems = content.items && Array.isArray(content.items);

  return (
    <div className="crv-section-card">
      <button
        className="crv-section-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="crv-section-header-left">
          <FiFileText size={18} />
          <h3>{section.section}</h3>
        </div>
        {expanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
      </button>

      {expanded && (
        <div className="crv-section-body">
          {hasItems ? (
            content.items.map((item, idx) => (
              <div key={item.id || idx} className="crv-item-card">
                <div className="crv-item-header">
                  {section.section} {idx + 1}
                </div>
                <div className="crv-fields-grid">
                  {Object.entries(item).map(([k, v]) =>
                    renderContentValue(k, v),
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="crv-fields-grid">
              {Object.entries(content).map(([k, v]) =>
                renderContentValue(k, v),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Signature Pad (Draw) ─────────────────────────────────
const SignaturePad = ({ onSignatureChange, onClear }) => {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1f2937";
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    isDrawingRef.current = true;
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    onSignatureChange(canvasRef.current.toDataURL("image/png"));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onClear();
  };

  return (
    <div className="crv-signature-draw">
      <canvas
        ref={canvasRef}
        className="crv-signature-canvas"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <button
        type="button"
        className="crv-clear-btn"
        onClick={handleClear}
      >
        <FiTrash2 size={14} /> Clear
      </button>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────
const ClientReportView = () => {
  const { reportId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  // Report state
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Signature state
  const [signatureType, setSignatureType] = useState("type");
  const [typedSignature, setTypedSignature] = useState("");
  const [drawnSignature, setDrawnSignature] = useState(null);
  const [uploadedSignature, setUploadedSignature] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [signerName, setSignerName] = useState("");
  const [signDate] = useState(
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  );

  // Action states
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [changeRequestText, setChangeRequestText] = useState("");
  const [changeRequestLoading, setChangeRequestLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // ─── Validate Token & Fetch Report ──────
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Validate token first
      await api.ValidateClientReportToken({ token });

      const response = await api.GetSingleClinicalReportById({
        Id: reportId,
        accessToken: token,
        refreshToken: token,
      });
      const data = response?.data || response;
      setReport(data);

      // Pre-fill signer name from client data
      const client = data?.client?.client;
      if (client) {
        setSignerName(
          `${client.firstName || ""} ${client.lastName || ""}`.trim(),
        );
      }
    } catch (err) {
      setError("Unable to load this report. The link may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  }, [reportId, token]);

  useEffect(() => {
    if (reportId && token) fetchReport();
  }, [reportId, token, fetchReport]);

  // ─── Toast ───────────────────────────────
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ─── Signature Handling ──────────────────
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be less than 5MB", "error");
      return;
    }

    setUploadedSignature(file);
    const reader = new FileReader();
    reader.onload = (ev) => setUploadPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const getSignatureData = () => {
    switch (signatureType) {
      case "type":
        return typedSignature;
      case "draw":
        return drawnSignature;
      case "image":
        return uploadPreview;
      default:
        return null;
    }
  };

  const isSignatureValid = () => {
    if (!signerName.trim()) return false;
    switch (signatureType) {
      case "type":
        return !!typedSignature.trim();
      case "draw":
        return !!drawnSignature;
      case "image":
        return !!uploadedSignature;
      default:
        return false;
    }
  };

  // ─── Sign Document ──────────────────────
  const handleSign = async () => {
    if (!isSignatureValid()) {
      showToast("Please provide your name and signature", "error");
      return;
    }

    setSigning(true);
    try {
      await api.SignClinicalReport({
        id: report?.sections?.find(
          (s) => s.section === "Consent & Signatures",
        )?.id,
        content: {
          signatureType,
          signatureData: getSignatureData(),
          signerName,
          signedAt: new Date().toISOString(),
        },
      });
      setSigned(true);
      showToast("Document signed successfully!");
    } catch (err) {
      showToast("Failed to sign document. Please try again.", "error");
    } finally {
      setSigning(false);
    }
  };

  // ─── Change Request ──────────────────────
  const handleSubmitChangeRequest = async () => {
    if (!changeRequestText.trim()) {
      showToast("Please describe the changes you'd like", "error");
      return;
    }

    setChangeRequestLoading(true);
    try {
      await api.CreateClinicalReportChangeRequest({
        clinicalReportId: reportId,
        description: changeRequestText,
        clientTenantId: report?.clientTenantId,
        accessToken: token,
        refreshToken: token,
      });
      showToast("Change request submitted successfully!");
      setShowChangeModal(false);
      setChangeRequestText("");
      fetchReport(); // Refresh to show updated change requests
    } catch (err) {
      showToast("Failed to submit change request", "error");
    } finally {
      setChangeRequestLoading(false);
    }
  };

  // ─── Render: Loading ─────────────────────
  if (loading) {
    return (
      <div className="crv-page">
        <div className="crv-loading">
          <div className="crv-spinner" />
          <p>Loading clinical report...</p>
        </div>
      </div>
    );
  }

  // ─── Render: Error ───────────────────────
  if (error) {
    return (
      <div className="crv-page">
        <div className="crv-error-state">
          <FiAlertCircle size={48} />
          <h2>Unable to Load Report</h2>
          <p>{error}</p>
          <button className="crv-btn crv-btn-primary" onClick={fetchReport}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: Signed Success ──────────────
  if (signed) {
    return (
      <div className="crv-page">
        <div className="crv-success-state">
          <div className="crv-success-icon">
            <FiCheck size={48} />
          </div>
          <h2>Document Signed Successfully</h2>
          <p>
            Thank you, <strong>{signerName}</strong>. Your signature has been
            recorded for <strong>"{report?.title}"</strong>.
          </p>
          <p className="crv-success-sub">
            You may close this page. A confirmation will be sent to your email.
          </p>
        </div>
      </div>
    );
  }

  // ─── Render: Report ──────────────────────
  const client = report?.client?.client;
  const clientName = client
    ? `${client.firstName || ""} ${client.lastName || ""}`.trim()
    : "Client";
  const changeRequests = report?.clinicalReportChangeRequests || [];

  return (
    <div className="crv-page">
      {/* Toast */}
      {toast && (
        <div className={`crv-toast crv-toast-${toast.type}`}>
          {toast.type === "success" ? (
            <FiCheck size={16} />
          ) : (
            <FiAlertCircle size={16} />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)}>
            <FiX size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="crv-header">
        <div className="crv-header-inner">
          <div className="crv-header-left">
            <FiFileText size={28} />
            <h1>Clinical Report</h1>
          </div>
          <span className={`crv-status-badge crv-status-${(report?.status || "").toLowerCase()}`}>
            {report?.status?.replace(/_/g, " ") || "Unknown"}
          </span>
        </div>
      </header>

      <main className="crv-main">
        {/* Report Info */}
        <div className="crv-info-card">
          <div className="crv-info-header">
            <div className="crv-client-avatar">
              {client?.firstName?.[0] || "?"}
              {client?.lastName?.[0] || "?"}
            </div>
            <div className="crv-client-details">
              <h2>{clientName}</h2>
              <p className="crv-doc-title">{report?.title || "Untitled Report"}</p>
            </div>
          </div>

          <div className="crv-info-grid">
            <div className="crv-info-item">
              <FiUser size={14} />
              <span className="crv-info-label">Created By</span>
              <span className="crv-info-value">
                {report?.creator?.fullName || "Unknown"}
              </span>
            </div>
            <div className="crv-info-item">
              <FiUser size={14} />
              <span className="crv-info-label">Approver</span>
              <span className="crv-info-value">
                {report?.approver?.fullName || "None"}
              </span>
            </div>
            <div className="crv-info-item">
              <FiCalendar size={14} />
              <span className="crv-info-label">Created</span>
              <span className="crv-info-value">
                {formatDateString(report?.createdAt)}
              </span>
            </div>
            <div className="crv-info-item">
              <FiCalendar size={14} />
              <span className="crv-info-label">Last Updated</span>
              <span className="crv-info-value">
                {formatDateString(report?.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Change Requests Alert */}
        {changeRequests.length > 0 && (
          <div className="crv-change-alert">
            <div className="crv-change-alert-header">
              <FiAlertCircle size={18} />
              <span>
                {changeRequests.length} Change Request
                {changeRequests.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="crv-change-list">
              {changeRequests.map((cr, idx) => (
                <div key={cr.id || idx} className="crv-change-item">
                  <p className="crv-change-desc">{cr.description}</p>
                  <span className="crv-change-date">
                    {formatDateTime(cr.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sections */}
        <div className="crv-sections">
          {report?.sections?.map((section) => (
            <SectionCard key={section.id} section={section} />
          ))}
        </div>

        {/* Signature Section */}
        <div className="crv-signature-section">
          <h2 className="crv-signature-title">Sign Document</h2>
          <p className="crv-signature-desc">
            Please review the document above and provide your signature below to
            confirm your consent.
          </p>

          {/* Signature Type Selector */}
          <div className="crv-signature-types">
            {SIGNATURE_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                className={`crv-sig-type-btn ${signatureType === type.value ? "active" : ""}`}
                onClick={() => setSignatureType(type.value)}
              >
                {type.icon}
                <span>{type.label}</span>
              </button>
            ))}
          </div>

          {/* Signature Input Area */}
          <div className="crv-signature-input-area">
            {signatureType === "type" && (
              <div className="crv-signature-type-input">
                <label>Type your signature</label>
                <input
                  type="text"
                  className="crv-typed-signature"
                  placeholder="Type your full name"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                />
                {typedSignature && (
                  <div className="crv-signature-preview-typed">
                    {typedSignature}
                  </div>
                )}
              </div>
            )}

            {signatureType === "draw" && (
              <div className="crv-signature-draw-input">
                <label>Draw your signature</label>
                <SignaturePad
                  onSignatureChange={setDrawnSignature}
                  onClear={() => setDrawnSignature(null)}
                />
              </div>
            )}

            {signatureType === "image" && (
              <div className="crv-signature-image-input">
                <label>Upload signature image</label>
                <div className="crv-upload-area">
                  {uploadPreview ? (
                    <div className="crv-upload-preview">
                      <img src={uploadPreview} alt="Signature" />
                      <button
                        type="button"
                        className="crv-remove-upload"
                        onClick={() => {
                          setUploadedSignature(null);
                          setUploadPreview(null);
                        }}
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="crv-upload-label">
                      <FiImage size={24} />
                      <span>Click to upload signature image</span>
                      <span className="crv-upload-hint">
                        PNG, JPG up to 5MB
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        hidden
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Signer Info */}
          <div className="crv-signer-info">
            <div className="crv-signer-field">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
              />
            </div>
            <div className="crv-signer-field">
              <label>Date</label>
              <input type="text" value={signDate} disabled />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="crv-actions">
          <button
            type="button"
            className="crv-btn crv-btn-secondary"
            onClick={() => setShowChangeModal(true)}
          >
            <FiAlertCircle size={16} />
            Request Change
          </button>
          <button
            type="button"
            className="crv-btn crv-btn-primary"
            onClick={handleSign}
            disabled={signing || !isSignatureValid()}
          >
            {signing ? (
              <>
                <FiLoader size={16} className="crv-spin" />
                Signing...
              </>
            ) : (
              <>
                <FiCheck size={16} />
                Sign Document
              </>
            )}
          </button>
        </div>
      </main>

      {/* Change Request Modal */}
      {showChangeModal && (
        <div className="crv-modal-overlay" onClick={() => setShowChangeModal(false)}>
          <div className="crv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="crv-modal-header">
              <h3>Request Change</h3>
              <button onClick={() => setShowChangeModal(false)}>
                <FiX size={20} />
              </button>
            </div>
            <div className="crv-modal-body">
              <p className="crv-modal-desc">
                Describe the changes you would like to be made to this document.
              </p>
              <textarea
                className="crv-modal-textarea"
                placeholder="Describe the changes you'd like..."
                value={changeRequestText}
                onChange={(e) => setChangeRequestText(e.target.value)}
                rows={5}
              />
            </div>
            <div className="crv-modal-footer">
              <button
                type="button"
                className="crv-btn crv-btn-secondary"
                onClick={() => setShowChangeModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="crv-btn crv-btn-primary"
                onClick={handleSubmitChangeRequest}
                disabled={changeRequestLoading || !changeRequestText.trim()}
              >
                {changeRequestLoading ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientReportView;

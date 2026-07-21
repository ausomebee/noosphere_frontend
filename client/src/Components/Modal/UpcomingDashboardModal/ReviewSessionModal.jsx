import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import ReusableModal from "../ReusableModal";
import { TextareaInput } from "../../../Components/Input/Inputs";
import { format } from "date-fns";
import api from "../../../api/homeApis";
import { showToast } from "../../../Helper/ShowToast";
import useAuth from "../../../hooks/useAuth";
import SignatureCanvas from "react-signature-canvas";
import { RxCross2 } from "react-icons/rx";
import { FiUpload } from "react-icons/fi";

// Simple star component
const StarRating = ({ label, rating, onChange }) => {
  return (
    <div style={{ marginBottom: "24px" }}>
      <p style={{ margin: "0 0 12px", fontSize: "15px", color: "#374151" }}>
        {label}
      </p>
      <div style={{ display: "flex", gap: "8px" }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
            onClick={() => onChange(star)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontSize: "32px",
              lineHeight: "1",
              color: star <= rating ? "#fbbf24" : "#d1d5db",
            }}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
};

// SOAP Notes Modal
const SOAPNotesModal = ({ isOpen, onClose, note }) => {
  if (!isOpen) return null;

  const modalContent = (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999999,
        padding: "20px",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: "16px",
          maxWidth: "600px",
          width: "100%",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          position: "relative",
          zIndex: 1000000,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            background: "white",
            zIndex: 10,
            borderTopLeftRadius: "16px",
            borderTopRightRadius: "16px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: "600",
              color: "#111827",
            }}
          >
            SOAP Notes
          </h2>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            style={{
              background: "#f3f4f6",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6b7280",
              borderRadius: "6px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#f3f4f6")}
          >
            <RxCross2 size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px" }}>
          <div
            style={{
              background: "#f9fafb",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
            }}
          >
            <h3
              style={{
                margin: "0 0 16px",
                fontSize: "16px",
                fontWeight: "600",
                color: "#374151",
              }}
            >
              Session Notes
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "#4b5563",
                lineHeight: "1.6",
                whiteSpace: "pre-wrap",
              }}
            >
              {note || "No notes available for this session."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            position: "sticky",
            bottom: 0,
            background: "white",
            borderBottomLeftRadius: "16px",
            borderBottomRightRadius: "16px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 24px",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#2563eb")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#3b82f6")}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

// Session Data Modal
const SessionDataModal = ({ isOpen, onClose, sessionData }) => {
  if (!isOpen) return null;

  const modalContent = (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999999,
        padding: "20px",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: "16px",
          maxWidth: "900px",
          width: "100%",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          position: "relative",
          zIndex: 1000000,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            background: "white",
            zIndex: 10,
            borderTopLeftRadius: "16px",
            borderTopRightRadius: "16px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: "600",
              color: "#111827",
            }}
          >
            Session Data
          </h2>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            style={{
              background: "#f3f4f6",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6b7280",
              borderRadius: "6px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#f3f4f6")}
          >
            <RxCross2 size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px" }}>
          {sessionData && sessionData.length > 0 ? (
            sessionData.map((data, index) => (
              <div
                key={data.id}
                style={{
                  marginBottom: index < sessionData.length - 1 ? "24px" : 0,
                  background: "#f9fafb",
                  padding: "20px",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                }}
              >
                {/* Target Header with ID */}
                <div
                  style={{
                    marginBottom: "16px",
                    paddingBottom: "16px",
                    borderBottom: "2px solid #e5e7eb",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 8px",
                      fontSize: "18px",
                      fontWeight: "600",
                      color: "#111827",
                    }}
                  >
                    Target {index + 1}
                  </h3>

                  {/* Target ID */}
                  {data.targetId && (
                    <div
                      style={{
                        display: "flex",
                        gap: "16px",
                        flexWrap: "wrap",
                        fontSize: "13px",
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: "600", color: "#6b7280" }}>
                          Target ID:{" "}
                        </span>
                        <span
                          style={{
                            color: "#3b82f6",
                            fontFamily: "monospace",
                            background: "#eff6ff",
                            padding: "2px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          {data.targetId}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {data.data?.notes && (
                  <div style={{ marginBottom: "16px" }}>
                    <p
                      style={{
                        margin: "0 0 8px",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#6b7280",
                      }}
                    >
                      Notes:
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        color: "#374151",
                        background: "white",
                        padding: "12px",
                        borderRadius: "8px",
                      }}
                    >
                      {data.data.notes}
                    </p>
                  </div>
                )}

                {/* Number of Occurrence */}
                {data.data?.numberOfOccurrence !== undefined && (
                  <div style={{ marginBottom: "16px" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        color: "#374151",
                      }}
                    >
                      <strong>Number of Occurrences:</strong>{" "}
                      {data.data.numberOfOccurrence}
                    </p>
                  </div>
                )}

                {/* Duration */}
                {data.data?.duration !== undefined && (
                  <div style={{ marginBottom: "16px" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        color: "#374151",
                      }}
                    >
                      <strong>Duration:</strong> {data.data.duration} seconds
                    </p>
                  </div>
                )}

                {/* Data Collection Type */}
                {data.data?.dataCollectionType && (
                  <div style={{ marginBottom: "16px" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        color: "#374151",
                      }}
                    >
                      <strong>Data Collection Type:</strong>{" "}
                      {data.data.dataCollectionType}
                    </p>
                  </div>
                )}

                {/* Percentage Correct */}
                {data.data?.percentageCorrect !== undefined && (
                  <div style={{ marginBottom: "16px" }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        color: "#374151",
                      }}
                    >
                      <strong>Percentage Correct:</strong>{" "}
                      {data.data.percentageCorrect}%
                    </p>
                  </div>
                )}

                {/* Trials Table */}
                {data.data?.trials && data.data.trials.length > 0 && (
                  <div style={{ marginTop: "16px" }}>
                    <p
                      style={{
                        margin: "0 0 12px",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#6b7280",
                      }}
                    >
                      Trials:
                    </p>
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          background: "white",
                          borderRadius: "8px",
                          overflow: "hidden",
                          fontSize: "13px",
                        }}
                      >
                        <thead>
                          <tr style={{ background: "#f3f4f6" }}>
                            {Object.keys(data.data.trials[0]).map((key) => (
                              <th
                                key={key}
                                style={{
                                  padding: "12px",
                                  textAlign: "left",
                                  fontWeight: "600",
                                  color: "#374151",
                                  textTransform: "capitalize",
                                  borderBottom: "2px solid #e5e7eb",
                                }}
                              >
                                {key.replace(/([A-Z])/g, " $1").trim()}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.data.trials.map((trial, idx) => (
                            <tr
                              key={idx}
                              style={{
                                borderBottom:
                                  idx < data.data.trials.length - 1
                                    ? "1px solid #e5e7eb"
                                    : "none",
                              }}
                            >
                              {Object.values(trial).map((value, vIdx) => (
                                <td
                                  key={vIdx}
                                  style={{
                                    padding: "12px",
                                    color: "#4b5563",
                                  }}
                                >
                                  {typeof value === "object"
                                    ? JSON.stringify(value)
                                    : value}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Steps Table */}
                {data.data?.steps && data.data.steps.length > 0 && (
                  <div style={{ marginTop: "16px" }}>
                    <p
                      style={{
                        margin: "0 0 12px",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#6b7280",
                      }}
                    >
                      Steps:
                    </p>
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          background: "white",
                          borderRadius: "8px",
                          overflow: "hidden",
                          fontSize: "13px",
                        }}
                      >
                        <thead>
                          <tr style={{ background: "#f3f4f6" }}>
                            {Object.keys(data.data.steps[0]).map((key) => (
                              <th
                                key={key}
                                style={{
                                  padding: "12px",
                                  textAlign: "left",
                                  fontWeight: "600",
                                  color: "#374151",
                                  textTransform: "capitalize",
                                  borderBottom: "2px solid #e5e7eb",
                                }}
                              >
                                {key.replace(/([A-Z])/g, " $1").trim()}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.data.steps.map((step, idx) => (
                            <tr
                              key={idx}
                              style={{
                                borderBottom:
                                  idx < data.data.steps.length - 1
                                    ? "1px solid #e5e7eb"
                                    : "none",
                              }}
                            >
                              {Object.values(step).map((value, vIdx) => (
                                <td
                                  key={vIdx}
                                  style={{
                                    padding: "12px",
                                    color: "#4b5563",
                                  }}
                                >
                                  {typeof value === "object"
                                    ? JSON.stringify(value)
                                    : value}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p style={{ textAlign: "center", color: "#6b7280" }}>
              No session data available.
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            position: "sticky",
            bottom: 0,
            background: "white",
            borderBottomLeftRadius: "16px",
            borderBottomRightRadius: "16px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 24px",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#2563eb")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#3b82f6")}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

const SessionFeedbackModal = ({
  isOpen,
  onClose,
  appointment,
  onSave,
}) => {
  const [serviceRating, setServiceRating] = useState(0);
  const [therapistRating, setTherapistRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Signature states
  const [signatureMode, setSignatureMode] = useState("draw");
  const [typedSignature, setTypedSignature] = useState("");
  const [signatureImage, setSignatureImage] = useState(null);
  const sigCanvas = useRef(null);

  // Modal states
  const [showSOAPModal, setShowSOAPModal] = useState(false);
  const [showSessionDataModal, setShowSessionDataModal] = useState(false);

  const { accessToken, refreshToken } = useAuth();

  // Fetch full session details when modal opens
  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (!isOpen || !appointment?.id || !accessToken) return;

      setLoadingSession(true);
      try {
        const response = await api.GetSingleSessionBySessionId({
          sessionId: appointment.id,
          accessToken,
          refreshToken,
        });

        setSessionDetails(response);
      } catch (error) {
        console.error("Failed to fetch session details:", error);
        setSessionDetails(appointment.originalData || appointment);
      } finally {
        setLoadingSession(false);
      }
    };

    fetchSessionDetails();
  }, [isOpen, appointment]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setServiceRating(0);
      setTherapistRating(0);
      setFeedback("");
      setConfirmed(false);
      setSessionDetails(null);
      setSignatureMode("draw");
      setTypedSignature("");
      setSignatureImage(null);
      if (sigCanvas.current) {
        sigCanvas.current.clear();
      }
    }
  }, [isOpen]);

  if (!appointment) return null;

  const data = sessionDetails || appointment.originalData || appointment;

  // Get signature data
  const getSignatureData = () => {
    if (signatureMode === "draw" && sigCanvas.current) {
      return sigCanvas.current.toDataURL();
    } else if (signatureMode === "type") {
      return typedSignature;
    } else if (signatureMode === "image") {
      return signatureImage;
    }
    return null;
  };

  const handleSave = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Confirming the session was delivered is optional — no longer blocks submit.
    const signatureData = getSignatureData();
    if (!signatureData || (signatureMode === "type" && !typedSignature.trim()) ||
        (signatureMode === "draw" && sigCanvas.current?.isEmpty())) {
      showToast("Please provide your signature", "error");
      return;
    }

    setIsLoading(true);
    try {
      await onSave({
        sessionId: appointment.id,
        confirmDelivery: confirmed,
        rateService: serviceRating,
        rateTherapist: therapistRating,
        feedback: feedback,
        signature: signatureData,
      });
    } catch (error) {
      showToast(error.message || "Failed to submit. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle button clicks without triggering form submission
  const handleButtonClick = (e, callback) => {
    e.preventDefault();
    e.stopPropagation();
    callback();
  };

  // Extract session information
  const getSessionInfo = () => {
    if (data.appointment) {
      const apt = data.appointment;
      const client = apt.client || {};
      const session = apt.session || {};
      const clinicians = apt.clinicians || [];

      const clientName =
        `${client.firstName || ""} ${client.lastName || ""}`.trim() ||
        "Unknown";
      const insuranceId = client.insuranceId || "N/A";

      const clinicianName =
        clinicians.length > 0
          ? clinicians.map((c) => c.fullName).join(", ")
          : "Not assigned";
      const npi =
        clinicians.length > 0 && clinicians[0].npi ? clinicians[0].npi : "N/A";

      const sessionDate = data.startTime
        ? format(new Date(data.startTime), "MM/dd/yyyy")
        : "N/A";

      const sessionStartTime = data.startTime
        ? format(new Date(data.startTime), "h:mm a")
        : "N/A";

      const sessionEndTime = data.endTime
        ? format(new Date(data.endTime), "h:mm a")
        : "N/A";

      let duration = "N/A";
      if (data.startTime && data.endTime) {
        const start = new Date(data.startTime);
        const end = new Date(data.endTime);
        const diffMs = end - start;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(
          (diffMs % (1000 * 60 * 60)) / (1000 * 60),
        );
        duration = `${diffHours}h ${diffMinutes}m`;
      }

      return {
        date: sessionDate,
        clientName,
        insuranceId,
        clinicianName,
        npi,
        sessionStartTime,
        sessionEndTime,
        sessionType: session.name || "N/A",
        serviceTypes: "N/A",
        location: apt.serviceLocation || "N/A",
        duration,
      };
    }

    if (data.clientName && data.sessionTypeName) {
      const sessionDate = data.date
        ? format(new Date(data.date), "MM/dd/yyyy")
        : "N/A";

      const sessionStartTime = data.date
        ? format(new Date(data.date), "h:mm a")
        : "N/A";

      let duration = "N/A";
      if (data.totalHours) {
        const hours = Math.floor(data.totalHours);
        const minutes = Math.round((data.totalHours - hours) * 60);

        if (hours > 0 && minutes > 0) {
          duration = `${hours}h ${minutes}m`;
        } else if (hours > 0) {
          duration = `${hours}h`;
        } else {
          duration = `${minutes}m`;
        }
      }

      return {
        date: sessionDate,
        clientName: data.clientName || "Unknown",
        insuranceId: "N/A",
        clinicianName: data.clinician || "Not assigned",
        npi: "N/A",
        sessionStartTime: sessionStartTime,
        sessionEndTime: "N/A",
        sessionType: data.sessionTypeName || "N/A",
        serviceTypes: "N/A",
        location: "N/A",
        duration: duration,
      };
    }

    return {
      date: "N/A",
      clientName: "Unknown",
      insuranceId: "N/A",
      clinicianName: "Not assigned",
      npi: "N/A",
      sessionStartTime: "N/A",
      sessionEndTime: "N/A",
      sessionType: "N/A",
      serviceTypes: "N/A",
      location: "N/A",
      duration: "N/A",
    };
  };

  const sessionInfo = getSessionInfo();

  return (
    <>
      <ReusableModal
        isOpen={isOpen}
        onClose={onClose}
        title="Session Information"
        size="xl"
        primaryButtonText={isLoading ? "Saving..." : "Save and Close"}
        primaryButtonLoading={isLoading}
        onPrimaryButtonClick={handleSave}
        primaryButtonDisabled={isLoading || loadingSession}
        secondaryButtonText="Cancel"
        onSecondaryButtonClick={onClose}
      >
        <div style={{ padding: "0 24px 24px" }}>
          {loadingSession ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "#6b7280",
              }}
            >
              Loading session details...
            </div>
          ) : (
            <>
              {/* Session Info Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "20px",
                  padding: "20px",
                  background: "#f9fafb",
                  borderRadius: "12px",
                  marginBottom: "32px",
                  fontSize: "14px",
                  color: "#4b5563",
                }}
              >
                <div>
                  <div>
                    <strong>Date</strong>: {sessionInfo.date}
                  </div>
                  <div>
                    <strong>Client Name</strong>: {sessionInfo.clientName}
                    {sessionInfo.insuranceId !== "N/A" && (
                      <> (Insurance ID: {sessionInfo.insuranceId})</>
                    )}
                  </div>
                  <div>
                    <strong>Clinician Name(s)</strong>:{" "}
                    {sessionInfo.clinicianName}
                    {sessionInfo.npi !== "N/A" && <> (NPI {sessionInfo.npi})</>}
                  </div>
                  <div>
                    <strong>Session Start Time</strong>:{" "}
                    {sessionInfo.sessionStartTime}
                  </div>
                  <div>
                    <strong>Session End Time</strong>:{" "}
                    {sessionInfo.sessionEndTime}
                  </div>
                </div>
                <div>
                  <div>
                    <strong>Session Type</strong>: {sessionInfo.sessionType}
                  </div>
                  <div>
                    <strong>Service Type(s)</strong>: {sessionInfo.serviceTypes}
                  </div>
                  <div>
                    <strong>Location</strong>: {sessionInfo.location}
                  </div>
                  <div>
                    <strong>Total Session Duration</strong>:{" "}
                    {sessionInfo.duration}
                  </div>
                </div>
              </div>

              {/* Documents & Data */}
              <div style={{ marginBottom: "32px" }}>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    margin: "0 0 16px",
                  }}
                >
                  Documents & Data
                </h3>
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    flexWrap: "wrap",
                    marginBottom: "24px",
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) =>
                      handleButtonClick(e, () => setShowSOAPModal(true))
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 16px",
                      background: "#eff6ff",
                      color: "#2563eb",
                      border: "1px solid #93c5fd",
                      borderRadius: "8px",
                      fontSize: "14px",
                      cursor: "pointer",
                      fontWeight: "500",
                    }}
                  >
                    SOAP Notes
                  </button>
                  <button
                    type="button"
                    onClick={(e) =>
                      handleButtonClick(e, () => setShowSessionDataModal(true))
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 16px",
                      background: "#eff6ff",
                      color: "#2563eb",
                      border: "1px solid #93c5fd",
                      borderRadius: "8px",
                      fontSize: "14px",
                      cursor: "pointer",
                      fontWeight: "500",
                    }}
                  >
                    Session Data
                  </button>
                </div>

                {/* Confirmation Checkbox */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    marginBottom: "32px",
                    fontSize: "15px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    style={{ marginTop: "2px" }}
                  />
                  <span style={{ color: "#374151", lineHeight: "1.5" }}>
                    I confirm that the session was delivered as described, and
                    the data collected accurately reflects the service provided.
                  </span>
                </label>
              </div>

              {/* General Feedback */}
              <div style={{ marginBottom: "32px" }}>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    margin: "0 0 16px",
                  }}
                >
                  General Feedback
                </h3>

                <StarRating
                  label="Please rate the service you received"
                  rating={serviceRating}
                  onChange={setServiceRating}
                />

                <StarRating
                  label="Please rate the therapist(s) who rendered the service"
                  rating={therapistRating}
                  onChange={setTherapistRating}
                />

                <div style={{ marginTop: "24px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "15px",
                      color: "#374151",
                    }}
                  >
                    Any other feedback (optional)
                  </label>
                  <TextareaInput
                    placeholder="Enter a description..."
                    rows={4}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </div>
              </div>

              {/* Signature Section */}
              <div
                style={{
                  padding: "24px",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  border: "2px solid #e5e7eb",
                }}
              >
                <p
                  style={{
                    margin: "0 0 24px",
                    fontWeight: "600",
                    color: "#1e293b",
                    textAlign: "center",
                  }}
                >
                  Append your signature to complete
                </p>

                {/* Signature Mode Tabs */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "12px",
                    marginBottom: "24px",
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) =>
                      handleButtonClick(e, () => setSignatureMode("type"))
                    }
                    style={{
                      padding: "10px 20px",
                      background:
                        signatureMode === "type" ? "#dbeafe" : "#f1f5f9",
                      color: signatureMode === "type" ? "#3b82f6" : "#64748b",
                      borderRadius: "8px",
                      border:
                        signatureMode === "type"
                          ? "2px solid #3b82f6"
                          : "1px solid #e2e8f0",
                      fontWeight: signatureMode === "type" ? "600" : "500",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Type
                  </button>
                  <button
                    type="button"
                    onClick={(e) =>
                      handleButtonClick(e, () => setSignatureMode("draw"))
                    }
                    style={{
                      padding: "10px 20px",
                      background:
                        signatureMode === "draw" ? "#dbeafe" : "#f1f5f9",
                      color: signatureMode === "draw" ? "#3b82f6" : "#64748b",
                      borderRadius: "8px",
                      border:
                        signatureMode === "draw"
                          ? "2px solid #3b82f6"
                          : "1px solid #e2e8f0",
                      fontWeight: signatureMode === "draw" ? "600" : "500",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Draw
                  </button>
                  <button
                    type="button"
                    onClick={(e) =>
                      handleButtonClick(e, () => setSignatureMode("image"))
                    }
                    style={{
                      padding: "10px 20px",
                      background:
                        signatureMode === "image" ? "#dbeafe" : "#f1f5f9",
                      color: signatureMode === "image" ? "#3b82f6" : "#64748b",
                      borderRadius: "8px",
                      border:
                        signatureMode === "image"
                          ? "2px solid #3b82f6"
                          : "1px solid #e2e8f0",
                      fontWeight: signatureMode === "image" ? "600" : "500",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Image
                  </button>
                </div>

                {/* Signature Input Area */}
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "12px",
                    border: "2px dashed #cbd5e1",
                    minHeight: "200px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  {signatureMode === "draw" && (
                    <div style={{ width: "100%", height: "200px" }}>
                      <SignatureCanvas
                        ref={sigCanvas}
                        canvasProps={{
                          style: {
                            width: "100%",
                            height: "200px",
                            borderRadius: "12px",
                          },
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) =>
                          handleButtonClick(e, () => sigCanvas.current?.clear())
                        }
                        style={{
                          position: "absolute",
                          bottom: "12px",
                          right: "12px",
                          padding: "8px 16px",
                          background: "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: "500",
                          cursor: "pointer",
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  {signatureMode === "type" && (
                    <input
                      type="text"
                      placeholder="Type your full name"
                      value={typedSignature}
                      onChange={(e) => setTypedSignature(e.target.value)}
                      style={{
                        width: "90%",
                        padding: "12px",
                        fontSize: "24px",
                        fontFamily: "Brush Script MT, cursive",
                        border: "none",
                        outline: "none",
                        textAlign: "center",
                        background: "transparent",
                      }}
                    />
                  )}

                  {signatureMode === "image" && (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px",
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        id="signature-upload"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setSignatureImage(event.target.result);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      {signatureImage ? (
                        <div style={{ position: "relative" }}>
                          <img
                            src={signatureImage}
                            alt="Signature"
                            style={{
                              maxWidth: "100%",
                              maxHeight: "160px",
                              borderRadius: "8px",
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) =>
                              handleButtonClick(e, () =>
                                setSignatureImage(null),
                              )
                            }
                            style={{
                              position: "absolute",
                              top: "8px",
                              right: "8px",
                              padding: "6px 12px",
                              background: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label
                          htmlFor="signature-upload"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "12px",
                            cursor: "pointer",
                          }}
                        >
                          <FiUpload size={32} color="#94a3b8" />
                          <p
                            style={{
                              margin: 0,
                              color: "#94a3b8",
                              fontSize: "14px",
                            }}
                          >
                            Click to upload signature image
                          </p>
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </ReusableModal>

      {/* SOAP Notes Modal */}
      <SOAPNotesModal
        isOpen={showSOAPModal}
        onClose={() => setShowSOAPModal(false)}
        note={sessionDetails?.note}
      />

      {/* Session Data Modal */}
      <SessionDataModal
        isOpen={showSessionDataModal}
        onClose={() => setShowSessionDataModal(false)}
        sessionData={sessionDetails?.sessionDatas}
      />
    </>
  );
};

export default SessionFeedbackModal;

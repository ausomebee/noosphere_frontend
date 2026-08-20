import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";
import api from "../../../api/helpAndSupportApi";
import { showToast } from "../../../Helper/ShowToast";
import { FiArrowLeft, FiFileText, FiExternalLink } from "react-icons/fi";
import { LuPrinter } from "react-icons/lu";
import { RiFileUploadLine } from "react-icons/ri";
import { formatDateTime } from "../../../Helper/Formatters";
import useFormatSettings from "../../../hooks/useFormatSettings";
import { toProgressEntry } from "./progressTrack";
import useDocumentViewer from "../../../hooks/useDocumentViewer";
import usePermissions from "../../../hooks/usePermissions";
import "./ViewRequestDetails.css";
import "./SupportRequests.css";

const ViewRequestDetails = () => {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const { userId, accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();
  const [withdrawing, setWithdrawing] = useState(false);
  const { dateFormat, timeFormat } = useFormatSettings();
  const { openDocument } = useDocumentViewer();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  const fetchTicket = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    try {
      const response = await api.GetSingleTicketById({
        ticketId: requestId,
        accessToken,
        refreshToken,
      });
      setRequest(response?.data || null);
    } catch (error) {
      console.error("Failed to fetch ticket:", error);
    } finally {
      setLoading(false);
    }
  }, [requestId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      await api.ChangeSupportRequestStatus({
        id: requestId,
        status: "Withdrawn",
        updatedBy: userId,
        accessToken,
        refreshToken,
      });
      showToast("Support request withdrawn", "success");
      navigate("/help/support-requests");
    } catch (error) {
      console.error("Failed to withdraw request:", error);
      showToast(error.message || "Failed to withdraw request", "error");
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="view-request-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        </div>
      </>
    );
  }

  if (!request) {
    return (
      <>
        <div className="view-request-container">
          <p style={{ textAlign: "center", color: "#666", padding: "40px 0" }}>
            Request not found.
          </p>
        </div>
      </>
    );
  }

  const attachments = request.attachments || [];
  const logs = request.Logs || [];

  return (
    <>
      <div className="view-request-container">
        {/* Top Bar */}
        <div className="view-request-topbar">
          <div className="view-request-topbar-left">
            <button
              className="view-request-back cursor-pointer"
              onClick={() => navigate("/help/support-requests")}
            >
              <FiArrowLeft size={16} aria-hidden="true" />
              Back
            </button>
            <h2>View issue details</h2>
          </div>
          {hasPermission("withdraw_support_request") && (
            <button
              className="withdraw-btn cursor-pointer"
              onClick={handleWithdraw}
              disabled={withdrawing}
            >
              {withdrawing ? (
                <svg
                  className="spinner animate-spin"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                "Withdraw Request"
              )}
            </button>
          )}
        </div>

        {/* Issue Information */}
        <p className="view-request-section-title">Issue Information</p>
        <table className="view-request-info-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="field-label">Category</td>
              <td className="field-value">{request.category || "N/A"}</td>
            </tr>
            <tr>
              <td className="field-label">Title</td>
              <td className="field-value">{request.title || "N/A"}</td>
            </tr>
            <tr>
              <td className="field-label">Status</td>
              <td className="field-value">{request.status || "N/A"}</td>
            </tr>
            <tr>
              <td className="field-label">Logged by</td>
              <td className="field-value">
                {[request.loggedBy?.firstName, request.loggedBy?.lastName]
                  .filter(Boolean)
                  .join(" ") ||
                  request.loggedBy?.fullName ||
                  "N/A"}
              </td>
            </tr>
            <tr>
              <td className="field-label">Date Reported</td>
              <td className="field-value">{formatDateTime(request.createdAt, dateFormat, timeFormat)}</td>
            </tr>
            <tr>
              <td className="field-label">Last Update</td>
              <td className="field-value">{formatDateTime(request.updatedAt, dateFormat, timeFormat)}</td>
            </tr>
            <tr>
              <td className="field-label">Attachments</td>
              <td className="field-value">
                {attachments.length > 0 ? (
                  attachments.map((att, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => openDocument(att.location, att.key?.split("-").slice(1).join("-") || `Attachment ${idx + 1}`)}
                      className="attachment-link cursor-pointer"
                    >
                      {att.key?.split("-").slice(1).join("-") ||
                        `Attachment ${idx + 1}`}
                    </button>
                  ))
                ) : (
                  <span>None</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Description */}
        <div className="view-request-description-header">
          <h3>Description</h3>
          <div className="view-request-description-actions">
            <button aria-label="Export description" className="cursor-pointer">
              <RiFileUploadLine size={18} aria-hidden="true" />
            </button>
            <button aria-label="Print description" className="cursor-pointer">
              <LuPrinter size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
        <table className="view-request-info-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="field-label">Description</td>
              <td className="field-value">{request.description || "N/A"}</td>
            </tr>
          </tbody>
        </table>

        {/* Documents (attachments rendered as document list) */}
        <div className="view-request-documents-header">
          <h3>Documents</h3>
          <div className="view-request-description-actions">
            <button aria-label="Export documents" className="cursor-pointer">
              <RiFileUploadLine size={18} aria-hidden="true" />
            </button>
            <button aria-label="Print documents" className="cursor-pointer">
              <LuPrinter size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
        {attachments.length > 0 ? (
          attachments.map((doc, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => openDocument(doc.location, doc.key?.split("-").slice(1).join("-") || `Document ${idx + 1}`)}
              className="document-item"
              style={{ textDecoration: "none", border: "none", background: "none", cursor: "pointer" }}
            >
              <FiFileText size={20} aria-hidden="true" />
              <span>
                {doc.key?.split("-").slice(1).join("-") ||
                  `Document ${idx + 1}`}
              </span>
            </button>
          ))
        ) : (
          <p style={{ color: "#666", fontSize: "14px" }}>
            No documents attached.
          </p>
        )}

        {/* Track Progress */}
        <button
          className="track-progress-link cursor-pointer"
          onClick={() => setIsProgressModalOpen(true)}
        >
          Track Progress <FiExternalLink size={14} aria-hidden="true" />
        </button>

        {/* Progress Track Modal */}
        <ReusableModal
          isOpen={isProgressModalOpen}
          onClose={() => setIsProgressModalOpen(false)}
          title="Progress Track"
          secondaryButtonText="Close"
          onSecondaryButtonClick={() => setIsProgressModalOpen(false)}
          size="md"
        >
          <div className="progress-track-list">
            {logs.length > 0 ? (
              logs.map((item, idx) => (
                <div key={item.logId || idx} className="progress-track-item">
                {(() => {
                  const entry = toProgressEntry(item, dateFormat, timeFormat);
                  return (
                    <>
                      <div className="track-headline">
                        {entry.person && (
                          <span className="track-person">{entry.person}</span>
                        )}
                        {entry.person ? " " : ""}
                        {entry.action}
                        {entry.failed && (
                          <span className="track-status failed"> Failed</span>
                        )}
                      </div>
                      {entry.reason && (
                        <div className="track-reason">{entry.reason}</div>
                      )}
                      {entry.when && (
                        <div className="track-date">{entry.when}</div>
                      )}
                    </>
                  );
                })()}
                </div>
              ))
            ) : (
              <p style={{ textAlign: "center", color: "#666" }}>
                No progress tracked yet.
              </p>
            )}
          </div>
        </ReusableModal>
      </div>
    </>
  );
};

export default ViewRequestDetails;

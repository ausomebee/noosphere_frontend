import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import DashboardLayout from "../../../Layout/TenantLayout";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";
import api from "../../../api/helpAndSupportApi";
import { showToast } from "../../../Helper/ShowToast";
import { FiArrowLeft, FiFileText, FiExternalLink } from "react-icons/fi";
import { LuPrinter } from "react-icons/lu";
import { RiFileUploadLine } from "react-icons/ri";
import { format } from "date-fns";
import "./ViewRequestDetails.css";
import "./SupportRequests.css";

const ViewRequestDetails = () => {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const accessToken = useSelector((s) => s.authentication?.user?.accessToken);
  const refreshToken = useSelector((s) => s.authentication?.user?.refreshToken);

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return format(new Date(dateStr), "MMM dd, yyyy | hh:mm:ss a");
    } catch {
      return "N/A";
    }
  };

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
      showToast("Failed to load request details", "error");
    } finally {
      setLoading(false);
    }
  }, [requestId, accessToken, refreshToken]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleWithdraw = () => {
    navigate("/help/support-requests");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="view-request-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!request) {
    return (
      <DashboardLayout>
        <div className="view-request-container">
          <p style={{ textAlign: "center", color: "#666", padding: "40px 0" }}>
            Request not found.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const attachments = request.attachments || [];
  const logs = request.Logs || [];

  return (
    <DashboardLayout>
      <div className="view-request-container">
        {/* Top Bar */}
        <div className="view-request-topbar">
          <div className="view-request-topbar-left">
            <button
              className="view-request-back"
              onClick={() => navigate("/help/support-requests")}
            >
              <FiArrowLeft size={16} />
              Back
            </button>
            <h2>View issue details</h2>
          </div>
          <button className="withdraw-btn" onClick={handleWithdraw}>
            Withdraw Request
          </button>
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
                {request.loggedBy?.fullName || "N/A"}
              </td>
            </tr>
            <tr>
              <td className="field-label">Date Reported</td>
              <td className="field-value">{formatDate(request.createdAt)}</td>
            </tr>
            <tr>
              <td className="field-label">Last Update</td>
              <td className="field-value">{formatDate(request.updatedAt)}</td>
            </tr>
            <tr>
              <td className="field-label">Attachments</td>
              <td className="field-value">
                {attachments.length > 0 ? (
                  attachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={att.location}
                      className="attachment-link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {att.key?.split("-").slice(1).join("-") ||
                        `Attachment ${idx + 1}`}
                    </a>
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
            <button title="Export">
              <RiFileUploadLine size={18} />
            </button>
            <button title="Print">
              <LuPrinter size={18} />
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
            <button title="Export">
              <RiFileUploadLine size={18} />
            </button>
            <button title="Print">
              <LuPrinter size={18} />
            </button>
          </div>
        </div>
        {attachments.length > 0 ? (
          attachments.map((doc, idx) => (
            <a
              key={idx}
              href={doc.location}
              target="_blank"
              rel="noopener noreferrer"
              className="document-item"
              style={{ textDecoration: "none" }}
            >
              <FiFileText size={20} />
              <span>
                {doc.key?.split("-").slice(1).join("-") ||
                  `Document ${idx + 1}`}
              </span>
            </a>
          ))
        ) : (
          <p style={{ color: "#666", fontSize: "14px" }}>
            No documents attached.
          </p>
        )}

        {/* Track Progress */}
        <button
          className="track-progress-link"
          onClick={() => setIsProgressModalOpen(true)}
        >
          Track Progress <FiExternalLink size={14} />
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
                <div key={idx} className="progress-track-item">
                  {item.message || item.action}
                  {item.person && (
                    <>
                      {" "}
                      <span className="track-person">{item.person}</span>
                    </>
                  )}
                  {item.status && (
                    <>
                      {" "}
                      <span
                        className={`track-status ${item.status.toLowerCase()}`}
                      >
                        {item.status}
                      </span>
                    </>
                  )}{" "}
                  on{" "}
                  <span className="track-date">
                    {item.createdAt
                      ? format(new Date(item.createdAt), "MM/dd/yy")
                      : "N/A"}
                  </span>
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
    </DashboardLayout>
  );
};

export default ViewRequestDetails;

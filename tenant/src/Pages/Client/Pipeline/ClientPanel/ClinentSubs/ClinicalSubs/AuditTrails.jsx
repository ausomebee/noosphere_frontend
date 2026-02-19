import React, { useEffect, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import useAuth from "../../../../../../hooks/useAuth";
import "./AuditTrails.css";
import "../../../../../../Components/ManageColumn/ManageColumn.css";
import api from "../../../../../../api/TemplateAndReportApi";

const AuditTrails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { reportId } = location.state || {};
  
  const { accessToken, refreshToken } = useAuth();


  const [auditTrails, setAuditTrails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAuditTrails = async () => {
      if (!reportId) {
        setError("No report ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await api.GetClinicalReportAuditTrails({
          reportId,
          accessToken,
          refreshToken,
        });
        setAuditTrails(data.data || []);
        setError(null);
      } catch (err) {
        console.error("Error fetching audit trails:", err);
        setError(err.message || "Failed to load audit trails");
      } finally {
        setLoading(false);
      }
    };

    fetchAuditTrails();
  }, [reportId, accessToken, refreshToken]);

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    });
  };

  const renderAuditEntry = (entry) => {
    const action = entry.action || entry.type || "";
    const actionLower = action.toLowerCase();

    switch (actionLower) {
      case "created":
      case "creation":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              Initial assessment report for client{" "}
              <span className="text-blue-600 font-bold">
                {entry.clientName || entry.for || "N/A"}
              </span>{" "}
              created on{" "}
              <span className="text-blue-600 font-bold">
                {entry.date || "N/A"}
              </span>{" "}
              by{" "}
              <span className="text-blue-600 font-bold">
                {entry.by || "Unknown"}
              </span>
            </span>
          </div>
        );

      case "submitted":
      case "submission":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              Document submitted for approval on{" "}
              <span className="text-blue-600 font-bold">
                {entry.date || "N/A"}
              </span>{" "}
              by{" "}
              <span className="text-blue-600 font-bold">
                {entry.by || "Unknown"}
              </span>
            </span>
          </div>
        );

      case "approved":
      case "approval":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              Document approved by{" "}
              <span className="text-blue-600 font-bold">
                {entry.by || "Unknown"}
              </span>{" "}
              on{" "}
              <span className="text-blue-600 font-bold">
                {entry.date || "N/A"}
              </span>
            </span>
          </div>
        );

      case "sent":
      case "sent_to_client":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              Document sent to client on{" "}
              <span className="text-blue-600 font-bold">
                {entry.date || "N/A"}
              </span>
            </span>
          </div>
        );

      case "requested":
      case "change_requested":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              Client requested changes on{" "}
              <span className="text-blue-600 font-bold">
                {entry.date || "N/A"}
              </span>
            </span>
          </div>
        );

      case "edited":
      case "updated":
      case "update":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              Document edited by{" "}
              <span className="text-blue-600 font-bold">
                {entry.by || "Unknown"}
              </span>{" "}
              on{" "}
              <span className="text-blue-600 font-bold">
                {entry.date || "N/A"}
              </span>
            </span>
          </div>
        );

      case "signed":
      case "signature":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              Document{" "}
              <span className="text-green-600 font-bold">signed</span> by{" "}
              <span className="text-blue-600 font-bold">
                {entry.by || "Unknown"}
              </span>{" "}
              on{" "}
              <span className="text-blue-600 font-bold">
                {entry.date || "N/A"}
              </span>
            </span>
          </div>
        );

      case "rejected":
      case "rejection":
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              Document rejected by{" "}
              <span className="text-blue-600 font-bold">
                {entry.by || "Unknown"}
              </span>{" "}
              on{" "}
              <span className="text-blue-600 font-bold">
                {entry.date || "N/A"}
              </span>
            </span>
          </div>
        );

      default:
        return (
          <div className="approval-entry">
            <span className="text-gray-700">
              {entry.action || entry.description || "Action"} by{" "}
              <span className="text-blue-600 font-bold">
                {entry.by || "Unknown"}
              </span>{" "}
              on{" "}
              <span className="text-blue-600 font-bold">
                {entry.date || "N/A"}
              </span>
            </span>
          </div>
        );
    }
  };

  return (
    <>
      <div className="audit-trails-container">
        <div className="manage-column-header">
          <button className="manage-back-button" onClick={() => navigate(-1)}>
            <FaArrowLeft />
            Back
          </button>
          <h1>Audit trail</h1>
          <button
            className="manage-back-button"
            style={{ opacity: 0, pointerEvents: "none" }}
          >
            <FaArrowLeft />
            Back
          </button>
        </div>

        <div className="audit-trail-content">
          {loading && (
            <div className="approval-item p-6" style={{ textAlign: "center" }}>
              <p style={{ color: "#6b7280" }}>Loading audit trails...</p>
            </div>
          )}

          {error && (
            <div className="approval-item p-6" style={{ textAlign: "center" }}>
              <p style={{ color: "#ef4444" }}>Error: {error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-4">
              {auditTrails && auditTrails.length > 0 ? (
                auditTrails.map((entry, index) => (
                  <div key={entry.id || index} className="audit-trail-item">
                    <div className="audit-timeline">
                      <div className="audit-dot"></div>
                      {index < auditTrails.length - 1 && (
                        <div className="audit-line"></div>
                      )}
                    </div>
                    <div className="audit-details">
                      <div className="approval-item p-6">
                        {renderAuditEntry({
                          ...entry,
                          date: formatDateTime(entry.createdAt || entry.date || entry.timestamp),
                          by: entry?.user?.fullName || entry?.performedBy || entry?.userName || entry.by || "Unknown",
                          action: entry.action || entry.type || entry.activity || "Updated",
                        })}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="approval-item p-6" style={{ textAlign: "center" }}>
                  <p style={{ color: "#6b7280" }}>
                    No audit trail data available for this report.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AuditTrails;
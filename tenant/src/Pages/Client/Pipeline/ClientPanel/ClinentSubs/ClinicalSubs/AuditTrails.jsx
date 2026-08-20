import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import useAuth from "../../../../../../hooks/useAuth";
import { formatDateTime } from "../../../../../../Helper/Formatters";
import useFormatSettings from "../../../../../../hooks/useFormatSettings";
import "./AuditTrails.css";
import "../../../../../../Components/ManageColumn/ManageColumn.css";
import api from "../../../../../../api/TemplateAndReportApi";
import ErrorFallback from "../../../../../../Components/ErrorFallback";
import SectionLoader from "../../../../../../Components/SectionLoader";
import Pagination from "../../../../../../Components/Table/Pagination";
import usePagedList from "../../../../../../hooks/usePagedList";

const AuditTrails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // The history endpoint returns only the report's own events — no client and
  // no title — so both are carried in from the page that opened this view.
  const {
    reportId,
    clientName: clientNameFromState,
    documentTitle: documentTitleFromState,
  } = location.state || {};
  
  const { accessToken, refreshToken } = useAuth();
  const { dateFormat, timeFormat } = useFormatSettings();


  const [auditTrails, setAuditTrails] = useState([]);
  const trailPage = usePagedList(auditTrails, 10);
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

  const formatAuditDate = (dateString) => {
    if (!dateString) return "N/A";
    return formatDateTime(dateString, dateFormat, timeFormat);
  };

  // Each entry reads as a line of prose — the same treatment the timesheet
  // history uses — with the names, dates and title picked out and the verb
  // carrying the status colour.
  const renderAuditEntry = (entry) => {
    const action = String(entry.action || entry.type || "").trim().toUpperCase();
    const subject = (
      <span className="approval-subject">
        {entry.documentTitle || "Clinical report"}
      </span>
    );
    const who = <span className="approval-subject">{entry.by || "Unknown"}</span>;
    const when = <span className="approval-subject">{entry.date || "N/A"}</span>;
    const client = (
      <span className="approval-subject">
        {entry.clientName || entry.for || "N/A"}
      </span>
    );

    switch (action) {
      case "CREATED":
      case "CREATION":
        return (
          <span className="approval-entry">
            {subject} for {client} created on {when} by {who}
          </span>
        );

      case "DRAFT":
        return (
          <span className="approval-entry">
            {subject} saved as a draft by {who} on {when}
          </span>
        );

      case "EDITED":
      case "UPDATED":
      case "UPDATE":
        return (
          <span className="approval-entry">
            {subject} edited by {who} on {when}
          </span>
        );

      case "SUBMITTED":
      case "SUBMISSION":
        return (
          <span className="approval-entry">
            {subject} submitted for approval by {who} on {when}
          </span>
        );

      case "APPROVED":
      case "APPROVAL":
        return (
          <span className="approval-entry">
            {subject}{" "}
            <span className="approval-action is-approved">approved</span> by{" "}
            {who} on {when}
          </span>
        );

      case "REJECTED":
      case "REJECTION":
        return (
          <span className="approval-entry">
            {subject}{" "}
            <span className="approval-action is-rejected">rejected</span> by{" "}
            {who} on {when}
          </span>
        );

      case "SENT":
      case "SENT_TO_CLIENT":
        return (
          <span className="approval-entry">
            {subject} sent to {client} on {when}
          </span>
        );

      case "REQUESTED":
      case "CHANGE_REQUESTED":
        return (
          <span className="approval-entry">
            <span className="approval-action is-rejected">Changes requested</span>{" "}
            on {subject} by {who} on {when}
          </span>
        );

      case "SIGNED":
      case "SIGNATURE":
        return (
          <span className="approval-entry">
            {subject} <span className="approval-action is-approved">signed</span>{" "}
            by {who} on {when}
          </span>
        );

      default:
        return (
          <span className="approval-entry">
            {subject}{" "}
            {action ? action.toLowerCase().replace(/_/g, " ") : "updated"} by{" "}
            {who} on {when}
          </span>
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
            <SectionLoader />
          )}

          {error && (
            <ErrorFallback message="Something went wrong loading audit trails. Please try again." onRetry={() => window.location.reload()} />
          )}

          {!loading && !error && (
            <div className="audit-trail-list">
              {trailPage.total > 0 ? (
                trailPage.pageItems.map((entry, index) => (
                  <div key={entry.id || index} className="approval-line">
                    {renderAuditEntry({
                      ...entry,
                      date: formatAuditDate(
                        entry.createdAt || entry.date || entry.timestamp
                      ),
                      // The API returns the actor under `staff` — none of
                      // the previously checked paths exist on the payload,
                      // so every entry read "by Unknown".
                      by:
                        entry?.staff?.fullName ||
                        entry?.user?.fullName ||
                        entry?.performedBy ||
                        entry?.userName ||
                        entry.by ||
                        "Unknown",
                      clientName: clientNameFromState,
                      documentTitle: documentTitleFromState,
                      action:
                        entry.action || entry.type || entry.activity || "Updated",
                    })}
                  </div>
                ))
              ) : (
                <div className="audit-trail-empty">
                  <p>No audit trail data available for this report.</p>
                </div>
              )}
              {trailPage.showPagination && (
                <Pagination
                  currentPage={trailPage.page}
                  totalPages={trailPage.totalPages}
                  onPageChange={trailPage.setPage}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AuditTrails;
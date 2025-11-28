import React, { useRef, useState } from "react";
import "./TenantList.css";
import { FaArrowLeft } from "react-icons/fa";
import {
  exportTableData,
  printTableData,
  exportTableToPDF,
} from "../../../utils/TableUtils";

const TenantListViewIssues = ({
  title = "Tenants",
  breadcrumb = "Tenants/ACME Corp/Billing & Payments/Payment Info",
  issue = {
    tenant: "ACME Corp",
    issueId: "#12345",
    title: "Billing Error in Invoice",
    category: "Billing Issue",
    priority: "Critical",
    status: "In Progress",
    loggedBy: "John Doe",
    assignedTo: "Jane Smith",
    dateReported: "Nov 12, 2023 | 01:04:06 AM",
    lastUpdate: "Nov 25, 2023 | 03:09:56 PM",
    attachments: [
      { name: "Attachment A", url: "#" },
      { name: "Attachment B", url: "#" },
    ],
    resolutionDeadline: "Apr 25, 2024",
    description:
      "Invoice #4567 generated incorrectly due to missing authorization. Needs immediate correction.",
    activityHistory: [
      {
        date: "Nov 25, 2023",
        time: "10:45 AM",
        action: "Issue Created",
        user: "Support Staff (Michael Scoffield)",
        details: "Initial Report Submitted",
      },
      {
        date: "Nov 25, 2023",
        time: "02:45 PM",
        action: "Issue Assigned",
        user: "Support Staff (Michael Scoffield)",
        details: "Assigned to Billing Staff (Jane Smith)",
      },
      {
        date: "Nov 25, 2023",
        time: "10:45 AM",
        action: "Status Updated",
        user: "Jane Smith",
        details: 'Status changed to "In Progress"',
      },
      {
        date: "Nov 25, 2023",
        time: "10:45 AM",
        action: "Comment Added",
        user: "John Doe",
        details: '"Awaiting additional info from John"',
      },
    ],
    documents: [
      { id: 1, name: "Document 1", url: "#" },
      { id: 2, name: "Document 2", url: "#" },
      { id: 3, name: "Document 3", url: "#" },
    ],
    comments: [
      {
        date: "Nov 25, 2023",
        time: "02:45 pm",
        user: "Support Staff (Michael Scoffield)",
        action: "commented",
        text: "Invoice #4567 generated incorrectly due to missing authorization. Needs immediate correction",
      },
      {
        date: "Nov 25, 2023",
        time: "03:00 pm",
        user: "Billing Staff (Jane Mitchell)",
        action: "replied",
        text: "The man does not know how to upload documents.",
      },
      {
        date: "Nov 25, 2023",
        time: "02:45 pm",
        user: "Support Staff (Michael Scoffield)",
        action: "commented",
        text: "Why is he now calling our lines ceaselessly",
      },
    ],
  },
  onExportCSV = exportTableData,
  onExportPDF = exportTableToPDF,
  onPrint = printTableData,
  onBack,
}) => {
  // State and refs for each section's export dropdown
  const [exportDropdownOpen, setExportDropdownOpen] = useState({
    issueInfo: false,
    description: false,
    activityHistory: false,
    documents: false,
    comments: false,
  });

  const exportButtonRefs = {
    issueInfo: useRef(null),
    description: useRef(null),
    activityHistory: useRef(null),
    documents: useRef(null),
    comments: useRef(null),
  };

  const exportDropdownRefs = {
    issueInfo: useRef(null),
    description: useRef(null),
    activityHistory: useRef(null),
    documents: useRef(null),
    comments: useRef(null),
  };

  // Toggle export dropdown for a specific section
  const toggleExportDropdown = (section) => {
    setExportDropdownOpen((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Extract table data for Issue Information section as a 2D array (only values, no headers)
  const issueInfoTableData = [
    [issue.tenant],
    [issue.issueId],
    [issue.title],
    [issue.category],
    [issue.priority], // Remove HTML markup
    [issue.status],
    [issue.loggedBy],
    [issue.assignedTo],
    [issue.dateReported],
    [issue.lastUpdate],
    [issue.attachments.map((att) => att.name).join(", ")],
    [issue.resolutionDeadline],
  ];

  // Extract table data for Description section as a 2D array (only values, no headers)
  const descriptionTableData = [
    [issue.description],
  ];

  // Extract table data for Activity History section as a 2D array (no headers)
  const activityHistoryTableData = issue.activityHistory.map((activity) => [
    `${activity.date}, ${activity.time}`,
    activity.action,
    activity.user,
    activity.details,
  ]);

  // Extract data for Documents section as a 2D array (no headers)
  const documentsTableData = issue.documents.map((doc) => [doc.name]);

  // Extract data for Comments section as a 2D array (no headers)
  const commentsTableData = issue.comments.map((comment) => [
    `${comment.date}, ${comment.time}`,
    comment.user,
    comment.action,
    comment.text,
  ]);

  // Handlers for Issue Information section
  const handleExportCSVIssueInfo = () => {
    onExportCSV(issueInfoTableData);
    toggleExportDropdown("issueInfo");
  };

  const handleExportPDFIssueInfo = () => {
    onExportPDF(issueInfoTableData);
    toggleExportDropdown("issueInfo");
  };

  const handlePrintIssueInfo = () => {
    onPrint(issueInfoTableData);
  };

  // Handlers for Description section
  const handleExportCSVDescription = () => {
    onExportCSV(descriptionTableData);
    toggleExportDropdown("description");
  };

  const handleExportPDFDescription = () => {
    onExportPDF(descriptionTableData);
    toggleExportDropdown("description");
  };

  const handlePrintDescription = () => {
    onPrint(descriptionTableData);
  };

  // Handlers for Activity History section
  const handleExportCSVActivityHistory = () => {
    onExportCSV(activityHistoryTableData);
    toggleExportDropdown("activityHistory");
  };

  const handleExportPDFActivityHistory = () => {
    onExportPDF(activityHistoryTableData);
    toggleExportDropdown("activityHistory");
  };

  const handlePrintActivityHistory = () => {
    onPrint(activityHistoryTableData);
  };

  // Handlers for Documents section
  const handleExportCSVDocuments = () => {
    onExportCSV(documentsTableData);
    toggleExportDropdown("documents");
  };

  const handleExportPDFDocuments = () => {
    onExportPDF(documentsTableData);
    toggleExportDropdown("documents");
  };

  const handlePrintDocuments = () => {
    onPrint(documentsTableData);
  };

  // Handlers for Comments section
  const handleExportCSVComments = () => {
    onExportCSV(commentsTableData);
    toggleExportDropdown("comments");
  };

  const handleExportPDFComments = () => {
    onExportPDF(commentsTableData);
    toggleExportDropdown("comments");
  };

  const handlePrintComments = () => {
    onPrint(commentsTableData);
  };

  return (
    <div className="tli-tenant-issue-page">
      {/* Header */}
      <div className="tenant-header">
        <button className="back-button" onClick={onBack}>
          <FaArrowLeft /> Back
        </button>
        <div className="header-info">
          <h1>{title}</h1>
          <p className="breadcrumb">
            {breadcrumb.split(" / ").slice(0, -1).join(" / ")}
            {breadcrumb.includes(" / ") && " / "}
            <span className="breadcrumb-active">
              {breadcrumb.split(" / ").slice(-1)}
            </span>
          </p>
        </div>
      </div>

      {/* Payment Info */}
      <div className="payment-info">
        <div className="header-actions">
          <h2>Issue Information</h2>
          <div className="table-actions">
            <div className="action-menu">
              <button
                onClick={() => toggleExportDropdown("issueInfo")}
                className="action-button"
                ref={exportButtonRefs.issueInfo}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              {exportDropdownOpen.issueInfo && (
                <div
                  className="action-dropdown export-dropdown"
                  ref={exportDropdownRefs.issueInfo}
                >
                  <button
                    className="dropdown-item"
                    onClick={handleExportCSVIssueInfo}
                  >
                    Export as CSV
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={handleExportPDFIssueInfo}
                  >
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
            <button onClick={handlePrintIssueInfo} className="action-button">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
            </button>
          </div>
        </div>
        <div className="issue-details">
          <table className="details-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Tenant</td>
                <td>{issue.tenant}</td>
              </tr>
              <tr>
                <td>Issue ID</td>
                <td>{issue.issueId}</td>
              </tr>
              <tr>
                <td>Title</td>
                <td>{issue.title}</td>
              </tr>
              <tr>
                <td>Category</td>
                <td>{issue.category}</td>
              </tr>
              <tr>
                <td>Priority</td>
                <td>
                  <span className="priority-label critical">
                    {issue.priority}
                  </span>
                </td>
              </tr>
              <tr>
                <td>Status</td>
                <td>{issue.status}</td>
              </tr>
              <tr>
                <td>Logged by</td>
                <td>{issue.loggedBy}</td>
              </tr>
              <tr>
                <td>Assigned to</td>
                <td>{issue.assignedTo}</td>
              </tr>
              <tr>
                <td>Date Reported</td>
                <td>{issue.dateReported}</td>
              </tr>
              <tr>
                <td>Last Update</td>
                <td>{issue.lastUpdate}</td>
              </tr>
              <tr>
                <td>Attachments</td>
                <td>
                  {issue.attachments.map((attachment, index) => (
                    <React.Fragment key={index}>
                      <a href={attachment.url} className="attachment-link">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                        </svg>
                        {attachment.name}
                      </a>
                      {index < issue.attachments.length - 1 && " "}
                    </React.Fragment>
                  ))}
                </td>
              </tr>
              <tr>
                <td>Resolution Deadline</td>
                <td>{issue.resolutionDeadline}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Description Section */}
      <div className="description">
        <div className="header-actions">
          <h2>Description</h2>
          <div className="table-actions">
            <div className="action-menu">
              <button
                onClick={() => toggleExportDropdown("description")}
                className="action-button"
                ref={exportButtonRefs.description}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              {exportDropdownOpen.description && (
                <div
                  className="action-dropdown export-dropdown"
                  ref={exportDropdownRefs.description}
                >
                  <button
                    className="dropdown-item"
                    onClick={handleExportCSVDescription}
                  >
                    Export as CSV
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={handleExportPDFDescription}
                  >
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
            <button onClick={handlePrintDescription} className="action-button">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
            </button>
          </div>
        </div>
        <table className="details-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Description</td>
              <td>{issue.description}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Activity History Section */}
      <div className="activity-history">
        <div className="header-actions">
          <h2>Activity History</h2>
          <div className="table-actions">
            <div className="action-menu">
              <button
                onClick={() => toggleExportDropdown("activityHistory")}
                className="action-button"
                ref={exportButtonRefs.activityHistory}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              {exportDropdownOpen.activityHistory && (
                <div
                  className="action-dropdown export-dropdown"
                  ref={exportDropdownRefs.activityHistory}
                >
                  <button
                    className="dropdown-item"
                    onClick={handleExportCSVActivityHistory}
                  >
                    Export as CSV
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={handleExportPDFActivityHistory}
                  >
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handlePrintActivityHistory}
              className="action-button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
            </button>
          </div>
        </div>
        <table className="details-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Action</th>
              <th>User</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {issue.activityHistory.map((activity, index) => (
              <tr key={index}>
                <td>
                  {activity.date}, <br />
                  {activity.time}
                </td>
                <td>{activity.action}</td>
                <td>{activity.user}</td>
                <td>{activity.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Documents Section */}
      <div className="documents-section">
        <div className="header-actions">
          <h2>Documents</h2>
          <div className="table-actions">
            <div className="action-menu">
              <button
                onClick={() => toggleExportDropdown("documents")}
                className="action-button"
                ref={exportButtonRefs.documents}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              {exportDropdownOpen.documents && (
                <div
                  className="action-dropdown export-dropdown"
                  ref={exportDropdownRefs.documents}
                >
                  <button
                    className="dropdown-item"
                    onClick={handleExportCSVDocuments}
                  >
                    Export as CSV
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={handleExportPDFDocuments}
                  >
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
            <button onClick={handlePrintDocuments} className="action-button">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
            </button>
          </div>
        </div>
        <div className="documents-list">
          {issue.documents.map((document) => (
            <div key={document.id} className="document-item">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="document-icon"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <a href={document.url} className="document-link">
                {document.name}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Comments Section */}
      {issue.comments && issue.comments.length > 0 && (
        <div className="issues-comments-section">
          <div className="header-actions">
            <h2>Comments</h2>
            <div className="table-actions">
              <div className="action-menu">
                <button
                  onClick={() => toggleExportDropdown("comments")}
                  className="action-button"
                  ref={exportButtonRefs.comments}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
                {exportDropdownOpen.comments && (
                  <div
                    className="action-dropdown export-dropdown"
                    ref={exportDropdownRefs.comments}
                  >
                    <button
                      className="dropdown-item"
                      onClick={handleExportCSVComments}
                    >
                      Export as CSV
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={handleExportPDFComments}
                    >
                      Export as PDF
                    </button>
                  </div>
                )}
              </div>
              <button onClick={handlePrintComments} className="action-button">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
              </button>
            </div>
          </div>
          <div className="issues-comments-list">
            {issue.comments.map((comment, index) => (
              <div key={index} className="issues-comment-item">
                <div className="issues-comment-meta">
                  <span className="issues-comment-date">
                    {comment.date}, {comment.time}
                  </span>
                  
                </div>
                <div>
                <span className="issues-comment-user">{comment.user}</span>
                <span className="issues-comment-action">{comment.action}</span>
                </div>
                <div className="issues-comment-text">{comment.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantListViewIssues;
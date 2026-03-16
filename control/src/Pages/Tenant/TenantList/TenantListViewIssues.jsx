import React from "react";
import "./TenantList.css";
import { FaArrowLeft } from "react-icons/fa";
import ExportPrintActions from "../../../Components/ExportPrintActions/ExportPrintActions";
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
  onBack,
}) => {
  const issueInfoColumns = [
    { key: "field", header: "Field" },
    { key: "value", header: "Value" },
  ];
  const issueInfoData = [
    { field: "Tenant", value: issue.tenant },
    { field: "Issue ID", value: issue.issueId },
    { field: "Title", value: issue.title },
    { field: "Category", value: issue.category },
    { field: "Priority", value: issue.priority },
    { field: "Status", value: issue.status },
    { field: "Logged by", value: issue.loggedBy },
    { field: "Assigned to", value: issue.assignedTo },
    { field: "Date Reported", value: issue.dateReported },
    { field: "Last Update", value: issue.lastUpdate },
    { field: "Attachments", value: issue.attachments.map((a) => a.name).join(", ") },
    { field: "Resolution Deadline", value: issue.resolutionDeadline },
  ];

  const descriptionColumns = [
    { key: "field", header: "Field" },
    { key: "value", header: "Value" },
  ];
  const descriptionData = [{ field: "Description", value: issue.description }];

  const activityColumns = [
    { key: "datetime", header: "Date & Time" },
    { key: "action", header: "Action" },
    { key: "user", header: "User" },
    { key: "details", header: "Details" },
  ];
  const activityData = issue.activityHistory.map((a) => ({
    datetime: `${a.date}, ${a.time}`,
    action: a.action,
    user: a.user,
    details: a.details,
  }));

  const documentColumns = [{ key: "name", header: "Document" }];
  const documentData = issue.documents;

  const commentColumns = [
    { key: "datetime", header: "Date & Time" },
    { key: "user", header: "User" },
    { key: "action", header: "Action" },
    { key: "text", header: "Comment" },
  ];
  const commentData = issue.comments.map((c) => ({
    datetime: `${c.date}, ${c.time}`,
    user: c.user,
    action: c.action,
    text: c.text,
  }));

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

      {/* Issue Info */}
      <div className="payment-info">
        <div className="header-actions">
          <h2>Issue Information</h2>
          <ExportPrintActions
            onExportCSV={() => exportTableData(issueInfoData, issueInfoColumns, "issue-info.csv", "Issue Information")}
            onExportPDF={() => exportTableToPDF(issueInfoData, issueInfoColumns, "issue-info.pdf", "Issue Information")}
            onPrint={() => printTableData(issueInfoData, issueInfoColumns, "Issue Information")}
          />
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
          <ExportPrintActions
            onExportCSV={() => exportTableData(descriptionData, descriptionColumns, "description.csv", "Description")}
            onExportPDF={() => exportTableToPDF(descriptionData, descriptionColumns, "description.pdf", "Description")}
            onPrint={() => printTableData(descriptionData, descriptionColumns, "Description")}
          />
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
          <ExportPrintActions
            onExportCSV={() => exportTableData(activityData, activityColumns, "activity-history.csv", "Activity History")}
            onExportPDF={() => exportTableToPDF(activityData, activityColumns, "activity-history.pdf", "Activity History")}
            onPrint={() => printTableData(activityData, activityColumns, "Activity History")}
          />
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
          <ExportPrintActions
            onExportCSV={() => exportTableData(documentData, documentColumns, "documents.csv", "Documents")}
            onExportPDF={() => exportTableToPDF(documentData, documentColumns, "documents.pdf", "Documents")}
            onPrint={() => printTableData(documentData, documentColumns, "Documents")}
          />
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
            <ExportPrintActions
              onExportCSV={() => exportTableData(commentData, commentColumns, "comments.csv", "Comments")}
              onExportPDF={() => exportTableToPDF(commentData, commentColumns, "comments.pdf", "Comments")}
              onPrint={() => printTableData(commentData, commentColumns, "Comments")}
            />
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
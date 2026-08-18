import React, { useState, useEffect, useRef } from "react";
import useAuth from "../../hooks/useAuth";
import usePermission from "../../hooks/usePermission";
import { FaArrowLeft } from "react-icons/fa";
import { IoIosArrowDown } from "react-icons/io";

import Button from "../../Components/Button/Button";
import ExportPrintActions from "../../Components/ExportPrintActions/ExportPrintActions";
import {
  exportTableData,
  printTableData,
  exportTableToPDF,
} from "../../utils/TableUtils";
import "./IssueManagement.css";
import AddCommentModal from "../../Components/ReusableModal/IssueViewModals/AddCommentModal";
import EditIssueModal from "../../Components/ReusableModal/IssueViewModals/EditIssueModal";
import AddAttachmentModal from "../../Components/ReusableModal/IssueViewModals/AddAttachmentModal";
import ChangeCategoryModal from "../../Components/ReusableModal/IssueViewModals/ChangeCategoryModal";
import ChangePriorityModal from "../../Components/ReusableModal/IssueViewModals/ChangePriorityModal";
import ReassignModal from "../../Components/ReusableModal/IssueViewModals/ReassignModal";
import ChangeStatusModal from "../../Components/ReusableModal/IssueViewModals/ChangeStatusModal";
import ContactTenantModal from "../../Components/ReusableModal/IssueViewModals/ContactTenantModal";
import MarkAsResolvedModal from "../../Components/ReusableModal/IssueViewModals/MarkAsResolvedModal";
import useDocumentViewer from "../../hooks/useDocumentViewer";
import api from "../../api/IssueApi";
import { showToast, showApiError } from "../../Helper/ShowToast";
import { formatDateTimeParenthesized as formatDateTime } from "../../Helper/Formatters";
import { Skeleton, SkeletonText, SkeletonTable } from "../../Components/LoadingSpinner";

const ViewIssue = ({ issue, onBack, staffList = [], tenant= [] }) => {
  const { accessToken, refreshToken, userId: adminId } = useAuth();
  const { hasPermission } = usePermission();

  const [issueData, setIssueData] = useState(null);
  const [actionDropdownOpen, setActionDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(null);
  const { openDocument } = useDocumentViewer();

  const actionButtonRef = useRef(null);
  const actionDropdownRef = useRef(null);

  // Refetch issue data
  const refetchIssue = async () => {
    try {
      const response = await api.GetIssueById({
        id: issue.id,
        accessToken,
        refreshToken,
      });
      const data = response.data;
      setIssueData({
        tenant: data.tenant?.companyName || "Unknown",
        issueId: issue.issue_id || `#${issue.id}`,
        tenantId: data.tenantId,
        title: data.title || "N/A",
        category: data.category || "N/A",
        priority: data.priority || "N/A",
        status: data.status || "Not Started",
        loggedBy: data.loggedBy
          ? `${data.loggedBy.firstName || ""} ${data.loggedBy.lastName || ""}`.trim() || "Unknown"
          : "Unknown",
        assignedTo: data.assignedTo
          ? `${data.assignedTo.firstName || ""} ${data.assignedTo.lastName || ""}`.trim() || "Unassigned"
          : "Unassigned",
        dateReported: formatDateTime(data.createdAt),
        lastUpdate: formatDateTime(data.updatedAt),
        attachments: data.attachments?.map((att) => ({
          name: att.key || "Attachment",
          url: att.location || "#",
        })) || [],
        resolutionDeadline: formatDateTime(data.resolutionDeadline),
        description: data.description || "No description provided",
        activityHistory: data.Logs?.map((log, index) => ({
          date: formatDateTime(log.createdAt),
          action: log.action || "Unknown",
          user: log.admin
            ? `${log.admin.firstName || ""} ${log.admin.lastName || ""}`.trim() || "Unknown"
            : "Unknown",
          details: log.details || "No details",
          id: log.logId || index + 1,
        })) || [],
        documents: data.attachments?.map((att, index) => ({
          id: index + 1,
          name: att.key || "Document",
          url: att.location || "#",
        })) || [],
        comments: data.comments?.map((comment, index) => ({
          date: formatDateTime(comment.createdAt),
          user: comment.commentBy
            ? `${comment.commentBy.firstName || ""} ${comment.commentBy.lastName || ""}`.trim() || "Unknown"
            : "Unknown",
          action: "commented",
          text: comment.comment || "No text",
          id: comment.id || index + 1,
        })) || [],
      });
    } catch (err) {
      showApiError(err, "LOAD_ISSUE");
    }
  };

  // Initialize issueData and refetch on issue change
  useEffect(() => {
    if (issue) {
      refetchIssue();
    }
  }, [issue]);

  // Handle click outside for action dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        actionDropdownRef.current &&
        !actionDropdownRef.current.contains(event.target) &&
        !actionButtonRef.current.contains(event.target)
      ) {
        setActionDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const actions = [
    hasPermission("add_issue_comment") && "Add a comment",
    hasPermission("add_issue_attachment") && "Add an attachment",
    "Change category",
    hasPermission("change_issue_priority") && "Change Priority",
    hasPermission("change_issue_status") && "Change Status",
    "Contact tenant by email",
    hasPermission("edit_issue") && "Edit issue",
    hasPermission("change_issue_status") && "Mark as resolved",
    hasPermission("reassign_issue") && "Reassign",
  ].filter(Boolean);

  // Column definitions for each section (used by TableUtils)
  const issueInfoColumns = [
    { key: "field", header: "Field" },
    { key: "value", header: "Value" },
  ];

  const issueInfoData = issueData
    ? [
        { field: "Tenant", value: issueData.tenant },
        { field: "Issue ID", value: issueData.issueId },
        { field: "Title", value: issueData.title },
        { field: "Category", value: issueData.category },
        { field: "Priority", value: issueData.priority },
        { field: "Status", value: issueData.status },
        { field: "Logged by", value: issueData.loggedBy },
        { field: "Assigned to", value: issueData.assignedTo },
        { field: "Date Reported", value: issueData.dateReported },
        { field: "Last Update", value: issueData.lastUpdate },
        { field: "Attachments", value: issueData.attachments?.map((a) => a.name).join(", ") || "None" },
        { field: "Resolution Deadline", value: issueData.resolutionDeadline },
      ]
    : [];

  const descriptionColumns = [
    { key: "field", header: "Field" },
    { key: "value", header: "Value" },
  ];
  const descriptionData = issueData ? [{ field: "Description", value: issueData.description }] : [];

  const activityColumns = [
    { key: "date", header: "Date" },
    { key: "action", header: "Action" },
    { key: "user", header: "User" },
    { key: "details", header: "Details" },
  ];
  const activityData = issueData?.activityHistory || [];

  const documentColumns = [{ key: "name", header: "Document" }];
  const documentData = issueData?.documents || [];

  const commentColumns = [
    { key: "date", header: "Date" },
    { key: "user", header: "User" },
    { key: "action", header: "Action" },
    { key: "text", header: "Comment" },
  ];
  const commentData = issueData?.comments || [];

  const handleActionClick = (action) => {
    setModalOpen(action);
  };

  const handleSaveComment = async (comment) => {
    try {
      await api.CreateCommentOnIssue({
        issueId: issue.id,
        comment,
        adminId,
        accessToken,
        refreshToken,
      });
      await refetchIssue();
      showToast("Comment added successfully", "success");
      setModalOpen(null);
    } catch (err) {
      showApiError(err, "ADD_COMMENT");
      // Re-thrown so the modal keeps the user's input and stays open.
      // Each IssueViewModal awaits this and its catch reads
      // "Error handled by parent" — swallowing here broke that contract.
      throw err;
    }
  };

  const handleSaveEdit = async ({ title, description }) => {
    try {
      await api.EditIssue({
        issueId: issue.id,
        title,
        description,
        updatedBy: adminId,
        accessToken,
        refreshToken,
      });
      await refetchIssue();
      showToast("Issue updated successfully", "success");
      setModalOpen(null);
    } catch (err) {
      showApiError(err, "EDIT_ISSUE");
      // Re-thrown so the modal keeps the user's input and stays open.
      // Each IssueViewModal awaits this and its catch reads
      // "Error handled by parent" — swallowing here broke that contract.
      throw err;
    }
  };

  const handleSaveAttachment = async (attachmentFile) => {
    try {
      const formData = new FormData();
      formData.append("id", issue.id);
      formData.append("attachment", attachmentFile);
      formData.append("updatedBy", adminId);

      await api.AddAttachment({
        payload: formData,
        accessToken,
        refreshToken,
      });
      await refetchIssue();
      showToast("Attachment added successfully", "success");
      setModalOpen(null);
    } catch (err) {
      showApiError(err, "ADD_ATTACHMENT");
      // Re-thrown so the modal keeps the user's input and stays open.
      // Each IssueViewModal awaits this and its catch reads
      // "Error handled by parent" — swallowing here broke that contract.
      throw err;
    }
  };

  const handleSaveCategory = async (category) => {
    try {
      await api.ChangeCategory({
        issueId: issue.id,
        category,
        updatedBy: adminId,
        accessToken,
        refreshToken,
      });
      await refetchIssue();
      showToast("Category changed successfully", "success");
      setModalOpen(null);
    } catch (err) {
      showApiError(err, "CHANGE_CATEGORY");
      // Re-thrown so the modal keeps the user's input and stays open.
      // Each IssueViewModal awaits this and its catch reads
      // "Error handled by parent" — swallowing here broke that contract.
      throw err;
    }
  };

  const handleSavePriority = async (priority) => {
    try {
      await api.ChangePriority({
        issueId: issue.id,
        priority,
        updatedBy: adminId,
        accessToken,
        refreshToken,
      });
      await refetchIssue();
      showToast("Priority changed successfully", "success");
      setModalOpen(null);
    } catch (err) {
      showApiError(err, "CHANGE_PRIORITY");
      // Re-thrown so the modal keeps the user's input and stays open.
      // Each IssueViewModal awaits this and its catch reads
      // "Error handled by parent" — swallowing here broke that contract.
      throw err;
    }
  };

  const handleSaveReassign = async (adminIdNew) => {
    try {
      await api.ReassignToStaff({
        issueId: issue.id,
        adminId: adminIdNew,
        updatedBy: adminId,
        accessToken,
        refreshToken,
      });
      await refetchIssue();
      showToast("Issue reassigned successfully", "success");
      setModalOpen(null);
    } catch (err) {
      showApiError(err, "REASSIGN_ISSUE");
      // Re-thrown so the modal keeps the user's input and stays open.
      // Each IssueViewModal awaits this and its catch reads
      // "Error handled by parent" — swallowing here broke that contract.
      throw err;
    }
  };

  const handleSaveStatus = async (status) => {
    try {
      await api.ChangeIssueStatus({
        issueId: issue.id,
        status,
        updatedBy: adminId,
        accessToken,
        refreshToken,
      });
      await refetchIssue();
      showToast("Status changed successfully", "success");
      setModalOpen(null);
    } catch (err) {
      showApiError(err, "CHANGE_STATUS");
      // Re-thrown so the modal keeps the user's input and stays open.
      // Each IssueViewModal awaits this and its catch reads
      // "Error handled by parent" — swallowing here broke that contract.
      throw err;
    }
  };

  
  const handleSaveContact = async ({ header, body, attachmentFile }) => {
    try {
      const formData = new FormData();
      formData.append("id", issueData.tenantId);
      formData.append("header", header);
      formData.append("body", body);
      if (attachmentFile) formData.append("attachment", attachmentFile);

      await api.ContactTenantByMail({
        payload: formData,
        accessToken,
        refreshToken,
      });
      await refetchIssue();
      showToast("Email sent successfully", "success");
      setModalOpen(null);
    } catch (err) {
      showApiError(err, "SEND_EMAIL");
      // Re-thrown so the modal keeps the user's input and stays open.
      // Each IssueViewModal awaits this and its catch reads
      // "Error handled by parent" — swallowing here broke that contract.
      throw err;
    }
  };

  const handleSaveResolved = async ({ resolution, attachmentFile }) => {
    try {
      const formData = new FormData();
      formData.append("id", issue.id);
      if (attachmentFile) formData.append("attachment", attachmentFile);
      formData.append("updatedBy", adminId);
      formData.append("status", "Resolved");
      formData.append("resolutionDescription", resolution);

      await api.MarkAsResolved({
        payload: formData,
        accessToken,
        refreshToken,
      });
      await refetchIssue();
      showToast("Issue marked as resolved", "success");
      setModalOpen(null);
    } catch (err) {
      showApiError(err, "RESOLVE_ISSUE");
      // Re-thrown so the modal keeps the user's input and stays open.
      // Each IssueViewModal awaits this and its catch reads
      // "Error handled by parent" — swallowing here broke that contract.
      throw err;
    }
  };

  return (
    <>
      <div className="tenant-header">
        <button className="back-button" onClick={onBack}>
          <FaArrowLeft /> Back
        </button>
        <div className="header-info">
          <h1>{issueData ? issueData.title : <Skeleton width="200px" height="24px" />}</h1>
          <p>{issueData ? issueData.issueId : <Skeleton width="80px" height="16px" />}</p>
        </div>
      </div>
      {!issueData ? (
        <div className="issue-management-container">
          <div className="issues-management-view">
            <div className="payment-info">
              <h2>Issue Information</h2>
              <SkeletonTable rows={6} cols={2} />
            </div>
            <div className="description">
              <h2>Description</h2>
              <SkeletonText lines={3} />
            </div>
            <div className="activity-history">
              <h2>Activity History</h2>
              <SkeletonTable rows={3} cols={4} />
            </div>
            <div className="documents-section">
              <h2>Documents</h2>
              <SkeletonText lines={2} />
            </div>
            <div className="issues-comments-section">
              <h2>Comments</h2>
              <SkeletonText lines={3} />
            </div>
          </div>
        </div>
      ) : (
      <div className="issue-management-container">
        <div className="issues-management-view">
          <div className="add-issue-buttons">
            <div className="dropdown-container">
              <Button
                label="Actions"
                icon={<IoIosArrowDown />}
                iconPosition="right"
                variant="secondary"
                ref={actionButtonRef}
                onClick={() => setActionDropdownOpen(!actionDropdownOpen)}
                aria-haspopup="true"
                aria-expanded={actionDropdownOpen}
                width="120px"
              />
              {actionDropdownOpen && (
                <div ref={actionDropdownRef} className="dropdown-menu dropdown-menu-header" role="menu">
                  <div className="dropdown-items">
                    {actions.map((action, index) => (
                      <button
                        key={index}
                        className="dropdown-item"
                        role="menuitem"
                        onClick={() => handleActionClick(action)}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

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
                    <td>{issueData.tenant}</td>
                  </tr>
                  <tr>
                    <td>Issue ID</td>
                    <td>{issueData.issueId}</td>
                  </tr>
                  <tr>
                    <td>Title</td>
                    <td>{issueData.title}</td>
                  </tr>
                  <tr>
                    <td>Category</td>
                    <td>{issueData.category}</td>
                  </tr>
                  <tr>
                    <td>Priority</td>
                    <td>
                      <span
                        className={`priority-label ${issueData.priority.toLowerCase().replace(" ", "-")}`}
                      >
                        {issueData.priority}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Status</td>
                    <td>{issueData.status}</td>
                  </tr>
                  <tr>
                    <td>Logged by</td>
                    <td>{issueData.loggedBy}</td>
                  </tr>
                  <tr>
                    <td>Assigned to</td>
                    <td>{issueData.assignedTo}</td>
                  </tr>
                  <tr>
                    <td>Date Reported</td>
                    <td>{issueData.dateReported}</td>
                  </tr>
                  <tr>
                    <td>Last Update</td>
                    <td>{issueData.lastUpdate}</td>
                  </tr>
                  <tr>
                    <td>Attachments</td>
                    <td>
                      {issueData.attachments?.map((attachment, index) => (
                        <React.Fragment key={index}>
                          <a
                            href={attachment.url}
                            className="attachment-link"
                            onClick={(e) => {
                              e.preventDefault();
                              openDocument(attachment.url, attachment.name);
                            }}
                          >
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
                              aria-hidden="true"
                              focusable="false"
                            >
                              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                            </svg>
                            {attachment.name}
                          </a>
                          {index < issueData.attachments.length - 1 && " "}
                        </React.Fragment>
                      )) || "None"}
                    </td>
                  </tr>
                  <tr>
                    <td>Resolution Deadline</td>
                    <td>{issueData.resolutionDeadline}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

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
                  <td>{issueData.description}</td>
                </tr>
              </tbody>
            </table>
          </div>

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
                  <th>Date</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {issueData.activityHistory?.length ? (
                  issueData.activityHistory.map((activity) => (
                    <tr key={activity.id}>
                      <td>{activity.date}</td>
                      <td>{activity.action}</td>
                      <td>{activity.user}</td>
                      <td>{activity.details}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">No activity history available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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
              {issueData.documents?.length ? (
                issueData.documents.map((document) => (
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
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <a
                      href={document.url}
                      className="document-link"
                      onClick={(e) => {
                        e.preventDefault();
                        openDocument(document.url, document.name);
                      }}
                    >
                      {document.name}
                    </a>
                  </div>
                ))
              ) : (
                <p>No documents available</p>
              )}
            </div>
          </div>

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
              {issueData.comments?.length ? (
                issueData.comments.map((comment) => (
                  <div key={comment.id} className="issues-comment-item">
                    <div className="issues-comment-header">
                      <span className="issues-comment-date">{comment.date}</span> {""}
                      
                    </div>
                    <div>
                      <span className="issues-comment-user">({comment.user})</span> {""}
                      <span className="issues-comment-action">{comment.action}</span> {""}
                    </div>
                    <div className="issues-comment-text">{comment.text}</div>
                  </div>
                ))
              ) : (
                <p>No comments available</p>
              )}
            </div>
          </div>

          <AddCommentModal
            isOpen={modalOpen === "Add a comment"}
            onClose={() => setModalOpen(null)}
            onSave={handleSaveComment}
            issueId={issue.id}
            adminId={adminId}
            accessToken={accessToken}
            refreshToken={refreshToken}
          />
          <EditIssueModal
            isOpen={modalOpen === "Edit issue"}
            onClose={() => setModalOpen(null)}
            onSave={handleSaveEdit}
            initialTitle={issueData?.title}
            initialDescription={issueData?.description}
            issueId={issue.id}
            adminId={adminId}
            accessToken={accessToken}
            refreshToken={refreshToken}
          />
          <AddAttachmentModal
            isOpen={modalOpen === "Add an attachment"}
            onClose={() => setModalOpen(null)}
            onSave={handleSaveAttachment}
            issueId={issue.id}
            adminId={adminId}
            accessToken={accessToken}
            refreshToken={refreshToken}
          />
          <ChangeCategoryModal
            isOpen={modalOpen === "Change category"}
            onClose={() => setModalOpen(null)}
            onSave={handleSaveCategory}
            initialCategory={issueData?.category}
            issueId={issue.id}
            adminId={adminId}
            accessToken={accessToken}
            refreshToken={refreshToken}
          />
          <ChangePriorityModal
            isOpen={modalOpen === "Change Priority"}
            onClose={() => setModalOpen(null)}
            onSave={handleSavePriority}
            initialPriority={issueData?.priority}
            selectedTenant={tenant}
            issueId={issue.id}
            adminId={adminId}
            accessToken={accessToken}
            refreshToken={refreshToken}
          />
          <ReassignModal
            isOpen={modalOpen === "Reassign"}
            onClose={() => setModalOpen(null)}
            onSave={handleSaveReassign}
            initialAssignee={issueData?.assignedTo}
            staffList={staffList}
            issueId={issue.id}
            adminId={adminId}
            accessToken={accessToken}
            refreshToken={refreshToken}
          />
          <ChangeStatusModal
            isOpen={modalOpen === "Change Status"}
            onClose={() => setModalOpen(null)}
            onSave={handleSaveStatus}
            initialStatus={issueData?.status}
            issueId={issue.id}
            adminId={adminId}
            accessToken={accessToken}
            refreshToken={refreshToken}
          />
          <ContactTenantModal
            isOpen={modalOpen === "Contact tenant by email"}
            onClose={() => setModalOpen(null)}
            onSave={handleSaveContact}
            issueId={issue.id}
            accessToken={accessToken}
            refreshToken={refreshToken}
          />
          <MarkAsResolvedModal
            isOpen={modalOpen === "Mark as resolved"}
            onClose={() => setModalOpen(null)}
            onSave={handleSaveResolved}
            issueId={issue.id}
            adminId={adminId}
            accessToken={accessToken}
            refreshToken={refreshToken}
          />
        </div>
      </div>
      )}
    </>
  );
};

export default ViewIssue;
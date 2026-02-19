import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { FaArrowLeft } from "react-icons/fa";
import { IoIosArrowDown } from "react-icons/io";

import ReusableModal from "../../Components/ReusableModal/ReusableModal";
import Button from "../../Components/Button/Button";
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
import api from "../../api/IssueApi";
import { showToast } from "../../Helper/ShowToast";

const ViewIssue = ({ issue, onBack, staffList = [], tenant= [] }) => {
  const token = useSelector((state) => state.authentication?.user?.token);
  const adminId = useSelector((state) => state.authentication?.user?.id);
  const accessToken = token;
  const refreshToken = token;

  const [issueData, setIssueData] = useState(null);
  const [actionDropdownOpen, setActionDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState({
    issueInfo: false,
    description: false,
    activityHistory: false,
    documents: false,
    comments: false,
  });

  const actionButtonRef = useRef(null);
  const actionDropdownRef = useRef(null);
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

  // Format date to "Nov 25, 2023 (02:45 pm)"
  const formatDateTime = (dateString) => {
    if (!dateString || dateString === "N/A") return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).replace(",", " (").replace(/(\d+:\d+ [AP]M)/, "$1)");
  };

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
        loggedBy: data.loggedBy?.fullName || "Unknown",
        assignedTo: data.assignedTo?.fullName || "Unassigned",
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
          user: log.admin?.fullName || "Unknown",
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
          user: comment.commentBy.fullName || "Unknown",
          action: "commented",
          text: comment.comment || "No text",
          id: comment.id || index + 1,
        })) || [],
      });
    } catch (err) {
      showToast(`Failed to refetch issue: ${err.message}`, "error");
    }
  };

  // Initialize issueData and refetch on issue change
  useEffect(() => {
    if (issue) {
      refetchIssue();
    }
  }, [issue]);

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        actionDropdownRef.current &&
        !actionDropdownRef.current.contains(event.target) &&
        !actionButtonRef.current.contains(event.target)
      ) {
        setActionDropdownOpen(false);
      }
      Object.keys(exportDropdownRefs).forEach((section) => {
        if (
          exportDropdownRefs[section].current &&
          !exportDropdownRefs[section].current.contains(event.target) &&
          !exportButtonRefs[section].current.contains(event.target)
        ) {
          setExportDropdownOpen((prev) => ({ ...prev, [section]: false }));
        }
      });
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle export dropdown
  const toggleExportDropdown = (section) => {
    setExportDropdownOpen((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const actions = [
    "Add a comment",
    "Add an attachment",
    "Change category",
    "Change Priority",
    "Change Status",
    "Contact tenant by email",
    "Edit issue",
    "Mark as resolved",
    "Reassign",
  ];

  // Placeholder export functions
  const onExportCSV = (data) => {} // TODO: implement handler;
  const onExportPDF = (data) => {} // TODO: implement handler;
  const onPrint = (data) => {} // TODO: implement handler;

  // Extract table data
  const issueInfoTableData = issueData
    ? [
        [issueData.tenant],
        [issueData.issueId],
        [issueData.title],
        [issueData.category],
        [issueData.priority],
        [issueData.status],
        [issueData.loggedBy],
        [issueData.assignedTo],
        [issueData.dateReported],
        [issueData.lastUpdate],
        [issueData.attachments?.map((att) => att.name).join(", ") || "None"],
        [issueData.resolutionDeadline],
      ]
    : [];
  const descriptionTableData = issueData ? [[issueData.description]] : [];
  const activityHistoryTableData =
    issueData?.activityHistory?.map((activity) => [
      activity.date,
      activity.action,
      activity.user,
      activity.details,
    ]) || [];
  const documentsTableData = issueData?.documents?.map((doc) => [doc.name]) || [];
  const commentsTableData =
    issueData?.comments?.map((comment) => [
      comment.date,
      comment.user,
      comment.action,
      comment.text,
    ]) || [];

  // Export handlers
  const handleExportCSVIssueInfo = () => {
    onExportCSV(issueInfoTableData);
    toggleExportDropdown("issueInfo");
  };
  const handleExportPDFIssueInfo = () => {
    onExportPDF(issueInfoTableData);
    toggleExportDropdown("issueInfo");
  };
  const handlePrintIssueInfo = () => onPrint(issueInfoTableData);
  const handleExportCSVDescription = () => {
    onExportCSV(descriptionTableData);
    toggleExportDropdown("description");
  };
  const handleExportPDFDescription = () => {
    onExportPDF(descriptionTableData);
    toggleExportDropdown("description");
  };
  const handlePrintDescription = () => onPrint(descriptionTableData);
  const handleExportCSVActivityHistory = () => {
    onExportCSV(activityHistoryTableData);
    toggleExportDropdown("activityHistory");
  };
  const handleExportPDFActivityHistory = () => {
    onExportPDF(activityHistoryTableData);
    toggleExportDropdown("activityHistory");
  };
  const handlePrintActivityHistory = () => onPrint(activityHistoryTableData);
  const handleExportCSVDocuments = () => {
    onExportCSV(documentsTableData);
    toggleExportDropdown("documents");
  };
  const handleExportPDFDocuments = () => {
    onExportPDF(documentsTableData);
    toggleExportDropdown("documents");
  };
  const handlePrintDocuments = () => onPrint(documentsTableData);
  const handleExportCSVComments = () => {
    onExportCSV(commentsTableData);
    toggleExportDropdown("comments");
  };
  const handleExportPDFComments = () => {
    onExportPDF(commentsTableData);
    toggleExportDropdown("comments");
  };
  const handlePrintComments = () => onPrint(commentsTableData);

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
      showToast(`Failed to add comment: ${err.message}`, "error");
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
      showToast(`Failed to edit issue: ${err.message}`, "error");
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
      showToast(`Failed to add attachment: ${err.message}`, "error");
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
      showToast(`Failed to change category: ${err.message}`, "error");
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
      showToast(`Failed to change priority: ${err.message}`, "error");
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
      showToast(`Failed to reassign issue: ${err.message}`, "error");
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
      showToast(`Failed to change status: ${err.message}`, "error");
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
      showToast(`Failed to send email: ${err.message}`, "error");
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
      showToast(`Failed to mark as resolved: ${err.message}`, "error");
    }
  };

  if (!issueData) return <div>Loading...</div>;

  return (
    <>
      <div className="tenant-header">
        <button className="back-button" onClick={onBack}>
          <FaArrowLeft /> Back
        </button>
        <div className="header-info">
          <h1>{issueData.title}</h1>
          <p>{issueData.issueId}</p>
        </div>
      </div>
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
                width="120px"
              />
              {actionDropdownOpen && (
                <div ref={actionDropdownRef} className="dropdown-menu dropdown-menu-header">
                  <div className="dropdown-items">
                    {actions.map((action, index) => (
                      <button
                        key={index}
                        className="dropdown-item"
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
                    <div className="action-dropdown export-dropdown" ref={exportDropdownRefs.issueInfo}>
                      <button className="dropdown-item" onClick={handleExportCSVIssueInfo}>
                        Export as CSV
                      </button>
                      <button className="dropdown-item" onClick={handleExportPDFIssueInfo}>
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
                    <div className="action-dropdown export-dropdown" ref={exportDropdownRefs.description}>
                      <button className="dropdown-item" onClick={handleExportCSVDescription}>
                        Export as CSV
                      </button>
                      <button className="dropdown-item" onClick={handleExportPDFDescription}>
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
                  <td>{issueData.description}</td>
                </tr>
              </tbody>
            </table>
          </div>

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
                    <div className="action-dropdown export-dropdown" ref={exportDropdownRefs.activityHistory}>
                      <button className="dropdown-item" onClick={handleExportCSVActivityHistory}>
                        Export as CSV
                      </button>
                      <button className="dropdown-item" onClick={handleExportPDFActivityHistory}>
                        Export as PDF
                      </button>
                    </div>
                  )}
                </div>
                <button onClick={handlePrintActivityHistory} className="action-button">
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
                      viewBox="0 0 24  beyond 24"
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
                    <div className="action-dropdown export-dropdown" ref={exportDropdownRefs.documents}>
                      <button className="dropdown-item" onClick={handleExportCSVDocuments}>
                        Export as CSV
                      </button>
                      <button className="dropdown-item" onClick={handleExportPDFDocuments}>
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
                ))
              ) : (
                <p>No documents available</p>
              )}
            </div>
          </div>

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
                    <div className="action-dropdown export-dropdown" ref={exportDropdownRefs.comments}>
                      <button className="dropdown-item" onClick={handleExportCSVComments}>
                        Export as CSV
                      </button>
                      <button className="dropdown-item" onClick={handleExportPDFComments}>
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
    </>
  );
};

export default ViewIssue;
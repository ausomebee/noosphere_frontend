import React, { useState, useEffect, useRef } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { IoIosArrowDown } from "react-icons/io";
import Layout from "../Layout/ControlLayout";
import ReusableModal from "../../Components/ReusableModal/ReusableModal";
import Button from "../../Components/Button/Button";
import api2 from "../../api/TenantApis";
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

const ViewIssue = ({ issue, onBack }) => {
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

  // Fetch issue data from API
  useEffect(() => {
    const fetchIssue = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await api2.getIssueById(issue.id, { token });
        setIssueData(response.data);
      } catch (error) {
        console.error("Failed to fetch issue:", error);
        setIssueData({
          tenant: "ACME Corps",
          issueId: `#${issue.id || "12345"}`,
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
          ],
        });
      }
    };

    if (issue?.id) {
      fetchIssue();
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
  const onExportCSV = (data) => console.log("Exporting CSV:", data);
  const onExportPDF = (data) => console.log("Exporting PDF:", data);
  const onPrint = (data) => console.log("Printing:", data);

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
      `${activity.date}, ${activity.time}`,
      activity.action,
      activity.user,
      activity.details,
    ]) || [];
  const documentsTableData = issueData?.documents?.map((doc) => [doc.name]) || [];
  const commentsTableData =
    issueData?.comments?.map((comment) => [
      `${comment.date}, ${comment.time}`,
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

  const handleSaveComment = (comment) => {
    console.log("Saving comment:", comment);
    // Add logic to update issueData.comments (e.g., API call or state update)
  };

  const handleSaveEdit = ({ title, description }) => {
    console.log("Saving edit:", { title, description });
    // Add logic to update issueData (e.g., API call or state update)
    if (issueData) {
      setIssueData((prev) => ({
        ...prev,
        title,
        description,
      }));
    }
  };

  const handleSaveAttachment = (file) => {
    console.log("Saving attachment:", file.name);
    // Add logic to upload file and update issueData.attachments (e.g., API call)
  };

  const handleSaveCategory = (from, to) => {
    console.log("Changing category from", from, "to", to);
    // Add logic to update issueData.category (e.g., API call or state update)
    if (issueData) {
      setIssueData((prev) => ({
        ...prev,
        category: to,
      }));
    }
  };

  const handleSavePriority = (from, to) => {
    console.log("Changing priority from", from, "to", to);
    // Add logic to update issueData.priority (e.g., API call or state update)
    if (issueData) {
      setIssueData((prev) => ({
        ...prev,
        priority: to,
      }));
    }
  };

  const handleSaveReassign = (current, newAssignee) => {
    console.log("Reassigning from", current, "to", newAssignee);
    // Add logic to update issueData.assignedTo (e.g., API call or state update)
    if (issueData) {
      setIssueData((prev) => ({
        ...prev,
        assignedTo: newAssignee,
      }));
    }
  };

  const handleSaveStatus = (from, to) => {
    console.log("Changing status from", from, "to", to);
    // Add logic to update issueData.status (e.g., API call or state update)
    if (issueData) {
      setIssueData((prev) => ({
        ...prev,
        status: to,
      }));
    }
  };

  const handleSaveContact = ({ header, body, attachmentFile }) => {
    console.log("Sending email:", { header, body, attachmentFile: attachmentFile?.name });
    // Add logic to send email and handle attachment (e.g., API call)
  };

  const handleSaveResolved = ({ resolution, attachmentFile, tenantApproval }) => {
    console.log("Marking as resolved:", { resolution, attachmentFile: attachmentFile?.name, tenantApproval });
    // Add logic to update issueData.status and resolution (e.g., API call)
    if (issueData) {
      setIssueData((prev) => ({
        ...prev,
        status: "Resolved",
        resolution,
      }));
    }
  };
  if (!issueData) return <div>Loading...</div>;

  return (
    <Layout>
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
                label={"Actions"}
                icon={<IoIosArrowDown />}
                iconPosition="right"
                variant="secondary"
                ref={actionButtonRef}
                onClick={() => setActionDropdownOpen(!actionDropdownOpen)}
                aria-haspopup="true"
                width="120px"
              />
              {actionDropdownOpen && (
                <div
                  ref={actionDropdownRef}
                  className="dropdown-menu dropdown-menu-header"
                >
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
                <button
                  onClick={handlePrintIssueInfo}
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
                        className={`priority-label ${issueData.priority
                          .toLowerCase()
                          .replace(" ", "-")}`}
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
                <button
                  onClick={handlePrintDescription}
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
                {issueData.activityHistory?.map((activity, index) => (
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
                <button
                  onClick={handlePrintDocuments}
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
            <div className="documents-list">
              {issueData.documents?.map((document) => (
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

          {issueData.comments && issueData.comments.length > 0 && (
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
                  <button
                    onClick={handlePrintComments}
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
              <div className="issues-comments-list">
                {issueData.comments.map((comment, index) => (
                  <div key={index} className="issues-comment-item">
                    <div className="issues-comment-meta">
                      <span className="issues-comment-date">
                        {comment.date}, {comment.time}
                      </span>
                    </div>
                    <div>
                      <span className="issues-comment-user">
                        {comment.user}
                      </span>
                      <span className="issues-comment-action">
                        {comment.action}
                      </span>
                    </div>
                    <div className="issues-comment-text">{comment.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Imported Modals */}
          <AddCommentModal
            isOpen={modalOpen === "Add a comment"}
            onClose={() => setModalOpen(null)}
            onSave={handleSaveComment}
          />
          <EditIssueModal
            isOpen={modalOpen === "Edit issue"}
            onClose={() => setModalOpen(null)}
            onSave={handleSaveEdit}
            initialTitle={issueData?.title}
            initialDescription={issueData?.description}
          />
          <AddAttachmentModal
            isOpen={modalOpen === "Add an attachment"}
            onClose={() => setModalOpen(null)}
            onSave={handleSaveAttachment}
          />
          <ChangeCategoryModal
            isOpen={modalOpen === "Change category"}
            onClose={() => setModalOpen(null)}
            onSave={handleSaveCategory}
            initialCategory={issueData?.category}
          />
          <ChangePriorityModal
            isOpen={modalOpen === "Change Priority"}
            onClose={() => setModalOpen(null)}
            onSave={handleSavePriority}
            initialPriority={issueData?.priority}
          />
          <ReassignModal
            isOpen={modalOpen === "Reassign"}
            onClose={() => setModalOpen(null)}
            onSave={handleSaveReassign}
            initialAssignee={issueData?.assignedTo}
            staffList={[]}
          />
          <ChangeStatusModal
            isOpen={modalOpen === "Change Status"}
            onClose={() => setModalOpen(null)}
            onSave={handleSaveStatus}
            initialStatus={issueData?.status}
          />
          <ContactTenantModal
            isOpen={modalOpen === "Contact tenant by email"}
            onClose={() => setModalOpen(null)}
            onSave={handleSaveContact}
          />
          <MarkAsResolvedModal
            isOpen={modalOpen === "Mark as resolved"}
            onClose={() => setModalOpen(null)}
            onSave={handleSaveResolved}
          />
        </div>
      </div>
    </Layout>
  );
};

export default ViewIssue;

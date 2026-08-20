import usePageTitle from "../../../hooks/usePageTitle";
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import CustomTable from "../../../Components/Table/CustomTable";
import Button from "../../../Components/Button/Button";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";
import { SelectInput, TextInput, TextareaInput } from "../../../Components/Input/Inputs";
import api from "../../../api/helpAndSupportApi";
import { showToast } from "../../../Helper/ShowToast";
import usePermissions from "../../../hooks/usePermissions";
import { FiPlus } from "react-icons/fi";
import {
  BsCloudUpload,
  BsFileEarmarkPdf,
  BsFileEarmarkPlay,
} from "react-icons/bs";
import { FaRegFile, FaPhotoVideo, FaImage, FaCheckCircle } from "react-icons/fa";
import { RiDeleteBin6Line } from "react-icons/ri";
import { formatDate, formatFileSize } from "../../../Helper/Formatters";
import useFormatSettings from "../../../hooks/useFormatSettings";
import { toProgressEntry } from "./progressTrack";
import usePagedList from "../../../hooks/usePagedList";
import Pagination from "../../../Components/Table/Pagination";
import AccessDenied from "../../../Components/AccessDenied/AccessDenied";
import "./SupportRequests.css";

const CATEGORIES = [
  "Account & Access",
  "Billing & Payments",
  "Subscription & Plans",
  "Data Issues",
  "User Management & Roles",
  "Client/Patient Management Issues",
  "Bug Report",
  "Performance",
  "Compliance & Security",
  "Notifications & Emails",
  "Analytics & Reporting",
  "Customization & Settings",
  "Third-Party Integrations",
  "Training & Onboarding",
  "Feature Request",
  "Other / Miscellaneous",
];

const STATUS_CLASS_MAP = {
  "Not Started": "unassigned",
  Resolved: "resolved",
  "In Resolution": "in-resolution",
  Assigned: "assigned",
  Pending: "pending",
  Unassigned: "unassigned",
};

const getFileIcon = (fileName) => {
  if (!fileName || typeof fileName !== "string") {
    return <FaRegFile size={16} className="file-icon" />;
  }
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <BsFileEarmarkPdf size={16} className="file-icon" />;
  if (["mp4", "avi", "mov"].includes(ext))
    return <FaPhotoVideo size={16} className="file-icon" />;
  if (["gif"].includes(ext))
    return <BsFileEarmarkPlay size={16} className="file-icon" />;
  if (["png", "jpg", "jpeg", "webp", "svg"].includes(ext))
    return <FaImage size={16} className="file-icon" />;
  return <FaRegFile size={16} className="file-icon" />;
};

const SupportRequests = () => {
  const navigate = useNavigate();
  const { tenantId, userId, accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();
  const { dateFormat, timeFormat } = useFormatSettings();

  usePageTitle("Support Requests");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ all: 0, resolved: 0, pending: 0 });

  // Submit modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    title: "",
    description: "",
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Progress track modal
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [progressData, setProgressData] = useState([]);
  const [progressTitle, setProgressTitle] = useState("");
  const trackPage = usePagedList(progressData);

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const response = await api.GetHelpAndSupportTicketsByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      setRequests(response?.data || []);
    } catch (error) {
      console.error("Failed to fetch support requests:", error);
    } finally {
      setLoading(false);
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch overview stats
  const fetchOverview = useCallback(async () => {
    if (!tenantId) return;
    try {
      const response = await api.GetHelpAndSupportTicketsOverviewByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const data = response?.data;
      if (data) {
        setStats({
          all: data.allIssues?._count?._all || 0,
          resolved: data.resolvedIssues?._count?._all || 0,
          pending: data.pendingIssues?._count?._all || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch overview:", error);
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchTickets();
    fetchOverview();
  }, [fetchTickets, fetchOverview]);

  // Table data mapped from API response
  const tableData = useMemo(() => {
    return requests.map((req) => ({
      id: req.id,
      issueCategory: req.category || "N/A",
      description:
        req.description?.length > 30
          ? req.description.substring(0, 30) + "..."
          : req.description || "N/A",
      loggedBy:
        [req.loggedBy?.firstName, req.loggedBy?.lastName]
          .filter(Boolean)
          .join(" ") ||
        req.loggedBy?.fullName ||
        "N/A",
      dateReported: formatDate(req.createdAt, dateFormat),
      status: req.status || "Not Started",
      hasActions: true,
      rawData: req,
    }));
  }, [requests]);

  // Columns
  const columns = useMemo(
    () => [
      { header: "Issue Category", key: "issueCategory", type: "text" },
      { header: "Description", key: "description", type: "text" },
      { header: "Logged by", key: "loggedBy", type: "text" },
      { header: "Date Reported", key: "dateReported", type: "text" },
      {
        header: "Status",
        key: "status",
        render: (row) => {
          const className = STATUS_CLASS_MAP[row.status] || "pending";
          return (
            <span className={`support-status-badge ${className}`}>
              {row.status}
            </span>
          );
        },
      },
    ],
    []
  );

  // Filters
  const filters = useMemo(() => {
    const statuses = [...new Set(tableData.map((r) => r.status))]
      .filter(Boolean)
      .map((s) => ({ value: s, label: s }));

    const categories = [...new Set(tableData.map((r) => r.issueCategory))]
      .filter(Boolean)
      .map((c) => ({ value: c, label: c }));

    return [
      {
        value: "status",
        label: "Status",
        filterValues: statuses,
        filterFunction: (row, val) => !val || row.status === val,
      },
      {
        value: "issueCategory",
        label: "Category",
        filterValues: categories,
        filterFunction: (row, val) => !val || row.issueCategory === val,
      },
      {
        value: "dateTime",
        label: "Date Reported",
        filterValues: [],
        filterFunction: (row, val) => !val || row.dateReported === val,
        filter_type: "dateTime",
      },
    ];
  }, [tableData]);

  // Withdraw a support request via the change-status endpoint, then refresh.
  const handleWithdraw = useCallback(
    async (row) => {
      try {
        await api.ChangeSupportRequestStatus({
          id: row.id,
          status: "Withdrawn",
          updatedBy: userId,
          accessToken,
          refreshToken,
        });
        showToast("Support request withdrawn", "success");
        fetchTickets();
        fetchOverview();
      } catch (error) {
        console.error("Failed to withdraw request:", error);
        showToast(error.message || "Failed to withdraw request", "error");
      }
    },
    [userId, accessToken, refreshToken, fetchTickets, fetchOverview]
  );

  // Actions
  const actions = useCallback(
    () => [
      {
        type: "dropdown",
        label: "More",
        items: [
          hasPermission("view_support_request") && {
            label: "View request details",
            onClick: (row) => navigate(`/help/support-requests/${row.id}`),
          },
          hasPermission("withdraw_support_request") && {
            label: "Withdraw Request",
            onClick: (row) => handleWithdraw(row),
            className: "remove",
          },
        ].filter(Boolean),
      },
    ],
    [navigate, hasPermission, handleWithdraw]
  );

  // File handlers
  const handleFilesSelected = (newFiles) => {
    // Snapshot the FileList into a real array NOW. The input's onChange clears
    // `e.target.value` right after this call, which empties the live FileList —
    // so converting inside the async state updater would capture nothing.
    const filesArray = Array.from(newFiles || []);
    if (!filesArray.length) return;
    setSelectedFiles((prev) => [...prev, ...filesArray]);
  };

  const handleRemoveFile = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit
  const handleSubmitRequest = async () => {
    if (!formData.category || !formData.title || !formData.description) return;

    setSubmitLoading(true);
    try {
      await api.CreateHelpAndSupportTicket({
        tenantId,
        category: formData.category,
        title: formData.title,
        description: formData.description,
        attachment: selectedFiles,
        accessToken,
        refreshToken,
      });

      showToast("Support request submitted successfully", "success");
      setFormData({ category: "", title: "", description: "" });
      setSelectedFiles([]);
      setIsSubmitModalOpen(false);
      fetchTickets();
      fetchOverview();
    } catch (error) {
      console.error("Failed to submit request:", error);
      showToast("Failed to submit support request", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Progress modal
  const handleViewProgress = (row) => {
    const logs = row.rawData?.Logs || [];
    // Newest first — the API returns oldest first, which buries the latest step.
    setProgressData(
      [...logs].sort(
        (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
      )
    );
    setProgressTitle(row.rawData?.issueName || row.rawData?.title || "");
    trackPage.setPage(1);
    setIsProgressModalOpen(true);
  };

  if (!hasPermission("view_support_request_list")) return <AccessDenied />;

  return (
    <>
      <div className="support-requests-container">
        {/* Header */}
        <div className="support-requests-header">
          <h1>Support Requests</h1>
          <p>Manage and track your support requests seamlessly</p>
        </div>

        {/* Stat Cards */}
        <div className="support-stat-cards">
          <div className="support-stat-card">
            <p className="stat-label">All Requests</p>
            <p className="stat-value">{stats.all}</p>
          </div>
          <div className="support-stat-card">
            <p className="stat-label">Resolved Requests</p>
            <p className="stat-value">{stats.resolved}</p>
          </div>
          <div className="support-stat-card">
            <p className="stat-label">Pending Requests</p>
            <p className="stat-value">{stats.pending}</p>
          </div>
        </div>

        {/* Submit Button */}
        {hasPermission("create_support_request") && (
          <div className="support-submit-row">
            <Button
              label="Submit a new request"
              variant="primary"
              icon={<FiPlus />}
              onClick={() => setIsSubmitModalOpen(true)}
            />
          </div>
        )}

        {/* Table */}
        <CustomTable
          data={tableData}
          columns={columns}
          actions={actions}
          filters={filters}
          tableName="Support Requests"
          itemsPerPage={10}
          showActions={true}
          showCheckbox={false}
          loading={loading}
        />

        {/* Submit a Request Modal */}
        <ReusableModal
          isOpen={isSubmitModalOpen}
          onClose={() => {
            setIsSubmitModalOpen(false);
            setFormData({ category: "", title: "", description: "" });
            setSelectedFiles([]);
          }}
          title="Submit a Request"
          primaryButtonText="Submit"
          secondaryButtonText="Cancel"
          onPrimaryButtonClick={handleSubmitRequest}
          primaryButtonLoading={submitLoading}
          size="md"
        >
          <SelectInput
            label="Category"
            name="category"
            value={formData.category}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, category: e.target.value }))
            }
            options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
            placeholder="Select"
          />

          <TextInput
            label="Title"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Type something"
          />

          <TextareaInput
            label="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            placeholder="Enter a description..."
          />

          <div className="support-upload-section">
            <h4>Upload and attach files</h4>
            <p>Upload and attach files to this issue</p>
            <div
              className="upload-area"
              onClick={() => fileInputRef.current?.click()}
              onDrop={(e) => {
                e.preventDefault();
                handleFilesSelected(e.dataTransfer.files);
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="text-gray-400 mb-3 flex justify-center">
                <BsCloudUpload size={48} />
              </div>
              <p className="text-sm font-medium text-blue-600">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">
                SVG, PNG, JPG or GIF (max. 800x400px)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,.png,.jpg,.jpeg,.gif,.pdf"
                multiple
                onChange={(e) => {
                  if (e.target.files?.length) {
                    handleFilesSelected(e.target.files);
                  }
                  e.target.value = "";
                }}
                className="hidden"
              />
            </div>

            {selectedFiles.length > 0 && (
              <div className="file-list mt-3">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="file-item">
                    <div className="file-header">
                      <div className="file-info">
                        {getFileIcon(file.name)}
                        <span className="file-name">
                          {file.name} • {formatFileSize(file.size)}
                        </span>
                      </div>
                      <div className="file-actions">
                        <FaCheckCircle size={16} className="file-success" />
                        <button
                          type="button"
                          className="remove-file"
                          onClick={() => handleRemoveFile(idx)}
                          aria-label="Remove file"
                        >
                          <RiDeleteBin6Line size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ReusableModal>

        {/* Progress Track Modal */}
        <ReusableModal
          isOpen={isProgressModalOpen}
          onClose={() => setIsProgressModalOpen(false)}
          title={`Progress Track${progressTitle ? ` — ${progressTitle}` : ""}`}
          secondaryButtonText="Close"
          onSecondaryButtonClick={() => setIsProgressModalOpen(false)}
          size="md"
        >
          <div className="progress-track-list">
            {trackPage.total > 0 ? (
              trackPage.pageItems.map((item, idx) => (
                <div key={item.logId || idx} className="progress-track-item">
                {(() => {
                  const entry = toProgressEntry(
                    item,
                    dateFormat,
                    timeFormat,
                    progressTitle
                  );
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
          {trackPage.showPagination && (
            <Pagination
              currentPage={trackPage.page}
              totalPages={trackPage.totalPages}
              onPageChange={trackPage.setPage}
            />
          )}
        </ReusableModal>
      </div>
    </>
  );
};

export default SupportRequests;

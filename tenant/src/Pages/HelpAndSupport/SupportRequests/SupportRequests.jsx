import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import DashboardLayout from "../../../Layout/TenantLayout";
import CustomTable from "../../../Components/Table/CustomTable";
import Button from "../../../Components/Button/Button";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";
import { SelectInput, TextInput, TextareaInput } from "../../../Components/Input/Inputs";
import api from "../../../api/helpAndSupportApi";
import { showToast } from "../../../Helper/ShowToast";
import { FiPlus } from "react-icons/fi";
import { BsCloudUpload } from "react-icons/bs";
import { RiDeleteBin6Line } from "react-icons/ri";
import { format } from "date-fns";
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

const SupportRequests = () => {
  const navigate = useNavigate();
  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const accessToken = useSelector((s) => s.authentication?.user?.accessToken);
  const refreshToken = useSelector((s) => s.authentication?.user?.refreshToken);

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
      showToast("Failed to load support requests", "error");
    } finally {
      setLoading(false);
    }
  }, [tenantId, accessToken, refreshToken]);

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
  }, [tenantId, accessToken, refreshToken]);

  useEffect(() => {
    fetchTickets();
    fetchOverview();
  }, [fetchTickets, fetchOverview]);

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return format(new Date(dateStr), "MM/dd/yy");
    } catch {
      return "N/A";
    }
  };

  // Table data mapped from API response
  const tableData = useMemo(() => {
    return requests.map((req) => ({
      id: req.id,
      issueCategory: req.category || "N/A",
      description:
        req.description?.length > 30
          ? req.description.substring(0, 30) + "..."
          : req.description || "N/A",
      loggedBy: req.loggedBy?.fullName || "N/A",
      dateReported: formatDate(req.createdAt),
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

  // Actions
  const actions = useCallback(
    () => [
      {
        type: "dropdown",
        label: "More",
        items: [
          {
            label: "View request details",
            onClick: (row) => navigate(`/help/support-requests/${row.id}`),
          },
          {
            label: "Withdraw Request",
            onClick: (row) => {
              setRequests((prev) => prev.filter((r) => r.id !== row.id));
            },
            className: "remove",
          },
        ],
      },
    ],
    [navigate]
  );

  // File handlers
  const handleFilesSelected = (newFiles) => {
    setSelectedFiles((prev) => [...prev, ...Array.from(newFiles)]);
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
    setProgressData(logs);
    setIsProgressModalOpen(true);
  };

  return (
    <DashboardLayout>
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
        <div className="support-submit-row">
          <Button
            label="Submit a new request"
            variant="primary"
            icon={<FiPlus />}
            onClick={() => setIsSubmitModalOpen(true)}
          />
        </div>

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
                        <span className="file-name">{file.name}</span>
                      </div>
                      <button
                        type="button"
                        className="remove-file"
                        onClick={() => handleRemoveFile(idx)}
                      >
                        <RiDeleteBin6Line size={16} />
                      </button>
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
          title="Progress Track"
          secondaryButtonText="Close"
          onSecondaryButtonClick={() => setIsProgressModalOpen(false)}
          size="md"
        >
          <div className="progress-track-list">
            {progressData.length > 0 ? (
              progressData.map((item, idx) => (
                <div key={idx} className="progress-track-item">
                  {item.message || item.action} on{" "}
                  <span className="track-date">
                    {formatDate(item.createdAt || item.date)}
                  </span>
                  {item.person && (
                    <>
                      {" "}
                      to <span className="track-person">{item.person}</span>
                    </>
                  )}
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

export default SupportRequests;

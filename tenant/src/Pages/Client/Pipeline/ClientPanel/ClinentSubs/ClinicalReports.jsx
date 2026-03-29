import React, { useEffect, useState, useMemo } from "react";
import useAuth from "../../../../../hooks/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import Button from "../../../../../Components/Button/Button";
import CustomTable from "../../../../../Components/Table/CustomTable";
import CreateAReportDocumentModal from "../../../../../Components/ReusableModal/ClientModal/ClinicalReport/CreateAReportDocumentModal";
import api from "../../../../../api/TemplateAndReportApi";
import usePermissions from "../../../../../hooks/usePermissions";
import { showToast } from "../../../../../Helper/ShowToast";
import { formatDate, formatDateTime } from "../../../../../Helper/Formatters";
import useFormatSettings from "../../../../../hooks/useFormatSettings";

// Delete Confirmation Modal
const DeleteReportConfirmModal = ({
  isOpen,
  reportTitle,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1050,
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "420px",
          width: "90%",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
        }}
      >
        <h3
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            marginBottom: "16px",
            color: "#1f2937",
          }}
        >
          Confirm Deletion
        </h3>
        <p
          style={{ color: "#4b5563", marginBottom: "24px", lineHeight: "1.5" }}
        >
          Are you sure you want to delete the report{" "}
          <span style={{ fontWeight: 500, color: "#dc2626" }}>
            "{reportTitle || "Untitled Report"}"
          </span>
          ?
          <br />
          This action cannot be undone.
        </p>
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              color: "#4b5563",
              background: "transparent",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.95rem",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#f3f4f6")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 20px",
              backgroundColor: "#dc2626",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.95rem",
              fontWeight: 500,
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#b91c1c")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "#dc2626")
            }
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// Signed PDFs Modal - lists all signed PDF versions
const SignedPdfsModal = ({ isOpen, onClose, versions, reportTitle }) => {
  if (!isOpen) return null;

  const sortedVersions = [...(versions || [])].sort(
    (a, b) => a.versionNumber - b.versionNumber,
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1050,
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "520px",
          width: "90%",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              color: "#1f2937",
              margin: 0,
            }}
          >
            Signed Documents
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "1.5rem",
              color: "#6b7280",
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {reportTitle && (
          <p
            style={{
              color: "#6b7280",
              marginBottom: "16px",
              fontSize: "0.9rem",
            }}
          >
            {reportTitle}
          </p>
        )}

        <div style={{ overflowY: "auto", flex: 1 }}>
          {sortedVersions.length > 0 ? (
            sortedVersions.map((version) => (
              <div
                key={version.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <div>
                  <p
                    style={{
                      fontWeight: 500,
                      color: "#1f2937",
                      margin: 0,
                      marginBottom: "4px",
                    }}
                  >
                    Version {version.versionNumber}
                  </p>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "#6b7280",
                      margin: 0,
                    }}
                  >
                    {formatDateTime(version.createdAt, dateFormat, timeFormat)}
                  </p>
                </div>
                <a
                  href={version.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "6px 14px",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    borderRadius: "6px",
                    textDecoration: "none",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor = "#1d4ed8")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor = "#2563eb")
                  }
                >
                  View PDF
                </a>
              </div>
            ))
          ) : (
            <p
              style={{
                textAlign: "center",
                color: "#6b7280",
                padding: "24px 0",
              }}
            >
              No signed versions available.
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "16px",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              color: "#4b5563",
              background: "transparent",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.95rem",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#f3f4f6")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const ClinicalReportsTab = ({ clientData }) => {
  const { tenantClientId, clientId } = useParams();
  const navigate = useNavigate();
  const { dateFormat, timeFormat } = useFormatSettings();

  const [activeTab, setActiveTab] = useState("drafts");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);

  // Signed PDFs modal state
  const [signedPdfModalOpen, setSignedPdfModalOpen] = useState(false);
  const [signedPdfReport, setSignedPdfReport] = useState(null);

  const { tenantId, userId, accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();

  const client = clientData?.client;

  useEffect(() => {
    if (tenantId && clientId) {
      fetchReports();
    }
  }, [tenantId, clientId, activeTab]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let response;

      switch (activeTab) {
        case "drafts":
          response = await api.GeClinicalReportByTenantIdAndStatus({
            clientTenantId: tenantClientId,
            status: "DRAFT",
            accessToken,
            refreshToken,
          });
          break;
        case "submittedForApproval":
          response = await api.GetClinicalReportByApproverId({
            approverId: userId,
            clientTenantId: tenantClientId,
            accessToken,
            refreshToken,
          });
          break;
        case "approved":
          response = await api.GeClinicalReportByTenantIdAndStatus({
            clientTenantId: tenantClientId,
            status: "APPROVED",
            accessToken,
            refreshToken,
          });
          break;
        case "awaitingSignature":
          response = await api.GeClinicalReportByTenantIdAndStatus({
            clientTenantId: tenantClientId,
            status: "AWAITING_SIGNATURE",
            accessToken,
            refreshToken,
          });
          break;
        case "changeRequested":
          response = await api.GeClinicalReportByTenantIdAndStatus({
            clientTenantId: tenantClientId,
            status: "CHANGES_REQUESTED",
            accessToken,
            refreshToken,
          });
          break;
        case "clientSigned":
          response = await api.GeClinicalReportByTenantIdAndStatus({
            clientTenantId: tenantClientId,
            status: "SIGNED",
            accessToken,
            refreshToken,
          });
          break;
        default:
          response = { data: [] };
      }

      const reportsData = response?.data || [];

      // Deduplicate by id
      const seen = new Set();
      const uniqueReports = reportsData
        .filter((report) => {
          if (seen.has(report.id)) return false;
          seen.add(report.id);
          return true;
        })
        .map((report) => ({
          id: report.id,
          documentTitle: report.title || "Untitled Report",
          dateCreated: formatDate(report.createdAt, dateFormat),
          createdBy: report.creator?.fullName || "Unknown",
          approverSupervisor: report.approver?.fullName || "None",
          lastUpdated: formatDate(report.updatedAt, dateFormat),
          status: report.status || "DRAFT",
          hasChangesRequested: report.status === "CHANGES_REQUESTED",
          changeRequestedBy:
            report.status === "CHANGES_REQUESTED" ? "supervisor" : null,
          changeRequestMessage:
            report.status === "CHANGES_REQUESTED"
              ? "Changes requested by supervisor"
              : "",
          version: report.clinicalReportVersions?.length
            ? `v${report.clinicalReportVersions.length}`
            : "v1",
          clinicalReportVersions: report.clinicalReportVersions || [],
          clinicalReportChangeRequests:
            report.clinicalReportChangeRequests || [],
          hasActions: true,
        }));

      setReports(uniqueReports);

      if (uniqueReports.length < reportsData.length) {
        if (import.meta.env.DEV) console.warn(
          `Filtered ${reportsData.length - uniqueReports.length} duplicate reports`,
        );
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      showToast("Failed to load reports", "error");
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (row) => {
    setReportToDelete(row);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;

    try {
      await api.DeleteClinicalReport({
        Id: reportToDelete.id,
        accessToken,
        refreshToken,
      });

      setReports((prev) => prev.filter((r) => r.id !== reportToDelete.id));
      showToast("Report deleted successfully", "success");
    } catch (err) {
      console.error("Delete failed:", err);
      showToast("Failed to delete report", "error");
    } finally {
      setDeleteModalOpen(false);
      setReportToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setReportToDelete(null);
  };

  const handleWithdrawReport = async (row) => {
    try {
      await api.WithdrawClientClinicalReport({
        clinicalReportId: row.id,
        accessToken,
        refreshToken,
      });
      showToast("Report withdrawn successfully", "success");
      fetchReports();
    } catch (err) {
      console.error("Withdraw failed:", err);
      showToast("Failed to withdraw report", "error");
    }
  };

  const handleNudgeClient = async (row) => {
    try {
      await api.NudgeClientForReport({
        clinicalReportId: row.id,
        accessToken,
        refreshToken,
      });
      showToast("Nudge sent to client successfully", "success");
    } catch (err) {
      console.error("Nudge failed:", err);
      showToast("Failed to nudge client", "error");
    }
  };

  const handleDuplicateReport = async (row) => {
    try {
      const response = await api.DuplicateClinicalReport({
        Id: row.id,
        accessToken,
        refreshToken,
      });

      showToast("Report duplicated successfully", "success");
      fetchReports(); // Refresh list to show the new duplicate
    } catch (err) {
      console.error("Duplicate failed:", err);
      showToast("Failed to duplicate report", "error");
    }
  };

  const navigateToBuilder = (row, customMode, extra = {}) => {
    navigate("/clinical-report/report-builder", {
      state: {
        id: row.id,
        metadata: {
          documentTitle: row.documentTitle,
          dateCreated: row.dateCreated,
          createdBy: row.createdBy,
          approverSupervisor: row.approverSupervisor,
          lastUpdated: row.lastUpdated,
          status: row.status,
          version: row.version || "v1",
          hasChangesRequested: row.hasChangesRequested || false,
          changeRequestedBy: row.changeRequestedBy || null,
          changeRequestMessage: row.changeRequestMessage || "",
          clientData: clientData || {},
        },
        mode: customMode,
        activeTab,
        ...extra,
      },
    });
  };

  const tabConfig = {
    drafts: {
      label: "Drafts",
      actions: [
        {
          type: "dropdown",
          items: [
            {
              label: "Edit",
              onClick: (row) => navigateToBuilder(row, "edit"),
            },
            hasPermission("duplicate_clinical_report") && {
              label: "Duplicate",
              onClick: (row) => handleDuplicateReport(row),
            },
            {
              label: "Delete Document",
              onClick: (row) => handleDeleteClick(row),
              danger: true,
            },
          ].filter(Boolean),
        },
      ],
    },
    submittedForApproval: {
      label: "Submitted For Approval",
      actions: [
        {
          type: "dropdown",
          items: [
            hasPermission("approve_clinical_report") && {
              label: "View Document",
              onClick: (row) => navigateToBuilder(row, "submittedForApproval"),
            },
          ].filter(Boolean),
        },
      ],
    },
    approved: {
      label: "Approved",
      actions: [],
    },
    awaitingSignature: {
      label: "Awaiting Signature",
      actions: [
        {
          type: "dropdown",
          items: [
            hasPermission("view_clinical_report") && {
              label: "View",
              onClick: (row) => navigateToBuilder(row, "awaitingSignature"),
            },
            hasPermission("nudge_client") && {
              label: "Nudge Client",
              onClick: (row) => handleNudgeClient(row),
            },
            {
              label: "Withdraw",
              onClick: (row) => handleWithdrawReport(row),
              danger: true,
            },
          ].filter(Boolean),
        },
      ],
    },
    changeRequested: {
      label: "Change Requested",
      actions: [
        {
          type: "dropdown",
          items: [
            {
              label: "Edit Document (Changes Requested)",
              onClick: (row) => navigateToBuilder(row, "changeRequested"),
            },
          ],
        },
      ],
    },
    clientSigned: {
      label: "Client Signed",
      actions: [
        {
          type: "dropdown",
          items: [
            {
              label: "View Signed Document (PDF)",
              onClick: (row) => {
                setSignedPdfReport(row);
                setSignedPdfModalOpen(true);
              },
            },
            {
              label: "View Audit Trail",
              onClick: (row) => {
                navigate("/clinical-report/audit-trails", {
                  state: { reportId: row.id },
                });
              },
            },
            hasPermission("view_clinical_report") && {
              label: "View",
              onClick: (row) => navigateToBuilder(row, "clientSigned"),
            },
          ].filter(Boolean),
        },
      ],
    },
  };

  const handleStartCreating = (data) => {
    navigate("/clinical-report/report-builder", {
      state: {
        formData: data.formData,
        metadata: data.metadata,
        mode: data.mode,
      },
    });
    setIsCreateModalOpen(false);
  };

  const columns = [
    { header: "Document Title", key: "documentTitle", type: "text" },
    { header: "Date Created", key: "dateCreated", type: "text" },
    { header: "Created By", key: "createdBy", type: "text" },
    { header: "Approver/Supervisor", key: "approverSupervisor", type: "text" },
    { header: "Last Updated", key: "lastUpdated", type: "text" },
  ];

  const filters = useMemo(
    () => [
      {
        value: "documentTitle",
        label: "Document Title",
        filterFunction: "includes",
      },
      { value: "createdBy", label: "Created By", filterFunction: "includes" },
      {
        value: "approverSupervisor",
        label: "Approver/Supervisor",
        filterFunction: "includes",
      },
    ],
    [],
  );

  const currentTabConfig = tabConfig[activeTab] || { actions: [] };

  return (
    <div>
      <div className="client-dropdown-wrapper justify-end flex mt-6">
        <Button
          label="New Document/Report"
          variant="primary"
          icon={<FaPlus />}
          onClick={() => setIsCreateModalOpen(true)}
        />
      </div>

      <div className="documents-tabs w-full mt-6">
        {Object.keys(tabConfig).map((tab) => (
          <button
            key={tab}
            className={`doc-tab flex-1 ${activeTab === tab ? "doc-tab-active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tabConfig[tab].label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <CustomTable
          data={reports}
          columns={columns}
          actions={currentTabConfig.actions}
          filters={filters}
          itemsPerPage={10}
          showCheckbox={false}
          showActions={!!currentTabConfig.actions?.length}
          loading={loading}
          tableName="Clinical Reports"
        />
      </div>

      <CreateAReportDocumentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onStartCreating={handleStartCreating}
        clientData={client}
      />

      {/* Delete Confirmation Modal */}
      <DeleteReportConfirmModal
        isOpen={deleteModalOpen}
        reportTitle={reportToDelete?.documentTitle || ""}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      {/* Signed PDFs Modal */}
      <SignedPdfsModal
        isOpen={signedPdfModalOpen}
        onClose={() => {
          setSignedPdfModalOpen(false);
          setSignedPdfReport(null);
        }}
        versions={signedPdfReport?.clinicalReportVersions || []}
        reportTitle={signedPdfReport?.documentTitle}
      />
    </div>
  );
};

export default ClinicalReportsTab;

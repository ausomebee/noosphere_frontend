import React, { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import Button from "../../../../../Components/Button/Button";
import CustomTable from "../../../../../Components/Table/CustomTable";
import CreateAReportDocumentModal from "../../../../../Components/ReusableModal/ClientModal/ClinicalReport/CreateAReportDocumentModal";
import api from "../../../../../api/TemplateAndReportApi";
import { showToast } from "../../../../../Helper/ShowToast";

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

const ClinicalReportsTab = ({ clientData }) => {
  const { tenantClientId, clientId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("drafts");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);

  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const userId = useSelector((s) => s.authentication?.user?.id);
  const accessToken = useSelector((s) => s.authentication?.user?.accessToken);
  const refreshToken = useSelector((s) => s.authentication?.user?.refreshToken);

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
            TenantId: tenantId,
            status: "DRAFT",
            accessToken,
            refreshToken,
          });
          break;
        case "submittedForApproval":
          response = await api.GetClinicalReportByApproverId({
            approverId: userId,
            accessToken,
            refreshToken,
          });
          break;
        case "approved":
          response = await api.GeClinicalReportByTenantIdAndStatus({
            TenantId: tenantId,
            status: "APPROVED",
            accessToken,
            refreshToken,
          });
          break;
        case "awaitingSignature":
          response = await api.GeClinicalReportByTenantIdAndStatus({
            TenantId: tenantId,
            status: "AWAITING_SIGNATURE",
            accessToken,
            refreshToken,
          });
          break;
        case "changeRequested":
          response = await api.GeClinicalReportByTenantIdAndStatus({
            TenantId: tenantId,
            status: "CHANGES_REQUESTED",
            accessToken,
            refreshToken,
          });
          break;
        case "clientSigned":
          response = await api.GeClinicalReportByTenantIdAndStatus({
            TenantId: tenantId,
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
          dateCreated: new Date(report.createdAt).toLocaleDateString(),
          createdBy: report.creator?.fullName || "Unknown",
          approverSupervisor: report.approver?.fullName || "None",
          lastUpdated: new Date(report.updatedAt).toLocaleDateString(),
          status: report.status || "DRAFT",
          hasChangesRequested: report.status === "CHANGES_REQUESTED",
          changeRequestedBy:
            report.status === "CHANGES_REQUESTED" ? "supervisor" : null,
          changeRequestMessage:
            report.status === "CHANGES_REQUESTED"
              ? "Changes requested by supervisor"
              : "",
          version: "v1",
          hasActions: true,
        }));

      setReports(uniqueReports);

      if (uniqueReports.length < reportsData.length) {
        console.warn(
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
            {
              label: "Duplicate",
              onClick: (row) => handleDuplicateReport(row),
            },
            {
              label: "Delete Document",
              onClick: (row) => handleDeleteClick(row),
              danger: true,
            },
          ],
        },
      ],
    },
    submittedForApproval: {
      label: "Submitted For Approval",
      actions: [
        {
          type: "dropdown",
          items: [
            {
              label: "View Document",
              onClick: (row) => navigateToBuilder(row, "submittedForApproval"),
            },
          ],
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
            {
              label: "View",
              onClick: (row) => navigateToBuilder(row, "awaitingSignature"),
            },
          ],
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
                showToast("Opening signed PDF...", "info");
              },
            },
            {
              label: "View Audit Trail",
              onClick: (row) => {
                navigate("/audit-trail", { state: { documentId: row.id } });
              },
            },
            {
              label: "View",
              onClick: (row) => navigateToBuilder(row, "clientSigned"),
            },
          ],
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
    </div>
  );
};

export default ClinicalReportsTab;

// ClinicalReports.jsx - Updated with plain CSS delete modal
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import { FiEdit2 } from "react-icons/fi";
import { HiOutlineDuplicate, HiOutlineTrash } from "react-icons/hi";
import { LuEye } from "react-icons/lu";
import useAuth from "../../../hooks/useAuth";
import Button from "../../../Components/Button/Button";
import CustomTable from "../../../Components/Table/CustomTable";
import { showToast } from "../../../Helper/ShowToast";
import CreateNewTemplateModal from "../../../Components/ReusableModal/SettingsModal/CreateNewTemplateModal";
import usePermissions from "../../../hooks/usePermissions";
import api from "../../../api/TemplateAndReportApi";

// ────────────────────────────────────────────────
// Delete Confirmation Modal - using inline styles + plain CSS
// ────────────────────────────────────────────────
const DeleteConfirmModal = ({ isOpen, templateName, onConfirm, onCancel }) => {
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
            color: "#1f2937",
            marginBottom: "16px",
          }}
        >
          Confirm Deletion
        </h3>

        <p
          style={{
            color: "#4b5563",
            marginBottom: "24px",
            lineHeight: "1.5",
          }}
        >
          Are you sure you want to delete the template{" "}
          <span
            style={{
              fontWeight: 500,
              color: "#dc2626",
            }}
          >
            "{templateName}"
          </span>
          ?
          <br />
          This action cannot be undone.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              color: "#4b5563",
              backgroundColor: "transparent",
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

const ClinicalReports = () => {
  const navigate = useNavigate();
  const { tenantId, accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  useEffect(() => {
    if (!tenantId) return;

    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const response = await api.GetClinicalReportTemplateByTenantId({
          tenantId,
          accessToken,
          refreshToken,
        });

        const templateData = response?.data || [];
        const formatted = Array.isArray(templateData)
          ? templateData.map((t) => ({
              id: t.id || t._id,
              name: t.title || t.name || "Untitled Template",
              hasActions: true,
              isDraft: t.isDraft ?? true,
              sections: t.sections || [],
              tenantId: t.tenantId,
            }))
          : [];

        setTemplates(formatted);
      } catch (err) {
        console.error("Error fetching templates:", err);
        showToast("Failed to load templates", "error");
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [tenantId, accessToken, refreshToken]);

  const handleCreateTemplate = ({ initialTitle }) => {
    // ← changed from templateName → initialTitle

    if (!initialTitle?.trim()) {
      showToast("Please enter a template name", "warning");
      return;
    }

    navigate("/clinical-report/template-builder", {
      state: {
        mode: "newTemplate",
        initialTitle: initialTitle.trim(),
        tenantId,
      },
    });

    setIsNewTemplateModalOpen(false);
  };

  const handleDeleteClick = (row) => {
    setTemplateToDelete(row);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;

    try {
      await api.DeleteClinicalReportTemplate({
        Id: templateToDelete.id,
        accessToken,
        refreshToken,
      });

      setTemplates((prev) => prev.filter((t) => t.id !== templateToDelete.id));
      showToast("Template deleted successfully", "success");
    } catch (err) {
      console.error("Delete failed:", err);
      showToast("Failed to delete template", "error");
    } finally {
      setDeleteModalOpen(false);
      setTemplateToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setTemplateToDelete(null);
  };

  const actions = [
    {
      type: "icon",
      label: "View",
      icon: <LuEye className="w-5 h-5 text-blue-600" />,
      onClick: (row) =>
        navigate("/clinical-report/template-builder", {
          state: {
            id: row.id,
            mode: "viewTemplate",
            initialTitle: row.name,
            sections: row.sections,
            tenantId: row.tenantId,
          },
        }),
    },
    hasPermission("edit_clinical_report_templates") && {
      type: "icon",
      label: "Edit",
      icon: <FiEdit2 className="w-5 h-5" />,
      onClick: (row) =>
        navigate("/clinical-report/template-builder", {
          state: {
            id: row.id,
            mode: "editTemplate",
            initialTitle: row.name,
            sections: row.sections,
            tenantId: row.tenantId,
          },
        }),
    },
    hasPermission("duplicate_clinical_report_template") && {
      type: "icon",
      label: "Duplicate",
      icon: <HiOutlineDuplicate className="w-5 h-5 text-green-600" />,
      onClick: async (row) => {
        try {
          const response = await api.DuplicateClinicalReportTemplate({
            Id: row.id,
            accessToken,
            refreshToken,
          });

          const duplicated = response?.data || response;
          const duplicatedId = duplicated?.id || Date.now().toString();
          const duplicatedName = duplicated?.title || `${row.name} (Copy)`;

          setTemplates((prev) => [
            ...prev,
            {
              id: duplicatedId,
              name: duplicatedName,
              hasActions: true,
              isDraft: true,
              sections: row.sections || [],
              tenantId: row.tenantId,
            },
          ]);

          showToast("Template duplicated successfully", "success");
        } catch (err) {
          console.error("Duplicate failed:", err);
          showToast("Could not duplicate template", "error");
        }
      },
    },
    hasPermission("delete_clinical_report_template") && {
      type: "icon",
      label: "Delete",
      icon: <HiOutlineTrash className="w-5 h-5 text-red-600" />,
      onClick: handleDeleteClick,
    },
  ].filter(Boolean);

  const columns = [{ header: "Template Name", key: "name", type: "text" }];

  return (
    <div style={{ padding: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "24px",
        }}
      >
        {hasPermission("create_clinical_report_template") && (
          <Button
            label="Create New Template"
            variant="primary"
            icon={<FaPlus />}
            onClick={() => setIsNewTemplateModalOpen(true)}
          />
        )}
      </div>

      <CustomTable
        tableName="Clinical Report Templates"
        data={templates}
        columns={columns}
        actions={actions}
        showActions={true}
        showCheckbox={false}
        itemsPerPage={10}
        loading={loading}
      />

      <CreateNewTemplateModal
        isOpen={isNewTemplateModalOpen}
        onClose={() => setIsNewTemplateModalOpen(false)}
        onStartCreating={handleCreateTemplate}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        templateName={templateToDelete?.name || ""}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
};

export default ClinicalReports;

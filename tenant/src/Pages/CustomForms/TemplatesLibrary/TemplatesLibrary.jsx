import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import Button from "../../../Components/Button/Button";
import { LuEye } from "react-icons/lu";
import { HiOutlineDuplicate, HiOutlineTrash } from "react-icons/hi";
import { FiEdit2 } from "react-icons/fi";
import CustomTable from "../../../Components/Table/CustomTable";
import DeleteConfirmationModal from "../../../Components/ReusableModal/PipelineModal/DeleteConfirmationModal";
import api from "../../../api/customFormsApi";
import useAuth from "../../../hooks/useAuth";
import { showToast, showApiError } from "../../../Helper/ShowToast";
import usePermissions from "../../../hooks/usePermissions";
import AccessDenied from "../../../Components/AccessDenied/AccessDenied";

const TemplatesLibrary = () => {
  const navigate = useNavigate();
  const { tenantId, accessToken, refreshToken } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermissions();

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Templates on Mount
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!tenantId) return;

      setLoading(true);
      try {
        const res = await api.GetTemplatesByTenantId({
          tenantId,
          accessToken,
          refreshToken,
        });

        const templates = res?.data?.data ?? [];
        if (templates.length > 0) {
          const formatted = templates.map((t) => ({
            id: t.id,
            name: t.name,
            hasActions: true,
            _raw: t,
          }));
          setTableData(formatted);
        } else {
          showToast("No templates found", "error");
        }
      } catch (err) {
        console.error("Fetch templates error:", err);
        showApiError(err, "LOAD_TEMPLATES");
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [tenantId, accessToken, refreshToken]);

  const columns = [{ header: "Name", key: "name", type: "text" }];

  const actions = [
    hasPermission("edit_template") && {
      type: "icon",
      label: "Edit",
      icon: <FiEdit2 className="w-5 h-5" />,
      onClick: (row) => navigate(`/custom-forms/forms/create/${row.id}`),
    },
    hasPermission("duplicate_template") && {
      type: "icon",
      label: "Duplicate",
      icon: <HiOutlineDuplicate className="w-5 h-5 text-green-600" />,
      onClick: async (row) => {
        try {
          const res = await api.DuplicateFormByFormId({
            formId: row.id,
            accessToken,
            refreshToken,
          });

          if (res?.data?.id) {
            const newCopy = {
              id: res.data.id,
              name: `${row.name} (Copy)`,
              hasActions: true,
              _raw: res.data,
            };
            setTableData((prev) => [...prev, newCopy]);
          }

          showToast("Template duplicated successfully", "success");
        } catch (e) {
          showToast(e.message || "Failed to duplicate template", "error");
        }
      },
    },
    hasPermission("delete_template") && {
      type: "icon",
      label: "Delete",
      icon: <HiOutlineTrash className="w-5 h-5 text-red-600" />,
      onClick: (row) => setRowToDelete(row),
      className: "remove",
    },
  ].filter(Boolean);

  const handleDeleteTemplate = async () => {
    if (!rowToDelete) return;
    setDeleting(true);
    try {
      await api.DeleteFormsByFormId({
        formId: rowToDelete.id,
        active: "delete",
        accessToken,
        refreshToken,
      });
      showToast("Template deleted successfully", "success");
      setTableData((prev) => prev.filter((item) => item.id !== rowToDelete.id));
      setRowToDelete(null);
    } catch (e) {
      showToast(e.message || "Failed to delete template", "error");
    } finally {
      setDeleting(false);
    }
  };

  if (!hasAnyPermission("view_template_list", "view_template"))
    return <AccessDenied />;

  return (
    <>
      <div>
        <h1 className="text-2xl text-gray-400 font-semibold">Template Library</h1>
        <h3 className="text-base text-gray-700 font-medium">
          Ready-to-use forms and documentation templates for streamlined service
          delivery
        </h3>
      </div>

      {hasPermission("create_template") && (
        <div className="justify-end flex mt-6">
          <Button
            label="New Template"
            variant="primary"
            icon={<FaPlus />}
            onClick={() => navigate("/custom-forms/forms/create")}
          />
        </div>
      )}

      <div className="mt-6">
        <CustomTable
          data={tableData}
          columns={columns}
          actions={actions}
          showActions={true}
          showCheckbox={false}
          itemsPerPage={10}
          tableName="Templates Library"
          loading={loading}
          enableSearch={true}
        />
      </div>
      <DeleteConfirmationModal
        isOpen={!!rowToDelete}
        onClose={() => setRowToDelete(null)}
        onConfirm={handleDeleteTemplate}
        title="Delete Template"
        message={`Are you sure you want to delete "${rowToDelete?.name || "this template"}"? This action cannot be undone.`}
        confirmButtonText="Delete"
        confirmButtonColor="#dc2626"
        loading={deleting}
      />
    </>
  );
};

export default TemplatesLibrary;

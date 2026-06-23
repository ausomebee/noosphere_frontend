// FormDrafts.jsx
import React, { useState, useEffect } from "react";
import CustomTable from "../../../../Components/Table/CustomTable";
import DeleteConfirmationModal from "../../../../Components/ReusableModal/PipelineModal/DeleteConfirmationModal";
import { useNavigate } from "react-router-dom";
import { HiOutlineDuplicate, HiOutlineTrash } from "react-icons/hi";
import { FiEdit2 } from "react-icons/fi";
import api from "../../../../api/customFormsApi";
import useAuth from "../../../../hooks/useAuth";
import { showToast, showApiError } from "../../../../Helper/ShowToast";
import { formatDate } from "../../../../Helper/Formatters";
import useFormatSettings from "../../../../hooks/useFormatSettings";

const FormDrafts = ({ onCountChange }) => {
  const navigate = useNavigate();
  const { tenantId, accessToken, refreshToken } = useAuth();
  const { dateFormat } = useFormatSettings();

  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // FETCH DRAFTS + SEND COUNT TO PARENT
  useEffect(() => {
    const fetchDrafts = async () => {
      setLoading(true);
      try {
        const res = await api.GetDraftsByTenantId({
          tenantId,
          accessToken,
          refreshToken,
        });

        const data = res.data.data || [];
        const formatted = data.map((d) => ({
          id: d.id,
          name: d.name,
          dateCreated: formatDate(d.createdAt, dateFormat),
          hasActions: true,
        }));

        setDrafts(formatted);
        onCountChange(formatted.length); // SEND COUNT UP
      } catch (err) {
        showApiError(err, "LOAD_DRAFTS");
        onCountChange(0);
      } finally {
        setLoading(false);
      }
    };

    fetchDrafts();
  }, [tenantId, accessToken, refreshToken, onCountChange]);

  // ALSO SEND COUNT WHEN DUPLICATE/DELETE
  useEffect(() => {
    onCountChange(drafts.length);
  }, [drafts.length, onCountChange]);

  const columns = [
    { header: "Name", key: "name", type: "text" },
    { header: "Date Created", key: "dateCreated", type: "text" },
  ];

  const actions = [
    {
      type: "icon",
      label: "Edit",
      icon: <FiEdit2 className="w-5 h-5" />,
      onClick: (row) => navigate(`/custom-forms/forms/create/${row.id}`),
    },
    {
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
              dateCreated: formatDate(new Date().toISOString(), dateFormat),
              hasActions: true,
            };
            setDrafts((prev) => [...prev, newCopy]);
          }

          showToast("Draft duplicated successfully", "success");
        } catch (e) {
          showToast(e.message || "Failed to duplicate draft", "error");
        }
      },
    },
    {
      type: "icon",
      label: "Delete",
      icon: <HiOutlineTrash className="w-5 h-5 text-red-600" />,
      onClick: (row) => setRowToDelete(row),
      className: "remove",
    },
  ];

  const handleDeleteDraft = async () => {
    if (!rowToDelete) return;
    setDeleting(true);
    try {
      await api.DeleteFormsByFormId({
        formId: rowToDelete.id,
        active: "delete",
        accessToken,
        refreshToken,
      });
      setDrafts((prev) => prev.filter((d) => d.id !== rowToDelete.id));
      showToast("Draft deleted successfully", "success");
      setRowToDelete(null);
    } catch (e) {
      showToast(e.message || "Failed to delete draft", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mt-6">
      <CustomTable
        data={drafts}
        columns={columns}
        actions={actions}
        showActions={true}
        showCheckbox={false}
        itemsPerPage={10}
        tableName="Draft Forms"
        loading={loading}
      />
      <DeleteConfirmationModal
        isOpen={!!rowToDelete}
        onClose={() => setRowToDelete(null)}
        onConfirm={handleDeleteDraft}
        title="Delete Draft"
        message={`Are you sure you want to delete "${rowToDelete?.name || "this draft"}"? This action cannot be undone.`}
        confirmButtonText="Delete"
        confirmButtonColor="#dc2626"
        loading={deleting}
      />
    </div>
  );
};

export default FormDrafts;
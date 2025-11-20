// FormDrafts.jsx
import React, { useState, useEffect } from "react";
import CustomTable from "../../../../Components/Table/CustomTable";
import { useNavigate } from "react-router-dom";
import { HiOutlineDuplicate, HiOutlineTrash } from "react-icons/hi";
import { FiEdit2 } from "react-icons/fi";
import api from "../../../../api/customFormsApi";
import { useSelector } from "react-redux";
import { showToast } from "../../../../Helper/ShowToast";

// FORMAT: DD-MM-YYYY
const formatDate = (isoString) => {
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const FormDrafts = ({ onCountChange }) => {
  const navigate = useNavigate();
  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const token = useSelector((s) => s.authentication?.user?.token);
  const accessToken = token;
  const refreshToken = token;

  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

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
          dateCreated: formatDate(d.createdAt),
          hasActions: true,
        }));

        setDrafts(formatted);
        onCountChange(formatted.length); // SEND COUNT UP
      } catch (err) {
        showToast(err.message || "Failed to load drafts", "error");
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
              dateCreated: formatDate(new Date().toISOString()),
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
      onClick: async (row) => {
        if (!window.confirm(`Delete "${row.name}"?`)) return;

        try {
          await api.DeleteFormsByFormId({
            formId: row.id,
            active: "delete",
            accessToken,
            refreshToken,
          });

          setDrafts((prev) => prev.filter((d) => d.id !== row.id));
          showToast("Draft deleted successfully", "success");
        } catch (e) {
          showToast(e.message || "Failed to delete draft", "error");
        }
      },
      className: "remove",
    },
  ];

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
    </div>
  );
};

export default FormDrafts;
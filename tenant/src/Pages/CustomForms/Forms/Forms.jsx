import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import Button from "../../../Components/Button/Button";
import CustomTable from "../../../Components/Table/CustomTable";
import DeleteConfirmationModal from "../../../Components/ReusableModal/PipelineModal/DeleteConfirmationModal";
import api from "../../../api/customFormsApi";
import useAuth from "../../../hooks/useAuth";
import { showToast } from "../../../Helper/ShowToast";
import usePermissions from "../../../hooks/usePermissions";
import { formatDate } from "../../../Helper/Formatters";
import useFormatSettings from "../../../hooks/useFormatSettings";

const Forms = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  // ---- Redux -------------------------------------------------
  const { tenantId, accessToken, refreshToken } = useAuth();
  const { dateFormat } = useFormatSettings();

  // ---- Local state -------------------------------------------
  const [forms, setForms] = useState([]);       // raw API data
  const [loading, setLoading] = useState(true); // table loading flag
  const [reloadKey, setReloadKey] = useState(0);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const refreshForms = () => setReloadKey((k) => k + 1);

  // ---- Load forms on mount ------------------------------------
  useEffect(() => {
    if (!tenantId) return;

    const load = async () => {
      setLoading(true);
      try {
        const res = await api.GetFormsByTenantId({
          tenantId,
          accessToken,
          refreshToken,
        });

        const apiForms = res?.data?.data ?? [];
        setForms(apiForms);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [tenantId, accessToken, refreshToken, reloadKey]);

  // ---- Table-ready data (with DD-MM-YYYY) --------------------
  const tableData = useMemo(
    () =>
      forms.map((f) => {
        return {
          id: f.id,
          name: f.name,
          dateCreated: formatDate(f.createdAt, dateFormat),
          isDraft: f.isDraft,
          hasActions: true,
          _raw: f,
        };
      }),
    [forms, dateFormat]
  );

  // ---- Columns ------------------------------------------------
  const columns = [
    { header: "Name", key: "name", type: "text" },
    { header: "Date Created", key: "dateCreated", type: "dateTime" }, // <-- plain text
  ];

  // ---- Date filter (works on DD-MM-YYYY) ----------------------
  const filters = useMemo(() => {
    const uniqueDates = [
      ...new Set(tableData.map((f) => f.dateCreated)), // already DD-MM-YYYY
    ]
      .filter(Boolean)
      .sort()
      .reverse()
      .map((d) => ({ value: d, label: d }));

    return [
      {
        value: "dateTime",
        label: "Date",
        filterValues: uniqueDates,
        filterFunction: (row, value) => !value || row.dateCreated === value,
      },
    ];
  }, [tableData]);

  // ---- Dropdown actions ----------------------------------------
  const actions = [
    {
      type: "dropdown",
      label: "More",
      items: [
        {
          label: "View Responses",
          onClick: (row) => navigate(`/custom-forms/forms/responses/${row.id}`),
        },
        hasPermission("edit_form") && {
          label: "Edit Form",
          onClick: (row) => navigate(`/custom-forms/forms/create/${row.id}`),
        },
        hasPermission("duplicate_form") && {
          label: "Duplicate",
          onClick: async (row) => {
            try {
              await api.DuplicateFormByFormId({
                formId: row.id,
                accessToken,
                refreshToken,
              });
              showToast( "Form duplicated", "success");
              refreshForms(); // re-fetch so the duplicate appears in the table
            } catch (e) {
              showToast( e.message || "Duplicate failed", "error");
            }
          },
        },
        hasPermission("delete_form") && {
          label: (row) => (row._raw?.isDraft ? "Delete" : "Delete"),
          onClick: (row) => setRowToDelete(row),
          className: "remove",
        },
      ].filter(Boolean),
      className: "more-dropdown",
    },
  ];

  const handleDeleteForm = async () => {
    if (!rowToDelete) return;
    setDeleting(true);
    try {
      await api.DeleteFormsByFormId({
        formId: rowToDelete.id,
        active: "delete",
        accessToken,
        refreshToken,
      });
      showToast("Form deleted", "success");
      setForms((prev) => prev.filter((f) => f.id !== rowToDelete.id));
      setRowToDelete(null);
    } catch (e) {
      showToast(e.message || "Operation failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  // ---- Create new form ----------------------------------------
  const handleAddForm = () => {
    navigate("/custom-forms/forms/create");
  };

  // ----------------------------------------------------------------
  return (
    <>
      <div>
        <h1 className="text-2xl text-gray-400 font-semibold">Forms</h1>
        <h3 className="text-base text-gray-700 font-500">
          Setup and manage forms and documents used in your practice
        </h3>
      </div>

      {hasPermission("create_form") && (
        <div className="justify-end flex mt-6">
          <Button
            label="Create a new form"
            variant="primary"
            icon={<FaPlus />}
            onClick={handleAddForm}
          />
        </div>
      )}

      <div className="mt-6">
        <CustomTable
          data={tableData}
          columns={columns}
          actions={actions}
          filters={filters}
          showActions={true}
          showCheckbox={false}
          itemsPerPage={10}
          tableName="Forms"
          loading={loading}
          enableSearch={true}
          // Clicking a form row opens the builder (edit). Without this the table
          // falls back to the first "View"-labelled action — "View Responses" —
          // and routes to responses instead.
          onActionClick={(row) =>
            navigate(`/custom-forms/forms/create/${row.id}`)
          }
        />
      </div>
      <DeleteConfirmationModal
        isOpen={!!rowToDelete}
        onClose={() => setRowToDelete(null)}
        onConfirm={handleDeleteForm}
        title="Delete Form"
        message={`Are you sure you want to delete "${rowToDelete?.name || "this form"}"? This action cannot be undone.`}
        confirmButtonText="Delete"
        confirmButtonColor="#dc2626"
        loading={deleting}
      />
    </>
  );
};

export default Forms;
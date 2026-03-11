import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import Button from "../../../Components/Button/Button";
import CustomTable from "../../../Components/Table/CustomTable";
import api from "../../../api/customFormsApi";
import useAuth from "../../../hooks/useAuth";
import { showToast } from "../../../Helper/ShowToast";
import usePermissions from "../../../hooks/usePermissions";

const Forms = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  // ---- Redux -------------------------------------------------
  const { tenantId, accessToken, refreshToken } = useAuth();

  // ---- Local state -------------------------------------------
  const [forms, setForms] = useState([]);       // raw API data
  const [loading, setLoading] = useState(true); // table loading flag

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
        showToast( err.message || "Failed to load forms", "error");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [tenantId, accessToken, refreshToken]);

  // ---- Table-ready data (with DD-MM-YYYY) --------------------
  const tableData = useMemo(
    () =>
      forms.map((f) => {
        // ---- Parse ISO → DD-MM-YYYY ----
        const d = new Date(f.createdAt);
        const day = String(d.getUTCDate()).padStart(2, "0");
        const month = String(d.getUTCMonth() + 1).padStart(2, "0");
        const year = d.getUTCFullYear();
        const formatted = `${day}-${month}-${year}`;

        return {
          id: f.id,
          name: f.name,
          dateCreated: formatted, // <-- formatted string
          isDraft: f.isDraft,
          hasActions: true,
          _raw: f,
        };
      }),
    [forms]
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
            } catch (e) {
              showToast( e.message || "Duplicate failed", "error");
            }
          },
        },
        hasPermission("delete_form") && {
          label: (row) => (row._raw?.isDraft ? "Delete" : "Delete"),
          onClick: async (row) => {
            const action = "delete";
            try {
              await api.DeleteFormsByFormId({
                formId: row.id,
                active: action,
                accessToken,
                refreshToken,
              });
              showToast( `Form ${action}d`, "success");
              setForms((prev) => prev.filter((f) => f.id !== row.id));
            } catch (e) {
              showToast( e.message || "Operation failed", "error");
            }
          },
          className: "remove",
        },
      ].filter(Boolean),
      className: "more-dropdown",
    },
  ];

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
        />
      </div>
    </>
  );
};

export default Forms;
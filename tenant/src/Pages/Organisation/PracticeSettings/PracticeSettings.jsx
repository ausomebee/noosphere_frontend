import React, { useMemo, useState, useEffect } from "react";
import DashboardLayout from "../../../Layout/TenantLayout";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../Components/Table/CustomTable";
import Button from "../../../Components/Button/Button";
import AddSessionTypeModal from "../../../Components/ReusableModal/OrganizationModal/AddSessionTypeModal";
import AddDiagnosisCode from "../../../Components/ReusableModal/OrganizationModal/AddDiagnosisCode";
import api from "../../../api/organisationApis";
import { useSelector } from "react-redux";
import { showToast } from "../../../Helper/ShowToast";

const PracticeSettings = () => {
  const [view, setView] = useState("diagnosisCodes");
  const [selectedRow, setSelectedRow] = useState(null);
  const [modalMode, setModalMode] = useState("add");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [diagnosisCodes, setDiagnosisCodes] = useState([]);
  const [sessionTypes, setSessionTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  const tenantId = useSelector((state) => state.authentication?.user?.tenantId);
  const token = useSelector((s) => s.authentication?.user?.token);
  const accessToken = token;
  const refreshToken = token;

  /* ----------------------------- FETCH DATA ----------------------------- */
  useEffect(() => {
    if (tenantId) {
      fetchDiagnosisCodes();
      fetchSessionTypes();
    }
  }, [tenantId]);

  const fetchDiagnosisCodes = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const response = await api.GetDiagnosisCodeByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });

      const codes = Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      const updatedCodes = codes.map((code) => ({ ...code, hasActions: true }));

      setDiagnosisCodes(updatedCodes);
    } catch (error) {
      showToast(error.message || "Failed to fetch diagnosis codes", "error");
      console.error("Error fetching diagnosis codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionTypes = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const response = await api.GetSessionTypeByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });

      const types = Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      const updatedTypes = types.map((type) => ({ ...type, hasActions: true }));

      setSessionTypes(updatedTypes);
    } catch (error) {
      showToast(error.message || "Failed to fetch session types", "error");
      console.error("Error fetching session types:", error);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------ TABLE COLUMNS & ACTIONS ------------------------ */
  const DiagnosisCodesColumns = [
    { header: "Diagnosis Description", key: "description", type: "text" },
    { header: "Code", key: "code", type: "text" },
    { header: "Status", key: "isActive", type: "active" },
  ];

  const SessionTypesColumns = [
    { header: "Name", key: "name", type: "text" },
    { header: "Category", key: "category", type: "text" },
    {
      header: "CPT Code(s)",
      key: "service",
      type: "custom",
      render: (row) => {
        const service = row.service;

        if (!service || typeof service !== "object") return "-";

        if (Array.isArray(service)) {
          return (
            service
              .map((s) => s.modifierType || "-")
              .filter(Boolean)
              .join(", ") || "-"
          );
        } else {
          return service.modifierType || "-";
        }
      },
    },
    {
      header: "Billable",
      key: "isBillable",
      type: "text",
      render: (value) => (value ? "Yes" : "No"),
    },
    { header: "Status", key: "isActive", type: "active" },
  ];

  /* ----------------------------- CRUD HANDLERS ----------------------------- */
  const handleSaveDiagnosisCode = async (data) => {
    try {
      let response;
      if (modalMode === "edit") {
        response = await api.UpdateDiagnosisCode({
          id: selectedRow.id,
          code: data.diagnosisCode,
          description: data.description,
          tenantId,
          isActive: data.status,
          accessToken,
          refreshToken,
        });

        const updatedItem = response.data?.data || response.data;
        setDiagnosisCodes((prev) =>
          prev.map((item) =>
            item.id === selectedRow.id
              ? { ...updatedItem, hasActions: true }
              : item
          )
        );
        showToast("Diagnosis code updated successfully", "success");
      } else {
        response = await api.CreateDiagnosisCode({
          code: data.diagnosisCode,
          description: data.description,
          tenantId,
          isActive: data.status,
          accessToken,
          refreshToken,
        });

        const newItem = response.data?.data || response.data;
        setDiagnosisCodes((prev) => [
          ...prev,
          { ...newItem, hasActions: true },
        ]);
        showToast("Diagnosis code created successfully", "success");
      }
      setIsAddModalOpen(false);
      setSelectedRow(null);
    } catch (error) {
      showToast(error.message || `Failed to ${modalMode} diagnosis code`, "error");
      console.error(`Error ${modalMode} diagnosis code:`, error);
    }
  };

  const handleSaveSessionType = async (data) => {
    try {
      const sessionTypeData = {
        tenantId,
        name: data.name,
        category: data.category,
        service: data.service || [],
        staffRolesAllowed: data.staffRole ? [data.staffRole] : [],
        locationsAllowed: Array.isArray(data.location)
          ? data.location
          : [data.location].filter(Boolean),
        defaultDuration: (data.hours || 0) * 60 + (data.minutes || 0),
        isActive: data.status,
        isBillable: data.billable || false,
        hasActions: true,
      };

      let response;
      if (modalMode === "edit") {
        response = await api.UpdateOrganizationSessionType({
          id: selectedRow.id,
          ...sessionTypeData,
          accessToken,
          refreshToken,
        });

        const updatedItem = response.data?.data || response.data;
        setSessionTypes((prev) =>
          prev.map((item) =>
            item.id === selectedRow.id
              ? { ...updatedItem, hasActions: true }
              : item
          )
        );
        showToast("Session type updated successfully", "success");
      } else {
        response = await api.CreateOrganizationSessionType({
          ...sessionTypeData,
          accessToken,
          refreshToken,
        });

        const newItem = response.data?.data || response.data;
        setSessionTypes((prev) => [...prev, { ...newItem, hasActions: true }]);
        showToast("Session type created successfully", "success");
      }
      setIsAddModalOpen(false);
      setSelectedRow(null);
    } catch (error) {
      showToast(error.message || `Failed to ${modalMode} session type`, "error");
      console.error(`Error ${modalMode} session type:`, error);
    }
  };

  const handleToggleDiagnosisCodeStatus = async (id, newStatus) => {
    try {
      const response = await api.UpdateActiveDiagnosisCode({
        id,
        active: newStatus,
        accessToken,
        refreshToken,
      });
      const updatedItem = response.data?.data || response.data;
      setDiagnosisCodes((prev) =>
        prev.map((item) =>
          item.id === id ? { ...updatedItem, hasActions: true } : item
        )
      );
      showToast(
        `Diagnosis code ${newStatus ? "activated" : "deactivated"} successfully`,
        "success"
      );
    } catch (error) {
      showToast(
        error.message || "Failed to toggle diagnosis code status",
        "error"
      );
      console.error("Error toggling diagnosis code status:", error);
      throw error;
    }
  };

  const handleToggleSessionTypeStatus = async (id, newStatus) => {
    try {
      const response = await api.UpdateActiveSessionTypeByTenantId({
        id,
        active: newStatus,
        accessToken,
        refreshToken,
      });
      const updatedItem = response.data?.data || response.data;
      setSessionTypes((prev) =>
        prev.map((item) =>
          item.id === id ? { ...updatedItem, hasActions: true } : item
        )
      );
      showToast(
        `Session type ${newStatus ? "activated" : "deactivated"} successfully`,
        "success"
      );
    } catch (error) {
      showToast(
        error.message || "Failed to toggle session type status",
        "error"
      );
      console.error("Error toggling session type status:", error);
      throw error;
    }
  };

  /* ----------------------------- TABLE CONFIG ----------------------------- */
  const DiagnosisCodesActions = [
    {
      type: "dropdown",
      label: "Actions",
      items: (row) => [
        {
          label: "Edit",
          onClick: () => {
            setSelectedRow(row);
            setModalMode("edit");
            setModalType("diagnosisCodes");
            setIsAddModalOpen(true);
          },
        },
        ...(row.isActive
          ? [
              {
                label: "Deactivate",
                onClick: () => handleToggleDiagnosisCodeStatus(row.id, false),
                className: "remove",
              },
            ]
          : [
              {
                label: "Activate",
                onClick: () => handleToggleDiagnosisCodeStatus(row.id, true),
                className: "activate",
              },
            ]),
      ],
    },
  ];

  const SessionTypesActions = [
    {
      type: "dropdown",
      label: "Actions",
      items: (row) => [
        {
          label: "Edit",
          onClick: () => {
            setSelectedRow(row);
            setModalMode("edit");
            setModalType("sessionTypes");
            setIsAddModalOpen(true);
          },
        },
        ...(row.isActive
          ? [
              {
                label: "Deactivate",
                onClick: () => handleToggleSessionTypeStatus(row.id, false),
                className: "remove",
              },
            ]
          : [
              {
                label: "Activate",
                onClick: () => handleToggleSessionTypeStatus(row.id, true),
                className: "activate",
              },
            ]),
      ],
    },
  ];

  const tableConfig = {
    diagnosisCodes: {
      data: diagnosisCodes,
      columns: DiagnosisCodesColumns,
      actions: DiagnosisCodesActions,
      tableName: "Diagnosis Codes",
    },
    sessionTypes: {
      data: sessionTypes,
      columns: SessionTypesColumns,
      actions: SessionTypesActions,
      tableName: "Session Types",
    },
  };

  const filters = useMemo(() => {
    if (view === "diagnosisCodes") return [];
    if (view === "sessionTypes") {
      return [
        { value: "category", label: "Category" },
        { value: "service", label: "Service" },
        { value: "isActive", label: "Status" },
      ];
    }
    return [];
  }, [view]);

  const handleAdd = () => {
    setModalMode("add");
    setModalType(view);
    setSelectedRow(null);
    setIsAddModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="appointment-sched-title mb-4">Practice Settings</h1>

        <div className="appointment-sched-view-switcher">
          <button
            onClick={() => setView("diagnosisCodes")}
            className={`appointment-sched-view-button ${
              view === "diagnosisCodes"
                ? "appointment-sched-view-button-active"
                : "appointment-sched-view-button-inactive"
            }`}
          >
            <span>Diagnosis Codes</span>
          </button>
          <button
            onClick={() => setView("sessionTypes")}
            className={`appointment-sched-view-button ${
              view === "sessionTypes"
                ? "appointment-sched-view-button-active"
                : "appointment-sched-view-button-inactive"
            }`}
          >
            <span>Session Types</span>
          </button>
        </div>

        <div className="justify-end flex mt-6">
          <Button
            label={`Add ${
              view === "diagnosisCodes" ? "Diagnosis Code" : "Session Type"
            }`}
            variant="secondary"
            icon={<FaPlus />}
            onClick={handleAdd}
            disabled={loading}
          />
        </div>

        <CustomTable
          data={tableConfig[view].data}
          columns={tableConfig[view].columns}
          actions={tableConfig[view].actions}
          filters={filters}
          showActions={true}
          showCheckbox={false}
          itemsPerPage={10}
          loading={loading}
          tableName={tableConfig[view].tableName}
        />

        {modalType === "sessionTypes" && (
          <AddSessionTypeModal
            isOpen={isAddModalOpen}
            onClose={() => {
              setIsAddModalOpen(false);
              setSelectedRow(null);
            }}
            onSave={handleSaveSessionType}
            mode={modalMode}
            initialData={selectedRow || {}}
          />
        )}

        {modalType === "diagnosisCodes" && (
          <AddDiagnosisCode
            isOpen={isAddModalOpen}
            onClose={() => {
              setIsAddModalOpen(false);
              setSelectedRow(null);
            }}
            onSave={handleSaveDiagnosisCode}
            mode={modalMode}
            initialData={selectedRow || {}}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default PracticeSettings;
import React, { useMemo, useState, useEffect } from "react";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../Components/Table/CustomTable";
import Button from "../../../Components/Button/Button";
import AddSessionTypeModal from "../../../Components/ReusableModal/OrganizationModal/AddSessionTypeModal";
import AddDiagnosisCode from "../../../Components/ReusableModal/OrganizationModal/AddDiagnosisCode";
import api from "../../../api/organisationApis";
import useAuth from "../../../hooks/useAuth";
import usePermissions from "../../../hooks/usePermissions";
import { showToast } from "../../../Helper/ShowToast";
import usePersistedTab from "../../../hooks/usePersistedTab";
// Billing settings moved here as additional Practice Settings tabs.
import ServiceCodes from "../../BillingAndPayment/Settings/SettingSubs/ServiceCodes";
import RoundingRules from "../../BillingAndPayment/Settings/SettingSubs/RoundingRules";
import PayersAndInsurance from "../../BillingAndPayment/Settings/SettingSubs/PayersAndInsurance";

const ALL_TABS = [
  { key: "diagnosisCodes", label: "Diagnosis Codes", permissionKey: "view_diagnosis_codes" },
  { key: "sessionTypes", label: "Session Types", permissionKey: "view_session_types" },
  { key: "serviceCodes", label: "Service Codes", permissionKey: "view_service_codes_list" },
  { key: "roundingRules", label: "Rounding Rules", permissionKey: "view_rounding_rules_list" },
  { key: "payersInsurance", label: "Payers & Insurance", permissionKey: "view_payers_list" },
];

const PracticeSettings = () => {
  const { tenantId, accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();

  const visibleTabs = useMemo(
    () => ALL_TABS.filter((t) => hasPermission(t.permissionKey)),
    [hasPermission]
  );

  const [view, setView] = usePersistedTab("tenant:practiceSettings", visibleTabs[0]?.key || "", visibleTabs.map((t) => t.key));
  const [selectedRow, setSelectedRow] = useState(null);
  const [modalMode, setModalMode] = useState("add");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [diagnosisCodes, setDiagnosisCodes] = useState([]);
  const [sessionTypes, setSessionTypes] = useState([]);
  const [loading, setLoading] = useState(false);

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
      setDiagnosisCodes(codes.map((code) => ({ ...code, hasActions: true })));
    } catch (error) {
      // No toast: empty/unavailable content is not an error.
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
      setSessionTypes(types.map((type) => ({ ...type, hasActions: true })));
    } catch (error) {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setLoading(false);
    }
  };

  /* ======================== TABLE COLUMNS ======================== */
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
      key: "sessionTypeServices",
      type: "custom",
      render: (row) => {
        const services = row.sessionTypeServices || [];

        if (!Array.isArray(services) || services.length === 0) return "-";

        const displayText = services
          .map((s) => {
            const code = s.serviceCode?.code || "N/A";
            const modifier = s.modifiers?.modifier
              ? ` (${s.modifiers.modifier})`
              : "";
            return `${code}${modifier}`;
          })
          .join(", ");

        // Truncate if longer than 20 characters
        return displayText.length > 20
          ? `${displayText.substring(0, 20)}...`
          : displayText;
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

  /* ======================== SAVE HANDLERS ======================== */
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
      showToast(`Failed to ${modalMode} diagnosis code`, "error");
    }
  };

  const handleSaveSessionType = async (payload) => {
    try {
      const sessionTypeData = {
        tenantId,
        ...payload,
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
      showToast(`Failed to ${modalMode} session type`, "error");
      console.error(error);
    }
  };

  /* ======================== TOGGLE STATUS ======================== */
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
        `Diagnosis code ${
          newStatus ? "activated" : "deactivated"
        } successfully`,
        "success"
      );
    } catch (error) {
      showToast("Failed to toggle status", "error");
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
      showToast("Failed to toggle status", "error");
    }
  };

  /* ======================== ACTIONS ======================== */
  const DiagnosisCodesActions = [
    {
      type: "dropdown",
      label: "Actions",
      items: (row) => [
        hasPermission("edit_diagnosis_codes") && {
          label: "Edit",
          onClick: () => {
            setSelectedRow(row);
            setModalMode("edit");
            setModalType("diagnosisCodes");
            setIsAddModalOpen(true);
          },
        },
        ...(hasPermission("deactivate_diagnosis_codes")
          ? row.isActive
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
              ]
          : []),
      ].filter(Boolean),
    },
  ];

  const SessionTypesActions = [
    {
      type: "dropdown",
      label: "Actions",
      items: (row) => [
        hasPermission("edit_session_types") && {
          label: "Edit",
          onClick: () => {
            setSelectedRow(row);
            setModalMode("edit");
            setModalType("sessionTypes");
            setIsAddModalOpen(true);
          },
        },
        ...(hasPermission("deactivate_session_types")
          ? row.isActive
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
              ]
          : []),
      ].filter(Boolean),
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
    return [
      { value: "category", label: "Category" },
      { value: "sessionTypeServices", label: "Service" },
      { value: "isActive", label: "Status" },
    ];
  }, [view]);

  const handleAdd = () => {
    setModalMode("add");
    setModalType(view);
    setSelectedRow(null);
    setIsAddModalOpen(true);
  };

  if (!visibleTabs.length) return null;

  return (
    <>
      <div className="p-6">
        <h1 className="appointment-sched-title mb-4">Practice Settings</h1>

        <div className="appointment-sched-view-switcher">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`appointment-sched-view-button ${
                view === tab.key
                  ? "appointment-sched-view-button-active"
                  : "appointment-sched-view-button-inactive"
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {view === "serviceCodes" ? (
          <ServiceCodes />
        ) : view === "roundingRules" ? (
          <RoundingRules />
        ) : view === "payersInsurance" ? (
          <PayersAndInsurance />
        ) : (
          <>
            {((view === "diagnosisCodes" && hasPermission("add_diagnosis_codes")) ||
              (view === "sessionTypes" && hasPermission("add_session_types"))) && (
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
            )}

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
          </>
        )}
      </div>
    </>
  );
};

export default PracticeSettings;

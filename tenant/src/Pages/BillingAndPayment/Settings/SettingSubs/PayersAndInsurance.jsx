import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../../Components/Table/CustomTable";
import AddPayerModal from "../../../../Components/ReusableModal/BillingAndPaymentModal/AddPayerModal";
import AddInsuranceTypeModal from "../../../../Components/ReusableModal/BillingAndPaymentModal/AddInsuranceTypeModal";
import useAuth from "../../../../hooks/useAuth";
import { showToast } from "../../../../Helper/ShowToast";
import api from "../../../../api/billingAndPaymentsApi";
import usePermissions from "../../../../hooks/usePermissions";
import usePersistedTab from "../../../../hooks/usePersistedTab";

const SUB_TABS = [
  { key: "payers", label: "Payers", permissionKey: "view_payers_list" },
  { key: "insuranceTypes", label: "Insurance Types", permissionKey: "view_insurance_list" },
];

const PayersAndInsurance = () => {
  const navigate = useNavigate();
  const { tenantId, accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();

  const visibleTabs = useMemo(
    () => SUB_TABS.filter((t) => hasPermission(t.permissionKey)),
    [hasPermission]
  );

  const [activeTab, setActiveTab] = usePersistedTab("tenant:payersAndInsurance", visibleTabs[0]?.key || "", visibleTabs.map((t) => t.key));
  const [payerModalOpen, setPayerModalOpen] = useState(false);
  const [insuranceTypeModalOpen, setInsuranceTypeModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [mode, setMode] = useState("add");

  const [insuranceTypeTableData, setInsuranceTypeTableData] = useState([]);
  const [payerTableData, setPayerTableData] = useState([]);
  const [serviceCodeTableData, setServiceCodeTableData] = useState([]);
  const [roundingRuleTableData, setRoundingRuleTableData] = useState([]);
  const [insuranceTypeLoading, setInsuranceTypeLoading] = useState(true);
  const [payerLoading, setPayerLoading] = useState(true);
  const [serviceCodeLoading, setServiceCodeLoading] = useState(true);
  const [roundingRuleLoading, setRoundingRuleLoading] = useState(true);
  const [insuranceTypeSaving, setInsuranceTypeSaving] = useState(false);
  const [payerSaving, setPayerSaving] = useState(false);

  // Fetch insurance types on mount
  useEffect(() => {
    if (tenantId) {
      fetchInsuranceTypes();
    }
  }, [tenantId, accessToken, refreshToken]);

  // Fetch payers after insurance types load (or on mount)
  useEffect(() => {
    if (tenantId && insuranceTypeTableData.length >= 0) { // Runs on mount + when insurance types update
      fetchPayers();
    }
  }, [tenantId, insuranceTypeTableData, accessToken, refreshToken]);

  const fetchInsuranceTypes = async () => {
    setInsuranceTypeLoading(true);
    try {
      const response = await api.GetInsuranceTypeByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const data = response.data || [];
      const transformedData = data.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        isActive: item.isActive,
        hasActions: true,
        fullData: item,
      }));
      setInsuranceTypeTableData(transformedData);
    } catch {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setInsuranceTypeLoading(false);
    }
  };

  const fetchPayers = async () => {
    setPayerLoading(true);
    try {
      const response = await api.GetPayerByTenantId({  // 👈 Note: If this should be GetPayersByTenantId, update the API call
        tenantId,
        accessToken,
        refreshToken,
      });
      // Assuming response is an array of { id, payerName, email, phone, insuranceTypeId, insuranceTypeName?, tplCode, carrierPayerId, address, city, state, zip, country, serviceCodes, isActive }
      // If no insuranceTypeName, map using insuranceTypeTableData
      const data = response.data || [];
      const insuranceTypeMap = new Map(
        insuranceTypeTableData.map((it) => [it.id, it.name])
      );
      const transformedData = data.map((item) => ({
        id: item.id,
        payerName: item.payerName,
        insuranceTypeName: item.insuranceTypeName || insuranceTypeMap.get(item.insuranceTypeId) || "Unknown",
        isActive: item.isActive,
        hasActions: true,
        email: item.email,
        phoneNumber: item.phone,
        tplCode: item.tplCode,
        carrierPayerId: item.carrierPayerId,
        address: item.address,
        city: item.city,
        state: item.state,
        zip: item.zip,
        country: item.country,
        serviceCodes: item.serviceCodes,
        fullData: item, // 👈 Raw API data for modal
      }));
      setPayerTableData(transformedData);
    } catch (error) {
      console.error("Payers fetch error:", error);
    } finally {
      setPayerLoading(false);
    }
  };

  // Fetch service codes on mount (for modal)
  useEffect(() => {
    if (tenantId) {
      fetchServiceCodes();
    }
  }, [tenantId, accessToken, refreshToken]);

  const fetchServiceCodes = async () => {
    setServiceCodeLoading(true);
    try {
      const response = await api.GetTenantServiceCodeByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const data = response.data || []; // Assuming response.data is array
      const transformedData = data
        .filter((item) => item.isActive) // Active only
        .map((item) => ({
          id: item.id,
          code: item.code,
          description: item.description,
          modifiers: Object.values(item.modifiers || {}).map(mod => ({ modifier: mod })), // Flatten object to array {modifier: string}
        }));
      setServiceCodeTableData(transformedData);
    } catch {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setServiceCodeLoading(false);
    }
  };

  // Fetch rounding rules on mount (for modal)
  useEffect(() => {
    if (tenantId) {
      fetchRoundingRules();
    }
  }, [tenantId, accessToken, refreshToken]);

  const fetchRoundingRules = async () => {
    setRoundingRuleLoading(true);
    try {
      const response = await api.GetRoundingRuleByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const data = response.data || []; // Assuming direct array return
      const transformedData = data
        .filter((item) => item.isActive) // Active only
        .map((item) => ({
          id: item.id,
          ruleName: item.ruleName,
          description: item.description,
          fullData: item,
        }));
      setRoundingRuleTableData(transformedData);
    } catch {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setRoundingRuleLoading(false);
    }
  };

  const insuranceTypeColumns = [
    { header: "Insurance Type", key: "name", type: "text" },
    { header: "Description", key: "description", type: "text" },
    { header: "Status", key: "isActive", type: "active" },
  ];

  const payerTypeColumns = [
    { header: "Payer Name", key: "payerName", type: "text" },
    { header: "Insurance Type", key: "insuranceTypeName", type: "text" },
    { header: "Status", key: "isActive", type: "active" },
  ];

  // Dynamic actions for insurance types
  // Shared by the row menu and the Status switch, so flipping the switch does
  // the same thing as choosing Activate/Deactivate from the menu.
  const handleToggleInsuranceTypeActive = async (row) => {
    try {
      await api.UpdateInsuranceTypeActiveness({
        id: row.id,
        isActive: !row.isActive,
        accessToken,
        refreshToken,
      });
      await fetchInsuranceTypes();
      showToast(
        `Insurance type ${row.isActive ? "deactivated" : "activated"} successfully`,
        "success",
      );
    } catch {
      showToast("Failed to update insurance type status", "error");
    }
  };

  const handleTogglePayerActive = async (row) => {
    try {
      await api.UpdatePayerActiveness({
        id: row.id,
        isActive: !row.isActive,
        accessToken,
        refreshToken,
      });
      await fetchPayers();
      showToast(
        `Payer ${row.isActive ? "deactivated" : "activated"} successfully`,
        "success",
      );
    } catch {
      showToast("Failed to update payer status", "error");
    }
  };

  const getInsuranceTypeActionsForRow = (row) => [
    {
      type: "dropdown",
      label: "More",
      items: [
        hasPermission("view_insurance_type_information") && {
          label: "View",
          onClick: () => {
            setSelectedRow(row);
            setMode("view");
            setInsuranceTypeModalOpen(true);
          },
        },
        hasPermission("edit_insurance_type") && {
          label: "Edit",
          onClick: () => {
            setSelectedRow(row);
            setMode("edit");
            setInsuranceTypeModalOpen(true);
          },
        },
        hasPermission("deactivate_insurance_type") && {
          label: row.isActive ? "Deactivate" : "Activate",
          onClick: () => handleToggleInsuranceTypeActive(row),
          className: "remove",
        },
      ].filter(Boolean),
      className: "more-dropdown",
    },
  ];

  // Dynamic actions for payers
  const getPayerActionsForRow = (row) => [
    {
      type: "dropdown",
      label: "More",
      items: [
        hasPermission("view_payer_information") && {
          label: "View",
          onClick: () => {
            navigate(`/organization/practice-settings/view-payer/${row.id}/${row.payerName}`);
          },
        },
        hasPermission("edit_payer") && {
          label: "Edit",
          onClick: () => {
            setSelectedRow(row);
            setMode("edit");
            setPayerModalOpen(true);
          },
        },
        hasPermission("deactivate_payer") && {
          label: row.isActive ? "Deactivate" : "Activate",
          onClick: () => handleTogglePayerActive(row),
          className: "remove",
        },
      ].filter(Boolean),
      className: "more-dropdown",
    },
  ];

  // Insurance type save
  const handleInsuranceTypeSave = async (data) => {
    if (mode === "view") {
      setInsuranceTypeModalOpen(false);
      setSelectedRow(null);
      setMode("add");
      return;
    }

    setInsuranceTypeSaving(true);
    try {
      const apiPayload = {
        tenantId,
        name: data.name,
        description: data.description || "",
        isActive: true,
      };

      let response;
      if (mode === "edit" && selectedRow) {
        apiPayload.id = selectedRow.id;
        apiPayload.isActive = selectedRow.isActive;
        response = await api.UpdateInsuranceType({
          ...apiPayload,
          accessToken,
          refreshToken,
        });
      } else {
        response = await api.CreateInsuranceType({
          ...apiPayload,
          accessToken,
          refreshToken,
        });
      }

      await fetchInsuranceTypes();
      setInsuranceTypeModalOpen(false);
      setSelectedRow(null);
      setMode("add");
      showToast("Insurance type saved successfully", "success");
      return response;
    } catch (error) {
      showToast("Failed to save insurance type", "error");
      throw error;
    } finally {
      setInsuranceTypeSaving(false);
    }
  };

  const handleInsuranceTypeDelete = async () => {
    if (!selectedRow || mode !== "edit") return;
    try {
      await api.UpdateInsuranceTypeActiveness({
        id: selectedRow.id,
        isActive: false,
        accessToken,
        refreshToken,
      });
      await fetchInsuranceTypes();
      setInsuranceTypeModalOpen(false);
      setSelectedRow(null);
      setMode("add");
      showToast("Insurance type deactivated successfully", "success");
    } catch {
      showToast("Failed to deactivate insurance type", "error");
    }
  };

  // Payer save
  const handlePayerSave = async (data) => {
    if (mode === "view") {
      setPayerModalOpen(false);
      setSelectedRow(null);
      setMode("add");
      return;
    }

    setPayerSaving(true);
    try {
      // insuranceType is now id directly from form
      const insuranceTypeId = data.insuranceType;
      if (!insuranceTypeId) {
        throw new Error("Invalid insurance type selected");
      }

      const apiPayload = {
        tenantId,
        payerName: data.payerName,
        email: data.email,
        phone: data.phoneNumber,
        insuranceTypeId,
        tplCode: data.tplCode,
        carrierPayerId: data.carrierPayerId,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        country: data.country,
        serviceCodes: data.serviceCodes,
        isActive: true,
      };

      let response;
      if (mode === "edit" && selectedRow) {
        // Edit existing
        apiPayload.id = selectedRow.id;
        apiPayload.isActive = selectedRow.isActive; // Preserve status
        response = await api.UpdatePayer({
          ...apiPayload,
          accessToken,
          refreshToken,
        });
      } else {
        // Add new
        response = await api.CreatePayer({
          ...apiPayload,
          accessToken,
          refreshToken,
        });
      }

      // Refetch data after save
      await fetchPayers();
      setPayerModalOpen(false);
      setSelectedRow(null);
      setMode("add");
      showToast("Payer saved successfully", "success");
      return response;
    } catch (error) {
      showToast("Failed to save payer", "error");
      throw error; // Let modal handle error display if needed
    } finally {
      setPayerSaving(false);
    }
  };

  const handlePayerDelete = async () => {
    if (!selectedRow || mode !== "edit") return;
    try {
      await api.UpdatePayerActiveness({
        id: selectedRow.id,
        isActive: false,
        accessToken,
        refreshToken,
      });
      // Refetch data after deactivate
      await fetchPayers();
      setPayerModalOpen(false);
      setSelectedRow(null);
      setMode("add");
      showToast("Payer deactivated successfully", "success");
    } catch {
      showToast("Failed to deactivate payer", "error");
    }
  };

  if (!visibleTabs.length) return null;

  return (
    <div>
      <h2 className="text-20px mt-6 text-gray-400">
        Manage the Payers & Insurance your organization works with
      </h2>

      <div className="tabs mt-6">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab flex items-center justify-center ${
              activeTab === tab.key ? "active" : ""
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      {activeTab === "payers" && (
        <div>
          {hasPermission("add_payer") && (
            <div className="justify-end flex mt-6">
              <Button
                label="Add a Payer"
                variant="secondary"
                icon={<FaPlus />}
                onClick={() => {
                  setSelectedRow(null);
                  setMode("add");
                  setPayerModalOpen(true);
                }}
                disabled={payerSaving || serviceCodeLoading || roundingRuleLoading}
              />
            </div>
          )}

          <div className="mt-6">
            <CustomTable
              data={payerTableData}
              columns={payerTypeColumns}
              actions={getPayerActionsForRow}
              onToggleActive={hasPermission("deactivate_payer") ? handleTogglePayerActive : undefined}
              tableName="Payers"
              itemsPerPage={10}
              showActions={true}
              showCheckbox={false}
              loading={payerLoading}
            />
          </div>
        </div>
      )}

      {activeTab === "insuranceTypes" && (
        <div>
          {hasPermission("add_insurance_type") && (
            <div className="justify-end flex mt-6">
              <Button
                label="Add an Insurance Type"
                variant="secondary"
                icon={<FaPlus />}
                onClick={() => {
                  setSelectedRow(null);
                  setMode("add");
                  setInsuranceTypeModalOpen(true);
                }}
                disabled={insuranceTypeSaving}
              />
            </div>
          )}
          <div className="mt-6">
            <CustomTable
              data={insuranceTypeTableData}
              columns={insuranceTypeColumns}
              actions={getInsuranceTypeActionsForRow}
              onToggleActive={hasPermission("deactivate_insurance_type") ? handleToggleInsuranceTypeActive : undefined}
              tableName="Insurance Types"
              itemsPerPage={10}
              showActions={true}
              showCheckbox={false}
              loading={insuranceTypeLoading}
            />
          </div>
        </div>
      )}

      <AddPayerModal
        isOpen={payerModalOpen}
        onClose={() => {
          setPayerModalOpen(false);
          setSelectedRow(null);
          setMode("add");
        }}
        onSave={handlePayerSave}
        mode={mode}
        initialData={selectedRow?.fullData || {}} 
        onDelete={handlePayerDelete}
        loading={payerSaving}
        insuranceTypes={insuranceTypeTableData}
        serviceCodes={serviceCodeTableData}
        roundingRules={roundingRuleTableData}
      />

      <AddInsuranceTypeModal
        isOpen={insuranceTypeModalOpen}
        onClose={() => {
          setInsuranceTypeModalOpen(false);
          setSelectedRow(null);
          setMode("add");
        }}
        onSave={handleInsuranceTypeSave}
        mode={mode}
        initialData={selectedRow?.fullData || {}}
        isLoading={insuranceTypeSaving}
        onDelete={handleInsuranceTypeDelete}
      />
    </div>
  );
};

export default PayersAndInsurance;
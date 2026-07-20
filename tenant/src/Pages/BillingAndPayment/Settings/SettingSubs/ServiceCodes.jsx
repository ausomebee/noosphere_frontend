import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../../Components/Table/CustomTable";
import AddServiceCodeModal from "../../../../Components/ReusableModal/BillingAndPaymentModal/AddServiceCodeModal";
import useAuth from "../../../../hooks/useAuth";
import { showToast } from "../../../../Helper/ShowToast";
import api from "../../../../api/billingAndPaymentsApi";
import usePermissions from "../../../../hooks/usePermissions";
import AccessDenied from "../../../../Components/AccessDenied/AccessDenied";

const ServiceCodes = () => {
  const navigate = useNavigate();
  const { tenantId, accessToken, refreshToken } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermissions();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch service codes on mount
  useEffect(() => {
    fetchServiceCodes();
  }, [tenantId, accessToken, refreshToken]);

  const fetchServiceCodes = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const response = await api.GetTenantServiceCodeByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      // Assuming response.data is an array of { id, code, description, modifiers (object), isActive, isDeleted }
      const data = response.data || [];
      const transformedData = data
        .filter((item) => !item.isDeleted) // Exclude deleted items
        .map((item) => ({
          id: item.id,
          serviceCodes: item.code,
          modifiers: item.modifiers
            ? Object.values(item.modifiers).join(", ") // Transform object to joined string for display
            : "None",
          description: item.description,
          isActive: item.isActive,
          hasActions: true,
        }));
      setTableData(transformedData);
    } catch {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: "Service Code", key: "serviceCodes", type: "text" },
    { header: "Modifiers", key: "modifiers", type: "text" },
    { header: "Description", key: "description", type: "text" },
    { header: "Status", key: "isActive", type: "active" },
  ];

  const filters = [{ value: "status", label: "Status" }];

  // Transform form data modifiers array to API object format
  const transformModifiersToApiObject = (modifiersArray) => {
    return modifiersArray.reduce((acc, { modifier }, index) => {
      if (modifier) {
        acc[`modifier${index + 1}`] = modifier;
      }
      return acc;
    }, {});
  };

  const handleSave = async (data) => {
    setSaving(true);
    try {
      const apiPayload = {
        tenantId,
        code: data.code,
        description: data.description,
        isActive: data.status,
        modifiers: transformModifiersToApiObject(data.modifiers),
      };

      let response;
      if (selectedService) {
        // Edit existing
        apiPayload.id = selectedService.id;
        response = await api.UpdateTenantServiceCode({
          ...apiPayload,
          accessToken,
          refreshToken,
        });
      } else {
        // Add new
        response = await api.CreateTenantServiceCode({
          ...apiPayload,
          accessToken,
          refreshToken,
        });
      }

      // Refetch data after save
      await fetchServiceCodes();
      setIsModalOpen(false);
      setSelectedService(null);
      showToast("Service code saved successfully", "success");
      return response;
    } catch (error) {
      showToast("Failed to save service code", "error");
      throw error; // Let modal handle error display if needed
    } finally {
      setSaving(false);
    }
  };

  // Dynamic actions per row - this function is called by CustomTable for each row
  const getActionsForRow = (row) => [
    {
      type: "dropdown",
      label: "More",
      items: [
        hasPermission("edit_service_code") && {
          label: "Edit",
          onClick: () => {
            setSelectedService(row);
            setIsModalOpen(true);
          },
        },
        hasPermission("deactivate_service_code") && {
          label: row.isActive ? "Deactivate" : "Activate",
          onClick: async () => {
            try {
              await api.UpdateServiceCodeActiveness({
                id: row.id,
                isActive: !row.isActive,
                accessToken,
                refreshToken,
              });
              await fetchServiceCodes();
              showToast(`Service code ${row.isActive ? "deactivated" : "activated"} successfully`, "success");
            } catch {
              showToast("Failed to update service code status", "error");
            }
          },
        },
      ].filter(Boolean),
      className: "more-dropdown",
    },
  ];

  if (!hasAnyPermission("view_service_codes_list", "view_service_code"))
    return <AccessDenied />;

  return (
    <div>
      <h2 className="text-20px mt-6 text-gray-400">
        Setup and manage Service (CPT) codes for the services your organization offers
      </h2>

      {hasPermission("add_service_code") && (
        <div className="justify-end flex mt-6">
          <Button
            label="Add a Service Code"
            variant="secondary"
            icon={<FaPlus />}
            onClick={() => {
              setSelectedService(null);
              setIsModalOpen(true);
            }}
            disabled={saving}
          />
        </div>
      )}

      <div className="mt-6">
        <CustomTable
          data={tableData}
          columns={columns}
          actions={getActionsForRow}
          filters={filters}
          tableName="Service Codes"
          itemsPerPage={10}
          showActions={true}
          showCheckbox={false}
          loading={loading}
        />
      </div>

      <AddServiceCodeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedService(null);
        }}
        onSave={handleSave}
        mode={selectedService ? "edit" : "add"}
        initialData={selectedService || {}}
        loading={saving}
      />
    </div>
  );
};

export default ServiceCodes;
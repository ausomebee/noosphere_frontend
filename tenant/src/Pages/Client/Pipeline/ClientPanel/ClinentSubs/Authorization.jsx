// src/pages/Client/ClientSubs/AuthorizationTab.jsx

import React, { useState, useEffect } from "react";
import { FaPlus } from "react-icons/fa";
import { useSelector } from "react-redux";
import Button from "../../../../../Components/Button/Button";
import AccordionTableRobust from "../../../../../Components/Table/AccordionTableRobust";
import AddAuthorizationModal from "../../../../../Components/ReusableModal/ClientModal/ClientAuthorizationModal";
import { showToast } from "../../../../../Helper/ShowToast";
import api from "../../../../../api/clientPanelApis";
import api2 from "../../../../../api/billingAndPaymentsApi";
import { useParams } from "react-router-dom";

const AuthorizationTab = () => {
  const [authorizations, setAuthorizations] = useState([]);
  const [serviceData, setServiceData] = useState({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAuth, setEditingAuth] = useState(null);
  const [editingAuthData, setEditingAuthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingEditData, setLoadingEditData] = useState(false);
  const [serviceCodes, setServiceCodes] = useState([]);
  const [loadingServiceCodes, setLoadingServiceCodes] = useState(false);
  const { clientId, tenantClientId } = useParams();

  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const token = useSelector((s) => s.authentication?.user?.token);
  const accessToken = token;
  const refreshToken = token;

  // Fetch service codes on component mount
  const fetchServiceCodes = async () => {
    if (!tenantId || !accessToken) return;

    setLoadingServiceCodes(true);
    try {
      const response = await api2.GetTenantServiceCodeByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const data = response?.data || [];
      const serviceCodeList = data
        .filter((item) => !item.isDeleted && item.isActive)
        .map((item) => ({
          value: item.code,
          label: `${item.code} - ${item.description}`,
        }));
      setServiceCodes(serviceCodeList);
    } catch (error) {
      console.error("Failed to load service codes:", error);
      showToast("Failed to load service codes", "error");
    } finally {
      setLoadingServiceCodes(false);
    }
  };

  // Fetch authorizations on component mount or when clientId changes
  useEffect(() => {
    if (tenantClientId) {
      fetchAuthorizations();
      fetchServiceCodes();
    }
  }, [tenantClientId]);

  // In your fetchAuthorizations function, update the service data formatting:
  const fetchAuthorizations = async () => {
    if (!tenantClientId || !accessToken) return;

    setLoading(true);
    try {
      const response = await api.GetAllClientAuthorizationByTenantClientId({
        tenantClientId,
        accessToken,
        refreshToken,
      });

      const authData = response?.data?.data || [];
      console.log("Fetched authorizations:", authData);

      const formattedAuthorizations = authData.map((auth) => ({
        id: auth.id,
        name: auth.title,
        insuranceCompany: auth?.insurance?.name,
        startDate: formatDate(auth.startDate),
        endDate: auth.endDate ? formatDate(auth.endDate) : "—",
        status: getStatus(auth.startDate, auth.endDate),
        utilization: calculateUtilization(auth.serviceCodes),
        rawData: auth,
      }));

      const formattedServiceData = {};
      authData.forEach((auth) => {
        // Make sure we're properly mapping the service codes from the API response
        formattedServiceData[auth.id] =
          auth.serviceCodes?.map((service) => ({
            serviceCode: service.code || "", // This should match the field name in the table
            modifier: service.modifier || "",
            units: service.units?.toString() || "0",
            per: service.per || "",
            utilization: 0,
          })) || [];
      });

      console.log("Formatted service data:", formattedServiceData); // Debug log
      setAuthorizations(formattedAuthorizations);
      setServiceData(formattedServiceData);
    } catch (error) {
      console.error("Failed to fetch authorizations:", error);
      showToast("Failed to load authorizations", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleAuthorization = async (id) => {
    if (!id || !accessToken) return null;

    setLoadingEditData(true);
    try {
      const response = await api.GetSingleClientAuthorizationById({
        id,
        accessToken,
        refreshToken,
      });

      return response?.data || null;
    } catch (error) {
      console.error("Failed to fetch authorization details:", error);
      showToast("Failed to load authorization details", "error");
      return null;
    } finally {
      setLoadingEditData(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return "—";
    }
  };

  const getStatus = (startDate, endDate) => {
    try {
      const now = new Date();
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : null;

      if (end && now > end) return "Expired";
      if (now < start) return "Pending";
      return "Active";
    } catch (error) {
      console.error("Error determining status:", error);
      return "Unknown";
    }
  };

  const calculateUtilization = (serviceCodes) => {
    if (!serviceCodes || serviceCodes.length === 0) return 0;
    return Math.floor(Math.random() * 100);
  };

  // Table Columns
  const columns = [
    { header: "Name", key: "name" },
    {
      header: "Insurance company",
      key: "insuranceCompany",
      render: (row) => row.rawData?.payerName || row.insuranceCompany || "—",
    },
    { header: "Start date", key: "startDate" },
    { header: "End date", key: "endDate" },
    {
      header: "Status",
      key: "status",
      render: (row) => (
        <span className={`status-badge ${row.status.toLowerCase()}`}>
          {row.status}
        </span>
      ),
    },
    {
      header: "Utilization",
      key: "utilization",
      render: (row) => (
        <div className="utilization-inline">
          <div
            className="utilization-fill-inline"
            style={{
              width: `${row.utilization}%`,
              backgroundColor: row.utilization >= 80 ? "#D92D20" : "#004ABA",
            }}
          />
          <span className="utilization-text-inline">{row.utilization}%</span>
        </div>
      ),
    },
  ];

  // Handlers
  const handleAddAuthorization = async (data) => {
    try {
      const response = await api.CreateClientAuthorization({
        tenantClientId,
        title: data.title,
        authorizationNumber: data.authNumber,
        startDate: data.startDate,
        endDate: data.endDate || null,
        payer: data.payer,
        insuranceType: data.insuranceType,
        serviceCodes: data.serviceCodes.map((service) => ({
          ...service,
          units: parseInt(service.units) || 0,
        })),
        accessToken,
        refreshToken,
      });

      if (response.status === 200 || response.status === 201) {
        showToast("Authorization added successfully", "success");
        fetchAuthorizations();
        setIsAddModalOpen(false);
      }
    } catch (error) {
      console.error("Failed to create authorization:", error);
      showToast(error.message || "Failed to add authorization", "error");
    }
  };

  const handleEdit = async (auth) => {
    setEditingAuth(auth);
    setLoadingEditData(true);

    try {
      const authData = await fetchSingleAuthorization(auth.id);
      if (authData) {
        setEditingAuthData(authData);
        setIsEditModalOpen(true);
      } else {
        showToast("Failed to load authorization details", "error");
      }
    } catch (error) {
      console.error("Error loading authorization for edit:", error);
      showToast("Failed to load authorization details", "error");
    } finally {
      setLoadingEditData(false);
    }
  };

  const handleSaveServiceCodes = async (updatedServiceData) => {
    try {
      // For each authorization that has updated service codes
      const updatePromises = Object.entries(updatedServiceData).map(
        async ([authId, serviceCodes]) => {
          const auth = authorizations.find((a) => a.id === authId);
          if (!auth) return;

          // Get the original authorization data to preserve other fields
          const originalAuth = auth.rawData;

          // Prepare the update payload
          const updatePayload = {
            id: authId,
            title: originalAuth.title,
            authorizationNumber: originalAuth.authorizationNumber,
            startDate: originalAuth.startDate,
            endDate: originalAuth.endDate || null,
            payer: originalAuth.payer,
            insuranceType: originalAuth.insuranceType,
            serviceCodes: serviceCodes.map((service) => ({
              code: service.serviceCode,
              modifier: service.modifier || "",
              units: parseInt(service.units) || 0,
              per: service.per || "",
            })),
            accessToken,
            refreshToken,
          };

          // Call the update API
          return await api.UpdateClientAuthorization(updatePayload);
        }
      );

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      // Refresh the authorizations to get the updated data
      await fetchAuthorizations();

      showToast("Service codes updated successfully", "success");
      return true;
    } catch (error) {
      console.error("Failed to update service codes:", error);
      showToast(error.message || "Failed to update service codes", "error");
      return false;
    }
  };

  const handleDeactivate = async (auth) => {
    if (window.confirm("Deactivate this authorization?")) {
      try {
        setAuthorizations((prev) =>
          prev.map((a) => (a.id === auth.id ? { ...a, status: "Inactive" } : a))
        );
        showToast("Authorization deactivated", "info");
      } catch (error) {
        console.error("Failed to deactivate authorization:", error);
        showToast("Failed to deactivate authorization", "error");
      }
    }
  };

  const handleDelete = async (auth) => {
    if (window.confirm("Delete this authorization permanently?")) {
      try {
        setAuthorizations((prev) => prev.filter((a) => a.id !== auth.id));
        setServiceData((prev) => {
          const { [auth.id]: _, ...rest } = prev;
          return rest;
        });
        showToast("Authorization deleted", "success");
      } catch (error) {
        console.error("Failed to delete authorization:", error);
        showToast("Failed to delete authorization", "error");
      }
    }
  };

  // Format the editing data for the modal
  const getEditingAuthData = () => {
    if (!editingAuthData) return {};

    return {
      title: editingAuthData.title || "",
      authNumber: editingAuthData.authorizationNumber || "",
      startDate: convertToInputDate(editingAuthData.startDate),
      endDate: editingAuthData.endDate
        ? convertToInputDate(editingAuthData.endDate)
        : "",
      payer: editingAuthData.payer || "",
      insuranceType: editingAuthData.insuranceType || "",
      serviceCodes: editingAuthData.serviceCodes?.map((service) => ({
        code: service.code || "",
        modifier: service.modifier || "",
        units: service.units?.toString() || "",
        per: service.per || "",
      })) || [{ code: "", modifier: "", units: "", per: "" }],
    };
  };

  const convertToInputDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    } catch (error) {
      console.error("Error converting date for input:", dateString, error);
      return "";
    }
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setEditingAuth(null);
    setEditingAuthData(null);
  };

  return (
    <div className="authorization-tab mt-6">
      {/* Add Button */}
      <div className="flex justify-end mb-6">
        <Button
          label="Add Authorization"
          icon={<FaPlus />}
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
          disabled={!tenantClientId}
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-4">Loading authorizations...</div>
      )}

      {/* Main Table */}
      {!loading && authorizations.length > 0 && (
        <AccordionTableRobust
          data={authorizations}
          columns={columns}
          tableName="Authorizations"
          itemsPerPage={10}
          initialServiceData={serviceData}
          onServiceDataChange={setServiceData}
          isEditMode={true}
          onEdit={handleEdit}
          onDeactivate={handleDeactivate}
          onDelete={handleDelete}
          onSave={handleSaveServiceCodes} // Add this line
          serviceCodes={serviceCodes}
          loadingServiceCodes={loadingServiceCodes}
       
        />
      )}

      {/* No Data State */}
      {!loading && authorizations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No authorizations found. Click "Add Authorization" to create one.
        </div>
      )}

      {/* Modals */}
      <AddAuthorizationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddAuthorization}
        mode="add"
      />

      <AddAuthorizationModal
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        onSubmit={handleSaveServiceCodes}
        initialData={getEditingAuthData()}
        mode="edit"
      />

      {/* Loading overlay for edit modal */}
      {loadingEditData && isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg">
            Loading authorization details...
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorizationTab;

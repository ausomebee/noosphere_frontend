// src/pages/Client/ClientSubs/AuthorizationTab.jsx

import React, { useState, useEffect } from "react";
import { FaPlus } from "react-icons/fa";
import useAuth from "../../../../../hooks/useAuth";
import Button from "../../../../../Components/Button/Button";
import AccordionTableRobust from "../../../../../Components/Table/AccordionTableRobust";
import AddAuthorizationModal from "../../../../../Components/ReusableModal/ClientModal/ClientAuthorizationModal";
import { showToast, showApiError } from "../../../../../Helper/ShowToast";
import api from "../../../../../api/clientPanelApis";
import api2 from "../../../../../api/billingAndPaymentsApi";
import { useParams } from "react-router-dom";
import { formatDate } from "../../../../../Helper/Formatters";
import useFormatSettings from "../../../../../hooks/useFormatSettings";
import usePermissions from "../../../../../hooks/usePermissions";

const AuthorizationTab = () => {
  const { dateFormat } = useFormatSettings();
  const { hasPermission } = usePermissions();
  const [authorizations, setAuthorizations] = useState([]);
  const [serviceData, setServiceData] = useState({}); // authId → array of services for inline editing
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAuth, setEditingAuth] = useState(null);
  const [editingAuthData, setEditingAuthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingEditData, setLoadingEditData] = useState(false);

  // Tenant service codes for dropdowns
  const [tenantServiceCodes, setTenantServiceCodes] = useState([]);
  const [loadingTenantServiceCodes, setLoadingTenantServiceCodes] =
    useState(false);

  const { tenantClientId } = useParams();
  const { tenantId, accessToken, refreshToken } = useAuth();

  // Fetch tenant service codes (for dropdown)
  const fetchTenantServiceCodes = async () => {
    if (!tenantId || !accessToken) return;
    setLoadingTenantServiceCodes(true);
    try {
      const response = await api2.GetTenantServiceCodeByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const data = response?.data || [];
      const active = data.filter((item) => !item.isDeleted && item.isActive);

      const list = active.map((item) => ({
        id: item.id,
        code: item.code,
        description: item.description,
        label: `${item.code} - ${item.description}`,
        value: item.id,
      }));

      setTenantServiceCodes(list);
    } catch (error) {
      console.error("Failed to load service codes:", error);
    } finally {
      setLoadingTenantServiceCodes(false);
    }
  };

  useEffect(() => {
    if (tenantClientId) {
      fetchAuthorizations();
      fetchTenantServiceCodes();
    }
  }, [tenantClientId]);

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

      const formatted = authData.map((auth) => {
        // Calculate total utilization for the row
        const totalUnits =
          auth.clientAuthorizationServices?.reduce(
            (sum, s) => sum + (s.units || 0),
            0,
          ) || 0;
        const usedUnits =
          auth.clientAuthorizationServices?.reduce(
            (sum, s) => sum + (s.usedUnit || 0),
            0,
          ) || 0;
        const utilization =
          totalUnits > 0 ? Math.round((usedUnits / totalUnits) * 100) : 0;

        return {
          id: auth.id,
          name: auth.title || "Untitled",
          insuranceCompany: auth.payerDetails?.payerName || "—",
          startDate: formatAuthDate(auth.startDate),
          endDate: auth.endDate ? formatAuthDate(auth.endDate) : "—",
          status: getStatus(auth.startDate, auth.endDate),
          utilization,
          isActive: auth.isActive !== false,
          rawData: auth,
        };
      });

      // Build serviceData for inline editing from clientAuthorizationServices
      const formattedServiceData = {};
      authData.forEach((auth) => {
        const services = auth.clientAuthorizationServices || [];

        formattedServiceData[auth.id] = services.map((svc) => {
          const codeInfo = svc.serviceCode || {};
          return {
            serviceCode: svc.serviceCodeId || "",
            serviceCodeDisplay: `${codeInfo.code || "—"} - ${
              codeInfo.description || "No description"
            }`,
            modifier: svc.modifiers || "",
            units: (svc.units || 0).toString(),
            usedUnits: svc.usedUnit || 0,
            per: svc.per || "SESSION",
            utilization:
              svc.units > 0 ? Math.round((svc.usedUnit / svc.units) * 100) : 0,
          };
        });
      });

      setAuthorizations(formatted);
      setServiceData(formattedServiceData);
    } catch (error) {
      console.error("Failed to fetch authorizations:", error);
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
      console.error("Failed to fetch authorization:", error);
      return null;
    } finally {
      setLoadingEditData(false);
    }
  };

  const formatAuthDate = (d) => (d ? formatDate(d, dateFormat) : "—");
  const getStatus = (start, end) => {
    const now = new Date();
    const s = new Date(start);
    const e = end ? new Date(end) : null;
    if (e && now > e) return "Expired";
    if (now < s) return "Pending";
    return "Active";
  };

  const columns = [
    { header: "Name", key: "name" },
    { header: "Insurance company", key: "insuranceCompany" },
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

  // CREATE
  const handleAddAuthorization = async (payload) => {

    try {
      await api.CreateClientAuthorization({
        tenantClientId,
        title: payload.title,
        authorizationNumber: payload.authNumber,
        startDate: payload.startDate,
        endDate: payload.endDate || null,
        payer: payload.payer,
        insuranceType: payload.insuranceType || null,
        serviceCodes: payload.service, // Ensure modal sends correct format
        accessToken,
        refreshToken,
      });

      showToast("Authorization added successfully", "success");
      fetchAuthorizations();
      setIsAddModalOpen(false);
    } catch (error) {
      console.error(error);
      // Re-throw so the modal surfaces the error and stays open instead of closing.
      throw error;
    }
  };

  // FULL EDIT: Open modal
  const handleEdit = async (auth) => {
    setEditingAuth(auth);
    setLoadingEditData(true);
    const data = await fetchSingleAuthorization(auth.id);
    if (data) {
      setEditingAuthData(data);
      setIsEditModalOpen(true);
    }
    setLoadingEditData(false);
  };

  // FULL EDIT: Save
  const handleEditSave = async (payload) => {
    try {
      await api.UpdateClientAuthorization({
        id: editingAuth.id,
        title: payload.title,
        authorizationNumber: payload.authNumber,
        startDate: payload.startDate,
        endDate: payload.endDate || null,
        payer: payload.payer,
        insuranceType: payload.insuranceType || null,
        serviceCodes: payload.serviceCodes,
        accessToken,
        refreshToken,
      });

      showToast("Authorization updated successfully", "success");
      fetchAuthorizations();
      setIsEditModalOpen(false);
      setEditingAuth(null);
      setEditingAuthData(null);
    } catch (error) {
      console.error(error);
      // Re-throw so the modal surfaces the error and stays open instead of closing.
      throw error;
    }
  };

  // INLINE SAVE: Update clientAuthorizationServices
  const handleInlineSave = async (updatedServices) => {
    const authId = Object.keys(updatedServices)[0];
    const newServices = updatedServices[authId];

    const payloadServiceCodes = newServices.map((s) => ({
      serviceCodeId: s.serviceCode,
      modifiers: s.modifier || null,
      units: parseInt(s.units) || 0,
      per: s.per || "SESSION",
    }));

    try {
      await api.UpdateClientAuthorization({
        id: authId,
        serviceCodes: payloadServiceCodes,
        accessToken,
        refreshToken,
      });

      showToast("Service codes updated successfully", "success");
      await fetchAuthorizations();
    } catch (error) {
      console.error("Failed to update service codes:", error);
      showApiError(error, "UPDATE_SERVICE_CODES");
      throw error;
    }
  };

  // DEACTIVATE / ACTIVATE
  const handleDeactivate = async (row) => {
    const newActive = row.isActive === false; // toggle: if currently inactive → activate
    try {
      await api.SetClientAuthorizationActive({
        id: row.id,
        active: newActive,
        accessToken,
        refreshToken,
      });
      showToast(
        `Authorization ${newActive ? "activated" : "deactivated"} successfully`,
        "success"
      );
      fetchAuthorizations();
    } catch (error) {
      console.error(error);
      showApiError(error, "UPDATE_AUTH_STATUS");
    }
  };

  // DELETE (soft)
  const handleDelete = async (row) => {
    if (!window.confirm("Are you sure you want to delete this authorization?")) return;
    try {
      await api.SoftDeleteClientAuthorization({
        id: row.id,
        accessToken,
        refreshToken,
      });
      showToast("Authorization deleted successfully", "success");
      fetchAuthorizations();
    } catch (error) {
      console.error(error);
      showApiError(error, "DELETE_AUTHORIZATION");
    }
  };

  // Prepare data for full edit modal
  const getEditingAuthData = () => {
    if (!editingAuthData) return {};

    const services = (editingAuthData.clientAuthorizationServices || []).map(
      (s) => ({
        serviceCodeId: s.serviceCodeId,
        modifier: s.modifiers || "",
        units: (s.units || "").toString(),
        per: s.per || "SESSION",
      }),
    );

    return {
      title: editingAuthData.title || "",
      authNumber: editingAuthData.authorizationNumber || "",
      startDate: editingAuthData.startDate
        ? new Date(editingAuthData.startDate).toISOString().split("T")[0]
        : "",
      endDate: editingAuthData.endDate
        ? new Date(editingAuthData.endDate).toISOString().split("T")[0]
        : "",
      payer: editingAuthData.payer || "",
      insuranceType: editingAuthData.insuranceType || "",
      serviceCodes: services,
    };
  };

  return (
    <div className="authorization-tab mt-6">
      <div className="flex justify-end mb-6">
        <Button
          label="Add Authorization"
          icon={<FaPlus />}
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
          disabled={!tenantClientId}
        />
      </div>

      {loading && (
        <div className="text-center py-8">Loading authorizations...</div>
      )}

      {!loading && authorizations.length > 0 && (
        <AccordionTableRobust
          data={authorizations}
          columns={columns}
          tableName="Authorizations"
          itemsPerPage={10}
          initialServiceData={serviceData}
          onServiceDataChange={setServiceData}
          isEditMode={hasPermission("edit_authorization")}
          onEdit={hasPermission("edit_authorization") ? handleEdit : undefined}
          onDeactivate={
            hasPermission("deactivate_authorization") ? handleDeactivate : undefined
          }
          onDelete={hasPermission("delete_authorization") ? handleDelete : undefined}
          onSave={hasPermission("edit_authorization") ? handleInlineSave : undefined}
          serviceCodes={tenantServiceCodes}
          loadingServiceCodes={loadingTenantServiceCodes}
        />
      )}

      {!loading && authorizations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No authorizations found. Click "Add Authorization" to create one.
        </div>
      )}

      <AddAuthorizationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddAuthorization}
        mode="add"
      />

      <AddAuthorizationModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingAuth(null);
          setEditingAuthData(null);
        }}
        onSubmit={handleEditSave}
        initialData={getEditingAuthData()}
        mode="edit"
      />

      {loadingEditData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            Loading authorization details...
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorizationTab;

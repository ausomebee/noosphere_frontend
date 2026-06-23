import React, { useState, useEffect, useMemo, useCallback } from "react";

import CustomTable from "../../../Components/Table/CustomTable";
import Button from "../../../Components/Button/Button";
import "./ClientList.css";
import { useNavigate } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import { showToast, showApiError } from "../../../Helper/ShowToast"; // assuming you have this
import api from "../../../api/TenantApis"; // For Create & Update
import clientApi from "../../../api/clientPanelApis"; // For GetAll, Activate/Deactivate
import AddClientModal from "../../../Components/ReusableModal/ClientModal/AddClientModal";
import usePermissions from "../../../hooks/usePermissions";


const ClientList = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const { tenantId, userId, accessToken, refreshToken } = useAuth();

  // Fetch all clients for this tenant
  const fetchClients = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await clientApi.GetAllTenantsClient({
        id: tenantId,
        accessToken,
        refreshToken,
      });
      setClients(res.data.data || []);
    } catch (err) {
      showApiError(err, "LOAD_CLIENTS");
    } finally {
      setLoading(false);
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);



  // Open modal for Add or Edit
  const openAddClientModal = () => {
    setEditingClient(null);
    setIsAddClientOpen(true);
  };

  const openEditClientModal = (row) => {
    setEditingClient(row);
    setIsAddClientOpen(true);
  };

  // Handle Create or Update
  const handleSubmitClient = async (formData) => {
    setIsUpdating(true);
    try {
      if (editingClient) {
        // UPDATE
        await api.UpdateCandidate({
          id: editingClient.client.id,
          tenantId,
          ...formData,
          phoneNumber: formData.phone || null,
          accessToken,
          documents: formData.documents || [],
          refreshToken,
        });
        showToast("Client updated successfully", "success");
      } else {
        // CREATE
        await api.CreateCandidate({
          ...formData,
          tenantId,
          createdBy: userId,
          phoneNumber: formData.phone || null,
          clientPortalAccess: true,
          documents: formData.documents || [],
          accessToken,
          refreshToken,
        });
        showToast("Client created successfully", "success");
      }
      fetchClients();
      // Modal closes itself via onClose on success.
    } catch (err) {
      // Re-throw so the AddClientModal shows the error and stays open.
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  // Transform API data → table format
  const tableData = useMemo(() => {
    return clients.map((item) => ({
      id: item.id, // client-tenant relationship ID
      clientId: item.client.id,
      name: `${item.client.firstName} ${item.client.lastName}`,
      dateAdded: item.createdAt.split("T")[0],
      email: item.client.email,
      phone: item.client.phoneNumber,
      ToggleActive: item.active,
      raw: item, // for future use
      hasActions: true,
    }));
  }, [clients]);

  const columns = [
    { header: "Name", key: "name", type: "text" },
    { header: "Date Added", key: "dateAdded", type: "dateTime" },
    { header: "Email", key: "email", type: "text" },
    { header: "Phone", key: "phone", type: "text" },
    { header: "Status", key: "ToggleActive", type: "active" },
  ];

  const actions = [
    {
      type: "dropdown",
      label: "More",
      items: [
        hasPermission("view_client_profile") && {
          label: "View Client",
          onClick: (row) =>
            navigate(`/client/view-client/${row.clientId}/${row.id}`),
        },
        hasPermission("edit_client_basic_information") && {
          label: "Edit Client Information",
          onClick: (row) => openEditClientModal(row.raw),
        },
        hasPermission("deactivate_client") && {
          label: (row) =>
            row.ToggleActive ? "Deactivate Client" : "Activate Client",
          onClick: (row) => handleToggleActive(row),
          className: (row) =>
            row.ToggleActive ? "text-red-600" : "text-green-600",
        },
      ].filter(Boolean),
      className: "more-dropdown",
    },
  ];

  const handleToggleActive = useCallback(
    async (row) => {
      const clientTenantId = row.id;
      const currentActive = row.ToggleActive;

      try {
        await clientApi.UpdateActiveClient({
          clientTenantId,
          active: !currentActive,
          accessToken,
          refreshToken,
        });

        showToast(
          currentActive ? "Client deactivated" : "Client activated",
          "success"
        );

        fetchClients(); // Refresh
      } catch (err) {
        showApiError(err, "UPDATE_CLIENT_STATUS");
      }
    },
    [accessToken, refreshToken, fetchClients]
  );

  const filters = useMemo(() => {
    const uniqueDates = [...new Set(tableData.map((c) => c.dateAdded))]
      .sort()
      .reverse();
    return [
      {
        value: "dateTime",
        label: "Date Added",
        filterValues: uniqueDates.map((d) => ({ value: d, label: d })),
        filterFunction: (row, value) => !value || row.dateAdded === value,
      },
    ];
  }, [tableData]);

  return (
    <>
      <div className="client-list-container">
        <div className="client-list-header">
          <h1 className="client-list-title">Clients</h1>

          {hasPermission("add_client") && <Button
            label="Add a New Client"
            variant="primary"
            icon={
              <svg
                width="20"
                height="10"
                viewBox="0 0 20 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  opacity="0.3"
                  d="M12.8584 7.90002C11.9417 7.49169 10.9751 7.29169 10.0001 7.29169C9.01673 7.29169 8.0584 7.50002 7.14173 7.90002C6.95006 7.98335 6.8084 8.14169 6.7334 8.33335H13.2751C13.1917 8.14169 13.0501 7.98335 12.8584 7.90002Z"
                  fill="white"
                />
                <path
                  opacity="0.3"
                  d="M10.7831 2.32502C10.7165 1.94169 10.3915 1.66669 9.9998 1.66669C9.60814 1.66669 9.28314 1.94169 9.21647 2.32502L9.0498 3.33335H10.9498L10.7831 2.32502Z"
                  fill="white"
                />
                <path
                  d="M8.55836 5H11.4417C12.2167 5 12.8 4.30833 12.675 3.54167L12.425 2.05C12.225 0.866667 11.2 0 10 0C8.80002 0 7.77502 0.866667 7.57502 2.05833L7.32502 3.55C7.20002 4.30833 7.78336 5 8.55836 5ZM9.21669 2.325C9.28336 1.94167 9.60836 1.66667 10 1.66667C10.3917 1.66667 10.7167 1.94167 10.7834 2.325L10.95 3.33333H9.05002L9.21669 2.325Z"
                  fill="white"
                />
                <path
                  d="M1.38311 4.25835C1.27478 4.47502 1.23311 4.73335 1.29978 4.99169C1.43311 5.56669 1.93311 5.85002 2.57478 5.82502C2.57478 5.82502 3.81644 5.82502 4.19978 5.82502C4.89144 5.82502 5.45811 5.34169 5.45811 4.75002C5.45811 4.63335 5.43311 4.52502 5.39978 4.41669C5.39144 4.39169 5.39144 4.37502 5.40811 4.35002C5.48311 4.21669 5.52478 4.06669 5.52478 3.90835C5.52478 3.65002 5.40811 3.40835 5.22478 3.22502C5.19978 3.20002 5.19978 3.17502 5.20811 3.14169C5.26644 2.97502 5.26644 2.78335 5.21644 2.60002C5.08311 2.24169 4.75811 2.00002 4.39144 1.98335C4.36644 1.98335 4.34978 1.97502 4.33311 1.95835C4.19144 1.78335 3.93311 1.66669 3.64144 1.66669C3.39144 1.66669 3.16644 1.75002 3.01644 1.88335C2.99144 1.90835 2.96644 1.90835 2.94144 1.90002C2.82478 1.85002 2.69144 1.82502 2.55811 1.82502C2.01644 1.82502 1.57478 2.23335 1.52478 2.75835C1.52478 2.77502 1.51644 2.79169 1.49978 2.80835C1.25811 3.02502 1.11644 3.35002 1.15811 3.68335C1.18311 3.86669 1.25811 4.04169 1.36644 4.18335C1.39144 4.20002 1.39144 4.23335 1.38311 4.25835Z"
                  fill="white"
                />
                <path
                  d="M13.5333 6.375C12.5583 5.94167 11.3583 5.625 10 5.625C8.64167 5.625 7.44167 5.95 6.46667 6.375C5.56667 6.775 5 7.675 5 8.65833V10H15V8.65833C15 7.675 14.4333 6.775 13.5333 6.375ZM6.725 8.33333C6.8 8.14167 6.95 7.98333 7.13333 7.9C8.05 7.49167 9.01667 7.29167 9.99167 7.29167C10.975 7.29167 11.9333 7.5 12.85 7.9C13.0417 7.98333 13.1833 8.14167 13.2583 8.33333H6.725Z"
                  fill="white"
                />
                <path
                  d="M1.01667 7.15002C0.4 7.41669 0 8.01669 0 8.69169V10H3.75V8.65835C3.75 7.96669 3.94167 7.31669 4.275 6.75002C3.96667 6.70002 3.65833 6.66669 3.33333 6.66669C2.50833 6.66669 1.725 6.84169 1.01667 7.15002Z"
                  fill="white"
                />
                <path
                  d="M18.9834 7.15002C18.2751 6.84169 17.4918 6.66669 16.6668 6.66669C16.3418 6.66669 16.0334 6.70002 15.7251 6.75002C16.0584 7.31669 16.2501 7.96669 16.2501 8.65835V10H20.0001V8.69169C20.0001 8.01669 19.6001 7.41669 18.9834 7.15002Z"
                  fill="white"
                />
                <path
                  d="M18.3334 4.16665V3.74998C18.3334 2.83331 17.5834 2.08331 16.6667 2.08331H15.0001C14.6501 2.08331 14.4584 2.48331 14.6751 2.75831L15.2584 3.28331C15.1001 3.54165 15.0001 3.84165 15.0001 4.16665C15.0001 5.08331 15.7501 5.83331 16.6667 5.83331C17.5834 5.83331 18.3334 5.08331 18.3334 4.16665Z"
                  fill="white"
                />
              </svg>
            }
            onClick={openAddClientModal}
          />}
        </div>

        <div className="table-wrapper">
          <CustomTable
            data={tableData}
            columns={columns}
            filters={filters}
            actions={actions}
            tableName="Clients"
            itemsPerPage={10}
            loading={loading}
            showActions={true}
            showCheckbox={false}
            onToggleActive={handleToggleActive}
          />
        </div>

        <AddClientModal
          isOpen={isAddClientOpen}
          onClose={() => setIsAddClientOpen(false)}
          onSubmit={handleSubmitClient}
          initialData={editingClient || null}
          primaryButtonLoading={isUpdating}
        />
      </div>
    </>
  );
};

export default ClientList;

import React, { useState, useEffect, useCallback } from "react";
import CustomTable from "../../../../Components/Table/CustomTable";
import api from "../../../../api/organisationStaffApis";

const Client = ({ staffId, accessToken, refreshToken, tenantId }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchClients = useCallback(async () => {
    if (!staffId || !tenantId || !accessToken) return;
    setLoading(true);
    try {
      const response = await api.GetStaffClients({
        staffId,
        tenantId,
        accessToken,
        refreshToken,
      });
      const data = response?.data || response;
      const list = Array.isArray(data) ? data : [];
      setClients(list);
    } catch (error) {
      console.error("Failed to fetch staff clients:", error);
    } finally {
      setLoading(false);
    }
  }, [staffId, tenantId, accessToken, refreshToken]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const tableData = clients.map((client) => ({
    id: client.id,
    clientName:
      client.fullName ||
      `${client.firstName || ""} ${client.lastName || ""}`.trim() ||
      "Unknown Client",
    dateAdded: client.createdAt
      ? new Date(client.createdAt).toLocaleDateString()
      : "N/A",
    email: client.email || "N/A",
    emergencyContact: client.caregiverName || client.emergencyContact || "N/A",
    phoneNo: client.phoneNumber || client.phoneNo || "N/A",
    status: client.active !== undefined
      ? client.active ? "Active" : "Inactive"
      : client.status || "N/A",
  }));

  return (
    <div className="p-20">
      <CustomTable
        data={tableData}
        columns={[
          { header: "Name", key: "clientName", type: "text" },
          { header: "Date Added", key: "dateAdded", type: "text" },
          { header: "Email", key: "email", type: "text" },
          { header: "Emergency Contact", key: "emergencyContact", type: "text" },
          { header: "Phone", key: "phoneNo", type: "text" },
          { header: "Status", key: "status", type: "active" },
        ]}
        loading={loading}
        showActions={false}
        showCheckbox={false}
        itemsPerPage={10}
        hideSearch
        hideTableActions
      />
    </div>
  );
};

export default Client;

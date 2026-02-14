import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../../Layout/TenantLayout";
import CustomTable from "../../../Components/Table/CustomTable";
import api from "../../../api/billingAndPaymentsApi";
import { useSelector } from "react-redux";

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    return "Invalid date";
  }
};

const Claims = () => {
  const navigate = useNavigate();
  
  // Redux state
  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const accessToken = useSelector((s) => s.authentication?.user?.accessToken);
  const refreshToken = useSelector((s) => s.authentication?.user?.refreshToken);
  
  // State
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch claims data
  useEffect(() => {
    if (tenantId && accessToken) {
      fetchClaimsData();
    }
  }, [tenantId, accessToken]);

  const fetchClaimsData = async () => {
    try {
      setLoading(true);
      const response = await api.GetClaimsByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      
      // Transform API data to match table structure - ONLY THE 4 COLUMNS
      const transformedData = response.data.map((claim) => ({
        id: claim.id,
        date: formatDate(claim.date),
        createdBy: claim.approver?.fullName || "N/A",
        clientName: claim.clientName || "N/A",
        payer: claim.authorizationsUsed?.[0]?.payerDetails?.payerName || "N/A",
        hasActions: true,
      }));
      
      setTableData(transformedData);
    } catch (error) {
      console.error("Error fetching claims:", error);
      // Empty table if API fails
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  // Define columns - ONLY THE 4 YOU WANT
  const columns = [
    { header: "Date Created", key: "date", type: "dateTime" },
    { header: "Created By", key: "createdBy", type: "text" },
    { header: "Client Name", key: "clientName", type: "text" },
    { header: "Payer", key: "payer", type: "text" },
  ];

  // Define filters
  const filters = useMemo(
    () => [
      {
        value: "payer",
        label: "Payer",
        filterFunction: (row, value) => (value ? row.payer === value : true),
      },
      {
        value: "clientName",
        label: "Client Name",
        filterFunction: (row, value) => (value ? row.clientName === value : true),
      },
      {
        value: "createdBy",
        label: "Created By",
        filterFunction: (row, value) => (value ? row.createdBy === value : true),
      },
      {
        value: "date",
        label: "Date",
        filterFunction: (row, value) => (value ? row.date === value : true),
      },
    ],
    []
  );

  const handleActionClick = (row) => {
    navigate(`/billing/claims/view/${row.id}`);
  };

  return (
    <DashboardLayout>
      <div>
        <h1 className="appointment-sched-title">Claims</h1>
        <h3 className="text-xl text-gray-700 font-500">Manage your claims</h3>
      </div>

      <div className="mt-32">
        <CustomTable
          data={tableData}
          columns={columns}
          filters={filters}
          tableName="Claims"
          itemsPerPage={10}
          showActions={true}
          showCheckbox={false}
          actionText="View"
          actionLinkPrefix="/claims/view/"
          onActionClick={handleActionClick}
          loading={loading}
        />
      </div>
    </DashboardLayout>
  );
};

export default Claims;
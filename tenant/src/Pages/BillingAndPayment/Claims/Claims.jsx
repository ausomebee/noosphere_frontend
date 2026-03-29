import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CustomTable from "../../../Components/Table/CustomTable";
import api from "../../../api/billingAndPaymentsApi";
import useAuth from "../../../hooks/useAuth";
import { formatDate } from "../../../Helper/Formatters";
import useFormatSettings from "../../../hooks/useFormatSettings";
import { showToast } from "../../../Helper/ShowToast";

const Claims = () => {
  const navigate = useNavigate();

  // Auth state
  const { tenantId, accessToken, refreshToken } = useAuth();
  const { dateFormat } = useFormatSettings();
  
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
      const transformedData = response.map((claim) => ({
        id: claim.id,
        date: formatDate(claim.date, dateFormat),
        createdBy: claim.approver?.fullName || "N/A",
        clientName: claim.clientName || "N/A",
        payer: claim.authorizationsUsed?.[0]?.payerDetails?.payerName || "N/A",
        hasActions: true,
      }));
      
      setTableData(transformedData);
    } catch (error) {
      console.error("Error fetching claims:", error);
      showToast("Failed to load claims", "error");
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
    <>
      <div>
        <h1 className="appointment-sched-title">Claims</h1>
        <h3 className="text-base text-gray-700 font-500">Manage your claims</h3>
      </div>

      <div className="mt-6">
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
    </>
  );
};

export default Claims;
import React, { useState, useEffect, useCallback } from "react";
import useAuth from "../../../../hooks/useAuth";
import usePermissions from "../../../../hooks/usePermissions";
import CustomTable from "../../../../Components/Table/CustomTable";
import AccessDenied from "../../../../Components/AccessDenied/AccessDenied";
import api from "../../../../api/payrollApi";
import { showToast } from "../../../../Helper/ShowToast";

const EmployeePaymentSchedules = () => {
  const { tenantId, accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();

  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);

  const Columns = [
    { header: "Name", key: "Name", type: "text" },
    { header: "Status", key: "isActive", type: "active" },
  ];

  // Fetch compensation types
  const fetchCompensationTypes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.GetCompensationTypeByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });

      const transformedData = data.data.map((item) => ({
        id: item.id,
        Name: item.name || item.compensationTypeName || "Unknown",
        isActive: item.isActive !== undefined ? item.isActive : true,
        fullData: item,
      }));
      setScheduleData(transformedData);
    } catch (error) {
      console.error("Error fetching compensation types:", error);
      setScheduleData([]); // Fallback to empty array
    } finally {
      setLoading(false);
    }
  }, [tenantId, accessToken, refreshToken]);

  // Handle toggle active
  const handleToggleActive = useCallback(
    async (row) => {
      const { id, isActive } = row;
      const newIsActive = !isActive;
      const originalData = [...scheduleData];

      // Optimistically update UI
      setScheduleData((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, isActive: newIsActive } : item
        )
      );

      try {
        await api.UpdateCompensationTypeActiveness({
          id,
          isActive: newIsActive,
          accessToken,
          refreshToken,
        });
        showToast(
          `Compensation type ${newIsActive ? "activated" : "deactivated"} successfully`,
          "success"
        );
      } catch (error) {
        console.error("Error updating compensation type status:", error);
        showToast("Failed to update compensation type status", "error");
        // Revert on error
        setScheduleData(originalData);
      }
    },
    [accessToken, refreshToken, scheduleData]
  );

  useEffect(() => {
    if (tenantId) {
      fetchCompensationTypes();
    }
  }, [tenantId, fetchCompensationTypes]);

  if (!hasPermission("view_compensation_type_list")) return <AccessDenied />;

  return (
    <div>
      <CustomTable
        data={scheduleData}
        columns={Columns}
        tableName="Payment Schedule"
        itemsPerPage={10}
        showActions={false}
        showCheckbox={false}
        hideSearch={true}
        loading={loading}
        onToggleActive={
          hasPermission("activate_deactivate_compensation_type")
            ? handleToggleActive
            : undefined
        }
      />
    </div>
  );
};

export default EmployeePaymentSchedules;
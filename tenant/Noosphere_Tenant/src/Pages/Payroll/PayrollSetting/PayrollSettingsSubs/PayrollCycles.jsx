import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import Button from "../../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../../Components/Table/CustomTable";
import PayrollCycleModal from "../../../../Components/ReusableModal/PayrollModal/NewPayrollCycleModal";
import api from "../../../../api/payrollApi";
import { showToast } from "../../../../Helper/ShowToast";

const PayrollCycles = () => {
  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const token = useSelector((s) => s.authentication?.user?.token);
  const accessToken = token;
  const refreshToken = token;
  const [tableData, setTableData] = useState([]);
  const [compensationTypes, setCompensationTypes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [selectedRow, setSelectedRow] = useState(null);
  const [loading, setLoading] = useState(true);

  const Columns = [
    { header: "Name", key: "name", type: "text" },
    { header: "Period Interval (Days)", key: "periodInterval", type: "text" },
    { header: "Auto run Payroll", key: "autoRunPayroll", type: "text" },
    { header: "Status", key: "status", type: "active" },
  ];

  const Actions = [
    {
      type: "dropdown",
      label: "More",
      items: [
        {
          label: "Edit",
          onClick: (row) => {
            setSelectedRow(row);
            setMode("edit");
            setIsModalOpen(true);
          },
        },
        {
          label: (row) => (row.status ? "Deactivate" : "Activate"),
          onClick: (row) => handleToggleActive(row),
          className: "remove",
        },
      ],
      className: "more-dropdown",
    },
  ];

  // Fetch compensation types
  const fetchCompensationTypes = useCallback(async () => {
    try {
      const data = await api.GetCompensationTypeByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      console.log("Fetched compensation types:", JSON.stringify(data, null, 2));
      setCompensationTypes(
        data.data.map((item) => ({
          id: item.id,
          name: item.name || "Unknown",
        }))
      );
    } catch (error) {
      console.error("Error fetching compensation types:", error);
      showToast("Failed to load compensation types", "error");
      setCompensationTypes([]);
    }
  }, [tenantId, accessToken, refreshToken]);

  // Fetch payroll cycles
  const fetchPayrollCycles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.GetPayrollCycleByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      console.log("Fetched payroll cycles:", JSON.stringify(data, null, 2));
      const transformedData = data.data.map((item) => ({
        id: item.id,
        name: item.name || "Unknown",
        compensationTypeId: item.compensationTypeId || "",
        intervals: item.interval || 1,
        startDate: item.startDate || "",
        autoRun: item.autoRun !== undefined ? item.autoRun : false,
        periodInterval: `${item.interval || 1} day${item.interval === 1 ? "" : "s"}`,
        autoRunPayroll: item.autoRun ? "Enabled" : "Disabled",
        status: item.isActive !== undefined ? item.isActive : true,
        hasActions: true,
        fullData: item,
      }));
      setTableData(transformedData);
    } catch (error) {
      console.error("Error fetching payroll cycles:", error);
      showToast("Failed to load payroll cycles", "error");
      setTableData([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, accessToken, refreshToken]);

  // Handle toggle active
  const handleToggleActive = useCallback(
    async (row) => {
      const { id, status } = row;
      const newStatus = !status;
      try {
        await api.UpdatePayrollCycleActiveness({
          id,
          isActive: newStatus,
          accessToken,
          refreshToken,
        });
        showToast(
          `Payroll cycle ${newStatus ? "activated" : "deactivated"} successfully`,
          "success"
        );
        fetchPayrollCycles();
      } catch (error) {
        console.error("Error updating payroll cycle status:", error);
        showToast("Failed to update payroll cycle status", "error");
      }
    },
    [accessToken, refreshToken, fetchPayrollCycles]
  );

  // Handle save
  const handleSave = useCallback(
    async (data) => {
      const payload = {
        tenantId,
        name: data.name,
        compensationTypeId: data.appliesTo,
        interval: Number(data.intervals),
        startDate: data.startDate,
        autoRun: data.autoRun,
        isActive: true,
        isDeleted: false,
        accessToken,
        refreshToken,
      };

      if (mode === "edit") {
        payload.id = selectedRow.id;
        payload.isActive = selectedRow.status;
      }

      try {
        console.log("API payload:", JSON.stringify(payload, null, 2));
        if (mode === "add") {
          await api.CreatePayrollCycles(payload);
          showToast("Payroll cycle created successfully", "success");
        } else if (mode === "edit") {
          await api.UpdatePayrollCycles(payload);
          showToast("Payroll cycle updated successfully", "success");
        }
        setIsModalOpen(false);
        fetchPayrollCycles();
      } catch (error) {
        console.error(`Error saving payroll cycle:`, error);
        showToast(`Failed to ${mode === "add" ? "create" : "update"} payroll cycle`, "error");
      }
    },
    [tenantId, accessToken, refreshToken, mode, selectedRow, fetchPayrollCycles]
  );

  // Fetch compensation types when tenantId changes
  useEffect(() => {
    if (tenantId) {
      fetchCompensationTypes();
    }
  }, [tenantId, fetchCompensationTypes]);

  // Fetch payroll cycles when tenantId or compensationTypes change
  useEffect(() => {
    if (tenantId && compensationTypes.length > 0) {
      fetchPayrollCycles();
    }
  }, [tenantId, compensationTypes, fetchPayrollCycles]);

  return (
    <div>
      <div className="justify-end flex mt-6">
        <Button
          label="Add a new Cycle"
          variant="secondary"
          icon={<FaPlus />}
          onClick={() => {
            setSelectedRow(null);
            setMode("add");
            setIsModalOpen(true);
          }}
        />
      </div>
      <div className="mt-32">
        <CustomTable
          data={tableData}
          columns={Columns}
          actions={Actions}
          tableName="Payroll Cycles"
          itemsPerPage={10}
          showActions={true}
          showCheckbox={false}
          hideSearch={true}
          hideTableActions={true}
          loading={loading}
          onToggleActive={handleToggleActive}
        />
      </div>
      <PayrollCycleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        mode={mode}
        initialData={selectedRow || {}}
        compensationTypes={compensationTypes}
      />
    </div>
  );
};

export default PayrollCycles;
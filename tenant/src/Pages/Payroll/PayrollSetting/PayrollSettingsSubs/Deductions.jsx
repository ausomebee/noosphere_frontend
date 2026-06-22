import React, { useState, useEffect, useCallback } from "react";
import useAuth from "../../../../hooks/useAuth";
import usePermissions from "../../../../hooks/usePermissions";
import Button from "../../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../../Components/Table/CustomTable";
import PayrollItemModal from "../../../../Components/ReusableModal/PayrollModal/NewIncomeItemModal";
import DeleteConfirmationModal from "../../../../Components/ReusableModal/PipelineModal/DeleteConfirmationModal";
import api from "../../../../api/payrollApi";
import { showToast } from "../../../../Helper/ShowToast";

const Deductions = () => {
  const { tenantId, accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();
  const [tableData, setTableData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [selectedRow, setSelectedRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const Columns = [
    { header: "Name", key: "name", type: "text" },
    { header: "Type", key: "unitType", type: "text" },
    { header: "Rate", key: "rates", type: "text" },
    { header: "Status", key: "status", type: "active" },
  ];

  const Actions = [
    {
      type: "dropdown",
      label: "More",
      items: [
        {
          label: "View",
          onClick: (row) => {
            setSelectedRow(row);
            setMode("view");
            setIsModalOpen(true);
          },
        },
        hasPermission("edit_deductions") && {
          label: "Edit",
          onClick: (row) => {
            setSelectedRow(row);
            setMode("edit");
            setIsModalOpen(true);
          },
        },
        hasPermission("delete_deductions") && {
          label: "Delete",
          onClick: (row) => setRowToDelete(row),
          className: "remove",
        },
      ].filter(Boolean),
      className: "more-dropdown",
    },
  ];

  // Fetch deductions
  const fetchDeductions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.GetDeductionsByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const transformedData = data.data.map((item) => ({
        id: item.id,
        name: item.name || "Unknown",
        unitType: item.type || "",
        rate: item.rate || {},
        status: item.isActive !== undefined ? item.isActive : true,
        rates: formatRateDisplay(item, data.data),
        hasActions: true,
        fullData: item,
      }));
      setTableData(transformedData);
    } catch (error) {
      console.error("Error fetching deductions:", error);
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
        await api.UpdateDeductionsActiveness({
          id,
          isActive: newStatus,
          accessToken,
          refreshToken,
        });
        showToast(
          `Deduction ${newStatus ? "activated" : "deactivated"} successfully`,
          "success",
        );
        fetchDeductions(); // Refresh data
      } catch (error) {
        console.error("Error updating deduction status:", error);
        showToast("Failed to update deduction status", "error");
      }
    },
    [accessToken, refreshToken, fetchDeductions],
  );

  // Handle save
  const handleSave = useCallback(
    async (data) => {
      const cleanedRate = {};
      if (data.unitType === "Flat Rate") {
        cleanedRate.rate = Number(data.rate.rate) || 0;
      } else if (data.unitType === "Time based") {
        cleanedRate.unit = Number(data.rate.unit) || 0;
        cleanedRate.unitMinutes = Number(data.rate.unitMinutes) || 0;
        cleanedRate.duration = data.rate.duration || "";
      } else if (data.unitType === "Percentage based") {
        cleanedRate.unit = Number(data.rate.unit) || 0;
        cleanedRate.duration = data.rate.duration || "";
      }

      const payload = {
        tenantId,
        name: data.name,
        type: data.unitType,
        rate: cleanedRate,
        isActive: data.status,
        isDeleted: false,
        accessToken,
        refreshToken,
      };

      if (mode === "edit") {
        payload.id = selectedRow.id;
      }

      try {
        if (mode === "add") {
          await api.CreateDeductions(payload);
          showToast("Deduction created successfully", "success");
        } else if (mode === "edit") {
          await api.UpdateDeductions(payload);
          showToast("Deduction updated successfully", "success");
        }
        setIsModalOpen(false);
        fetchDeductions(); // Refresh data
      } catch (error) {
        console.error(`Error saving deduction:`, error);
        showToast(
          `Failed to ${mode === "add" ? "create" : "update"} deduction`,
          "error",
        );
      }
    },
    [tenantId, accessToken, refreshToken, mode, selectedRow, fetchDeductions],
  );

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!rowToDelete) return;
    setDeleting(true);
    try {
      await api.DeleteDeduction({
        id: rowToDelete.id,
        accessToken,
        refreshToken,
      });
      showToast("Deduction deleted successfully", "success");
      setRowToDelete(null);
      fetchDeductions(); // refresh the list
    } catch (error) {
      console.error("Error deleting deduction:", error);
      showToast(error.message || "Failed to delete deduction", "error");
    } finally {
      setDeleting(false);
    }
  }, [rowToDelete, accessToken, refreshToken, fetchDeductions]);

  const formatRateDisplay = (data, items) => {
    if (data.type === "Flat Rate") {
      return `$${data.rate.rate || 0}`;
    } else if (data.type === "Percentage based") {
      const referencedItem = items.find(
        (item) => item.id === (data.rate.duration || ""),
      );
      return `${data.rate.unit || 0}% of ${referencedItem ? referencedItem.name : "Unknown Item"}`;
    } else if (data.type === "Time based") {
      return `$${data.rate.unit || 0} per ${data.rate.duration === "hours" ? "hour" : "minute"}`;
    }
    return "";
  };

  useEffect(() => {
    if (tenantId) {
      fetchDeductions();
    }
  }, [tenantId, fetchDeductions]);

  return (
    <div>
      {hasPermission("add_deductions") && (
        <div className="justify-end flex mt-6">
          <Button
            label="Add New Deduction"
            variant="secondary"
            icon={<FaPlus />}
            onClick={() => {
              setSelectedRow(null);
              setMode("add");
              setIsModalOpen(true);
            }}
          />
        </div>
      )}
      <div className="mt-6">
        <CustomTable
          data={tableData}
          columns={Columns}
          actions={Actions}
          tableName="Deductions"
          itemsPerPage={10}
          showActions={true}
          showCheckbox={false}
          hideSearch={true}
          hideTableActions={true}
          loading={loading}
          onToggleActive={handleToggleActive}
        />
      </div>
      <PayrollItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        mode={mode}
        initialData={selectedRow || {}}
        isDeduction={true}
        existingItems={tableData}
      />
      <DeleteConfirmationModal
        isOpen={!!rowToDelete}
        onClose={() => setRowToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Deduction"
        message={`Are you sure you want to delete "${rowToDelete?.name || "this deduction"}"? This action cannot be undone.`}
        confirmButtonText="Delete"
        confirmButtonColor="#dc2626"
        loading={deleting}
      />
    </div>
  );
};

export default Deductions;

import React, { useState, useEffect, useCallback } from "react";
import Button from "../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../Components/Table/CustomTable";
import { useNavigate } from "react-router-dom";
import NewPayrollModal from "../../../Components/ReusableModal/PayrollModal/NewPayrollModal";
import useAuth from "../../../hooks/useAuth";
import usePermissions from "../../../hooks/usePermissions";
import payrollApi from "../../../api/payrollApi";
import { showApiError } from "../../../Helper/ShowToast";
import { formatDate, formatCurrency } from "../../../Helper/Formatters";
import useFormatSettings from "../../../hooks/useFormatSettings";

const Payroll = () => {
  const navigate = useNavigate();
  const { tenantId, accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();
  const { dateFormat, currency } = useFormatSettings();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState([]);

  const fetchPayrollStats = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const response = await payrollApi.GetPayrollCycleStats({
        tenantId,
        accessToken,
        refreshToken,
      });
      const data = response?.data || response || [];
      const rows = Array.isArray(data)
        ? data.map((item) => ({
            id: item.id,
            date: item.payrollDate
              ? formatDate(item.payrollDate, dateFormat)
              : "-",
            payPeriod: item.payPeriod || "-",
            noOfStaff: item.numberOfStaffs?.toString() || "0",
            totalPayrollValue: item.totalPayrollValue != null
              ? formatCurrency(item.totalPayrollValue, currency)
              : formatCurrency(0, currency),
            hasActions: true,
          }))
        : [];
      setTableData(rows);
    } catch (error) {
      showApiError(error, "LOAD_PAYROLL");
    } finally {
      setLoading(false);
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPayrollStats();
  }, [fetchPayrollStats]);

  const handleActionClick = (row) => {
    navigate(`/payroll/payroll/view-breakdown/${row.id}`);
  };

  const columns = [
    { header: "Payroll Date", key: "date", type: "dateTime" },
    { header: "Pay Period", key: "payPeriod", type: "text" },
    { header: "No of Staff in Payroll", key: "noOfStaff", type: "text" },
    { header: "Total Payroll Value", key: "totalPayrollValue", type: "text" },
  ];

  const handleSavePayroll = () => {
    setIsModalOpen(false);
    fetchPayrollStats();
  };

  return (
    <>
      <div>
        <h1 className="text-2xl text-gray-400 font-semibold">Payroll</h1>
        <h3 className="text-base text-gray-700 font-500">
          Run your payroll seamlessly
        </h3>
      </div>

      {hasPermission("create_new_payroll") && (
        <div className="justify-end flex mt-6">
          <Button
            label="New Payroll"
            variant="primary"
            icon={<FaPlus />}
            onClick={() => setIsModalOpen(true)}
          />
        </div>
      )}

      <div className="mt-6">
        <CustomTable
          data={tableData}
          columns={columns}
          tableName="Payroll Setup"
          itemsPerPage={10}
          showActions={true}
          showCheckbox={false}
          actionText="View Breakdown"
          actionLinkPrefix="/claims/view/"
          onActionClick={handleActionClick}
          loading={loading}
        />
      </div>

      <NewPayrollModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePayroll}
      />
    </>
  );
};

export default Payroll;

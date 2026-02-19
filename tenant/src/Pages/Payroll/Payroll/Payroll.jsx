import React, { useState, useEffect, useCallback } from "react";
import Button from "../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../Components/Table/CustomTable";
import { useNavigate } from "react-router-dom";
import NewPayrollModal from "../../../Components/ReusableModal/PayrollModal/NewPayrollModal";
import useAuth from "../../../hooks/useAuth";
import payrollApi from "../../../api/payrollApi";
import { showToast } from "../../../Helper/ShowToast";

const Payroll = () => {
  const navigate = useNavigate();
  const { tenantId, accessToken, refreshToken } = useAuth();
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
              ? new Date(item.payrollDate).toLocaleDateString("en-US", {
                  month: "2-digit",
                  day: "2-digit",
                  year: "numeric",
                })
              : "-",
            payPeriod: item.payPeriod || "-",
            noOfStaff: item.numberOfStaffs?.toString() || "0",
            totalPayrollValue: item.totalPayrollValue != null
              ? `$${Number(item.totalPayrollValue).toLocaleString()}`
              : "$0",
            hasActions: true,
          }))
        : [];
      setTableData(rows);
    } catch (error) {
      showToast(error.message || "Failed to fetch payroll stats", "error");
    } finally {
      setLoading(false);
    }
  }, [tenantId, accessToken, refreshToken]);

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

      <div className="justify-end flex mt-6">
        <Button
          label="New Payroll"
          variant="primary"
          icon={<FaPlus />}
          onClick={() => setIsModalOpen(true)}
        />
      </div>

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

import React, { useState, useEffect, useCallback } from "react";
import { FiEdit3 } from "react-icons/fi";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import CustomTable from "../../../../Components/Table/CustomTable";
import PayrollModal from "../../../../Components/ReusableModal/OrganizationModal/PayRollModal";
import api from "../../../../api/organisationStaffApis";
import { showToast } from "../../../../Helper/ShowToast";
// Static appointments data for Payroll History
const appointments = [
  {
    id: 1,
    payrollDate: "12/10/2024",
    payPeriod: "1/10/24-11/11/24",
    payrollValue: "$12000",
    hasActions: true,
  },
  {
    id: 2,
    payrollDate: "12/10/2024",
    payPeriod: "1/10/24-11/11/24",
    payrollValue: "$12000",
    hasActions: true,
  },
  {
    id: 3,
    payrollDate: "12/10/2024",
    payPeriod: "1/10/24-11/11/24",
    payrollValue: "$12000",
    hasActions: true,
  },
  {
    id: 4,
    payrollDate: "12/10/2024",
    payPeriod: "1/10/24-11/11/24",
    payrollValue: "$12000",
    hasActions: true,
  },
  {
    id: 5,
    payrollDate: "12/10/2024",
    payPeriod: "1/10/24-11/11/24",
    payrollValue: "$12000",
    hasActions: true,
  },
  {
    id: 6,
    payrollDate: "12/10/2024",
    payPeriod: "1/10/24-11/11/24",
    payrollValue: "$12000",
    hasActions: true,
  },
  {
    id: 7,
    payrollDate: "12/10/2024",
    payPeriod: "1/10/24-11/11/24",
    payrollValue: "$12000",
    hasActions: true,
  },
  {
    id: 8,
    payrollDate: "12/10/2024",
    payPeriod: "1/10/24-11/11/24",
    payrollValue: "$12000",
    hasActions: true,
  },
];

// Format the appointment data for the table
const tableData = appointments.map((appt) => ({
  id: appt.id,
  payrollDate: appt.payrollDate || "N/A",
  payPeriod: appt.payPeriod || "N/A",
  payrollValue: appt.payrollValue || "N/A",
  hasActions: appt.hasActions || true,
}));

const Payroll = () => {
  const accessToken = useSelector((s) => s.authentication?.user?.accessToken);
  const refreshToken = useSelector((s) => s.authentication?.user?.refreshToken);
  const user = useSelector((s) => s.authentication?.user);
  const { tenantStaffId } = useParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [modalMode, setModalMode] = useState(null); // "view" or "edit"
  const [payrollSettings, setPayrollSettings] = useState({
    id: null,
    paymentSchedule: "Weekly",
    rate: "$0",
    minimumHours: "0",
    monthlyFlatFee: "N/A",
    otherPay: [],
    deductions: [],
  });
  const [error, setError] = useState("");

  // Fetch payroll settings from API
  const fetchPayrollSettings = useCallback(async () => {
    try {
      const res = await api.GetAllStaffPayrollById({
        id: tenantStaffId,
        accessToken,
        refreshToken,
      });

      if (
        res?.data?.status === "ok" &&
        Array.isArray(res.data.data) &&
        res.data.data.length > 0
      ) {
        const payroll = res.data.data[0]; // Use first record
        setPayrollSettings({
          id: payroll.id || null,
          paymentSchedule: payroll.paymentSchedule || "Weekly",
          rate: `$${payroll.ratePerHour || "0"}`,
          minimumHours: payroll.minimumHours || "0",
          monthlyFlatFee:
            payroll.paymentSchedule === "Monthly"
              ? payroll.monthlyFlatFee || "N/A"
              : "N/A",
          otherPay: Array.isArray(payroll.otherPays)
            ? payroll.otherPays.map((op) => ({
                label: op.type.charAt(0).toUpperCase() + op.type.slice(1),
                value: `$${op.rate}`,
              }))
            : [],
          deductions: Array.isArray(payroll.deductions)
            ? payroll.deductions.map((d) => ({
                label: d.type.charAt(0).toUpperCase() + d.type.slice(1),
                value: `$${d.rate}`,
              }))
            : [],
        });
        setError("");
      } else {
        throw new Error(res?.data?.message || "No payroll data found");
      }
    } catch (e) {
      setError(e.message || "Failed to fetch payroll settings");
    }
  }, [tenantStaffId, accessToken, refreshToken]);

  useEffect(() => {
    fetchPayrollSettings();
  }, [fetchPayrollSettings]);

  const handleOpenModal = (row, mode) => {
    setSelectedPayroll(mode === "view" ? row || null : null);
    setModalMode(mode);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPayroll(null);
    setModalMode(null);
  };

  const savePayroll = async ({ id, payroll }) => {
    try {
      const response = await api.UpdateTenantStaffPayroll({
        id,
        payroll,
        accessToken,
        refreshToken,
      });

      await fetchPayrollSettings(); // Refresh settings after update
      setError("");
    } catch (e) {
      console.error("Failed to save payroll:", {
        message: e.message,
        response: e.response?.data,
        status: e.response?.status,
        stack: e.stack,
      });
      setError(e.response?.data?.message || "Failed to save payroll");
      throw new Error(e.response?.data?.message || "Failed to save payroll");
    }
  };

  return (
    <div className="p-20">
      {error && (
        <div className="mb-4 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded">
          {error}
        </div>
      )}
      <div className="flex items-center gap-4">
        <h2 className="font-bold text-lg text-gray-600 mb-4">
          Payroll Settings
        </h2>
        <div
          className="bg-white-bg p-5 rounded-md border border-gray-200 self-start cursor-pointer"
          onClick={() => handleOpenModal(null, "edit")}
        >
          <FiEdit3 size={20} />
        </div>
      </div>

      <div className="bg-gray-200 rounded-sm w-full p-20 mb-6 mt-6">
        <div className="grid grid-cols-3 items-center w-full">
          <div>
            <h2 className="font-bold text-lg text-gray-600">Basic</h2>
            <Row
              label="Payment Schedule"
              value={payrollSettings.paymentSchedule}
            />
            <Row label="Rate" value={payrollSettings.rate} />
            {payrollSettings.paymentSchedule !== "Monthly" && (
              <Row
                label="Minimum Number of Hours"
                value={payrollSettings.minimumHours}
              />
            )}
            {payrollSettings.paymentSchedule === "Monthly" && (
              <Row
                label="Monthly Flat Fee"
                value={payrollSettings.monthlyFlatFee}
              />
            )}
          </div>

          <div>
            <h2 className="font-bold text-lg text-gray-600">Other Pay</h2>
            {payrollSettings.otherPay?.length > 0 ? (
              payrollSettings.otherPay.map((item, index) => (
                <Row key={index} label={item.label} value={item.value} />
              ))
            ) : (
              <Row label="Other Pay" value="--" />
            )}
          </div>

          <div>
            <h2 className="font-bold text-lg text-gray-600">Deductions</h2>
            {payrollSettings.deductions?.length > 0 ? (
              payrollSettings.deductions.map((item, index) => (
                <Row key={index} label={item.label} value={item.value} />
              ))
            ) : (
              <Row label="Deductions" value="--" />
            )}
          </div>
        </div>
      </div>

      <h2 className="font-bold text-lg text-gray-600 mb-4">Payroll History</h2>
      <div>
        <CustomTable
          data={tableData}
          columns={[
            { header: "Payroll Date", key: "payrollDate", type: "text" },
            { header: "Pay Period", key: "payPeriod", type: "text" },
            {
              header: "Total Payroll Value",
              key: "payrollValue",
              type: "text",
            },
          ]}
          actionText="View BreakDown"
          actionLinkPrefix={[]}
          showActions
          showCheckbox={false}
          hideSearch
          itemsPerPage={10}
          hideTableActions
          tableName="Payroll History"
          onActionClick={(row) => handleOpenModal(row, "view")}
        />
      </div>

      <PayrollModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={savePayroll}
        modalMode={modalMode}
        selectedPayroll={selectedPayroll}
        payrollSettings={payrollSettings}
        tenantStaffId={tenantStaffId}
      />
    </div>
  );
};

const Row = ({ label, value }) => (
  <div className="flex items-center gap-2">
    <p className="text-sm text-gray-400 font-medium w-32">{label}</p>
    <p className="text-gray-600">{value || "N/A"}</p>
  </div>
);

export default Payroll;

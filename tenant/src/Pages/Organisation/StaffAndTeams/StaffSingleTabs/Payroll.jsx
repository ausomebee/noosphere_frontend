import React, { useState, useEffect, useCallback } from "react";
import { FiEdit3 } from "react-icons/fi";
import useAuth from "../../../../hooks/useAuth";
import { useParams } from "react-router-dom";
import CustomTable from "../../../../Components/Table/CustomTable";
import PayrollModal from "../../../../Components/ReusableModal/OrganizationModal/PayRollModal";
import api from "../../../../api/organisationStaffApis";
import { formatDate } from "../../../../Helper/Formatters";
import useFormatSettings from "../../../../hooks/useFormatSettings";
import "../../Organisation.css";

const formatRate = (item) => {
  const rate = item.rate || {};
  if (item.type === "Flat Rate") return `$${rate.rate || 0}`;
  if (item.type === "Percentage based") return `${rate.unit || 0}%`;
  if (item.type === "Time based") return `$${rate.unit || 0} per ${rate.duration || "hour"}`;
  return "N/A";
};

const Payroll = () => {
  const { accessToken, refreshToken } = useAuth();
  const { dateFormat } = useFormatSettings();
  const { tenantStaffId } = useParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [loading, setLoading] = useState(false);
  const [payrollSettings, setPayrollSettings] = useState({
    id: null,
    paymentSchedule: "",
    ratePerHour: "0",
    minimumHours: "0",
    incomeItems: [],
    deductions: [],
  });
  const [error, setError] = useState("");
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchPayrollSettings = useCallback(async () => {
    setLoading(true);
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
        const payroll = res.data.data[0];
        setPayrollSettings({
          id: payroll.id || null,
          paymentSchedule: payroll.paymentSchedule || "",
          ratePerHour: payroll.ratePerHour || "0",
          minimumHours: payroll.minimumHours || "0",
          incomeItems: Array.isArray(payroll.incomeItems) ? payroll.incomeItems : [],
          deductions: Array.isArray(payroll.deductions) ? payroll.deductions : [],
        });
        setError("");
      } else {
        setError(res?.data?.message || "No payroll data found");
      }
    } catch (e) {
      setError(e.message || "Failed to fetch payroll settings");
    } finally {
      setLoading(false);
    }
  }, [tenantStaffId, accessToken, refreshToken]);

  const fetchPayrollHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await api.GetStaffPayrollCycleStats({
        staffId: tenantStaffId,
        accessToken,
        refreshToken,
      });

      if (res?.data?.status === "ok" && Array.isArray(res.data.data)) {
        const mapped = res.data.data.map((item) => ({
          id: item.id,
          payrollDate: formatDate(item.payrollDate, dateFormat),
          payPeriod: `${formatDate(item.payrollDate, dateFormat)} - ${formatDate(item.payPeriod, dateFormat)}`,
          totalPayrollValue: `$${item.totalPayrollValue || 0}`,
          hasActions: true,
        }));
        setHistoryData(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch payroll history:", e.message);
    } finally {
      setHistoryLoading(false);
    }
  }, [tenantStaffId, accessToken, refreshToken, dateFormat]);

  useEffect(() => {
    fetchPayrollSettings();
    fetchPayrollHistory();
  }, [fetchPayrollSettings, fetchPayrollHistory]);

  const handleOpenModal = (mode, row) => {
    setModalMode(mode);
    setSelectedPayroll(mode === "view" ? row || null : null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalMode(null);
    setSelectedPayroll(null);
  };

  const savePayroll = async ({ id, payroll }) => {
    try {
      await api.UpdateTenantStaffPayroll({
        id,
        payroll,
        accessToken,
        refreshToken,
      });
      await fetchPayrollSettings();
      setError("");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save payroll");
      throw new Error(e.response?.data?.message || "Failed to save payroll");
    }
  };

  const showMinHours = payrollSettings.paymentSchedule !== "HOURLY" &&
    payrollSettings.paymentSchedule !== "DAILY";

  return (
    <div className="p-6">
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
          onClick={() => handleOpenModal("edit")}
        >
          <FiEdit3 size={20} />
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="payroll-settings-card">
          <div className="payroll-settings-grid">
            <div>
              <h2 className="font-bold text-lg text-gray-600 mb-3">Basic</h2>
              <Row
                label="Payment Schedule"
                value={payrollSettings.paymentSchedule || "N/A"}
              />
              <Row label="Rate Per Hour" value={`$${payrollSettings.ratePerHour}`} />
              {showMinHours && (
                <Row
                  label="Minimum Hours"
                  value={payrollSettings.minimumHours || "0"}
                />
              )}
            </div>

            <div>
              <h2 className="font-bold text-lg text-gray-600 mb-3">Income Items</h2>
              {payrollSettings.incomeItems.length > 0 ? (
                payrollSettings.incomeItems.map((item) => (
                  <Row key={item.id} label={item.name} value={formatRate(item)} />
                ))
              ) : (
                <p className="text-sm text-gray-400">No income items</p>
              )}
            </div>

            <div>
              <h2 className="font-bold text-lg text-gray-600 mb-3">Deductions</h2>
              {payrollSettings.deductions.length > 0 ? (
                payrollSettings.deductions.map((item) => (
                  <Row key={item.id} label={item.name} value={formatRate(item)} />
                ))
              ) : (
                <p className="text-sm text-gray-400">No deductions</p>
              )}
            </div>
          </div>
        </div>
      )}

      <h2 className="font-bold text-lg text-gray-600 mb-4">Payroll History</h2>
      <CustomTable
        data={historyData}
        loading={historyLoading}
        columns={[
          { header: "Payroll Date", key: "payrollDate", type: "text" },
          { header: "Pay Period", key: "payPeriod", type: "text" },
          { header: "Total Payroll Value", key: "totalPayrollValue", type: "text" },
        ]}
        actionText="View BreakDown"
        showActions
        showCheckbox={false}
        hideSearch
        itemsPerPage={10}
        hideTableActions
        tableName="Payroll History"
        onActionClick={(row) => handleOpenModal("view", row)}
      />

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
  <div className="payroll-setting-row">
    <p className="payroll-setting-label">{label}</p>
    <p className="payroll-setting-value">{value || "N/A"}</p>
  </div>
);

export default Payroll;

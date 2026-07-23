import React, { useState, useEffect, useCallback } from "react";
import LoadingSpinner from "../../LoadingSpinner";
import ReusableModal from "../ReusableModal";
import Button from "../../Button/Button";
import { FaPlus } from "react-icons/fa";
import Pagination from "../../Table/Pagination";
import EmployeeRow from "./EmployeeRow";
import AddIncomeItemModal from "./AddIncomItemModal";
import AddDeductionModal from "./AddDeductionModal";
import { RxCross2 } from "react-icons/rx";
import { CheckboxInput } from "../../Input/Inputs";
import payrollApi from "../../../api/payrollApi";
import { showToast, showApiError } from "../../../Helper/ShowToast";
import { formatDateRange } from "../../../Helper/Formatters";
import useFormatSettings from "../../../hooks/useFormatSettings";

const PreviewPayrollModal = ({
  isOpen,
  onClose,
  payrollData,
  onSave,
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const { dateFormat } = useFormatSettings();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [incomeItems, setIncomeItems] = useState([]);
  const [deductionItems, setDeductionItems] = useState([]);
  const itemsPerPage = 8;

  // Fetch staff and prefetch income/deduction items when modal opens
  const fetchData = useCallback(async () => {
    if (!isOpen || !payrollData || !tenantId) return;
    setLoading(true);
    try {
      const [staffRes, incomeRes, deductionRes] = await Promise.all([
        payrollApi.GetStaffWithPayrollByDate({
          tenantId,
          startDate: payrollData.from,
          endDate: payrollData.to,
          paymentSchedule: payrollData.compensationType,
          accessToken,
          refreshToken,
        }),
        payrollApi.GetIncomeItemsByTenantId({ tenantId, accessToken, refreshToken }),
        payrollApi.GetDeductionsByTenantId({ tenantId, accessToken, refreshToken }),
      ]);

      // Map staff data
      const staffData = staffRes?.data || staffRes || [];
      const mapped = (Array.isArray(staffData) ? staffData : []).map((item) => {
        const staff = item.staff || {};
        const payroll = staff.TenantStaffPayroll?.[0] || {};
        return {
          id: staff.id,
          name: item.staffName || staff.fullName || "Unknown",
          grossPay: item.grossPay || 0,
          netPay: item.netPay || 0,
          paymentSchedule: item.paymentSchedule || payroll.paymentSchedule || "",
          hourlyRate: Number(payroll.ratePerHour) || 0,
          monthlyRate: Number(payroll.monthlyRate) || 0,
          minHoursPerMonth: Number(payroll.minimumHours) || 0,
          basicPay: Number(payroll.monthlyRate) || 0,
          numberOfHours: Number(payroll.minimumHours) || 0,
          payrollId: payroll.id || "",
          additionalIncomes: payroll.incomeItems || [],
          additionalDeductions: payroll.deductions || [],
        };
      });
      setEmployees(mapped);

      // Prefetch income/deduction items
      const incData = incomeRes?.data || incomeRes || [];
      const dedData = deductionRes?.data || deductionRes || [];
      setIncomeItems(Array.isArray(incData) ? incData : []);
      setDeductionItems(Array.isArray(dedData) ? dedData : []);
    } catch (error) {
      showApiError(error, "LOAD_PAYROLL");
    } finally {
      setLoading(false);
    }
  }, [isOpen, payrollData, tenantId, accessToken, refreshToken]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setSelectedEmployees([]);
      setExpandedEmployee(null);
      setCurrentPage(1);
    } else {
      setEmployees([]);
    }
  }, [isOpen, fetchData]);

  const filteredEmployees = employees;
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

  const handleSelectEmployee = (employeeId) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === currentEmployees.length && currentEmployees.length > 0) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(currentEmployees.map((emp) => emp.id));
    }
  };

  const handleRemoveSelected = () => {
    if (selectedEmployees.length === 0) return;
    setEmployees((prev) => prev.filter((emp) => !selectedEmployees.includes(emp.id)));
    setSelectedEmployees([]);
  };

  const handleToggleExpand = (employeeId) => {
    setExpandedEmployee(expandedEmployee === employeeId ? null : employeeId);
  };

  const handleAddIncome = (employeeId) => {
    setCurrentEmployeeId(employeeId);
    setIsIncomeModalOpen(true);
  };

  const handleAddDeduction = (employeeId) => {
    setCurrentEmployeeId(employeeId);
    setIsDeductionModalOpen(true);
  };

  const handleAddIncomeItem = (incomeItem) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === currentEmployeeId) {
          return {
            ...emp,
            additionalIncomes: [...emp.additionalIncomes, incomeItem],
          };
        }
        return emp;
      })
    );
    setCurrentEmployeeId(null);
    setIsIncomeModalOpen(false);
  };

  const handleAddDeductionItem = (deductionItem) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === currentEmployeeId) {
          return {
            ...emp,
            additionalDeductions: [...emp.additionalDeductions, deductionItem],
          };
        }
        return emp;
      })
    );
    setCurrentEmployeeId(null);
    setIsDeductionModalOpen(false);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setExpandedEmployee(null);
  };

  const handleSave = async () => {
    if (employees.length === 0) {
      showToast("No staff in payroll to save", "error");
      return;
    }
    setSaving(true);
    try {
      const staffs = employees.map((emp) => ({
        id: emp.id,
        payrollId: emp.payrollId,
        deductions: emp.additionalDeductions.map((d) => ({ id: d.id })),
        incomeItems: emp.additionalIncomes.map((i) => ({ id: i.id })),
      }));

      await payrollApi.CreateManualPayrollCycle({
        tenantId,
        compensationType: payrollData.compensationType.toUpperCase(),
        startDate: payrollData.from,
        endDate: payrollData.to,
        staffs,
        accessToken,
        refreshToken,
      });

      showToast("Payroll cycle created successfully", "success");
      onSave();
    } catch (error) {
      showApiError(error, "SAVE_PAYROLL");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ReusableModal
        isOpen={isOpen}
        onClose={onClose}
        title="Preview Payroll"
        subTitle={`Payroll Cycle: (${formatDateRange(payrollData?.from, payrollData?.to, dateFormat)})`}
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleSave}
        onSecondaryButtonClick={onClose}
        size="xl"
        className="max-h-screen overflow-y-auto"
        primaryButtonLoading={saving}
      >
        <div className="flex flex-col h-full">
          <div className="flex justify-end items-center mb-6">
            {selectedEmployees.length > 0 && (
              <Button
                variant="secondary-danger"
                label="Remove from Payroll"
                onClick={handleRemoveSelected}
                icon={<RxCross2 />}
              />
            )}
          </div>
          {loading ? (
            <LoadingSpinner />
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="custom-table">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="py-3 px-4 text-left">
                      <CheckboxInput
                        checked={selectedEmployees.length === currentEmployees.length && currentEmployees.length > 0}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">
                      Employee
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">
                      Payment Schedule
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">
                      Gross Pay
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">
                      Net Pay
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-700"></th>
                  </tr>
                </thead>
                <tbody>
                  {currentEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-gray-500">
                        No staff found for this payroll period
                      </td>
                    </tr>
                  ) : (
                    currentEmployees.map((employee) => (
                      <EmployeeRow
                        key={employee.id}
                        employee={employee}
                        isSelected={selectedEmployees.includes(employee.id)}
                        onSelect={handleSelectEmployee}
                        expandedEmployee={expandedEmployee}
                        onToggleExpand={handleToggleExpand}
                        onAddIncome={handleAddIncome}
                        onAddDeduction={handleAddDeduction}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </ReusableModal>
      <AddIncomeItemModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        onSave={handleAddIncomeItem}
        tenantId={tenantId}
        accessToken={accessToken}
        refreshToken={refreshToken}
        prefetchedItems={incomeItems}
      />
      <AddDeductionModal
        isOpen={isDeductionModalOpen}
        onClose={() => setIsDeductionModalOpen(false)}
        onSave={handleAddDeductionItem}
        tenantId={tenantId}
        accessToken={accessToken}
        refreshToken={refreshToken}
        prefetchedItems={deductionItems}
      />
    </>
  );
};

export default PreviewPayrollModal;

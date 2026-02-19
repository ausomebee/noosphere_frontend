import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import { SearchInput } from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import Pagination from "../../../Components/Table/Pagination";
import AddIncomeItemModal from "../../../Components/ReusableModal/PayrollModal/AddIncomItemModal";
import AddDeductionModal from "../../../Components/ReusableModal/PayrollModal/AddDeductionModal";
import EmployeeRow from "../../../Components/ReusableModal/PayrollModal/EmployeeRow";
import AddStaffModal from "../../../Components/ReusableModal/PayrollModal/AddStaffModal";
import useAuth from "../../../hooks/useAuth";
import payrollApi from "../../../api/payrollApi";
import { showToast } from "../../../Helper/ShowToast";

const ViewBreakDown = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tenantId, accessToken, refreshToken } = useAuth();
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportButtonRef = useRef(null);
  const exportDropdownRef = useRef(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [compensationType, setCompensationType] = useState("");
  const [payrollDate, setPayrollDate] = useState("");
  const [removingStaff, setRemovingStaff] = useState(false);
  const [incomeItems, setIncomeItems] = useState([]);
  const [deductionItems, setDeductionItems] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const originalEmployeesRef = useRef(null);

  // Fetch income items and deductions on mount
  useEffect(() => {
    if (!tenantId) return;
    const fetchItems = async () => {
      try {
        const [incomeRes, deductionRes] = await Promise.all([
          payrollApi.GetIncomeItemsByTenantId({ tenantId, accessToken, refreshToken }),
          payrollApi.GetDeductionsByTenantId({ tenantId, accessToken, refreshToken }),
        ]);
        const incData = incomeRes?.data || incomeRes || [];
        const dedData = deductionRes?.data || deductionRes || [];
        setIncomeItems(Array.isArray(incData) ? incData : []);
        setDeductionItems(Array.isArray(dedData) ? dedData : []);
      } catch (error) {
        console.error("Failed to fetch payroll items:", error);
      }
    };
    fetchItems();
  }, [tenantId, accessToken, refreshToken]);

  const fetchCycleStaffs = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await payrollApi.GetPayrollCycleStaffs({
        payrollCycleId: id,
        accessToken,
        refreshToken,
      });
      const data = response?.data || response || [];
      const staffList = Array.isArray(data) ? data : [];

      if (staffList.length > 0) {
        const firstRecord = staffList[0]?.record;
        setCompensationType(firstRecord?.payrollCycle?.compensationType || "");
        if (firstRecord?.payrollCycle?.startDate) {
          setPayrollDate(
            new Date(firstRecord.payrollCycle.startDate).toLocaleDateString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "numeric",
            })
          );
        }
      }

      const mapped = staffList.map((item) => {
        const record = item.record || {};
        const staffPayroll = record.staff?.TenantStaffPayroll?.[0] || {};
        return {
          id: record.id,
          staffId: record.staffId,
          staffPayrollId: staffPayroll.id || "",
          name: item.staffName || "Unknown",
          grossPay: item.grossPay || 0,
          netPay: item.netPay || 0,
          paymentSchedule: item.paymentSchedule || "",
          hourlyRate: Number(staffPayroll.ratePerHour) || 0,
          monthlyRate: Number(staffPayroll.monthlyRate) || 0,
          minHoursPerMonth: Number(staffPayroll.minHoursPerMonth) || 0,
          basicPay: Number(staffPayroll.monthlyRate) || 0,
          numberOfHours: Number(staffPayroll.minHoursPerMonth) || 0,
          additionalIncomes: staffPayroll.incomeItems || [],
          additionalDeductions: staffPayroll.deductions || [],
        };
      });

      setEmployees(mapped);
      originalEmployeesRef.current = mapped;
      setHasChanges(false);
    } catch (error) {
      showToast(error.message || "Failed to fetch payroll staff", "error");
    } finally {
      setLoading(false);
    }
  }, [id, accessToken, refreshToken]);

  useEffect(() => {
    fetchCycleStaffs();
  }, [fetchCycleStaffs]);

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

  const handleSelectEmployee = (employeeId) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((eid) => eid !== employeeId)
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

  const handleRemoveSelected = async () => {
    if (selectedEmployees.length === 0) return;
    setRemovingStaff(true);
    try {
      await Promise.all(
        selectedEmployees.map((payrollCycleStaffId) =>
          payrollApi.RemoveStaffFromPayrollCycle({
            id: payrollCycleStaffId,
            accessToken,
            refreshToken,
          })
        )
      );
      setSelectedEmployees([]);
      showToast("Staff removed from payroll", "success");
      fetchCycleStaffs();
    } catch (error) {
      showToast(error.message || "Failed to remove staff", "error");
    } finally {
      setRemovingStaff(false);
    }
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
    setHasChanges(true);
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
    setHasChanges(true);
    setCurrentEmployeeId(null);
    setIsDeductionModalOpen(false);
  };

  const handleAddStaff = async (staffIds) => {
    try {
      await Promise.all(
        staffIds.map((staffId) =>
          payrollApi.AddStaffToPayrollCycle({
            payrollCycleId: id,
            staffId,
            accessToken,
            refreshToken,
          })
        )
      );
      setIsStaffModalOpen(false);
      showToast("Staff added to payroll", "success");
      fetchCycleStaffs();
    } catch (error) {
      showToast(error.message || "Failed to add staff", "error");
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setExpandedEmployee(null);
  };

  const toggleExportDropdown = () => {
    setExportDropdownOpen((prev) => !prev);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmitChanges = async () => {
    setSubmitting(true);
    try {
      const staffs = employees.map((emp) => ({
        id: emp.id,
        payrollCycleId: id,
        staffId: emp.staffId,
        staffPayrollId: emp.staffPayrollId,
        incomeItems: (emp.additionalIncomes || []).map((item) => ({ id: item.id })),
        deductions: (emp.additionalDeductions || []).map((item) => ({ id: item.id })),
      }));

      await payrollApi.EditPayrollBreakdown({
        staffs,
        accessToken,
        refreshToken,
      });

      showToast("Payroll breakdown updated", "success");
      setHasChanges(false);
      fetchCycleStaffs();
    } catch (error) {
      showToast(error.message || "Failed to update payroll breakdown", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="program-column-header flex gap-4 items-center">
        <div onClick={() => navigate(-1)} aria-label="Go back">
          <button className="back-button">
            <FaArrowLeft />
            <span className="primary-text">Back</span>
          </button>
        </div>
        <div className="breadcrumb-trail">
          <span className="breadcrumb-segment">View Payroll BreakDown</span>
          <span className="breadcrumb-separator">-</span>
          <span className="breadcrumb-current">{payrollDate || "Loading..."}</span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 mt-6 mx-auto" style={{ flexWrap: "wrap", gap: "12px" }}>
        <SearchInput
          placeholder="Search"
          value={searchTerm}
          onChange={handleSearchChange}
          aria-label="Search employees"
        />
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={toggleExportDropdown}
              ref={exportButtonRef}
              aria-label="Toggle export options"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            {exportDropdownOpen && (
              <div
                className="action-dropdown export-dropdown absolute right-0 mt-1 bg-white rounded-md shadow-lg py-1 z-10"
                ref={exportDropdownRef}
              >
                <button
                  className="dropdown-item px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  onClick={() => setExportDropdownOpen(false)}
                  aria-label="Export as CSV"
                >
                  Export as CSV
                </button>
                <button
                  className="dropdown-item px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  onClick={() => setExportDropdownOpen(false)}
                  aria-label="Export as PDF"
                >
                  Export as PDF
                </button>
              </div>
            )}
          </div>
          <button onClick={() => {}} aria-label="Print table">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex justify-end items-center mb-6 gap-2">
        {hasChanges && (
          <Button
            variant="primary"
            label="Submit"
            onClick={handleSubmitChanges}
            loading={submitting}
          />
        )}
        <Button
          variant="secondary"
          label="Add Staff to Payroll"
          icon={<FaPlus />}
          onClick={() => setIsStaffModalOpen(true)}
          aria-label="Add staff to payroll"
        />
        {selectedEmployees.length > 0 && (
          <Button
            variant="secondary-danger"
            label="Remove from Payroll"
            onClick={handleRemoveSelected}
            loading={removingStaff}
            aria-label="Remove selected employees"
          />
        )}
      </div>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      ) : (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table className="custom-table w-full" style={{ minWidth: "600px" }}>
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="py-3 px-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.length === currentEmployees.length && currentEmployees.length > 0}
                    onChange={handleSelectAll}
                    aria-label="Select all employees"
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
              {currentEmployees.map((employee) => (
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

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
      <AddStaffModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        onSave={handleAddStaff}
        isMultiple={true}
        compensationType={compensationType}
        tenantId={tenantId}
        accessToken={accessToken}
        refreshToken={refreshToken}
      />
    </>
  );
};

export default ViewBreakDown;

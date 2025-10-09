import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../../../Layout/TenantLayout";
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import { SearchInput } from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import Pagination from "../../../Components/Table/Pagination";
import AddIncomeItemModal from "../../../Components/ReusableModal/PayrollModal/AddIncomItemModal";
import AddDeductionModal from "../../../Components/ReusableModal/PayrollModal/AddDeductionModal";
import EmployeeRow from "../../../Components/ReusableModal/PayrollModal/EmployeeRow";
import AddStaffModal from "../../../Components/ReusableModal/PayrollModal/AddStaffModal";
import { mockEmployees } from "../../../Data/mockData";

const ViewBreakDown = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const [editedEmployees, setEditedEmployees] = useState({});
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const payrollData = {
    "1": {
      id: "1",
      date: "12/10/2024",
      payPeriod: "12/10/24 - 11/11/24",
      noOfStaff: "8",
      totalPayrollValue: "$18200",
      hasActions: true,
      employees: [
        {
          id: 1,
          name: "Austin Akpabio",
          paymentSchedule: "Weekly",
          grossPay: 2725,
          netPay: 2275,
          basicPay: 2500,
          fixedBonus: 25,
          hourlyRate: 62.5,
          numberOfHours: 40,
          taxDeduction: 200,
          pensionDeduction: 250,
          additionalIncomes: [],
          additionalDeductions: [],
        },
        {
          id: 2,
          name: "Phil Landerer",
          paymentSchedule: "Monthly",
          grossPay: 2725,
          netPay: 2275,
          basicPay: 2500,
          fixedBonus: 25,
          hourlyRate: 62.5,
          numberOfHours: 40,
          taxDeduction: 200,
          pensionDeduction: 250,
          additionalIncomes: [],
          additionalDeductions: [],
        },
        {
          id: 3,
          name: "Philip Landor",
          paymentSchedule: "Hourly",
          grossPay: 2725,
          netPay: 2275,
          basicPay: 2500,
          fixedBonus: 25,
          hourlyRate: 62.5,
          numberOfHours: 40,
          taxDeduction: 200,
          pensionDeduction: 250,
          additionalIncomes: [],
          additionalDeductions: [],
        },
        {
          id: 4,
          name: "Acary Bagner",
          paymentSchedule: "Monthly",
          grossPay: 2725,
          netPay: 2275,
          basicPay: 2500,
          fixedBonus: 25,
          hourlyRate: 62.5,
          numberOfHours: 40,
          taxDeduction: 200,
          pensionDeduction: 250,
          additionalIncomes: [],
          additionalDeductions: [],
        },
        {
          id: 5,
          name: "Van Nessa",
          paymentSchedule: "Hourly",
          grossPay: 2725,
          netPay: 2275,
          basicPay: 2500,
          fixedBonus: 25,
          hourlyRate: 62.5,
          numberOfHours: 40,
          taxDeduction: 200,
          pensionDeduction: 250,
          additionalIncomes: [],
          additionalDeductions: [],
        },
        {
          id: 6,
          name: "Tom Sinn",
          paymentSchedule: "Hourly",
          grossPay: 2725,
          netPay: 2275,
          basicPay: 2500,
          fixedBonus: 25,
          hourlyRate: 62.5,
          numberOfHours: 40,
          taxDeduction: 200,
          pensionDeduction: 250,
          additionalIncomes: [],
          additionalDeductions: [],
        },
        {
          id: 7,
          name: "Ann Drew",
          paymentSchedule: "Monthly",
          grossPay: 2725,
          netPay: 2275,
          basicPay: 2500,
          fixedBonus: 25,
          hourlyRate: 62.5,
          numberOfHours: 40,
          taxDeduction: 200,
          pensionDeduction: 250,
          additionalIncomes: [],
          additionalDeductions: [],
        },
        {
          id: 8,
          name: "Phil Leap",
          paymentSchedule: "Monthly",
          grossPay: 2725,
          netPay: 2275,
          basicPay: 2500,
          fixedBonus: 25,
          hourlyRate: 62.5,
          numberOfHours: 40,
          taxDeduction: 200,
          pensionDeduction: 250,
          additionalIncomes: [],
          additionalDeductions: [],
        },
      ],
    },
    "9": {
      id: "9",
      date: "09/29/2025",
      payPeriod: "09/29/25 - 10/01/25",
      noOfStaff: "0",
      totalPayrollValue: "$0",
      hasActions: true,
      employees: [],
    },
  };

  useEffect(() => {
    const payroll = payrollData[id] || { employees: [] };
    setEmployees(payroll.employees);
  }, [id]);

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    if (selectedEmployees.length > 0) {
      const updatedEmployees = employees.filter((emp) => !selectedEmployees.includes(emp.id));
      setEmployees(updatedEmployees);
      setSelectedEmployees([]);
      // Mark all removed employees as edited
      const removedIds = selectedEmployees;
      setEditedEmployees((prev) => ({
        ...prev,
        ...removedIds.reduce((acc, id) => ({ ...acc, [id]: true }), {}),
      }));
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

  const handleAddIncomeItem = (data) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === currentEmployeeId) {
          const baseGross = emp.paymentSchedule === "Hourly"
            ? emp.hourlyRate * emp.numberOfHours
            : emp.basicPay;
          const additionalAmount = data.unitType === "percentage_based"
            ? baseGross * (data.amount / 100)
            : data.unitType === "hourly_rate" || data.unitType === "hourly_rate_with_overtime"
            ? data.amount * emp.numberOfHours
            : data.amount;
          return {
            ...emp,
            additionalIncomes: [...emp.additionalIncomes, data],
            grossPay: emp.grossPay + additionalAmount,
            netPay: emp.netPay + additionalAmount,
          };
        }
        return emp;
      })
    );
    setCurrentEmployeeId(null);
    setIsIncomeModalOpen(false);
    // Mark the updated employee as edited
    setEditedEmployees((prev) => ({
      ...prev,
      [currentEmployeeId]: true,
    }));
  };

  const handleAddDeductionItem = (data) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === currentEmployeeId) {
          const gross = emp.grossPay;
          const additionalAmount = data.unitType === "percentage_based"
            ? gross * (data.amount / 100)
            : data.amount;
          return {
            ...emp,
            additionalDeductions: [...emp.additionalDeductions, data],
            netPay: emp.netPay - additionalAmount,
          };
        }
        return emp;
      })
    );
    setCurrentEmployeeId(null);
    setIsDeductionModalOpen(false);
    // Mark the updated employee as edited
    setEditedEmployees((prev) => ({
      ...prev,
      [currentEmployeeId]: true,
    }));
  };

  const handleUpdateEmployee = (updatedEmployee) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === updatedEmployee.id ? updatedEmployee : emp))
    );
    setEditedEmployees((prev) => ({
      ...prev,
      [updatedEmployee.id]: true,
    }));
  };

  const handleAddStaff = (staffIds) => {
    const newEmployees = mockEmployees.filter(
      (emp) => staffIds.includes(emp.id) && !employees.some((e) => e.id === emp.id)
    );
    setEmployees((prev) => [...prev, ...newEmployees]);
    setIsStaffModalOpen(false);
    // Mark all added employees as edited
    const newIds = newEmployees.map((emp) => emp.id);
    setEditedEmployees((prev) => ({
      ...prev,
      ...newIds.reduce((acc, id) => ({ ...acc, [id]: true }), {}),
    }));
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setExpandedEmployee(null);
  };

  const handleSaveAllChanges = () => {
    const updatedPayroll = {
      ...payrollData[id],
      employees: employees,
      noOfStaff: employees.length.toString(),
      totalPayrollValue: `$${employees.reduce((sum, emp) => sum + emp.netPay, 0).toLocaleString()}`,
    };
    console.log("Updated payroll data:", updatedPayroll);
    alert("Changes saved successfully!");
  };

  const handleSaveRow = (employeeId) => {
    const updatedPayroll = {
      ...payrollData[id],
      employees: employees,
      noOfStaff: employees.length.toString(),
      totalPayrollValue: `$${employees.reduce((sum, emp) => sum + emp.netPay, 0).toLocaleString()}`,
    };
    console.log(`Updated row ${employeeId} payroll data:`, updatedPayroll);
    alert(`Changes for employee ${employeeId} saved successfully!`);
    setEditedEmployees((prev) => {
      const newEdited = { ...prev };
      delete newEdited[employeeId];
      return newEdited;
    });
  };

  const toggleExportDropdown = () => {
    setExportDropdownOpen((prev) => !prev);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on search
  };

  return (
    <DashboardLayout>
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
          <span className="breadcrumb-current">{payrollData[id]?.date || "Unknown payroll date"}</span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 mt-20 mx-auto">
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
                  onClick={() => {
                    setExportDropdownOpen(false);
                    // Implement exportTableData
                  }}
                  aria-label="Export as CSV"
                >
                  Export as CSV
                </button>
                <button
                  className="dropdown-item px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  onClick={() => {
                    setExportDropdownOpen(false);
                    // Implement exportTableToPDF
                  }}
                  aria-label="Export as PDF"
                >
                  Export as PDF
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              // Implement printTableData
            }}
            aria-label="Print table"
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
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex justify-end items-center mb-6">
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
            aria-label="Remove selected employees"
          />
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="custom-table w-full">
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
                onUpdateEmployee={handleUpdateEmployee}
                onSaveRow={handleSaveRow}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      <div className="mt-6 flex justify-end">
        <Button
          variant="primary"
          label="Submit All Changes"
          onClick={handleSaveAllChanges}
          disabled={Object.keys(editedEmployees).length === 0}
          aria-label="Submit all changes"
        />
      </div>

      <AddIncomeItemModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        onSave={handleAddIncomeItem}
      />
      <AddDeductionModal
        isOpen={isDeductionModalOpen}
        onClose={() => setIsDeductionModalOpen(false)}
        onSave={handleAddDeductionItem}
      />
      <AddStaffModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        onSave={handleAddStaff}
        isMultiple={true}
      />
    </DashboardLayout>
  );
};

export default ViewBreakDown;
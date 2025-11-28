import React, { useState } from "react";
import ReusableModal from "../ReusableModal";
import Button from "../../Button/Button";
import { FaPlus } from "react-icons/fa";
import Pagination from "../../Table/Pagination";
import EmployeeRow from "./EmployeeRow";
import AddStaffModal from "./AddStaffModal";
import AddIncomeItemModal from "./AddIncomItemModal";
import AddDeductionModal from "./AddDeductionModal";
import { mockEmployees } from "../../../Data/mockData";
import { RxCross2 } from "react-icons/rx";
import { CheckboxInput } from "../../Input/Inputs";

const PreviewPayrollModal = ({ isOpen, onClose, payrollData, onSave }) => {
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [employees, setEmployees] = useState(mockEmployees);
  const itemsPerPage = 8;

  const totalPages = Math.ceil(employees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEmployees = employees.slice(startIndex, startIndex + itemsPerPage);

  const handleSelectEmployee = (employeeId) => {
    setSelectedEmployees((prev) => {
      const newSelection = prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId];
      console.log("Selected Employees for Removal:", newSelection);
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === currentEmployees.length && currentEmployees.length > 0) {
      setSelectedEmployees([]);
      console.log("Deselected all employees for removal");
    } else {
      const newSelection = currentEmployees.map((emp) => emp.id);
      setSelectedEmployees(newSelection);
      console.log("Selected all employees for removal:", newSelection);
    }
  };

  const handleRemoveSelected = () => {
    if (selectedEmployees.length > 0) {
      setEmployees((prev) => prev.filter((emp) => !selectedEmployees.includes(emp.id)));
      setSelectedEmployees([]);
      console.log("Removed selected employees");
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
  };

  const handleAddStaff = (staffIds) => {
    const newEmployees = mockEmployees.filter(
      (emp) => staffIds.includes(emp.id) && !employees.some((e) => e.id === emp.id)
    );
    setEmployees((prev) => [...prev, ...newEmployees]);
    setIsStaffModalOpen(false);
    console.log("Added staff IDs:", staffIds);
  };

  const handleUpdateEmployee = (updatedEmployee) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === updatedEmployee.id ? updatedEmployee : emp))
    );
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setExpandedEmployee(null);
  };

  const formatDateRange = (from, to) => {
    if (!from || !to) return "";
    const fromDate = new Date(from).toLocaleDateString();
    const toDate = new Date(to).toLocaleDateString();
    return `${fromDate} - ${toDate}`;
  };

  const handleSave = () => {
    console.log("Saving payroll with employees:", employees);
    const payroll = {
      ...payrollData,
      employees: employees,
    };
    console.log("Submitted payroll:", payroll);
    onSave(payroll);
  };

  return (
    <>
      <ReusableModal
        isOpen={isOpen}
        onClose={onClose}
        title="Preview Payroll"
        subTitle={`Payroll Cycle: (${formatDateRange(payrollData?.from, payrollData?.to)})`}
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleSave}
        onSecondaryButtonClick={onClose}
        size="xl"
        className="max-h-screen overflow-y-auto"
      >
        <div className="flex flex-col h-full">
          <div className="flex justify-end items-center mb-6">
            <Button
              variant="secondary"
              label="Add Staff to Payroll"
              icon={<FaPlus />}
              onClick={() => setIsStaffModalOpen(true)}
            />
            {selectedEmployees.length > 0 && (
              <Button
                variant="secondary-danger"
                label="Remove from Payroll"
                onClick={handleRemoveSelected}
                icon={<RxCross2 />}
              />
            )}
          </div>
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
        </div>
      </ReusableModal>
      <AddStaffModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        onSave={handleAddStaff}
        isMultiple={true}
      />
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
    </>
  );
};

export default PreviewPayrollModal;
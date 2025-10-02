import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import { SelectInput, TextInput, CheckboxInput } from "../../Input/Inputs";
import Button from "../../Button/Button";
import { FaPlus } from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import Pagination from "../../Table/Pagination";

// Validation schemas
const newPayrollSchema = yup.object({
  from: yup.string().required("Start date is required"),
  to: yup
    .string()
    .required("End date is required")
    .test(
      "is-after-from",
      "End date must be after start date",
      function (value) {
        const { from } = this.parent;
        if (!from || !value) return true;
        return new Date(value) > new Date(from);
      }
    ),
});

const addIncomeSchema = yup.object({
  incomeItem: yup.string().required("Please select an income item"),
  unitType: yup.string().required("Please select a unit type"),
  amount: yup
    .number()
    .typeError("Amount must be a number")
    .required("Amount is required")
    .min(0, "Amount cannot be negative"),
});

const addDeductionSchema = yup.object({
  deductionItem: yup.string().required("Please select a deduction item"),
  unitType: yup.string().required("Please select a unit type"),
  amount: yup
    .number()
    .typeError("Amount must be a number")
    .required("Amount is required")
    .min(0, "Amount cannot be negative"),
});

const addStaffSchema = yup.object({
  selectedStaff: yup
    .array()
    .min(1, "At least one employee must be selected")
    .required("Please select employees"),
});

// Mock data for employees
const mockEmployees = [
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
];

// Add Staff Modal Component
const AddStaffModal = ({ isOpen, onClose, onSave, isMultiple = true }) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(addStaffSchema),
    defaultValues: {
      selectedStaff: [],
    },
  });

  const onSubmit = (data) => {
    onSave(data.selectedStaff);
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Staff to Payroll"
      primaryButtonText="Add Selected"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      onSecondaryButtonClick={handleClose}
      size="medium"
    >
      <div className="flex flex-col gap-4">
        <Controller
          name="selectedStaff"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="Select Employees"
              options={mockEmployees.map((emp) => ({
                value: emp.id,
                label: emp.name,
              }))}
              value={field.value}
              onChange={(value) => field.onChange(value)}
              placeholder="Select employees"
              className="w-full"
              error={errors.selectedStaff?.message}
              isMulti={isMultiple}
            />
          )}
        />
      </div>
    </ReusableModal>
  );
};

// Add Income Item Modal Component
const AddIncomeItemModal = ({ isOpen, onClose, onSave }) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(addIncomeSchema),
    defaultValues: {
      incomeItem: "",
      unitType: "",
      amount: 0,
    },
  });

  const incomeOptions = [
    { value: "overwork_commission", label: "Overwork Commission" },
    { value: "capital_compensation", label: "Capital Compensation" },
    { value: "extraordinary_work", label: "Extraordinary Work" },
  ];

  const unitTypeOptions = [
    { value: "flat_rate", label: "Flat Rate" },
    { value: "percentage_based", label: "Percentage based" },
    { value: "hourly_rate", label: "Hourly Rate" },
    { value: "hourly_rate_with_overtime", label: "Hourly Rate with Overtime" },
  ];

  const onSubmit = (data) => {
    onSave({
      type: data.incomeItem,
      unitType: data.unitType,
      amount: Number(data.amount),
    });
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Income Item"
      primaryButtonText="Continue"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      onSecondaryButtonClick={handleClose}
      size="medium"
    >
      <div className="flex flex-col gap-4">
        <Controller
          name="incomeItem"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="Select Income Item"
              options={incomeOptions}
              value={field.value}
              onChange={(value) => field.onChange(value)}
              placeholder="Select"
              className="w-full"
              error={errors.incomeItem?.message}
            />
          )}
        />
        <Controller
          name="unitType"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="Unit Type"
              options={unitTypeOptions}
              value={field.value}
              onChange={(value) => field.onChange(value)}
              placeholder="Select unit type"
              className="w-full"
              error={errors.unitType?.message}
            />
          )}
        />
        <TextInput
          label="Amount"
          type="number"
          {...control.register("amount")}
          error={errors.amount?.message}
          placeholder="Enter amount"
          className="w-full"
        />
      </div>
    </ReusableModal>
  );
};

// Add Deduction Modal Component
const AddDeductionModal = ({ isOpen, onClose, onSave }) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(addDeductionSchema),
    defaultValues: {
      deductionItem: "",
      unitType: "",
      amount: 0,
    },
  });

  const deductionOptions = [
    { value: "insurance", label: "Insurance" },
    { value: "loan", label: "Loan Deduction" },
    { value: "other", label: "Other Deductions" },
  ];

  const unitTypeOptions = [
    { value: "flat_rate", label: "Flat Rate" },
    { value: "percentage_based", label: "Percentage based" },
  ];

  const onSubmit = (data) => {
    onSave({
      type: data.deductionItem,
      unitType: data.unitType,
      amount: Number(data.amount),
    });
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Deduction"
      primaryButtonText="Continue"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      onSecondaryButtonClick={handleClose}
      size="medium"
    >
      <div className="flex flex-col gap-4">
        <Controller
          name="deductionItem"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="Select Deduction"
              options={deductionOptions}
              value={field.value}
              onChange={(value) => field.onChange(value)}
              placeholder="Select"
              className="w-full"
              error={errors.deductionItem?.message}
            />
          )}
        />
        <Controller
          name="unitType"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="Unit Type"
              options={unitTypeOptions}
              value={field.value}
              onChange={(value) => field.onChange(value)}
              placeholder="Select unit type"
              className="w-full"
              error={errors.unitType?.message}
            />
          )}
        />
        <TextInput
          label="Amount"
          type="number"
          {...control.register("amount")}
          error={errors.amount?.message}
          placeholder="Enter amount"
          className="w-full"
        />
      </div>
    </ReusableModal>
  );
};

// Employee Row Component with Accordion
const EmployeeRow = ({
  employee,
  isSelected,
  onSelect,
  expandedEmployee,
  onToggleExpand,
  onAddIncome,
  onAddDeduction,
  onUpdateEmployee,
}) => {
  const isExpanded = expandedEmployee === employee.id;
  const [localEmployee, setLocalEmployee] = useState(employee);

  useEffect(() => {
    setLocalEmployee(employee);
  }, [employee]);

  const calculateGrossPay = () => {
    let gross = localEmployee.paymentSchedule === "Hourly"
      ? localEmployee.hourlyRate * localEmployee.numberOfHours
      : localEmployee.basicPay;
    gross += localEmployee.fixedBonus;
    gross += localEmployee.additionalIncomes.reduce((sum, inc) => {
      if (inc.unitType === "percentage_based") {
        const baseGross = localEmployee.paymentSchedule === "Hourly"
          ? localEmployee.hourlyRate * localEmployee.numberOfHours
          : localEmployee.basicPay;
        return sum + (baseGross * (inc.amount / 100));
      } else if (inc.unitType === "hourly_rate" || inc.unitType === "hourly_rate_with_overtime") {
        return sum + (inc.amount * localEmployee.numberOfHours);
      }
      return sum + inc.amount;
    }, 0);
    return gross;
  };

  const calculateNetPay = () => {
    const gross = calculateGrossPay();
    const deductions = localEmployee.taxDeduction + localEmployee.pensionDeduction +
      localEmployee.additionalDeductions.reduce((sum, ded) => {
        if (ded.unitType === "percentage_based") {
          return sum + (gross * (ded.amount / 100));
        }
        return sum + ded.amount;
      }, 0);
    return gross - deductions;
  };

  const handleInputChange = (field, value) => {
    const updatedEmployee = {
      ...localEmployee,
      [field]: Number(value) || 0,
      grossPay: calculateGrossPay(),
      netPay: calculateNetPay(),
    };
    setLocalEmployee(updatedEmployee);
    onUpdateEmployee(updatedEmployee);
  };

  return (
    <>
      <tr className="border-b border-gray-200 hover:bg-gray-50">
        <td className="py-3 px-4">
          <CheckboxInput
            checked={isSelected}
            onChange={() => onSelect(employee.id)}
          />
        </td>
        <td className="py-3 px-4">
          <span className="text-blue-600 font-medium cursor-pointer">
            {localEmployee.name}
          </span>
        </td>
        <td className="py-3 px-4 text-gray-700">{localEmployee.paymentSchedule}</td>
        <td className="py-3 px-4 text-gray-700">
          ${calculateGrossPay().toLocaleString()}
        </td>
        <td className="py-3 px-4 text-gray-700">
          ${calculateNetPay().toLocaleString()}
        </td>
        <td className="py-3 px-4">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleExpand(employee.id);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            type="button"
          >
            <svg
              className={`w-5 h-5 transform transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td
            colSpan="6"
            className=""
            style={{ padding: "0", borderRadius: "0" }}
          >
            <div className="">
              <div className="mb-6">
                {/* Gross Income Header */}
                <div className="bg-gray-200 rounded-md">
                  <h2 className="text-center border-b p-3 text-gray-400 text-lg">
                    Gross Income
                  </h2>
                </div>

                {/* Basic Pay Section */}
                <div className="flex justify-between p-20 items-center border-b">
                  <div>
                    <h2 className="text-left text-gray-400 text-base">
                      Basic Pay
                    </h2>
                  </div>
                  <div className="flex">
                    <div className="flex-col flex">
                      <label htmlFor="hourlyRate">Hourly Rate</label>
                      <div className="custom-time-container">
                        <div className="custom-time-div-two">
                          <span className="custom-time-label">$</span>
                        </div>
                        <input
                          type="number"
                          value={localEmployee.hourlyRate || ""}
                          onChange={(e) => handleInputChange("hourlyRate", e.target.value)}
                          className="custom-time-input-two"
                        />
                      </div>
                    </div>
                    {localEmployee.paymentSchedule === "Hourly" && (
                      <div className="flex-col flex ml-4">
                        <label htmlFor="numberOfHours">Number of Hours</label>
                        <div className="custom-time-container">
                          <input
                            type="number"
                            value={localEmployee.numberOfHours || ""}
                            onChange={(e) => handleInputChange("numberOfHours", e.target.value)}
                            className="custom-time-input-two"
                          />
                        </div>
                      </div>
                    )}
                    {localEmployee.paymentSchedule === "Monthly" && (
                      <div className="flex-col flex ml-4">
                        <label htmlFor="basicPay">Monthly Flat Fee</label>
                        <div className="custom-time-container">
                          <div className="custom-time-div-two">
                            <span className="custom-time-label">$</span>
                          </div>
                          <input
                            type="number"
                            value={localEmployee.basicPay || ""}
                            onChange={(e) => handleInputChange("basicPay", e.target.value)}
                            className="custom-time-input-two"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fixed Bonus Section */}
                <div className="flex justify-between p-20 items-center border-b">
                  <div>
                    <h2 className="text-left text-gray-400 text-base">
                      Fixed Bonus
                    </h2>
                  </div>
                  <div className="flex">
                    <div className="flex-col flex">
                      <label htmlFor="fixedBonus">Rate</label>
                      <div className="custom-time-container">
                        <div className="custom-time-div-two">
                          <span className="custom-time-label">$</span>
                        </div>
                        <input
                          type="number"
                          value={localEmployee.fixedBonus || ""}
                          onChange={(e) => handleInputChange("fixedBonus", e.target.value)}
                          className="custom-time-input-two"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Incomes */}
                {localEmployee.additionalIncomes.map((income, index) => (
                  <div key={`income-${index}`} className="flex justify-between p-20 items-center border-b">
                    <div>
                      <h2 className="text-left text-gray-400 text-base">
                        {income.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} ({income.unitType.replace(/_/g, " ")})
                      </h2>
                    </div>
                    <div className="flex">
                      <div className="flex-col flex">
                        <label htmlFor={`income-${index}`}>Amount</label>
                        <div className="custom-time-container">
                          <div className="custom-time-div-two">
                            <span className="custom-time-label">{income.unitType === "percentage_based" ? "%" : "$"}</span>
                          </div>
                          <input
                            type="number"
                            value={income.amount}
                            onChange={(e) => {
                              const updatedIncomes = [...localEmployee.additionalIncomes];
                              updatedIncomes[index] = { ...income, amount: Number(e.target.value) || 0 };
                              handleInputChange("additionalIncomes", updatedIncomes);
                            }}
                            className="custom-time-input-two"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Income Button */}
                <div className="p-4 flex justify-start">
                  <Button
                    variant="secondary"
                    label="Add"
                    icon={<FaPlus />}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onAddIncome(employee.id);
                    }}
                  />
                </div>

                {/* Deductions Header */}
                <div className="bg-gray-200 rounded-md mt-6">
                  <h2 className="text-center border-b p-3 text-gray-400 text-lg">
                    Deduction
                  </h2>
                </div>

                {/* Tax Deduction */}
                <div className="flex justify-between p-20 items-center border-b">
                  <div>
                    <h2 className="text-left text-gray-400 text-base">
                      Tax Deduction
                    </h2>
                  </div>
                  <div className="flex">
                    <div className="flex-col flex">
                      <label htmlFor="taxDeduction">Rate</label>
                      <div className="custom-time-container">
                        <div className="custom-time-div-two">
                          <span className="custom-time-label">$</span>
                        </div>
                        <input
                          type="number"
                          value={localEmployee.taxDeduction || ""}
                          onChange={(e) => handleInputChange("taxDeduction", e.target.value)}
                          className="custom-time-input-two"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pension Deduction */}
                <div className="flex justify-between p-20 items-center border-b">
                  <div>
                    <h2 className="text-left text-gray-400 text-base">
                      Pension Deduction
                    </h2>
                  </div>
                  <div className="flex">
                    <div className="flex-col flex">
                      <label htmlFor="pensionDeduction">Rate</label>
                      <div className="custom-time-container">
                        <div className="custom-time-div-two">
                          <span className="custom-time-label">$</span>
                        </div>
                        <input
                          type="number"
                          value={localEmployee.pensionDeduction || ""}
                          onChange={(e) => handleInputChange("pensionDeduction", e.target.value)}
                          className="custom-time-input-two"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Deductions */}
                {localEmployee.additionalDeductions.map((deduction, index) => (
                  <div key={`deduction-${index}`} className="flex justify-between p-20 items-center border-b">
                    <div>
                      <h2 className="text-left text-gray-400 text-base">
                        {deduction.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} ({deduction.unitType.replace(/_/g, " ")})
                      </h2>
                    </div>
                    <div className="flex">
                      <div className="flex-col flex">
                        <label htmlFor={`deduction-${index}`}>Amount</label>
                        <div className="custom-time-container">
                          <div className="custom-time-div-two">
                            <span className="custom-time-label">{deduction.unitType === "percentage_based" ? "%" : "$"}</span>
                          </div>
                          <input
                            type="number"
                            value={deduction.amount}
                            onChange={(e) => {
                              const updatedDeductions = [...localEmployee.additionalDeductions];
                              updatedDeductions[index] = { ...deduction, amount: Number(e.target.value) || 0 };
                              handleInputChange("additionalDeductions", updatedDeductions);
                            }}
                            className="custom-time-input-two"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Deduction Button */}
                <div className="p-4 flex justify-start">
                  <Button
                    variant="secondary"
                    label="Add"
                    icon={<FaPlus />}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onAddDeduction(employee.id);
                    }}
                  />
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// Preview Payroll Modal Component
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
      employees: employees, // Submit all employees, not filtered by selectedEmployees
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
        subTitle={`Payroll Cycle: (${formatDateRange(
          payrollData?.from,
          payrollData?.to
        )})`}
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleSave}
        onSecondaryButtonClick={onClose}
        size="xl"
        className="max-h-screen overflow-y-auto"
      >
        <div className="flex flex-col h-full">
          {/* Header Actions */}
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

          {/* Employee Table */}
          <div className="flex-1 overflow-auto">
            <table className="custom-table">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="py-3 px-4 text-left">
                    <CheckboxInput
                      checked={
                        selectedEmployees.length === currentEmployees.length &&
                        currentEmployees.length > 0
                      }
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

      {/* Add Staff Modal */}
      <AddStaffModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        onSave={handleAddStaff}
        isMultiple={true}
      />

      {/* Add Income Item Modal */}
      <AddIncomeItemModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        onSave={handleAddIncomeItem}
      />

      {/* Add Deduction Modal */}
      <AddDeductionModal
        isOpen={isDeductionModalOpen}
        onClose={() => setIsDeductionModalOpen(false)}
        onSave={handleAddDeductionItem}
      />
    </>
  );
};

// Main NewPayroll Modal Component
const NewPayrollModal = ({ isOpen, onClose, onSave }) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm({
    resolver: yupResolver(newPayrollSchema),
    defaultValues: {
      from: "",
      to: "",
    },
  });

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [payrollData, setPayrollData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const watchedValues = watch();

  const onSubmit = (data) => {
    setIsLoading(true);
    setTimeout(() => {
      setPayrollData(data);
      setIsPreviewOpen(true);
      setIsLoading(false);
    }, 1000);
  };

  const onError = (errors) => {
    console.log("Form errors:", errors);
  };

  const handlePreviewSave = (data) => {
    onSave(data);
    setIsPreviewOpen(false);
    handleClose();
  };

  const handlePreviewClose = () => {
    setIsPreviewOpen(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <>
      <ReusableModal
        isOpen={isOpen && !isPreviewOpen}
        onClose={handleClose}
        title="New Payroll"
        primaryButtonText="Next"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleSubmit(onSubmit, onError)}
        onSecondaryButtonClick={handleClose}
        primaryButtonLoading={isLoading}
        size="medium"
      >
        <div className="flex gap-4">
          <div className="flex-1">
            <Controller
              name="from"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="From *"
                  type="date"
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  className="rounded-20px"
                  width="full"
                  error={errors.from?.message}
                  placeholder="Select a starting date"
                />
              )}
            />
          </div>
          <div className="flex-1">
            <Controller
              name="to"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="To *"
                  type="date"
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  className="rounded-20px"
                  width="full"
                  error={errors.to?.message}
                  placeholder="Select an ending date"
                  min={watchedValues.from}
                />
              )}
            />
          </div>
        </div>
      </ReusableModal>

      <PreviewPayrollModal
        isOpen={isPreviewOpen}
        onClose={handlePreviewClose}
        payrollData={payrollData}
        onSave={handlePreviewSave}
      />
    </>
  );
};

export default NewPayrollModal;
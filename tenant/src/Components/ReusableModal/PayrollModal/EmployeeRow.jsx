import React, { useState, useEffect } from "react";
import { CheckboxInput } from "../../Input/Inputs";
import Button from "../../Button/Button";
import { FaPlus } from "react-icons/fa";

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

export default EmployeeRow;
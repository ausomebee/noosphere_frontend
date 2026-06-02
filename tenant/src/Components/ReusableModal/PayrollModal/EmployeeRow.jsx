import React from "react";
import { CheckboxInput } from "../../Input/Inputs";
import Button from "../../Button/Button";
import { FaPlus } from "react-icons/fa";
import { formatItemLabel, getCurrencySymbol, formatCurrency } from "../../../Helper/Formatters";
import useFormatSettings from "../../../hooks/useFormatSettings";

const EmployeeRow = ({
  employee,
  isSelected,
  onSelect,
  expandedEmployee,
  onToggleExpand,
  onAddIncome,
  onAddDeduction,
}) => {
  const { currency } = useFormatSettings();
  const isExpanded = expandedEmployee === employee.id;

  const getAmount = (item) => {
    if (item.amount != null) return Number(item.amount) || 0;
    if (item.rate) {
      if (item.type === "Flat Rate") return Number(item.rate.rate) || 0;
      if (item.type === "Time based") return Number(item.rate.unit) || 0;
      if (item.type === "Percentage based") return Number(item.rate.unit) || 0;
    }
    return 0;
  };

  const getItemLabel = (item) => {
    if (item.name) return item.name;
    if (item.type) return formatItemLabel(item.type);
    return "Item";
  };

  const getUnitSymbol = (item) => {
    if (item.type === "Percentage based" || item.unitType === "percentage_based") return "%";
    return getCurrencySymbol("USD");
  };

  const displayGrossPay = employee.grossPay || 0;
  const displayNetPay = employee.netPay || 0;

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
            {employee.name}
          </span>
        </td>
        <td className="py-3 px-4 text-gray-700">{employee.paymentSchedule}</td>
        <td className="py-3 px-4 text-gray-700">
          {formatCurrency(displayGrossPay, currency)}
        </td>
        <td className="py-3 px-4 text-gray-700">
          {formatCurrency(displayNetPay, currency)}
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
            style={{ padding: "0", borderRadius: "0" }}
          >
            <div>
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
                    {(employee.paymentSchedule === "HOURLY" || employee.paymentSchedule === "DAILY") && (
                      <div className="flex-col flex">
                        <label>Hourly Rate</label>
                        <div className="custom-time-container">
                          <div className="custom-time-div-two">
                            <span className="custom-time-label">$</span>
                          </div>
                          <input
                            type="number"
                            value={employee.hourlyRate || ""}
                            readOnly
                            className="custom-time-input-two"
                          />
                        </div>
                      </div>
                    )}
                    {employee.paymentSchedule === "SALARIED" && (
                      <>
                        <div className="flex-col flex">
                          <label>Monthly Rate</label>
                          <div className="custom-time-container">
                            <div className="custom-time-div-two">
                              <span className="custom-time-label">$</span>
                            </div>
                            <input
                              type="number"
                              value={employee.monthlyRate || employee.basicPay || ""}
                              readOnly
                              className="custom-time-input-two"
                            />
                          </div>
                        </div>
                        <div className="flex-col flex ml-4">
                          <label>Min Hours/Month</label>
                          <div className="custom-time-container">
                            <input
                              type="number"
                              value={employee.minHoursPerMonth || employee.numberOfHours || ""}
                              readOnly
                              className="custom-time-input-two"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Additional Incomes */}
                {employee.additionalIncomes?.map((income, index) => (
                  <div key={`income-${index}`} className="flex justify-between p-20 items-center border-b">
                    <div>
                      <h2 className="text-left text-gray-400 text-base">
                        {getItemLabel(income)}
                      </h2>
                    </div>
                    <div className="flex">
                      <div className="flex-col flex">
                        <label>Amount</label>
                        <div className="custom-time-container">
                          <div className="custom-time-div-two">
                            <span className="custom-time-label">{getUnitSymbol(income)}</span>
                          </div>
                          <input
                            type="number"
                            value={getAmount(income)}
                            readOnly
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

                {/* Additional Deductions (all from endpoint) */}
                {employee.additionalDeductions?.map((deduction, index) => (
                  <div key={`deduction-${index}`} className="flex justify-between p-20 items-center border-b">
                    <div>
                      <h2 className="text-left text-gray-400 text-base">
                        {getItemLabel(deduction)}
                      </h2>
                    </div>
                    <div className="flex">
                      <div className="flex-col flex">
                        <label>Amount</label>
                        <div className="custom-time-container">
                          <div className="custom-time-div-two">
                            <span className="custom-time-label">{getUnitSymbol(deduction)}</span>
                          </div>
                          <input
                            type="number"
                            value={getAmount(deduction)}
                            readOnly
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

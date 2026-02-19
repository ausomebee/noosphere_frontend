import React, { useState } from "react";
import EmployeePaymentSchedules from "./PayrollSettingsSubs/EmployeePaymentSchedules";
import IncomeItems from "./PayrollSettingsSubs/IncomeItems";
import Deductions from "./PayrollSettingsSubs/Deductions";
import PayrollCycles from "./PayrollSettingsSubs/PayrollCycles";

const PayrollSettings = () => {
  const [activeTab, setActiveTab] = useState("incomeItems");

  const renderActiveTab = () => {
    switch (activeTab) {
      case "paymentSchedules":
        return <EmployeePaymentSchedules />;
      case "incomeItems":
        return <IncomeItems />;
      case "deductions":
        return <Deductions />;
      case "payrollCycles":
        return <PayrollCycles />;
      default:
        return null;
    }
  };

  return (
    <>
      <div>
        <h1 className="text-2xl text-gray-400 font-semibold">Payroll Settings</h1>
        <h3 className="text-base text-gray-700 font-500">
          Manage the settings for your Staff Payroll
        </h3>
      </div>

      {/* Tabs */}
      <div className="tabs mt-6">
        {/* <button
          className={`tab flex items-center justify-center ${
            activeTab === "paymentSchedules" ? "active" : ""
          }`}
          onClick={() => setActiveTab("paymentSchedules")}
        >
          Compensation Types
        </button> */}
        <button
          className={`tab flex items-center justify-center ${
            activeTab === "incomeItems" ? "active" : ""
          }`}
          onClick={() => setActiveTab("incomeItems")}
        >
          Income Items
        </button>
        <button
          className={`tab flex items-center justify-center ${
            activeTab === "deductions" ? "active" : ""
          }`}
          onClick={() => setActiveTab("deductions")}
        >
          Deductions
        </button>
        <button
          className={`tab flex items-center justify-center ${
            activeTab === "payrollCycles" ? "active" : ""
          }`}
          onClick={() => setActiveTab("payrollCycles")}
        >
          Payroll Cycles
        </button>
      </div>

      <div className="mt-6">{renderActiveTab()}</div>
    </>
  );
};

export default PayrollSettings;

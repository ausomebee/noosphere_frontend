import React, { useState, useMemo } from "react";
import IncomeItems from "./PayrollSettingsSubs/IncomeItems";
import Deductions from "./PayrollSettingsSubs/Deductions";
import PayrollCycles from "./PayrollSettingsSubs/PayrollCycles";
import usePermissions from "../../../hooks/usePermissions";
import usePersistedTab from "../../../hooks/usePersistedTab";

const ALL_TABS = [
  { key: "incomeItems", label: "Income Items", permissionKey: "view_income_items_list" },
  { key: "deductions", label: "Deductions", permissionKey: "view_deductions_list" },
  { key: "payrollCycles", label: "Payroll Cycles", permissionKey: "view_payroll_cycles_list" },
];

const PayrollSettings = () => {
  const { hasPermission } = usePermissions();

  const visibleTabs = useMemo(
    () => ALL_TABS.filter((t) => hasPermission(t.permissionKey)),
    [hasPermission]
  );

  const [activeTab, setActiveTab] = usePersistedTab("tenant:payrollSettings", visibleTabs[0]?.key || "");

  const renderActiveTab = () => {
    switch (activeTab) {
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

  if (!visibleTabs.length) return null;

  return (
    <>
      <div>
        <h1 className="text-2xl text-gray-400 font-semibold">Payroll Settings</h1>
        <h3 className="text-base text-gray-700 font-500">
          Manage the settings for your Staff Payroll
        </h3>
      </div>

      <div className="tabs mt-6">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab flex items-center justify-center ${
              activeTab === tab.key ? "active" : ""
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">{renderActiveTab()}</div>
    </>
  );
};

export default PayrollSettings;

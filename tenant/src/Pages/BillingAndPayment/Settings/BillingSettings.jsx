import React, { useState, useMemo } from "react";
import ServiceCodes from "./SettingSubs/ServiceCodes";
import RoundingRules from "./SettingSubs/RoundingRules";
import PayersAndInsurance from "./SettingSubs/PayersAndInsurance";
import usePermissions from "../../../hooks/usePermissions";
import usePersistedTab from "../../../hooks/usePersistedTab";

const ALL_TABS = [
  { key: "serviceCodes", label: "Service Codes", permissionKey: "view_service_codes_list" },
  { key: "roundingRules", label: "Rounding Rules", permissionKey: "view_rounding_rules_list" },
  { key: "payersInsurance", label: "Payers & Insurance", permissionKey: "view_payers_list" },
];

const BillingSettings = () => {
  const { hasPermission } = usePermissions();

  const visibleTabs = useMemo(
    () => ALL_TABS.filter((t) => hasPermission(t.permissionKey)),
    [hasPermission]
  );

  const [view, setView] = usePersistedTab("tenant:billingSettings", visibleTabs[0]?.key || "");

  const renderContent = () => {
    switch (view) {
      case "serviceCodes":
        return <ServiceCodes />;
      case "roundingRules":
        return <RoundingRules />;
      case "payersInsurance":
        return <PayersAndInsurance />;
      default:
        return null;
    }
  };

  if (!visibleTabs.length) return null;

  return (
    <>
      <div>
        <h1 className="text-2xl text-gray-400 font-semibold">Settings</h1>
      </div>

      <div className="appointment-sched-view-switcher">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={`appointment-sched-view-button flex items-center ${
              view === tab.key
                ? "appointment-sched-view-button-active"
                : "appointment-sched-view-button-inactive"
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {renderContent()}
    </>
  );
};

export default BillingSettings;

import React, { useState } from "react";
import DashboardLayout from "../../../Layout/TenantLayout";
import ServiceCodes from "./SettingSubs/ServiceCodes";
import RoundingRules from "./SettingSubs/RoundingRules";
import PayersAndInsurance from "./SettingSubs/PayersAndInsurance";

const BillingSettings = () => {
  const [view, setView] = useState("serviceCodes");

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

  return (
    <DashboardLayout>
      <div>
        <h1 className="appointment-sched-title">Settings</h1>
      </div>

      <div className="appointment-sched-view-switcher">
        <button
          onClick={() => setView("serviceCodes")}
          className={`appointment-sched-view-button flex items-center ${
            view === "serviceCodes"
              ? "appointment-sched-view-button-active"
              : "appointment-sched-view-button-inactive"
          }`}
        >
          <span>Service Codes</span>
        </button>
        <button
          onClick={() => setView("roundingRules")}
          className={`appointment-sched-view-button flex items-center ${
            view === "roundingRules"
              ? "appointment-sched-view-button-active"
              : "appointment-sched-view-button-inactive"
          }`}
        >
          <span>Rounding Rules</span>
        </button>
        <button
          onClick={() => setView("payersInsurance")}
          className={`appointment-sched-view-button flex items-center ${
            view === "payersInsurance"
              ? "appointment-sched-view-button-active"
              : "appointment-sched-view-button-inactive"
          }`}
        >
          <span>Payers & Insurance</span>
        </button>
      </div>

      {renderContent()}
    </DashboardLayout>
  );
};

export default BillingSettings;

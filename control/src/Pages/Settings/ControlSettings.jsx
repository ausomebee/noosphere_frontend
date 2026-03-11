import React, { useState } from "react";
import Staff from "./SettingsSubs/Staff";
import Departments from "./SettingsSubs/Departments";
import Roles from "./SettingsSubs/Roles";
import "./Settings.css";

const tabs = [
  { key: "staff", label: "STAFF" },
  { key: "departments", label: "DEPARTMENTS" },
  { key: "roles", label: "ROLES" },
];

const ControlSettings = () => {
  const [activeTab, setActiveTab] = useState("staff");

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your organization settings here</p>
      </div>

      <div className="settings-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`settings-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="settings-tab-content">
        {activeTab === "staff" && <Staff />}
        {activeTab === "departments" && <Departments />}
        {activeTab === "roles" && <Roles />}
      </div>
    </div>
  );
};

export default ControlSettings;

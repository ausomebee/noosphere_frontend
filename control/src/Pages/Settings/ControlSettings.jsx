import usePageTitle from "../../hooks/usePageTitle";
import React from "react";
import Staff from "./SettingsSubs/Staff";
import Departments from "./SettingsSubs/Departments";
import Roles from "./SettingsSubs/Roles";
import usePersistedTab from "../../hooks/usePersistedTab";
import usePermission from "../../hooks/usePermission";
import "./Settings.css";

const ControlSettings = () => {
  usePageTitle("Settings");
  const { hasPermission } = usePermission();
  const [activeTab, setActiveTab] = usePersistedTab("control:controlSettings", "staff");

  // Only show tabs the user can view. Departments has no dedicated permission
  // key in the config, so it stays available under the (route-guarded) module.
  const tabs = [
    hasPermission("view_staff") && { key: "staff", label: "STAFF" },
    { key: "departments", label: "DEPARTMENTS" },
    hasPermission("view_roles") && { key: "roles", label: "ROLES" },
  ].filter(Boolean);

  // Fall back to the first visible tab if the persisted one is now hidden.
  const effectiveTab = tabs.some((t) => t.key === activeTab)
    ? activeTab
    : tabs[0]?.key;

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
            className={`settings-tab ${effectiveTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="settings-tab-content">
        {effectiveTab === "staff" && <Staff />}
        {effectiveTab === "departments" && <Departments />}
        {effectiveTab === "roles" && <Roles />}
      </div>
    </div>
  );
};

export default ControlSettings;

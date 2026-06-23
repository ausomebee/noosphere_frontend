import usePageTitle from "../../hooks/usePageTitle";
import React, { useState, useMemo } from "react";
import GeneralSettings from "./SettingsSubs/GeneralSettings";
import NotificationSettings from "./SettingsSubs/NotificationSettings";
import ClinicalReports from "./SettingsSubs/ClinicalReports";
import usePermissions from "../../hooks/usePermissions";
import usePersistedTab from "../../hooks/usePersistedTab";

const ALL_TABS = [
  { key: "generalSettings", label: "General Settings", permissionKey: "view_general_settings" },
  { key: "notificationSettings", label: "Notification Settings", permissionKey: "view_notification_settings" },
  { key: "clinicalReports", label: "Clinical Reports (Template Library)", permissionKey: "view_clinical_report_template_list" },
];

const Settings = () => {
  const { hasPermission } = usePermissions();

  const visibleTabs = useMemo(
    () => ALL_TABS.filter((t) => hasPermission(t.permissionKey)),
    [hasPermission]
  );

  usePageTitle("Settings");
  const [activeTab, setActiveTab] = usePersistedTab("tenant:settings", visibleTabs[0]?.key || "", visibleTabs.map((t) => t.key));

  const renderActiveTab = () => {
    switch (activeTab) {
      case "generalSettings":
        return <GeneralSettings />;
      case "notificationSettings":
        return <NotificationSettings />;
      case "clinicalReports":
        return <ClinicalReports />;
      default:
        return null;
    }
  };

  if (!visibleTabs.length) return null;

  return (
    <>
      <div>
        <h1 className="appointment-sched-title">Settings</h1>
        <h3 className="text-xl text-gray-700 font-500">
          Manage your application settings
        </h3>
      </div>

      <div className="tabs mt-20">
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

export default Settings;

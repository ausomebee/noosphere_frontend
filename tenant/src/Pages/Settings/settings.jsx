import React, { useState } from "react";
import GeneralSettings from "./SettingsSubs/GeneralSettings";
import NotificationSettings from "./SettingsSubs/NotificationSettings";
import ClinicalReports from "./SettingsSubs/ClinicalReports";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("generalSettings");


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
  return (
    <>
      <div>
        <h1 className="appointment-sched-title">Settings</h1>
        <h3 className="text-xl text-gray-700 font-500">
          Manage your application settings
        </h3>
      </div>

      <div className="tabs mt-20">
        <button
          className={`tab flex items-center justify-center ${
            activeTab === "generalSettings" ? "active" : ""
          }`}
          onClick={() => setActiveTab("generalSettings")}
        >
          General Settings
        </button>
        <button
          className={`tab flex items-center justify-center ${
            activeTab === "notificationSettings" ? "active" : ""
          }`}
          onClick={() => setActiveTab("notificationSettings")}
        >
          Notification Settings
        </button>
        <button
          className={`tab flex items-center justify-center ${
            activeTab === "clinicalReports" ? "active" : ""
          }`}
          onClick={() => setActiveTab("clinicalReports")}
        >
          Clinical Reports (Template Library)
        </button>
      </div>

            <div className="mt-6">{renderActiveTab()}</div>
    </>
  );
};

export default Settings;

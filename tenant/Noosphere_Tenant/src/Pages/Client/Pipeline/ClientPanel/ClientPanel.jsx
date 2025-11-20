// src/pages/Client/ClinentSubs/ClientPanel.jsx
import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import "./ClientPanel.css";
import { FaArrowLeft } from "react-icons/fa";
import ClientInformationTab from "./ClinentSubs/ClientInfo";
import ProgramsTab from "./ClinentSubs/Programs";
import AppointmentsScheduleTab from "./ClinentSubs/AppointmentsAndSchedules";
import AuthorizationTab from "./ClinentSubs/Authorization";
import ClinicalReportsTab from "./ClinentSubs/ClinicalReports";
import DashboardLayout from "../../../../Layout/TenantLayout";

const ClientPanel = () => {
  const [view, setView] = useState("clientInformation");
  const location = useLocation();

  // Detect if we're in "view" mode
  const isViewMode = location.pathname.includes("/view-client/");

  const renderTabContent = () => {
    switch (view) {
      case "clientInformation":
        return <ClientInformationTab isViewMode={isViewMode} />;
      case "programs":
        return <ProgramsTab />;
      case "appointmentsAndSchedule":
        return <AppointmentsScheduleTab />;
      case "authorization":
        return <AuthorizationTab />;
      case "clinicalReports":
        return <ClinicalReportsTab />;
      default:
        return <ClientInformationTab isViewMode={isViewMode} />;
    }
  };

  return (
    <DashboardLayout>
      <div className="client-panel-container">
        {/* Header */}
        <div className="manage-column-header">
          <div className="program-column-header">
            <button className="back-button">
              <FaArrowLeft />
              <span className="primary-text">Back</span>
            </button>
            <div className="breadcrumb-trail">
              <span className="breadcrumb-segment">Clinton Clifford</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="appointment-sched-view-switcher">
          <button
            onClick={() => setView("clientInformation")}
            className={`appointment-sched-view-button ${
              view === "clientInformation"
                ? "appointment-sched-view-button-active"
                : "appointment-sched-view-button-inactive"
            }`}
          >
            Client Information
          </button>
          <button
            onClick={() => setView("programs")}
            className={`appointment-sched-view-button ${
              view === "programs"
                ? "appointment-sched-view-button-active"
                : "appointment-sched-view-button-inactive"
            }`}
          >
            Programs
          </button>
          <button
            onClick={() => setView("appointmentsAndSchedule")}
            className={`appointment-sched-view-button ${
              view === "appointmentsAndSchedule"
                ? "appointment-sched-view-button-active"
                : "appointment-sched-view-button-inactive"
            }`}
          >
            Appointments & Schedule
          </button>
          <button
            onClick={() => setView("authorization")}
            className={`appointment-sched-view-button ${
              view === "authorization"
                ? "appointment-sched-view-button-active"
                : "appointment-sched-view-button-inactive"
            }`}
          >
            Authorization
            <span className="auth-badge">1</span>
          </button>
          <button
            onClick={() => setView("clinicalReports")}
            className={`appointment-sched-view-button ${
              view === "clinicalReports"
                ? "appointment-sched-view-button-active"
                : "appointment-sched-view-button-inactive"
            }`}
          >
            Clinical Reports
          </button>
        </div>

        {/* Dynamic Content */}
        {renderTabContent()}
      </div>
    </DashboardLayout>
  );
};

export default ClientPanel;
// src/pages/Client/ClinentSubs/ClientPanel.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./ClientPanel.css";
import { FaArrowLeft } from "react-icons/fa";
import ClientInformationTab from "./ClinentSubs/ClientInfo";
import ProgramsTab from "./ClinentSubs/Programs";
import AppointmentsScheduleTab from "./ClinentSubs/AppointmentsAndSchedules";
import AuthorizationTab from "./ClinentSubs/Authorization";
import ClinicalReportsTab from "./ClinentSubs/ClinicalReports";
import DashboardLayout from "../../../../Layout/TenantLayout";
import api from "../../../../api/clientPanelApis"; // adjust path
import { useSelector } from "react-redux";
import LoadingSpinner from "../../../../Components/LoadingSpinner";

const ClientPanel = () => {
  const navigate = useNavigate();
  const { clientId } = useParams(); // <-- get the ID from URL
  const location = useLocation();
  const [view, setView] = useState("clientInformation");
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const accessToken = useSelector((s) => s.authentication?.user?.accessToken);
  const refreshToken = useSelector((s) => s.authentication?.user?.refreshToken);

  const isViewMode = location.pathname.includes("/view-client/");

  // Fetch single pipeline item
  useEffect(() => {
    if (!clientId) return;

    const fetchClient = async () => {
      try {
        setLoading(true);
        const res = await api.GetSingleClientByClientId({
          id: clientId,
          accessToken,
          refreshToken,
        });
        setClientData(res.data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [clientId, accessToken, refreshToken]);

  const renderTabContent = () => {
    if (loading)
      return (
        <div className="p-8 text-center">
          <LoadingSpinner />{" "}
        </div>
      );

    switch (view) {
      case "clientInformation":
        return (
          <ClientInformationTab
            clientData={clientData}
            isViewMode={isViewMode}
          />
        );
      case "programs":
        return <ProgramsTab fullName={fullName} />;
      case "appointmentsAndSchedule":
        return <AppointmentsScheduleTab fullName={fullName} />;
      case "authorization":
        return <AuthorizationTab />;
      case "clinicalReports":
        return <ClinicalReportsTab clientData={clientData} />;
      default:
        return (
          <ClientInformationTab
            clientData={clientData}
            isViewMode={isViewMode}
          />
        );
    }
  };

  const onBack = () => {
    navigate(-1);
  };

  // Full name for header (fallback to "Client" while loading)
  const fullName = clientData
    ? `${clientData.client.firstName || ""} ${
        clientData.client.lastName || ""
      }`.trim() || "Client"
    : "Unknown";

  return (
    <DashboardLayout>
      <div className="client-panel-container">
        {/* Header */}
        <div className="manage-column-header">
          <div className="program-column-header">
            <button className="back-button" onClick={onBack}>
              <FaArrowLeft />
              <span className="primary-text">Back</span>
            </button>
            <div className="breadcrumb-trail">
              <span className="breadcrumb-segment">{fullName}</span>
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

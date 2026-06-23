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

import api from "../../../../api/clientPanelApis"; // adjust path
import useAuth from "../../../../hooks/useAuth";
import LoadingSpinner from "../../../../Components/LoadingSpinner";

const ClientPanel = () => {
  const navigate = useNavigate();
  const { clientId } = useParams(); // <-- get the ID from URL
  const location = useLocation();
  const [view, setView] = useState("clientInformation");
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const { accessToken, refreshToken } = useAuth();

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
  }, [clientId, accessToken, refreshToken, reloadKey]);

  const refreshClient = () => setReloadKey((k) => k + 1);

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
            onUpdated={refreshClient}
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
            onUpdated={refreshClient}
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
    <>
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
        <div className="appointment-sched-view-switcher appointment-tabs-balanced">
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
    </>
  );
};

export default ClientPanel;

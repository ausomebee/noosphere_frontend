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
import usePersistedTab from "../../../../hooks/usePersistedTab";
import usePermissions from "../../../../hooks/usePermissions";

const ClientPanel = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { clientId, tenantClientId } = useParams(); // <-- get the IDs from URL
  const location = useLocation();
  const [view, setView] = usePersistedTab(`tenant:clientPanel:${clientId}`, "clientInformation");
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [authCount, setAuthCount] = useState(0);

  const { accessToken, refreshToken } = useAuth();

  const isViewMode = location.pathname.includes("/view-client/");

  // When arriving from a notification, focus the requested panel tab.
  useEffect(() => {
    const focusTab = location.state?.focusTab;
    const VALID_TABS = [
      "clientInformation",
      "programs",
      "appointmentsAndSchedule",
      "authorization",
      "clinicalReports",
    ];
    if (focusTab && VALID_TABS.includes(focusTab)) {
      setView(focusTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

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

  // Fetch the real authorization count so the tab badge reflects actual data
  // (and hides when there are none) instead of a hardcoded number.
  useEffect(() => {
    if (!tenantClientId) return;
    let cancelled = false;
    const fetchAuthCount = async () => {
      try {
        const res = await api.GetAllClientAuthorizationByTenantClientId({
          tenantClientId,
          accessToken,
          refreshToken,
        });
        if (cancelled) return;
        const list = res?.data?.data || [];
        setAuthCount(Array.isArray(list) ? list.length : 0);
      } catch {
        if (!cancelled) setAuthCount(0);
      }
    };
    fetchAuthCount();
    return () => {
      cancelled = true;
    };
  }, [tenantClientId, accessToken, refreshToken, reloadKey]);

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

        {/* Tabs — segmented (pill) style, matching Program Library */}
        <div className="appointment-sched-view-switcher appointment-tabs-segmented">
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
          {hasPermission("view_client_program_list") && (
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
          )}
          {hasPermission("view_client_appointment_schedules_list") && (
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
          )}
          {hasPermission("view_client_authorization_list") && (
            <button
              onClick={() => setView("authorization")}
              className={`appointment-sched-view-button ${
                view === "authorization"
                  ? "appointment-sched-view-button-active"
                  : "appointment-sched-view-button-inactive"
              }`}
            >
              Authorization
              {authCount > 0 && <span className="auth-badge">{authCount}</span>}
            </button>
          )}
          {hasPermission("view_client_clinical_report_list") && (
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
          )}
        </div>

        {/* Dynamic Content */}
        {renderTabContent()}
      </div>
    </>
  );
};

export default ClientPanel;

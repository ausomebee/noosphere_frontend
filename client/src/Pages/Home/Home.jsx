import usePageTitle from "../../hooks/usePageTitle";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import DashboardLayout from "../../layouts/ClientLayout";

import "./Home.css";
import { LuCalendarClock, LuEye } from "react-icons/lu";
import ReusableTable from "../../Components/Table/ReuseableTable";
import EmptyAppointmentsSvg from "../../Components/Svgs/EmptyAppointmentSvg";
import OverviewCard from "../../Components/Cards/Dashboard/Overview/OverviewCard";
import AuthorizationCard from "../../Components/Cards/Dashboard/Authorization/AuthorizationCard";

// === ALL MODALS IMPORTED ===
import RescheduleModal from "../../Components/Modal/UpcomingDashboardModal/RescheduleModal";
import AppointmentDetailsModal from "../../Components/Modal/UpcomingDashboardModal/AppointmentDetailsModal";
import SessionFeedbackModal from "../../Components/Modal/UpcomingDashboardModal/ReviewSessionModal";
import SuccessModal from "../../Components/Modal/SuccessModal";

// API Functions
import api from "../../api/homeApis";
import ErrorFallback from "../../Components/ErrorFallback";
import usePersistedTab from "../../hooks/usePersistedTab";

import useAuth from "../../hooks/useAuth";
import { formatDate, formatTime, formatTimeFromDate } from "../../Helper/Formatters";

// ============================================================================
// Loading Spinner Component (Embedded)
// ============================================================================
const LoadingSpinner = ({ size = "medium", message = "Loading..." }) => {
  const sizeMap = {
    small: { width: "24px", height: "24px", borderWidth: "2px" },
    medium: { width: "40px", height: "40px", borderWidth: "3px" },
    large: { width: "60px", height: "60px", borderWidth: "4px" },
  };

  const spinnerSize = sizeMap[size] || sizeMap.medium;

  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    minHeight: "300px",
  };

  const spinnerStyle = {
    width: spinnerSize.width,
    height: spinnerSize.height,
    border: `${spinnerSize.borderWidth} solid #f3f4f6`,
    borderTop: `${spinnerSize.borderWidth} solid #3b82f6`,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  };

  const messageStyle = {
    marginTop: "16px",
    fontSize: "14px",
    color: "#6b7280",
    fontWeight: "500",
  };

  return (
    <div style={containerStyle}>
      <div style={spinnerStyle}></div>
      {message && <p style={messageStyle}>{message}</p>}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Main Home Component
// ============================================================================
const Home = () => {
  usePageTitle("Dashboard");
  const [activeTab, setActiveTab] = usePersistedTab("client:home", "upcoming");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState({
    overview: false,
    chart: false,
    authorization: false,
    appointments: false,
  });
  const [error, setError] = useState(null);

  // Data states
  const [overviewData, setOverviewData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [authorizationData, setAuthorizationData] = useState([]);
  const [selectedServiceCode, setSelectedServiceCode] = useState(null);
  const [chartPeriod, setChartPeriod] = useState("month");

  // Appointments data states
  const [appointmentsData, setAppointmentsData] = useState({
    upcoming: [],
    awaiting: [],
    completed: [],
    reschedule: [],
    cancelled: [],
  });

  const { clientId, tenantClientId, tenantId, accessToken, refreshToken } = useAuth();

  // Modal States
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState("Awesome");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch Overview Data
  useEffect(() => {
    const fetchOverviewData = async () => {
      if (!clientId || !accessToken) return;

      setLoading(prev => ({ ...prev, overview: true }));
      try {
        const response = await api.GetClientSessionOverview({
          clientId,
          accessToken,
          refreshToken,
        });

        // Transform API data to match component props
        const avgSeconds = response.data.data.avgSession[0]?.avg_seconds;
        const hours = Math.floor(avgSeconds / 3600);
        const minutes = Math.floor((avgSeconds % 3600) / 60);
        const avgDuration = `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}hrs`;

        setOverviewData({
          completedSessions: response.data.data.completedSession || 0,
          avgSessionDuration: avgDuration,
          upcomingSessions: response.data.data.awaitingApproval || 0,
          chartData: chartData,
        });
      } catch (error) {
        console.error("Failed to fetch overview:", error);
        setError("Failed to load overview data");
      } finally {
        setLoading(prev => ({ ...prev, overview: false }));
      }
    };

    fetchOverviewData();
  }, [clientId, accessToken, refreshToken, chartData]);

  // Fetch Chart Data
  useEffect(() => {
    const fetchChartData = async () => {
      if (!clientId || !accessToken) return;

      setLoading(prev => ({ ...prev, chart: true }));
      try {
        const response = await api.GetClientSessionChart({
          clientId,
          groupBy: chartPeriod,
          accessToken,
          refreshToken,
        });

        // Transform API data to match chart format
        const transformedData = response.data.data.map(item => ({
          month: item.period,
          value: item.session_count,
        }));

        setChartData(transformedData);
      } catch (error) {
        console.error("Failed to fetch chart data:", error);
        setError("Failed to load chart data");
      } finally {
        setLoading(prev => ({ ...prev, chart: false }));
      }
    };

    fetchChartData();
  }, [clientId, chartPeriod]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch Authorization Service Codes
  useEffect(() => {
    const fetchAuthorizationCodes = async () => {
      if (!tenantClientId || !accessToken) return;

      setLoading(prev => ({ ...prev, authorization: true }));
      try {
        const response = await api.GetAllAuthorizationServiceCodes({
          tenantClientId,
          accessToken,
          refreshToken,
        });

        setAuthorizationData(response.data.data);
      } catch (error) {
        console.error("Failed to fetch authorization codes:", error);
        setError("Failed to load authorization data");
      } finally {
        setLoading(prev => ({ ...prev, authorization: false }));
      }
    };

    fetchAuthorizationCodes();
  }, [tenantClientId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch Appointments Data based on active tab
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!clientId || !accessToken) return;

      setLoading(prev => ({ ...prev, appointments: true }));
      try {
        let response;
        let transformedData = [];

        switch (activeTab) {
          case "upcoming":
            response = await api.GetClientUpcomingAppointments({
              clientId,
              accessToken,
              refreshToken,
            });
            
            // Transform upcoming appointments data based on actual API response
            transformedData = response.data.data.map(apt => {
              // Get service types from appointmentServices array
              const serviceTypes = apt.appointmentServices
                ?.map(service => {
                  const code = service.serviceCode?.code || "";
                  const description = service.serviceCode?.description || "";
                  return `${code}${description ? ` - ${description.substring(0, 20)}...` : ""}`;
                })
                .join(", ") || "N/A";

              // Get clinician names
              const clinicians = apt.clinicians
                ?.map(c => c.fullName)
                .join(", ") || "Not assigned";

              // Format date and time
              const dateFormatted = formatDate(apt.date);

              const timeRange = apt.startTime
                ? `${formatTime(apt.startTime)} - ${formatTime(apt.endTime)}`
                : "";

              return {
                id: apt.id,
                sessionType: apt.session?.name || "N/A",
                serviceType: serviceTypes,
                dateTime: `${dateFormatted}\n${timeRange}`,
                clinician: clinicians,
                isNew: false,
                originalData: apt,
              };
            });
            break;

          case "awaiting":
            response = await api.GetClientAwaitingApprovals({
              clientId,
              accessToken,
              refreshToken,
            });
            
            // Transform awaiting approvals data based on actual API response
            transformedData = response.data.data.map(session => {
              const apt = session.appointment || {};
              const client = apt.client || {};
              const sessionInfo = apt.session || {};
              const clinicians = apt.clinicians || [];

              // Get client name
              const clientName = client.firstName && client.lastName
                ? `${client.firstName} ${client.lastName}`
                : "Unknown";

              // Get clinician names
              const clinicianNames = clinicians
                .map(c => c.fullName)
                .join(", ") || "Not assigned";

              // Format date and time
              const dateFormatted = formatDate(session.startTime);

              const timeFormatted = session.startTime
                ? formatTimeFromDate(session.startTime)
                : "";

              return {
                id: session.id,
                sessionType: sessionInfo.name || "N/A",
                serviceType: "Pending Review", // Not provided in awaiting feedback response
                dateTime: `${dateFormatted}\n${timeFormatted}`,
                clinician: clinicianNames,
                clientApprovalStatus: session.clientApprovalStatus,
                supervisorApprovalStatus: session.supervisorApprovalStatus,
                // Store original data for modals
                originalData: session,
              };
            });
            break;

          case "completed":
            response = await api.GetClientCompletedAppointments({
              clientId,
              accessToken,
              refreshToken,
            });
            
            // Transform completed appointments data
            transformedData = response.data.data.map(session => {
              // Format date (ISO 8601 format from API)
              const dateFormatted = formatDate(session.date);

              // Format time from ISO date
              const timeFormatted = session.date
                ? formatTimeFromDate(session.date)
                : "";

              // Format duration - convert decimal hours to readable format
              let durationDisplay = "";
              if (session.totalHours) {
                const hours = Math.floor(session.totalHours);
                const minutes = Math.round((session.totalHours - hours) * 60);
                
                if (hours > 0 && minutes > 0) {
                  durationDisplay = `${hours}h ${minutes}m`;
                } else if (hours > 0) {
                  durationDisplay = `${hours}h`;
                } else {
                  durationDisplay = `${minutes}m`;
                }
              }

              return {
                id: session.id,
                sessionType: session.sessionTypeName || "N/A",
                serviceType: "Completed", // Not provided in completed response
                dateTime: `${dateFormatted}${timeFormatted ? '\n' + timeFormatted : ''}${durationDisplay ? '\n' + durationDisplay : ''}`,
                clinician: session.clinician || "Not assigned",
                clientName: session.clientName,
                clientApprovalStatus: session.clientApprovalStatus,
                supervisorApprovalStatus: session.supervisorApprovalStatus,
                totalHours: session.totalHours,
                // Store original data for modals
                originalData: session,
              };
            });
            break;

          case "cancelled":
            response = await api.GetClientCancelAppointments({
              clientId,
              accessToken,
              refreshToken,
            });
            
            // Transform cancelled appointments data (same structure as upcoming)
            transformedData = response.data.data.map(apt => {
              // Get service types from appointmentServices array
              const serviceTypes = apt.appointmentServices
                ?.map(service => {
                  const code = service.serviceCode?.code || "";
                  const description = service.serviceCode?.description || "";
                  return `${code}${description ? ` - ${description.substring(0, 20)}...` : ""}`;
                })
                .join(", ") || "N/A";

              // Get clinician names
              const clinicians = apt.clinicians
                ?.map(c => c.fullName)
                .join(", ") || "Not assigned";

              // Format date and time
              const dateFormatted = formatDate(apt.date);

              const cancelTimeRange = apt.startTime
                ? `${formatTime(apt.startTime)} - ${formatTime(apt.endTime)}`
                : "";

              return {
                id: apt.id,
                sessionType: apt.session?.name || "N/A",
                serviceType: serviceTypes,
                dateTime: `${dateFormatted}\n${cancelTimeRange}`,
                clinician: clinicians,
                cancelReason: apt.reasonForCancel || "No reason provided",
                canceledBy: apt.canceledBy || "Unknown",
                originalData: apt,
              };
            });
            break;

          case "reschedule":
            response = await api.GetClientRescheduledAppointments({
              clientId,
              accessToken,
              refreshToken,
            });
            
            // Transform rescheduled appointments data (same structure as upcoming)
            transformedData = response.data.data.map(apt => {
              // Get service types from appointmentServices array
              const serviceTypes = apt.appointmentServices
                ?.map(service => {
                  const code = service.serviceCode?.code || "";
                  const description = service.serviceCode?.description || "";
                  return `${code}${description ? ` - ${description.substring(0, 20)}...` : ""}`;
                })
                .join(", ") || "N/A";

              // Get clinician names
              const clinicians = apt.clinicians
                ?.map(c => c.fullName)
                .join(", ") || "Not assigned";

              // Format date and time
              const dateFormatted = formatDate(apt.date);

              const rescheduleTimeRange = apt.startTime
                ? `${formatTime(apt.startTime)} - ${formatTime(apt.endTime)}`
                : "";

              return {
                id: apt.id,
                sessionType: apt.session?.name || "N/A",
                serviceType: serviceTypes,
                dateTime: `${dateFormatted}\n${rescheduleTimeRange}`,
                clinician: clinicians,
                rescheduled: apt.rescheduled,
                rescheduleAccepted: apt.rescheduleAccepted,
                rescheduleRejected: apt.rescheduleRejected,
                previousDate: apt.previousDate,
                previousStartTime: apt.previousStartTime,
                previousEndTime: apt.previousEndTime,
                // Store original data for modals
                originalData: apt,
              };
            });
            break;

          default:
            transformedData = [];
        }

        setAppointmentsData(prev => ({
          ...prev,
          [activeTab]: transformedData,
        }));
      } catch (error) {
        console.error(`Failed to fetch ${activeTab} appointments:`, error);
        // Don't set global error, just log it
        setAppointmentsData(prev => ({
          ...prev,
          [activeTab]: [],
        }));
      } finally {
        setLoading(prev => ({ ...prev, appointments: false }));
      }
    };

    fetchAppointments();
  }, [activeTab, clientId, accessToken, refreshToken, refreshKey]);

  // Prepare authorization card data for selected service code
  const authorizationCardData = useMemo(() => {
    if (!selectedServiceCode) return null;
    return {
      totalAuthorized: selectedServiceCode.totalUnits || 0,
      totalCompleted: selectedServiceCode.totalUsed || 0,
      totalRemaining: selectedServiceCode.totalRemaining || 0,
      serviceCode: selectedServiceCode.code,
      description: selectedServiceCode.description,
    };
  }, [selectedServiceCode]);

  // Service code options for dropdown
  const serviceCodeOptions = useMemo(() =>
    authorizationData.map(item => ({
      value: item.serviceCodeId,
      label: `${item.code} - ${item.description}`,
    })),
    [authorizationData]
  );

  // Handle service code change
  const handleServiceCodeChange = useCallback((value) => {
    const selected = authorizationData.find(item => item.serviceCodeId === value);
    setSelectedServiceCode(selected);
  }, [authorizationData]);

  const ITEMS_PER_PAGE = 10;

  // Calculate awaiting count
  const awaitingCount = appointmentsData.awaiting.length;

  // Paginate data
  const currentTabData = useMemo(() =>
    appointmentsData[activeTab] || [],
    [appointmentsData, activeTab]
  );
  const totalPages = Math.max(1, Math.ceil(currentTabData.length / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() =>
    currentTabData.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    ),
    [currentTabData, currentPage]
  );

  // Reset page when tab changes
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  }, []);

  const tabs = useMemo(() => [
    { key: "upcoming", label: "Upcoming" },
    { key: "awaiting", label: "Awaiting feedback", count: awaitingCount },
    { key: "reschedule", label: "Reschedule Requests" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ], [awaitingCount]);

  const columns = useMemo(() => [
    { key: "sessionType", title: "Session Type" },
    { key: "serviceType", title: "Service Type(s)" },
    {
      key: "dateTime",
      title: "Date & Time",
      render: (value) => (
        <span style={{ whiteSpace: "pre-line" }}>{value}</span>
      ),
    },
    { key: "clinician", title: "Clinician(s)" },
  ], []);

  // Actions per tab
  const getActions = () => {
    switch (activeTab) {
      case "upcoming":
        return [
          {
            render: (row) =>
              row.isNew && <span className="status-badge new">New</span>,
          },
          {
            menu: true,
            label: "Request Reschedule",
            icon: <LuCalendarClock size={16} />,
            onClick: (row) => {
              setSelectedAppointment(row);
              setRescheduleModalOpen(true);
            },
          },
          {
            menu: true,
            label: "View appointment details",
            icon: <LuEye size={16} />,
            onClick: (row) => {
              setSelectedAppointment(row);
              setDetailsModalOpen(true);
            },
          },
        ];

      case "awaiting":
        return [
          {
            render: (row) => (
              <button
                className="action-link"
                style={{
                  fontWeight: "600",
                  color: "#3b82f6",
                  textDecoration: "underline",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setSelectedAppointment(row);
                  setFeedbackModalOpen(true);
                }}
              >
                Review Session
              </button>
            ),
          },
        ];

      case "reschedule":
        return [
          {
            render: (row) => {
              if (row.rescheduleAccepted) {
                return (
                  <span 
                    style={{
                      padding: "4px 12px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "500",
                      background: "#dcfce7",
                      color: "#16a34a",
                    }}
                  >
                    Accepted
                  </span>
                );
              }
              if (row.rescheduleRejected) {
                return (
                  <span 
                    style={{
                      padding: "4px 12px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "500",
                      background: "#fee2e2",
                      color: "#dc2626",
                    }}
                  >
                    Rejected
                  </span>
                );
              }
              return (
                <span 
                  style={{
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "500",
                    background: "#fef3c7",
                    color: "#d97706",
                  }}
                >
                  Pending
                </span>
              );
            },
          },
          {
            menu: true,
            label: "View details",
            icon: <LuEye size={16} />,
            onClick: (row) => {
              setSelectedAppointment(row);
              setDetailsModalOpen(true);
            },
          },
        ];

      case "completed":
        return [];

      case "cancelled":
        return [];

      default:
        return [];
    }
  };

  // Success Handlers
  const successTimerRef = useRef(null);
  const showSuccess = useCallback(() => {
    setSuccessModalOpen(true);
    clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setSuccessModalOpen(false), 3500);
  }, []);

  const handleRescheduleSuccess = () => {
    setRescheduleModalOpen(false);
    setSelectedAppointment(null);
    setSuccessTitle("Awesome");
    setSuccessMessage("Your reschedule request has been sent!");
    showSuccess();
    setRefreshKey(prev => prev + 1);
  };

  const handleFeedbackSuccess = () => {
    setFeedbackModalOpen(false);
    setSelectedAppointment(null);
    setSuccessTitle("Thank you!");
    setSuccessMessage("Your session feedback has been submitted!");
    showSuccess();
    setRefreshKey(prev => prev + 1);
  };

  // Handle session approval submission - returns promise so modal can await it
  const handleSessionApproval = async (approvalData) => {
    await api.ApproveSession({
      sessionId: approvalData.sessionId,
      confirmDelivery: approvalData.confirmDelivery,
      rateService: approvalData.rateService,
      rateTherapist: approvalData.rateTherapist,
      feedback: approvalData.feedback,
      signature: approvalData.signature,
      accessToken,
      refreshToken,
    });
    handleFeedbackSuccess();
  };

  // Handle period change for chart
  const handlePeriodChange = (value) => {
    setChartPeriod(value);
  };

  // Show loading state
  if (loading.overview && loading.chart && loading.authorization) {
    return (
      <DashboardLayout>
        <div className="home-content">
          <LoadingSpinner size="large" message="Loading dashboard..." />
        </div>
      </DashboardLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <DashboardLayout>
        <ErrorFallback
          message="Something went wrong loading your dashboard. Please try again."
          onRetry={() => window.location.reload()}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="home-content">
        <div className="home-grid">
          <OverviewCard 
            data={overviewData} 
            onPeriodChange={handlePeriodChange}
            selectedPeriod={chartPeriod}
          />
          <AuthorizationCard 
            data={authorizationCardData}
            serviceCodeOptions={serviceCodeOptions}
            onServiceCodeChange={handleServiceCodeChange}
            selectedServiceCodeId={selectedServiceCode?.serviceCodeId}
          />
        </div>

        <div className="home-table-section">
          {loading.appointments ? (
            <div style={{ 
              background: "white", 
              borderRadius: "12px", 
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
            }}>
              <div style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 4px" }}>
                  My Appointments
                </h2>
                <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                  See and manage all your appointments here
                </p>
              </div>
              <LoadingSpinner message="Loading appointments..." />
            </div>
          ) : (
            <ReusableTable
              title="My Appointments"
              subtitle="See and manage all your appointments here"
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              columns={columns}
              data={paginatedData}
              searchPlaceholder="Search Appointments"
              showFilters={true}
              showViewToggle={true}
              emptyState={{
                icon: <EmptyAppointmentsSvg />,
                title: "No appointments",
                subtitle:
                  "You don't have any appointments yet. New appointments will appear here",
              }}
              actions={getActions()}
              pagination={{ currentPage, totalPages }}
              onPageChange={setCurrentPage}
            />
          )}
        </div>

        {/* === ALL MODALS === */}
        {detailsModalOpen && (
          <AppointmentDetailsModal
            isOpen={detailsModalOpen}
            onClose={() => {
              setDetailsModalOpen(false);
              setSelectedAppointment(null);
            }}
            appointment={selectedAppointment}
            onReschedule={(apt) => {
              setSelectedAppointment(apt);
              setRescheduleModalOpen(true);
              setDetailsModalOpen(false);
            }}
          />
        )}

        <RescheduleModal
          isOpen={rescheduleModalOpen}
          onClose={() => {
            setRescheduleModalOpen(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          accessToken={accessToken}
          refreshToken={refreshToken}
          tenantId={tenantId}
          onSuccess={handleRescheduleSuccess}
        />

        <SessionFeedbackModal
          isOpen={feedbackModalOpen}
          onClose={() => {
            setFeedbackModalOpen(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          onSave={handleSessionApproval}
        />

        <SuccessModal
          isOpen={successModalOpen}
          onClose={() => setSuccessModalOpen(false)}
          title={successTitle}
          message={successMessage}
        />
      </div>
    </DashboardLayout>
  );
};

export default Home;
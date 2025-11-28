// src/pages/Client/ClientSubs/AppointmentsAndSchedules/AppointmentsScheduleTab.jsx
import { useState, memo, useCallback, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { format, addDays, subDays } from "date-fns";
import Button from "../../../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import { showToast } from "../../../../../Helper/ShowToast";
import AppointmentModal from "../../../../../Components/ReusableModal/SchedulerModal/AppointmentModal";
import api from "../../../../../api/AppointmentApi";
import api2 from "../../../../../api/clientPanelApis";
import CustomTable from "../../../../../Components/Table/CustomTable";
import MonthView from "../../../../../Components/CalendarScheduler/MonthView";
import { SearchInput } from "../../../../../Components/Input/Inputs";
import { useParams } from "react-router-dom";

const MemoAppointmentModal = memo(AppointmentModal);

const AppointmentsScheduleTab = ({ fullName }) => {
  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const token = useSelector((s) => s.authentication?.user?.token);
  const accessToken = token;
  const refreshToken = token;
  const [activeTab, setActiveTab] = useState("upcomingAppointments");
  const [viewMode, setViewMode] = useState("table");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const { clientId } = useParams(); // Get clientId from URL params

  const [clients, setClients] = useState([]);
  const [sessionTypes, setSessionTypes] = useState([]);
  const [staff, setStaff] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  const currentClient = useMemo(() => {
    if (!clientId) return null;

    // If we have clients loaded, find the current one
    if (clients.length > 0) {
      const client = clients.find(
        (client) => client.id === clientId || client.clientId === clientId
      );

      // Return the EXACT structure that AppointmentModal expects
      if (client) {
        return {
          clientId: client.id || client.clientId,
          client: {
            firstName:
              client.firstName || client.fullName?.split(" ")[0] || "Client",
            lastName:
              client.lastName ||
              client.fullName?.split(" ").slice(1).join(" ") ||
              "",
          },
          // Include any other fields that might be in the original client data
          ...client,
        };
      }
    }

    // Fallback structure that matches modal expectations
    const nameParts = (fullName || "Current Client").split(" ");
    const firstName = nameParts[0] || "Client";
    const lastName = nameParts.slice(1).join(" ") || "";

    return {
      clientId: clientId,
      client: {
        firstName: firstName,
        lastName: lastName,
      },
      firstName: firstName,
      lastName: lastName,
      fullName: fullName || "Current Client",
    };
  }, [clients, clientId, fullName]);

  // Fetch supporting data - fix client fetching
  const fetchSupportingData = useCallback(async () => {
    try {
      const [sess, stf] = await Promise.all([
        api
          .GetSessionTypeActiveByTenantId({
            tenantId,
            accessToken,
            refreshToken,
          })
          .then((r) => r.data?.data || []),
        api
          .GetTenantStaffByTenantId({ tenantId, accessToken, refreshToken })
          .then((r) => r.data?.data || []),
      ]);
      setSessionTypes(sess);
      setStaff(stf);

      // Only fetch current client details
      if (clientId) {
        try {
          const clientResponse = await api2.GetClientById({
            clientId,
            accessToken,
            refreshToken,
          });
          if (clientResponse?.data?.data) {
            const clientData = clientResponse.data.data;
            // Transform the client data to match modal expectations
            const transformedClient = {
              clientId: clientData.id || clientData.clientId,
              client: {
                firstName:
                  clientData.firstName ||
                  clientData.fullName?.split(" ")[0] ||
                  "Client",
                lastName:
                  clientData.lastName ||
                  clientData.fullName?.split(" ").slice(1).join(" ") ||
                  "",
              },
              // Include original data
              ...clientData,
            };
            setClients([transformedClient]);
          }
        } catch (error) {
          console.error("Failed to fetch client details:", error);
          // Create a minimal client object with correct structure
          const nameParts = (fullName || "Current Client").split(" ");
          const firstName = nameParts[0] || "Client";
          const lastName = nameParts.slice(1).join(" ") || "";

          setClients([
            {
              clientId: clientId,
              client: {
                firstName: firstName,
                lastName: lastName,
              },
              firstName: firstName,
              lastName: lastName,
              fullName: fullName || "Current Client",
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Failed to load support data:", error);
      showToast("Failed to load support data", "error");
    }
  }, [tenantId, accessToken, refreshToken, clientId, fullName]);
  // Fetch appointments for the CURRENT CLIENT only
  const fetchAppointments = useCallback(async () => {
    if (!clientId) {
      showToast("Client ID not found", "error");
      return;
    }

    setLoading(true);
    try {
      let response;
      switch (activeTab) {
        case "upcomingAppointments":
          response = await api2.GetClientUpcomingAppointments({
            id: clientId,
            accessToken,
            refreshToken,
          });
          break;
        case "pastAppointments":
          response = await api2.GetClientPastAppointments({
            id: clientId,
            accessToken,
            refreshToken,
          });
          break;
        case "cancelledAppointments":
          response = await api2.GetClientCancelAppointments({
            id: clientId,
            accessToken,
            refreshToken,
          });
          break;
        default:
          response = { data: { data: [] } };
      }

      // Handle the API response structure
      if (response?.data?.data) {
        setAppointments(response.data.data);
      } else if (response?.data) {
        // Handle case where data is directly in response.data
        setAppointments(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      showToast("Failed to fetch appointments", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab, clientId, accessToken, refreshToken]);

  useEffect(() => {
    fetchSupportingData();
  }, [fetchSupportingData]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Format appointments for display using your API structure
  const formattedAppointments = useMemo(() => {
    return appointments.map((appt) => {
      // Safely get client name from appointment data
      let clientName = "Current Client";
      if (appt.client) {
        if (appt.client.firstName && appt.client.lastName) {
          clientName = `${appt.client.firstName} ${appt.client.lastName}`;
        } else if (appt.client.fullName) {
          clientName = appt.client.fullName;
        }
      } else if (currentClient?.fullName) {
        clientName = currentClient.fullName;
      }

      return {
        id: appt.id,
        clientName: clientName,
        therapistName:
          appt.clinicians?.map((c) => c.fullName).join(", ") || "Unassigned",
        serviceType:
          appt.service?.map((s) => s.serviceType).join(", ") || "N/A",
        sessionType: appt.session?.name || "N/A",
        date: appt.date || "Unknown Date",
        time:
          appt.startTime && appt.endTime
            ? `${appt.startTime} - ${appt.endTime}`
            : "No Time",
        dateTime: appt.date
          ? `${format(new Date(appt.date), "MMM dd, yyyy")} • ${
              appt.startTime || ""
            }`
          : "Unknown Date",
        colorCode: appt.colourCode || "#3B82F6",
        hasActions: true,
        rawData: appt,
      };
    });
  }, [appointments, currentClient]);

  // Search filtering - only search within this client's appointments
  const filteredAppointments = useMemo(() => {
    if (!searchTerm) return formattedAppointments;

    const term = searchTerm.toLowerCase();
    return formattedAppointments.filter(
      (appt) =>
        appt.therapistName.toLowerCase().includes(term) ||
        appt.serviceType.toLowerCase().includes(term) ||
        appt.sessionType.toLowerCase().includes(term) ||
        appt.date.toLowerCase().includes(term) ||
        appt.time.toLowerCase().includes(term)
    );
  }, [formattedAppointments, searchTerm]);

  // Calendar view appointments format
  const calendarAppointments = useMemo(() => {
    return filteredAppointments.map((appt) => ({
      id: appt.id,
      clientId: clientId,
      clinicianIds: appt.rawData.clinicians?.map((c) => c.id) || [],
      service: appt.rawData.service || [],
      sessionId: appt.rawData.sessionId,
      date: appt.date,
      startTime: appt.rawData.startTime,
      endTime: appt.rawData.endTime,
      colourCode: appt.colorCode,
      title: appt.serviceType || "Appointment",
    }));
  }, [filteredAppointments, clientId]);

  // Table filters - only show filters relevant to this client's appointments
  const filters = useMemo(() => {
    const clinicians = [
      ...new Set(formattedAppointments.map((a) => a.therapistName)),
    ]
      .filter(Boolean)
      .map((n) => ({ value: n, label: n }));
    const services = [
      ...new Set(formattedAppointments.map((a) => a.serviceType)),
    ]
      .filter(Boolean)
      .map((s) => ({ value: s, label: s }));
    const sessions = [
      ...new Set(formattedAppointments.map((a) => a.sessionType)),
    ]
      .filter(Boolean)
      .map((s) => ({ value: s, label: s }));

    return [
      {
        value: "therapistName",
        label: "Clinician",
        filterValues: clinicians,
        filterFunction: (row, val) => !val || row.therapistName.includes(val),
      },
      {
        value: "serviceType",
        label: "Service Type",
        filterValues: services,
        filterFunction: (row, val) => !val || row.serviceType.includes(val),
      },
      {
        value: "sessionType",
        label: "Session Type",
        filterValues: sessions,
        filterFunction: (row, val) => !val || row.sessionType === val,
      },
    ];
  }, [formattedAppointments]);

  // Table Columns
  const columns = [
    { header: "Clinician(s)", key: "therapistName", type: "text" },
    { header: "Service Type(s)", key: "serviceType", type: "text" },
    { header: "Session Type", key: "sessionType", type: "text" },
    { header: "Date", key: "date", type: "dateTime" },
    { header: "Time", key: "time", type: "text" },
  ];

  // Table Actions
  const actions = [
    {
      type: "dropdown",
      items: [
        {
          label: "View Details",
          onClick: (row) => handleViewDetails(row),
        },
        {
          label: "Edit Appointment",
          onClick: (row) => openModal(row),
        },
        {
          label: "Reschedule",
          onClick: (row) => handleReschedule(row),
        },
        {
          label: "Cancel Appointment",
          onClick: (row) => handleCancel(row),
          className: "remove",
        },
      ],
    },
  ];

  // Calendar appointment click handler
  const handleAppointmentClick = (appointment, position) => {
    console.log("Appointment clicked:", appointment);
    // Find the full appointment data
    const fullAppointment = appointments.find(
      (appt) => appt.id === appointment.id
    );
    if (fullAppointment) {
      openModal(fullAppointment);
    }
  };

  // Action handlers
  const handleViewDetails = (appointment) => {
    console.log("View details:", appointment);
    openModal(appointment);
  };

  const handleReschedule = (appointment) => {
    console.log("Reschedule:", appointment);
    openModal(appointment);
  };

  const handleCancel = async (appointment) => {
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      try {
        // Implement cancel logic using your API
        await api.CancelAppointment({
          id: appointment.id,
          accessToken,
          refreshToken,
        });
        showToast("Appointment cancelled successfully", "success");
        fetchAppointments(); // Refresh the list
      } catch (error) {
        console.error("Failed to cancel appointment:", error);
        showToast("Failed to cancel appointment", "error");
      }
    }
  };

  const openModal = (appointment = null) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
  };

  const handleSaveAppointment = async (data) => {
    try {
      // Ensure the appointment is created/updated for the current client
      const appointmentData = {
        ...data,
        clientId: clientId, // Always use the current client
        tenantId,
        accessToken,
        refreshToken,
      };

      if (selectedAppointment) {
        // Update existing appointment
        await api.UpdateAppointments({
          ...appointmentData,
          id: selectedAppointment.id,
        });
        showToast("Appointment updated successfully!", "success");
      } else {
        // Create new appointment
        await api.CreateAppointments(appointmentData);
        showToast("Appointment created successfully!", "success");
      }

      closeModal();
      fetchAppointments(); // Refresh the list
    } catch (error) {
      console.error("Failed to save appointment:", error);
      showToast("Failed to save appointment", "error");
    }
  };

  // Calendar navigation
  const handlePrevMonth = () => {
    setCurrentDate(subDays(currentDate, 30));
  };

  const handleNextMonth = () => {
    setCurrentDate(addDays(currentDate, 30));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="p-6">
      {/* Tabs */}
      <div className="documents-tabs w-full">
        {[
          "upcomingAppointments",
          "pastAppointments",
          "cancelledAppointments",
        ].map((tab) => (
          <button
            key={tab}
            className={`doc-tab flex-1 ${
              activeTab === tab ? "doc-tab-active" : ""
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "upcomingAppointments" && "Upcoming Appointments"}
            {tab === "pastAppointments" && "Past Appointments"}
            {tab === "cancelledAppointments" && "Cancelled Appointments"}
          </button>
        ))}
      </div>

      {/* View Toggle + Search + New Button */}
      <div className="flex justify-between items-center mt-6 mb-4">
        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <div className="cal-sched-filter-controls">
            <div className="cal-sched-tab-container">
              <button
                onClick={() => setViewMode("table")}
                className={`cal-sched-tab-button flex items-center gap-2 ${
                  viewMode === "table" ? "active" : ""
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M6.66667 5H17.5M6.66667 10H17.5M6.66667 15H17.5M2.5 5H2.50833M2.5 10H2.50833M2.5 15H2.50833"
                    stroke="currentColor"
                    strokeWidth="1.67"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Table View
              </button>
              <div className="cal-sched-tab-divider" />
              <button
                onClick={() => setViewMode("calendar")}
                className={`cal-sched-tab-button flex items-center gap-2 ${
                  viewMode === "calendar" ? "active" : ""
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M13.3333 1.66699V5.00033M6.66667 1.66699V5.00033M2.5 8.33366H17.5M4.16667 3.33366H15.8333C16.7538 3.33366 17.5 4.07985 17.5 5.00033V16.667C17.5 17.5875 16.7538 18.3337 15.8333 18.3337H4.16667C3.24619 18.3337 2.5 17.5875 2.5 16.667V5.00033C2.5 4.07985 3.24619 3.33366 4.16667 3.33366Z"
                    stroke="currentColor"
                    strokeWidth="1.67"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Calendar View
              </button>
            </div>
          </div>
        </div>

        <Button
          label="New Appointment"
          variant="primary"
          icon={<FaPlus />}
          onClick={() => openModal()}
        />
      </div>

      {/* Calendar Controls (only show in calendar view) */}
      {viewMode === "calendar" && (
        <div className="flex mt-6 items-center">
          <div className="flex justify-between items-center mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 text-3xl hover:bg-gray-200 rounded"
              >
                ‹
              </button>
              <button onClick={handleToday} className="px-3 py-1 ">
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 text-3xl hover:bg-gray-200 rounded"
              >
                ›
              </button>
              <span className="ml-4 font-semibold">
                {format(currentDate, "MMMM yyyy")}
              </span>
            </div>
          </div>
          <div style={{ marginBottom: "-10px" }}>
            <SearchInput
              placeholder="Search appointments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              width={300}
            />
          </div>
        </div>
      )}

      {/* Content: Table or Calendar */}
      <div className="mt-4">
        {viewMode === "table" ? (
          <CustomTable
            data={filteredAppointments}
            columns={columns}
            actions={actions}
            filters={filters}
            tableName={`${activeTab
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (str) => str.toUpperCase())}`}
            itemsPerPage={10}
            loading={loading}
            showCheckbox={false}
            showActions={true}
          />
        ) : (
          <div className="bg-white p-4 min-h-[600px]">
            <MonthView
              date={currentDate}
              appointments={calendarAppointments}
              clients={[currentClient].filter(Boolean)} // Only send current client
              onAppointmentClick={handleAppointmentClick}
            />
          </div>
        )}
      </div>

      <MemoAppointmentModal
        key={selectedAppointment?.id || "new"}
        isOpen={isModalOpen}
        onClose={closeModal}
        initialData={selectedAppointment}
        isEditMode={!!selectedAppointment}
        onSave={handleSaveAppointment}
        clients={currentClient ? [currentClient] : []} // Ensure it's always an array
        sessionTypes={sessionTypes}
        staff={staff}
        accessToken={accessToken}
        refreshToken={refreshToken}
        tenantId={tenantId}
        initialClientId={clientId}
      />
    </div>
  );
};

export default AppointmentsScheduleTab;

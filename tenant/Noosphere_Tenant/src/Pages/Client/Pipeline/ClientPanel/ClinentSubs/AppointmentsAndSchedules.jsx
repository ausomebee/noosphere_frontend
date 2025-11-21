// src/pages/Client/ClinentSubs/AppointmentsAndSchedules/AppointmentsScheduleTab.jsx
import { useState, memo, useCallback, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { format, addDays, subDays } from "date-fns";
import Button from "../../../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import { showToast } from "../../../../../Helper/ShowToast";
import AppointmentModal from "../../../../../Components/ReusableModal/SchedulerModal/AppointmentModal";
import api from "../../../../../api/AppointmentApi";
import CustomTable from "../../../../../Components/Table/CustomTable";
import MonthView from "../../../../../Components/CalendarScheduler/MonthView";
import { SearchInput } from "../../../../../Components/Input/Inputs";

const MemoAppointmentModal = memo(AppointmentModal);

const AppointmentsScheduleTab = () => {
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

  const [clients, setClients] = useState([]);
  const [sessionTypes, setSessionTypes] = useState([]);
  const [staff, setStaff] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Get the current client ID from the URL or props
  // You'll need to pass this from the parent ClientPanel component
  const getCurrentClientId = () => {
    // Option 1: Get from URL params (if your route is /client/:clientId)
    const pathParts = window.location.pathname.split("/");
    const clientIdFromUrl = pathParts[pathParts.length - 1];

    // Option 2: Get from props (preferred - pass from ClientPanel)
    // For now, we'll use the URL method
    return clientIdFromUrl;
  };

  const currentClientId = getCurrentClientId();

  // Fetch supporting data
  const fetchSupportingData = useCallback(async () => {
    try {
      const [sess, clis, stf] = await Promise.all([
        api
          .GetSessionTypeActiveByTenantId({
            tenantId,
            accessToken,
            refreshToken,
          })
          .then((r) => r.data.data || []),
        api
          .GetClientByTenantId({ tenantId, accessToken, refreshToken })
          .then((r) => r.data.data || []),
        api
          .GetTenantStaffByTenantId({ tenantId, accessToken, refreshToken })
          .then((r) => r.data.data || []),
      ]);
      setSessionTypes(sess);
      setClients(clis);
      setStaff(stf);
    } catch (error) {
      showToast("Failed to load support data", "error");
    }
  }, [tenantId, accessToken, refreshToken]);

  // Fetch appointments for the CURRENT CLIENT only
  const fetchAppointments = useCallback(async () => {
    if (!currentClientId) {
      showToast("Client ID not found", "error");
      return;
    }

    setLoading(true);
    try {
      let response;
      switch (activeTab) {
        case "upcomingAppointments":
          response = await api.GetUpcomingAppointmentByClientId({
            clientId: currentClientId,
            accessToken,
            refreshToken,
          });
          break;
        case "pastAppointments":
          response = await api.GetPastAppointmentByClientId({
            clientId: currentClientId,
            accessToken,
            refreshToken,
          });
          break;
        case "cancelledAppointments":
          response = await api.GetCancelledAppointmentByClientId({
            clientId: currentClientId,
            accessToken,
            refreshToken,
          });
          break;
        default:
          response = { data: { data: [] } };
      }

      if (response?.data?.data) {
        setAppointments(response.data.data);
      }
    } catch (error) {
      showToast("Failed to fetch appointments", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentClientId, accessToken, refreshToken]);

  useEffect(() => {
    fetchSupportingData();
    fetchAppointments();
  }, [fetchSupportingData, fetchAppointments]);

  // Get current client name for display
  const currentClient = useMemo(() => {
    return clients.find(
      (client) =>
        client.id === currentClientId || client.clientId === currentClientId
    );
  }, [clients, currentClientId]);

  // Format appointments for display
  const formattedAppointments = useMemo(() => {
    return appointments.map((appt) => ({
      id: appt.id,
      clientName:
        currentClient?.fullName || appt.client?.fullName || "Current Client",
      therapistName:
        appt.clinicians?.map((c) => c.fullName).join(", ") || "Unassigned",
      serviceType: appt.service?.map((s) => s.serviceType).join(", ") || "N/A",
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
    }));
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
      clientId: currentClientId,
      clinicianIds: appt.rawData.clinicians?.map((c) => c.id) || [],
      service: appt.rawData.service || [],
      sessionId: appt.rawData.sessionId,
      date: appt.date,
      startTime: appt.rawData.startTime,
      endTime: appt.rawData.endTime,
      colourCode: appt.colorCode,
    }));
  }, [filteredAppointments, currentClientId]);

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
    // You can show a details modal or navigate
  };

  // Action handlers
  const handleViewDetails = (appointment) => {
    console.log("View details:", appointment);
    // Implement details view
  };

  const handleReschedule = (appointment) => {
    console.log("Reschedule:", appointment);
    // Implement reschedule logic
  };

  const handleCancel = (appointment) => {
    console.log("Cancel:", appointment);
    // Implement cancel logic
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
      // Ensure the appointment is created for the current client
      const appointmentData = {
        ...data,
        clientId: currentClientId, // Always use the current client
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
            {/* Search Input */}
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
              clients={clients}
              onAppointmentClick={handleAppointmentClick}
            />
          </div>
        )}
      </div>

      {/* Modal */}
      <MemoAppointmentModal
        key={selectedAppointment?.id || "new"}
        isOpen={isModalOpen}
        onClose={closeModal}
        initialData={selectedAppointment}
        isEditMode={!!selectedAppointment}
        onSave={handleSaveAppointment}
        clients={clients}
        sessionTypes={sessionTypes}
        staff={staff}
        accessToken={accessToken}
        refreshToken={refreshToken}
        tenantId={tenantId}
        // Pre-select the current client in the modal
        initialClientId={currentClientId}
      />
    </div>
  );
};

export default AppointmentsScheduleTab;

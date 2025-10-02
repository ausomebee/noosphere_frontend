import React, { useState, useRef, useMemo, useCallback } from "react";
import { format, addDays, subDays, parse, startOfDay } from "date-fns";
import { useSelector } from "react-redux";
import DayView from "./DayView";
import WeekView from "./WeekView";
import MonthView from "./MonthView";
import StaffClientFilter from "./StaffClientFilter";
import AppointmentModal from "../ReusableModal/SchedulerModal/AppointmentModal";
import DatePickerModal from "../ReusableModal/SchedulerModal/DatePickerModal";
import AppointmentDetailsModal from "../ReusableModal/SchedulerModal/AppointmentDetailsModal";
import RescheduleModal from "../ReusableModal/SchedulerModal/RescheduleModal";
import CancelModal from "../ReusableModal/SchedulerModal/CancelModal";
import "./Scheduler.css";
import { SearchInput } from "../Input/Inputs";
import Button from "../Button/Button";
import { FaPlus } from "react-icons/fa";
import { HiOutlineCog6Tooth } from "react-icons/hi2";
import { LuPrinter } from "react-icons/lu";
import { CgExport } from "react-icons/cg";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import api from "../../api/AppointmentApi";
import { showToast } from "../../Helper/ShowToast";

const CalendarScheduler = ({
  appointments,
  staff,
  clients,
  sessionTypes,
  initialDate,
  accessToken,
  refreshToken,
  tenantId,
  role,
  refreshAppointments,
  // selectedClients,
  loading,
}) => {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [view, setView] = useState("month");
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentPosition, setAppointmentPosition] = useState(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("staff");
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isCalendarViewModalOpen, setIsCalendarViewModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelAppointment, setCancelAppointment] = useState(null);

  const calendarContainerRef = useRef(null);

  const staffWithCounts = useMemo(
    () =>
      staff.map((member) => ({
        ...member,
        appointmentCount: appointments.filter((appt) =>
          Array.isArray(appt.clinicians)
            ? appt.clinicians.includes(member.id)
            : false
        ).length,
      })),
    [appointments, staff]
  );

  const clientsWithCounts = useMemo(
    () =>
      clients.map((client) => ({
        ...client,
        appointmentCount: appointments.filter(
          (appt) => appt.clientId === client.clientId
        ).length,
      })),
    [appointments, clients]
  );

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      const staffMatch =
        selectedStaff.length === 0 ||
        (Array.isArray(appt.clinicians) &&
          appt.clinicians.some((c) => selectedStaff.includes(c)));
      const clientMatch =
        selectedClients.length === 0 || selectedClients.includes(appt.clientId);
      const searchMatch = searchTerm
        ? (
            clients.find((c) => c.clientId === appt.clientId)?.client
              ?.fullName || ""
          )
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (Array.isArray(appt.clinicians) &&
            appt.clinicians.some((clinicianId) =>
              (staff.find((s) => s.id === clinicianId)?.fullName || "")
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
            )) ||
          (appt.service?.[0]?.serviceType || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        : true;
      return (
        (activeTab === "staff" ? staffMatch : true) &&
        (activeTab === "client" ? clientMatch : true) &&
        searchMatch
      );
    });
  }, [
    appointments,
    activeTab,
    selectedStaff,
    selectedClients,
    searchTerm,
    clients,
    staff,
  ]);

  const handleToday = useCallback(() => setCurrentDate(new Date()), []);
  const handlePrev = useCallback(
    () =>
      setCurrentDate(
        subDays(currentDate, view === "day" ? 1 : view === "week" ? 7 : 30)
      ),
    [currentDate, view]
  );
  const handleNext = useCallback(
    () =>
      setCurrentDate(
        addDays(currentDate, view === "day" ? 1 : view === "week" ? 7 : 30)
      ),
    [currentDate, view]
  );
  const handleStaffChange = useCallback(
    (staffId) =>
      setSelectedStaff((prev) =>
        prev.includes(staffId)
          ? prev.filter((id) => id !== staffId)
          : [...prev, staffId]
      ),
    []
  );
  const handleClientChange = useCallback(
    (clientId) =>
      setSelectedClients((prev) =>
        prev.includes(clientId)
          ? prev.filter((id) => id !== clientId)
          : [...prev, clientId]
      ),
    []
  );
  const handleTabClick = useCallback((tab) => {
    setActiveTab(tab);
    setIsSidebarVisible(true);
  }, []);
  const handleHideSidebar = useCallback(() => setIsSidebarVisible(false), []);
  const handleSearchChange = useCallback(
    (e) => setSearchTerm(e.target.value),
    []
  );
  const handleFilterClick = useCallback(() => setIsFilterModalOpen(true), []);
  const handleCalendarViewClick = useCallback(
    () => setIsCalendarViewModalOpen(true),
    []
  );
  const handleSettingsClick = useCallback(
    () => setIsSettingsModalOpen(true),
    []
  );
  const handleAppointmentClick = useCallback((appt, position) => {
    setSelectedAppointment(appt);
    setAppointmentPosition(position);
  }, []);
  const handleCloseAppointmentDetails = useCallback(() => {
    setSelectedAppointment(null);
    setAppointmentPosition(null);
  }, []);
  const handleEditAppointment = useCallback((appointment) => {
    setSelectedAppointment(appointment);
    setIsAppointmentModalOpen(true);
  }, []);
  const handleRescheduleAppointment = useCallback((appointment) => {
    setSelectedAppointment(null);
    setRescheduleAppointment(appointment);
    setIsRescheduleModalOpen(true);
  }, []);
  const handleCancelAppointment = useCallback((appointment) => {
    setSelectedAppointment(null);
    setCancelAppointment(appointment);
    setIsCancelModalOpen(true);
  }, []);

  const splitId = (id) => {
    if (!id) {
      showToast("Invalid appointment ID", "error");
      return { uuid: null, timestamp: null };
    }

    if (id.includes("_")) {
      const parts = id.split("_");
      if (parts.length !== 2) {
        showToast("Malformed appointment ID", "error");
        return { uuid: null, timestamp: null };
      }
      return { uuid: parts[0], timestamp: parts[1] };
    }

    // If no underscore, treat the whole ID as UUID
    return { uuid: id, timestamp: null };
  };

  const handleSaveAppointment = useCallback(
    async (appointmentData) => {
      try {
        const payload = {
          tenantId,
          clientId: appointmentData.client.replace("client", ""),
          sessionId: appointmentData.sessionType,
          clinicians: appointmentData.clinicians.map((id) => ({
            id: id.replace("clinician", ""),
          })),
          service: appointmentData.service,
          date: appointmentData.date,
          isRecurring: appointmentData.isRecurring,
          startTime: appointmentData.startTime,
          endTime: appointmentData.endTime,
          recurrence: appointmentData.recurrence || {},
          isBillable: appointmentData.billable,
          serviceLocation: appointmentData.serviceLocation,
          requiresTravel: appointmentData.requiresTravel,
          colourCode: appointmentData.colorCode,
          accessToken,
          refreshToken,
        };

        let response;
        if (appointmentData.scope) {
          const { uuid } = splitId(selectedAppointment?.id);
          if (!uuid) {
            showToast("Invalid appointment ID", "error");
            return;
          }
          response = await api.UpdateAppointments({
            ...payload,
            id: uuid,
            relatedAppointment: uuid,
            forAll: appointmentData.scope === "all",
          });
        } else {
          response = await api.CreateAppointments(payload);
        }

        showToast("Appointment saved successfully", "success");

        // Refresh appointments after saving
        if (refreshAppointments) {
          await refreshAppointments();
        }

        setIsAppointmentModalOpen(false);
        setSelectedAppointment(null);
      } catch (error) {
        showToast(error.message || "Failed to save appointment", "error");
      }
    },
    [
      accessToken,
      refreshToken,
      tenantId,
      selectedAppointment,
      refreshAppointments,
    ]
  );
  const handleSaveReschedule = useCallback(
    async (rescheduleData) => {
      try {
        const { uuid } = splitId(rescheduleAppointment?.id);
        if (!uuid) {
          showToast("Invalid appointment ID", "error");
          return;
        }

        const payload = {
          tenantId,
          id: uuid,
          date: rescheduleData.date,
          startTime: rescheduleData.startTime,
          endTime: rescheduleData.endTime,
          relatedAppointment: uuid,
          rescheduled: true,
          accessToken,
          refreshToken,
          forAll: rescheduleData.scope === "all",
        };
        console.log(payload);
        await api.RescheduleAppointments(payload);

        showToast("Appointment rescheduled successfully", "success");

        // Refresh appointments after rescheduling
        if (refreshAppointments) {
          await refreshAppointments();
        }

        setIsRescheduleModalOpen(false);
        setRescheduleAppointment(null);
      } catch (error) {
        showToast(error.message || "Failed to reschedule appointment", "error");
      }
    },
    [accessToken, refreshToken, rescheduleAppointment, refreshAppointments]
  );

  const handleSaveCancel = useCallback(
    async (cancelData) => {
      try {
        const { uuid } = splitId(cancelAppointment?.id);
        if (!uuid) {
          showToast("Invalid appointment ID", "error");
          return;
        }

        const payload = {
          tenantId,
          id: uuid,
          reason: cancelData.reason,
          relatedAppointment: uuid,
          accessToken,
          refreshToken,
          forAll: true,
        };
        await api.CancelAppointments(payload);

        showToast("Appointment canceled successfully", "success");

        // Refresh appointments after cancelling
        if (refreshAppointments) {
          await refreshAppointments();
        }

        setIsCancelModalOpen(false);
        setCancelAppointment(null);
      } catch (error) {
        showToast(error.message || "Failed to cancel appointment", "error");
      }
    },
    [accessToken, refreshToken, cancelAppointment, refreshAppointments]
  );

  const showFilterTabs = role === "Admin";

  return (
    <div className="cal-sched-container">
      <h1 className="cal-sched-title">Calendar</h1>
      <div className="cal-sched-header">
        <div className="cal-sched-left-controls">
          <div>
            <button
              type="button"
              onClick={handleToday}
              className="cal-sched-today-button"
            >
              Today
            </button>
          </div>
          <div className="cal-sched-date-controls">
            <span
              className="cal-sched-date-text"
              onClick={() => setIsDatePickerOpen(true)}
            >
              {format(currentDate, "MMMM yyyy")}
            </span>
            <button onClick={handlePrev} className="cal-sched-nav-button">
              <IoIosArrowBack />
            </button>
            <button onClick={handleNext} className="cal-sched-nav-button">
              <IoIosArrowForward />
            </button>
          </div>
        </div>

        <div className="cal-sched-view-switcher">
          <button
            onClick={() => setView("day")}
            className={`cal-sched-view-button ${
              view === "day"
                ? "cal-sched-view-button-active"
                : "cal-sched-view-button-inactive"
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setView("week")}
            className={`cal-sched-view-button ${
              view === "week"
                ? "cal-sched-view-button-active"
                : "cal-sched-view-button-inactive"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView("month")}
            className={`cal-sched-view-button ${
              view === "month"
                ? "cal-sched-view-button-active"
                : "cal-sched-view-button-inactive"
            }`}
          >
            Month
          </button>
        </div>

        <div className="cal-sched-left-controls">
          <Button
            label="New Appointment"
            variant="primary"
            onClick={() => setIsAppointmentModalOpen(true)}
            icon={<FaPlus />}
          />
        </div>
      </div>

      <div className="cal-sched-filter-section">
        <div className="cal-sched-left-controls">
          {showFilterTabs && (
            <div className="cal-sched-filter-controls">
              <span className="cal-sched-filter-label">View by:</span>
              <div className="cal-sched-tab-container">
                <button
                  onClick={() => handleTabClick("staff")}
                  className={`cal-sched-tab-button ${
                    activeTab === "staff"
                      ? "cal-sched-tab-button-active"
                      : "cal-sched-tab-button-inactive"
                  }`}
                >
                  Staff
                </button>
                <div className="cal-sched-tab-divider"></div>
                <button
                  onClick={() => handleTabClick("client")}
                  className={`cal-sched-tab-button ${
                    activeTab === "client"
                      ? "cal-sched-tab-button-active"
                      : "cal-sched-tab-button-inactive"
                  }`}
                >
                  Client
                </button>
              </div>
            </div>
          )}

          <div className="cal-sched-search-container">
            <SearchInput
              placeholder="Search"
              value={searchTerm}
              onChange={handleSearchChange}
              width={300}
            />
          </div>
        </div>

        <div className="cal-sched-right-controls">
          <button onClick={handleFilterClick} className="cal-sched-icon-button">
            <CgExport size={24} />
          </button>
          <button
            onClick={handleCalendarViewClick}
            className="cal-sched-icon-button"
          >
            <LuPrinter size={24} />
          </button>
          <button
            onClick={handleSettingsClick}
            className="cal-sched-icon-button"
          >
            <HiOutlineCog6Tooth size={24} />
          </button>
        </div>
      </div>

      <div className="cal-sched-content">
        {isSidebarVisible && showFilterTabs && (
          <StaffClientFilter
            staff={staffWithCounts}
            clients={clientsWithCounts}
            selectedStaff={selectedStaff}
            selectedClients={selectedClients}
            onStaffChange={handleStaffChange}
            onClientChange={handleClientChange}
            onHideSidebar={handleHideSidebar}
            activeTab={activeTab}
          />
        )}

        <div
          className={`cal-sched-calendar-container ${
            isSidebarVisible && showFilterTabs
              ? "cal-sched-calendar-with-sidebar"
              : "cal-sched-calendar-full"
          }`}
          ref={calendarContainerRef}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
              }}
            >
              <svg
                width="50"
                height="50"
                viewBox="0 0 50 50"
                xmlns="http://www.w3.org/2000/svg"
                style={{ animation: "spin 1s linear infinite" }}
              >
                <circle
                  cx="25"
                  cy="25"
                  r="20"
                  stroke="#4A90E2"
                  strokeWidth="5"
                  fill="none"
                  strokeDasharray="31.4"
                  strokeDashoffset="0"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    values="0;31.4"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              </svg>
              <style>
                {`
                  @keyframes spin {
                    100% {
                      transform: rotate(360deg);
                    }
                  }
                `}
              </style>
            </div>
          ) : (
            <>
              {view === "day" && (
                <DayView
                  date={currentDate}
                  appointments={filteredAppointments}
                  clients={clients}
                  onAppointmentClick={handleAppointmentClick}
                />
              )}
              {view === "week" && (
                <WeekView
                  date={currentDate}
                  appointments={filteredAppointments}
                  clients={clients}
                  onAppointmentClick={handleAppointmentClick}
                />
              )}
              {view === "month" && (
                <MonthView
                  date={currentDate}
                  appointments={filteredAppointments}
                  onAppointmentClick={handleAppointmentClick}
                />
              )}
              <AppointmentDetailsModal
                isOpen={!!selectedAppointment}
                onClose={handleCloseAppointmentDetails}
                appointment={selectedAppointment}
                position={appointmentPosition}
                clients={clients}
                staff={staff}
                onEdit={handleEditAppointment}
                onReschedule={handleRescheduleAppointment}
                onCancel={handleCancelAppointment}
              />
            </>
          )}
        </div>
      </div>

      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => {
          setIsAppointmentModalOpen(false);
          setSelectedAppointment(null);
        }}
        initialData={selectedAppointment}
        isEditMode={!!selectedAppointment}
        onSave={handleSaveAppointment}
        clients={clients}
        sessionTypes={sessionTypes}
        staff={staff}
        accessToken={accessToken}
        refreshToken={refreshToken}
        tenantId={tenantId}
      />

      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onDateSelect={setCurrentDate}
      />
      <RescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => {
          setIsRescheduleModalOpen(false);
          setRescheduleAppointment(null);
        }}
        appointment={rescheduleAppointment}
        onSave={handleSaveReschedule}
      />
      <CancelModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setCancelAppointment(null);
        }}
        onSave={handleSaveCancel}
        appointments={cancelAppointment ? [cancelAppointment] : []}
      />
    </div>
  );
};

export default CalendarScheduler;

// CalendarScheduler.jsx
import React, { useState, useMemo, useCallback, useEffect, memo } from "react";
import { format, addDays, subDays } from "date-fns";
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
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import api from "../../api/AppointmentApi";
import { showToast, showApiError } from "../../Helper/ShowToast";
import usePermissions from "../../hooks/usePermissions";

// Memoized modals to prevent unnecessary re-renders
const MemoAppointmentModal = memo(AppointmentModal);
const MemoRescheduleModal = memo(RescheduleModal);
const MemoAppointmentDetailsModal = memo(AppointmentDetailsModal);

// Returns the appropriate default calendar view based on screen width
const getDefaultView = () => {
  if (typeof window === "undefined") return "month";
  const width = window.innerWidth;
  if (width <= 640) return "day";
  if (width <= 992) return "week";
  return "month";
};

function CalendarScheduler({
  appointments,
  staff,
  clients,
  sessionTypes,
  initialDate,
  accessToken,
  refreshToken,
  tenantId,
  loading,
  selectedClients,
  selectedStaff,
  setSelectedClients,
  setSelectedStaff,
  fetchAppointmentsByFilter,
  refetchAppointments,
}) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [view, setView] = useState(getDefaultView);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  // Date pre-filled into the New Appointment modal when a calendar slot is
  // clicked (only the date is preset — the time is left blank).
  const [presetSlot, setPresetSlot] = useState(null);
  const [appointmentPosition, setAppointmentPosition] = useState(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("client");
  const [searchTerm, setSearchTerm] = useState("");

  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelAppointment, setCancelAppointment] = useState(null);

  const { hasPermission } = usePermissions();
  const canViewFilter = hasPermission("view_calendar_filter");
  const canViewStaff = hasPermission("view_staff_list");
  const canViewClients = hasPermission("view_client_list");

  // Granular appointment action gates (SCHEDULER module)
  const canCreateAppointment = hasPermission("create_a_new_appointment");
  const canEditAppointment = hasPermission("edit_appointments");
  const canRescheduleAppointment = hasPermission("reschedule_appointments");
  const canCancelAppointment = hasPermission("cancel_appointments");
  const canStartAppointment = hasPermission("start_appointments");

  // Auto-show sidebar if user has filter permission
  useEffect(() => {
    if (canViewFilter) {
      setIsSidebarVisible(true);
    }
  }, [canViewFilter]);

  const effectiveActiveTab = canViewStaff && !canViewClients ? "staff" : activeTab;

  // Client-side search (instant, no API call)
  const filteredAppointments = useMemo(() => {
    if (!searchTerm) return appointments;

    const term = searchTerm.toLowerCase();
    return appointments.filter((appt) => {
      const clientName =
        clients.find((c) => c.clientId === appt.clientId)?.client?.fullName ||
        "";
      const clinicianNames = Array.isArray(appt.clinicianIds)
        ? appt.clinicianIds
            .map((id) => staff.find((s) => s.id === id)?.fullName || "")
            .join(" ")
        : "";
      const serviceName = appt.service?.[0]?.serviceType || "";

      return (
        clientName.toLowerCase().includes(term) ||
        clinicianNames.toLowerCase().includes(term) ||
        serviceName.toLowerCase().includes(term)
      );
    });
  }, [appointments, searchTerm, clients, staff]);

  const refreshCurrentView = useCallback(() => {
    // Silently refetch appointments from the server so newly created/updated
    // appointments appear without a page reload. The parent re-applies the
    // active filter once the fresh data arrives.
    if (refetchAppointments) {
      refetchAppointments();
      return;
    }
    // Fallback: re-filter the already-loaded list.
    const payload = {
      clientIds: effectiveActiveTab === "client" ? selectedClients : [],
      staffIds: effectiveActiveTab === "staff" ? selectedStaff : [],
    };
    fetchAppointmentsByFilter(payload);
  }, [
    refetchAppointments,
    effectiveActiveTab,
    selectedClients,
    selectedStaff,
    fetchAppointmentsByFilter,
  ]);

  const splitId = useCallback((id) => {
    if (!id?.includes("_")) return { uuid: id, timestamp: null };
    const [uuid, timestamp] = id.split("_");
    return { uuid, timestamp };
  }, []);

  // FIXED: Was "closeAllMod Colonel" → now correct
  const closeAllModals = useCallback(() => {
    setSelectedAppointment(null);
    setAppointmentPosition(null);
    setPresetSlot(null);
    setIsAppointmentModalOpen(false);
    setIsRescheduleModalOpen(false);
    setRescheduleAppointment(null);
    setIsCancelModalOpen(false);
    setCancelAppointment(null);
  }, []);

  const handleToday = () => setCurrentDate(new Date());
  const handlePrev = () =>
    setCurrentDate(
      subDays(currentDate, view === "day" ? 1 : view === "week" ? 7 : 30)
    );
  const handleNext = () =>
    setCurrentDate(
      addDays(currentDate, view === "day" ? 1 : view === "week" ? 7 : 30)
    );

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setIsSidebarVisible(true);
  };

  const handleHideSidebar = () => setIsSidebarVisible(false);
  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  const handleAppointmentClick = (appt, position) => {
    // Clicking an event opens the appointment-details popover. Gate it so the
    // detail view won't open without the view_appointment_details_on_calendar key.
    if (!hasPermission("view_appointment_details_on_calendar")) return;
    setSelectedAppointment(appt);
    setAppointmentPosition(position);
  };

  // Clicking (or right-clicking) an empty calendar slot opens the New
  // Appointment modal pre-filled with that slot's DATE only (time left blank).
  const handleSlotClick = useCallback(
    (date) => {
      // Clicking an empty slot also opens the create-appointment modal, so it
      // needs the same gate as the New Appointment button.
      if (!canCreateAppointment) return;
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return;
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      setSelectedAppointment(null);
      setPresetSlot({ date: ymd });
      setIsAppointmentModalOpen(true);
    },
    [canCreateAppointment],
  );

  const handleEditAppointment = (appt) => {
    setSelectedAppointment(appt);
    setIsAppointmentModalOpen(true);
  };

  const handleRescheduleAppointment = (appt) => {
    setRescheduleAppointment(appt);
    setIsRescheduleModalOpen(true);
  };

  const handleCancelAppointment = (appt) => {
    setCancelAppointment(appt);
    setIsCancelModalOpen(true);
  };

  const handleSaveAppointment = async (data) => {
    try {
      const payload = {
        tenantId,
        clientId: data.client,
        sessionId: data.sessionType,
        clinicians: data.clinicians.map((id) => ({ id })),
        service: data.service,
        date: data.date,
        isRecurring: data.isRecurring,
        startTime: data.startTime,
        endTime: data.endTime,
        recurrence: data.recurrence || {},
        isBillable: data.billable,
        serviceLocation: data.serviceLocation,
        requiresTravel: data.requiresTravel,
        colourCode: data.colorCode,
        accessToken,
        refreshToken,
      };

      if (data.scope) {
        const { uuid } = splitId(selectedAppointment?.id);
        await api.UpdateAppointments({
          ...payload,
          id: uuid,
          forAll: data.scope === "all",
        });
      } else {
        await api.CreateAppointments(payload);
      }

      showToast("Appointment saved", "success");
      closeAllModals();
      refreshCurrentView();
    } catch (err) {
      showApiError(err, "SAVE_APPOINTMENT");
      // Re-throw so the AppointmentModal stays open on a failed save.
      throw err;
    }
  };

  const handleSaveReschedule = async (data) => {
    try {
      const { uuid } = splitId(rescheduleAppointment?.id);
      await api.RescheduleAppointments({
        tenantId,
        id: uuid,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        rescheduled: true,
        forAll: data.scope === "all",
        accessToken,
        refreshToken,
      });
      showToast("Rescheduled", "success");
      closeAllModals();
      refreshCurrentView();
    } catch (err) {
      showApiError(err, "RESCHEDULE_APPOINTMENT");
    }
  };

  const handleSaveCancel = async (data) => {
    try {
      const { uuid } = splitId(cancelAppointment?.id);
      await api.CancelAppointments({
        tenantId,
        id: uuid,
        reason: data.reason,
        forAll: true,
        accessToken,
        refreshToken,
      });
      showToast("Cancelled", "success");
      closeAllModals();
      refreshCurrentView();
    } catch (err) {
      showApiError(err, "CANCEL_APPOINTMENT");
    }
  };

  const showFilterTabs = canViewStaff && canViewClients;

  // Prevent unnecessary re-renders of modals
  const memoizedSelectedAppointment = useMemo(
    () => selectedAppointment,
    [selectedAppointment?.id]
  );
  const memoizedRescheduleAppointment = useMemo(
    () => rescheduleAppointment,
    [rescheduleAppointment?.id]
  );

  return (
    <div className="cal-sched-container">
      <h1 className="cal-sched-title">Calendar</h1>

      <div className="cal-sched-header">
        <div className="cal-sched-left-controls">
          <button onClick={handleToday} className="cal-sched-today-button">
            Today
          </button>
          <div className="cal-sched-date-controls">
            <span
              onClick={() => setIsDatePickerOpen(true)}
              className="cal-sched-date-text"
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

        {canCreateAppointment && (
          <Button
            label="New Appointment"
            variant="primary"
            onClick={() => {
              setSelectedAppointment(null);
              setPresetSlot(null);
              setIsAppointmentModalOpen(true);
            }}
            icon={<FaPlus />}
          />
        )}
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
                    effectiveActiveTab === "staff" ? "active" : ""
                  }`}
                >
                  Staff
                </button>
                <div className="cal-sched-tab-divider" />
                <button
                  onClick={() => handleTabClick("client")}
                  className={`cal-sched-tab-button ${
                    effectiveActiveTab === "client" ? "active" : ""
                  }`}
                >
                  Client
                </button>
              </div>
            </div>
          )}

          <div className="cal-sched-search-wrapper">
            <SearchInput
              placeholder="Search"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>

      </div>

      <div className="cal-sched-content">
        {isSidebarVisible && canViewFilter && (
          <StaffClientFilter
            staff={staff} // staffWithCounts
            clients={clients} // clientsWithCounts
            selectedStaff={selectedStaff}
            selectedClients={selectedClients}
            onStaffChange={(id) =>
              setSelectedStaff((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
              )
            }
            onClientChange={(id) =>
              setSelectedClients((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
              )
            }
            onHideSidebar={handleHideSidebar}
            activeTab={effectiveActiveTab}
            fetchAppointmentsByFilter={fetchAppointmentsByFilter}
          />
        )}

        <div
          className={`cal-sched-calendar-container ${
            isSidebarVisible && canViewFilter ? "with-sidebar" : "full"
          }`}
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
                  onSlotClick={handleSlotClick}
                />
              )}
              {view === "week" && (
                <WeekView
                  date={currentDate}
                  appointments={filteredAppointments}
                  clients={clients}
                  onAppointmentClick={handleAppointmentClick}
                  onSlotClick={handleSlotClick}
                />
              )}
              {view === "month" && (
                <MonthView
                  date={currentDate}
                  appointments={filteredAppointments}
                  clients={clients}
                  onAppointmentClick={handleAppointmentClick}
                  onSlotClick={handleSlotClick}
                />
              )}

              <MemoAppointmentDetailsModal
                isOpen={!!selectedAppointment}
                onClose={closeAllModals}
                appointment={memoizedSelectedAppointment}
                position={appointmentPosition}
                clients={clients}
                staff={staff}
                onEdit={canEditAppointment ? handleEditAppointment : undefined}
                onReschedule={
                  canRescheduleAppointment
                    ? handleRescheduleAppointment
                    : undefined
                }
                onCancel={
                  canCancelAppointment ? handleCancelAppointment : undefined
                }
                canStart={canStartAppointment}
              />
            </>
          )}
        </div>
      </div>

      <MemoAppointmentModal
        key={memoizedSelectedAppointment?.id || "new-appointment"}
        isOpen={isAppointmentModalOpen}
        onClose={closeAllModals}
        initialData={memoizedSelectedAppointment}
        isEditMode={!!memoizedSelectedAppointment}
        presetSlot={presetSlot}
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

      <MemoRescheduleModal
        key={memoizedRescheduleAppointment?.id || "reschedule"}
        isOpen={isRescheduleModalOpen}
        onClose={closeAllModals}
        appointment={memoizedRescheduleAppointment}
        onSave={handleSaveReschedule}
      />

      <CancelModal
        isOpen={isCancelModalOpen}
        onClose={closeAllModals}
        onSave={handleSaveCancel}
        appointments={cancelAppointment ? [cancelAppointment] : []}
      />
    </div>
  );
}

export default CalendarScheduler;

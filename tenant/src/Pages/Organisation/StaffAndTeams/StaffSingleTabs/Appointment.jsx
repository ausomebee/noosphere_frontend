import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import DayView from "../../../../Components/CalendarScheduler/DayView";
import WeekView from "../../../../Components/CalendarScheduler/WeekView";
import MonthView from "../../../../Components/CalendarScheduler/MonthView";
import AvailabilityModal from "../../../../Components/ReusableModal/SchedulerModal/AvailabilityModal";
import UpcomingAppointments from "./UpcomingAppointments";
import { format, subDays, addDays } from "date-fns";
import { CgExport } from "react-icons/cg";
import { LuPrinter } from "react-icons/lu";
import { HiOutlineCog6Tooth } from "react-icons/hi2";
import { FaPlus } from "react-icons/fa";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { RxCross2 } from "react-icons/rx";
import Button from "../../../../Components/Button/Button";
import usePermissions from "../../../../hooks/usePermissions";
import { SearchInput } from "../../../../Components/Input/Inputs";
import DatePickerModal from "../../../../Components/ReusableModal/SchedulerModal/DatePickerModal";
import api from "../../../../api/organisationStaffApis";
import { showToast } from "../../../../Helper/ShowToast";

// View-only Appointment Details Modal (just close button)
const StaffAppointmentDetailsModal = ({ isOpen, onClose, appointment, position }) => {
  const modalRef = useRef(null);
  const [modalSize, setModalSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (isOpen && modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      setModalSize({ width: rect.width, height: rect.height });
    }
  }, [isOpen]);

  const adjustedPosition = useMemo(() => {
    if (!isOpen || !appointment || !position || !position.x || !position.y) {
      return { x: 50, y: 50 };
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const clickX = position.x;
    const clickY = position.y;
    const modalWidth = modalSize.width || 400;
    const modalHeight = modalSize.height || 300;
    const offset = 10;
    let x = clickX + offset;
    let y = clickY + offset;
    if (x + modalWidth > vw) x = clickX - modalWidth - offset;
    if (y + modalHeight > vh) y = clickY - modalHeight - offset;
    x = Math.max(0, Math.min(x, vw - modalWidth));
    y = Math.max(0, Math.min(y, vh - modalHeight));
    return { x: (x / vw) * 100, y: (y / vh) * 100 };
  }, [isOpen, appointment, position, modalSize]);

  if (!isOpen || !appointment) return null;

  const startTime = appointment.start
    ? format(new Date(appointment.start), "h:mm a")
    : "N/A";
  const endTime = appointment.end
    ? format(new Date(appointment.end), "h:mm a")
    : "N/A";
  const dateDisplay = appointment.start
    ? format(new Date(appointment.start), "MM/dd/yyyy")
    : "N/A";

  return (
    <div
      ref={modalRef}
      className="appointment-modal-container"
      style={{
        position: "fixed",
        top: `${adjustedPosition.y}vh`,
        left: `${adjustedPosition.x}vw`,
        transform: "none",
        zIndex: 1000,
        maxWidth: "min(700px, 90vw)",
        maxHeight: "min(500px, 90vh)",
        overflow: "auto",
        boxSizing: "border-box",
      }}
    >
      <div className="modal-header">
        <h2 className="header-title">Appointment Details</h2>
        <button onClick={onClose} className="close-button">
          <RxCross2 size={20} />
        </button>
      </div>
      <div className="modal-body">
        <div className="details-container">
          <div className="client-section">
            <div className="client-name">
              <h3 className="client-name-label">Client</h3>
              {appointment.clientName || appointment.client || "Unknown Client"}
            </div>
          </div>
          <div className="details-grid">
            <div className="detail-item">
              <div className="detail-row">
                <span className="bullet">&bull;</span>
                <div className="detail-column">
                  <span className="detail-label">Therapist</span>
                  <span className="detail-value">
                    {appointment.therapist || appointment.clinicianNames?.join(", ") || "N/A"}
                  </span>
                </div>
              </div>
              <div className="detail-row">
                <span className="bullet">&bull;</span>
                <div className="detail-column">
                  <span className="detail-label">Date</span>
                  <span className="detail-value">{dateDisplay}</span>
                </div>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-row">
                <span className="bullet">&bull;</span>
                <div className="detail-column">
                  <span className="detail-label">Time</span>
                  <span className="detail-value">{startTime} - {endTime}</span>
                </div>
              </div>
              <div className="detail-row">
                <span className="bullet">&bull;</span>
                <div className="detail-column">
                  <span className="detail-label">Service Type</span>
                  <span className="detail-value">
                    {appointment.serviceType || appointment.service?.map((s) => s.serviceType).join(", ") || "N/A"}
                  </span>
                </div>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-row">
                <span className="bullet">&bull;</span>
                <div className="detail-column">
                  <span className="detail-label">Session Type</span>
                  <span className="detail-value">
                    {appointment.sessionType || appointment.sessionName || "N/A"}
                  </span>
                </div>
              </div>
              {appointment.serviceLocation && (
                <div className="detail-row">
                  <span className="bullet">&bull;</span>
                  <div className="detail-column">
                    <span className="detail-label">Location</span>
                    <span className="detail-value">{appointment.serviceLocation}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="appointment-modal-footer">
        <div className="flex-1">
          <Button label="Close" variant="secondary" width="w-full" onClick={onClose} />
        </div>
      </div>
    </div>
  );
};

// Resolve client name from string or object
const resolveClientName = (appt) => {
  if (appt.clientName && typeof appt.clientName === "string") return appt.clientName;
  // client might be an object with { firstName, lastName, preferredName }
  const client = appt.client;
  if (client && typeof client === "object") {
    const first = client.firstName || "";
    const last = client.lastName || "";
    const preferred = client.preferredName ? ` (${client.preferredName})` : "";
    return `${first} ${last}${preferred}`.trim() || "Unknown Client";
  }
  if (client && typeof client === "string") return client;
  return "Unknown Client";
};

// Resolve service type from appointmentServices or service array
const resolveServiceType = (appt) => {
  // API returns appointmentServices with nested serviceCode
  if (appt.appointmentServices?.length > 0) {
    return appt.appointmentServices
      .map((as) => {
        const code = as.serviceCode || {};
        return code.code || "Not specified";
      })
      .join(", ");
  }
  // Already transformed service array
  if (appt.service?.length > 0) {
    return appt.service.map((s) => s.serviceType || s.code || "Not specified").join(", ");
  }
  if (typeof appt.serviceType === "string") return appt.serviceType;
  return "N/A";
};

// Resolve session name from session object or direct field
const resolveSessionName = (appt) => {
  if (appt.session?.name) return appt.session.name;
  if (typeof appt.sessionName === "string") return appt.sessionName;
  if (typeof appt.sessionType === "string") return appt.sessionType;
  return "N/A";
};

// Resolve clinician names
const resolveClinicians = (appt) => {
  if (appt.clinicians?.length > 0) {
    return appt.clinicians.map((c) => c.fullName || "Unknown").join(", ");
  }
  if (appt.clinicianNames?.length > 0) return appt.clinicianNames.join(", ");
  if (typeof appt.therapist === "string") return appt.therapist;
  return "N/A";
};

// Transform API appointment to calendar format
const transformAppointment = (appt) => {
  const startDate = appt.date && appt.startTime
    ? new Date(`${appt.date}T${appt.startTime}`)
    : appt.start ? new Date(appt.start) : new Date();
  const endDate = appt.date && appt.endTime
    ? new Date(`${appt.date}T${appt.endTime}`)
    : appt.end ? new Date(appt.end) : new Date();

  const clientName = resolveClientName(appt);
  const clientObj = appt.client && typeof appt.client === "object" ? appt.client : null;

  return {
    id: appt.id,
    client: clientName,
    clientName,
    clientId: appt.clientId || clientObj?.id,
    time: format(startDate, "h:mma").toLowerCase(),
    start: startDate,
    end: endDate,
    date: appt.date,
    startTime: appt.startTime,
    endTime: appt.endTime,
    color: appt.colourCode || appt.color || "#48f794",
    therapist: resolveClinicians(appt),
    clinicianNames: appt.clinicians?.map((c) => c.fullName) || appt.clinicianNames,
    serviceType: resolveServiceType(appt),
    service: appt.appointmentServices || appt.service,
    sessionType: resolveSessionName(appt),
    sessionName: resolveSessionName(appt),
    serviceLocation: appt.serviceLocation,
    staffId: appt.staffId,
  };
};

const Appointment = ({ staffId, accessToken, refreshToken }) => {
  const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("month");
  const [isSidebarVisible] = useState(false);
  const calendarContainerRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentPosition, setAppointmentPosition] = useState(null);

  // API data
  const [calendarAppointments, setCalendarAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [upcomingLoading, setUpcomingLoading] = useState(false);

  // Availability state — all off by default until fetched from API
  const [availability, setAvailability] = useState({
    monday: { available: false, startTime: "09:00", endTime: "17:00" },
    tuesday: { available: false, startTime: "09:00", endTime: "17:00" },
    wednesday: { available: false, startTime: "09:00", endTime: "17:00" },
    thursday: { available: false, startTime: "09:00", endTime: "17:00" },
    friday: { available: false, startTime: "09:00", endTime: "17:00" },
    saturday: { available: false, startTime: "09:00", endTime: "17:00" },
    sunday: { available: false, startTime: "09:00", endTime: "17:00" },
  });
  const [availabilityId, setAvailabilityId] = useState(null);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);

  // Fetch calendar appointments from GET /appointments/staff/{staffId}
  const fetchCalendarAppointments = useCallback(async () => {
    if (!staffId || !accessToken) return;
    setLoading(true);
    try {
      const response = await api.GetStaffAppointments({
        staffId,
        accessToken,
        refreshToken,
      });
      const data = response?.data || response;
      const past = data?.past || [];
      const upcoming = data?.upcoming || [];
      const all = [...past, ...upcoming].map(transformAppointment);
      setCalendarAppointments(all);
    } catch (error) {
      console.error("Failed to fetch staff appointments:", error);
      showToast("Failed to load staff appointments", "error");
    } finally {
      setLoading(false);
    }
  }, [staffId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch upcoming appointments from GET /appointments/staff/upcoming/{staffId}
  const fetchUpcomingAppointments = useCallback(async () => {
    if (!staffId || !accessToken) return;
    setUpcomingLoading(true);
    try {
      const response = await api.GetStaffUpcomingAppointments({
        staffId,
        accessToken,
        refreshToken,
      });
      const data = response?.data || response;
      const list = Array.isArray(data) ? data : [];
      setUpcomingAppointments(list.map(transformAppointment));
    } catch (error) {
      console.error("Failed to fetch upcoming appointments:", error);
      showToast("Failed to load upcoming appointments", "error");
    } finally {
      setUpcomingLoading(false);
    }
  }, [staffId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch availability from GET /organization/staff-availability/staff/{staffId}
  const fetchAvailability = useCallback(async () => {
    if (!staffId || !accessToken) return;
    try {
      const response = await api.GetStaffAvailability({
        staffId,
        accessToken,
        refreshToken,
      });
      // API response: { data: { message, status, data: [ { id, staffId, availabilityDays: [...] } ] } }
      const responseData = response?.data || response;
      const list = responseData?.data || responseData;
      const records = Array.isArray(list) ? list : [];
      const record = records[0];
      if (record) {
        setAvailabilityId(record.id || null);
        if (record.availabilityDays) {
          const days = Array.isArray(record.availabilityDays)
            ? availabilityToObject(record.availabilityDays)
            : record.availabilityDays;
          setAvailability(days);
        }
      }
    } catch (error) {
      console.error("Failed to fetch staff availability:", error);
      showToast("Failed to load staff availability", "error");
    }
  }, [staffId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCalendarAppointments();
    fetchUpcomingAppointments();
    fetchAvailability();
  }, [fetchCalendarAppointments, fetchUpcomingAppointments, fetchAvailability]);

  const handleToday = () => setCurrentDate(new Date());

  const handlePrev = () =>
    setCurrentDate(
      subDays(currentDate, view === "day" ? 1 : view === "week" ? 7 : 30)
    );

  const handleNext = () =>
    setCurrentDate(
      addDays(currentDate, view === "day" ? 1 : view === "week" ? 7 : 30)
    );

  // Filter appointments by search
  const filteredAppointments = useMemo(() => {
    if (!searchTerm) return calendarAppointments;
    const term = searchTerm.toLowerCase();
    return calendarAppointments.filter(
      (appt) =>
        appt.client?.toLowerCase().includes(term) ||
        appt.therapist?.toLowerCase().includes(term) ||
        appt.serviceType?.toLowerCase().includes(term)
    );
  }, [calendarAppointments, searchTerm]);

  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  const handleAppointmentClick = (appt, position) => {
    setSelectedAppointment(appt);
    setAppointmentPosition(position);
  };

  const handleCloseAppointmentDetails = () => {
    setSelectedAppointment(null);
    setAppointmentPosition(null);
  };

  // Convert availability object (from modal) to array for API
  const availabilityToArray = (availObj) =>
    Object.entries(availObj).map(([day, data]) => {
      const entry = {
        dayOfWeek: day.toUpperCase(),
        available: data.available,
        from: data.startTime,
        to: data.endTime,
      };
      if (data.id) entry.id = data.id;
      return entry;
    });

  // Convert availability array (from API) to object for modal
  // Merges with defaults so all 7 days are always present
  const availabilityToObject = (availArr) => {
    const defaults = {
      monday: { available: false, startTime: "09:00", endTime: "17:00" },
      tuesday: { available: false, startTime: "09:00", endTime: "17:00" },
      wednesday: { available: false, startTime: "09:00", endTime: "17:00" },
      thursday: { available: false, startTime: "09:00", endTime: "17:00" },
      friday: { available: false, startTime: "09:00", endTime: "17:00" },
      saturday: { available: false, startTime: "09:00", endTime: "17:00" },
      sunday: { available: false, startTime: "09:00", endTime: "17:00" },
    };
    availArr.forEach((item) => {
      defaults[item.dayOfWeek.toLowerCase()] = {
        id: item.id,
        available: item.available,
        startTime: item.from,
        endTime: item.to,
      };
    });
    return defaults;
  };

  // Save availability (create or update)
  const handleSaveAvailability = async (newAvailability) => {
    setAvailabilitySaving(true);
    const availabilityArray = availabilityToArray(newAvailability);
    try {
      if (availabilityId) {
        // Check if all days have ids (PUT requires id on every day)
        const allHaveIds = availabilityArray.every((day) => day.id);
        if (allHaveIds) {
          // All days exist on backend — update all
          await api.UpdateStaffAvailability({
            id: availabilityId,
            availabilityDays: availabilityArray,
            accessToken,
            refreshToken,
          });
        } else {
          // Some days are new (no id) — only update existing days
          const existingDays = availabilityArray.filter((day) => day.id);
          if (existingDays.length > 0) {
            await api.UpdateStaffAvailability({
              id: availabilityId,
              availabilityDays: existingDays,
              accessToken,
              refreshToken,
            });
          }
        }
      } else {
        // No record exists — create with all 7 days
        const response = await api.CreateStaffAvailability({
          staffId,
          availabilityDays: availabilityArray,
          accessToken,
          refreshToken,
        });
        const data = response?.data || response;
        if (data?.id) setAvailabilityId(data.id);
      }
      setIsAvailabilityModalOpen(false);
      showToast("Availability saved successfully", "success");
      // Re-fetch to get fresh data with ids
      fetchAvailability();
    } catch (error) {
      console.error("Failed to save availability:", error);
      showToast("Failed to save availability", "error");
    } finally {
      setAvailabilitySaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="tabs">
        <button
          className={`tab ${activeTab === "calendar" ? "active" : ""}`}
          onClick={() => setActiveTab("calendar")}
        >
          Calendar
        </button>
        <button
          className={`tab ${activeTab === "upcomingAppointments" ? "active" : ""}`}
          onClick={() => setActiveTab("upcomingAppointments")}
        >
          Upcoming Appointments
          {upcomingAppointments.length > 0 && (
            <span className="candidate-count">{upcomingAppointments.length}</span>
          )}
        </button>
      </div>

      {activeTab === "calendar" ? (
        <div className="cal-sched-container">
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
              {hasPermission("set_staff_availability") && (
                <Button
                  label="Set availability"
                  variant="primary"
                  onClick={() => setIsAvailabilityModalOpen(true)}
                  icon={<FaPlus />}
                />
              )}
            </div>
          </div>

          <div className="cal-sched-filter-section">
            <div className="cal-sched-left-controls">
              <div className="cal-sched-search-container">
                <SearchInput
                  placeholder="Search"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  width="100%"
                />
              </div>
            </div>

            <div className="cal-sched-right-controls">
              <button className="cal-sched-icon-button">
                <CgExport size={24} />
              </button>
              <button className="cal-sched-icon-button">
                <LuPrinter size={24} />
              </button>
              <button className="cal-sched-icon-button">
                <HiOutlineCog6Tooth size={24} />
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "400px" }}>
              <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" style={{ animation: "spin 1s linear infinite" }}>
                <circle cx="25" cy="25" r="20" stroke="#4A90E2" strokeWidth="5" fill="none" strokeDasharray="31.4" strokeDashoffset="0">
                  <animate attributeName="stroke-dashoffset" values="0;31.4" dur="1.5s" repeatCount="indefinite" />
                </circle>
              </svg>
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <div
              className={`mt-6 cal-sched-calendar-container ${
                isSidebarVisible
                  ? "cal-sched-calendar-with-sidebar"
                  : "cal-sched-calendar-full"
              }`}
              ref={calendarContainerRef}
            >
              {view === "day" && (
                <DayView
                  date={currentDate}
                  appointments={filteredAppointments}
                  onAppointmentClick={handleAppointmentClick}
                />
              )}
              {view === "week" && (
                <WeekView
                  date={currentDate}
                  appointments={filteredAppointments}
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

              <StaffAppointmentDetailsModal
                isOpen={!!selectedAppointment}
                onClose={handleCloseAppointmentDetails}
                appointment={selectedAppointment}
                position={appointmentPosition}
              />
            </div>
          )}

          <DatePickerModal
            isOpen={isDatePickerOpen}
            onClose={() => setIsDatePickerOpen(false)}
            onDateSelect={setCurrentDate}
          />

          <AvailabilityModal
            isOpen={isAvailabilityModalOpen}
            onClose={() => setIsAvailabilityModalOpen(false)}
            onSave={handleSaveAvailability}
            initialValues={availability}
            isLoading={availabilitySaving}
          />
        </div>
      ) : (
        <UpcomingAppointments appointments={upcomingAppointments} loading={upcomingLoading} />
      )}
    </div>
  );
};

export default Appointment;

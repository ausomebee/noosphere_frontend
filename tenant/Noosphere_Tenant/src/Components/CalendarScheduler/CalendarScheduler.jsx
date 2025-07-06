import React, { useState, useRef } from "react";
import { format, addDays, subDays } from "date-fns";
import DayView from "./DayView";
import WeekView from "./WeekView";
import MonthView from "./MonthView";
import StaffClientFilter from "./StaffClientFilter";
import AppointmentModal from "../ReusableModal/SchedulerModal/AppointmentModal";
import DatePickerModal from "./DatePickerModal";
import AppointmentDetailsModal from "./AppointmentDetailsModal";
import "./Scheduler.css"; // Import the CSS
import { SearchInput } from "../Input/Inputs";
import Button from "../Button/Button";
import { FaPlus } from "react-icons/fa";
import { HiOutlineCog6Tooth } from "react-icons/hi2";
import { LuPrinter } from "react-icons/lu";
import { CgExport } from "react-icons/cg";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";

const CalendarScheduler = ({ appointments, staff, clients }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
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

  const calendarContainerRef = useRef(null);

  const handleToday = () => setCurrentDate(new Date());

  const handlePrev = () =>
    setCurrentDate(
      subDays(currentDate, view === "day" ? 1 : view === "week" ? 7 : 30)
    );

  const handleNext = () =>
    setCurrentDate(
      addDays(currentDate, view === "day" ? 1 : view === "week" ? 7 : 30)
    );

  const handleStaffChange = (staffId) =>
    setSelectedStaff((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId]
    );

  const handleClientChange = (clientId) =>
    setSelectedClients((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );

  const staffWithCounts = staff.map((member) => ({
    ...member,
    appointmentCount: appointments.filter((appt) => appt.staffId === member.id)
      .length,
  }));

  const clientsWithCounts = clients.map((client) => ({
    ...client,
    appointmentCount: appointments.filter((appt) => appt.clientId === client.id)
      .length,
  }));

  const filteredAppointments = appointments.filter((appt) => {
    const staffFilter =
      activeTab === "staff"
        ? selectedStaff.length === 0
          ? true
          : selectedStaff.includes(appt.staffId)
        : true;
    const clientFilter =
      activeTab === "client"
        ? selectedClients.length === 0
          ? true
          : selectedClients.includes(appt.clientId)
        : true;
    const searchFilter = searchTerm
      ? appt.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.staff?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.title?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    return staffFilter && clientFilter && searchFilter;
  });

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setIsSidebarVisible(true);
  };

  const handleHideSidebar = () => setIsSidebarVisible(false);

  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  const handleFilterClick = () => setIsFilterModalOpen(true);

  const handleCalendarViewClick = () => setIsCalendarViewModalOpen(true);

  const handleSettingsClick = () => setIsSettingsModalOpen(true);

  const handleAppointmentClick = (appt, position) => {
    setSelectedAppointment(appt);
    setAppointmentPosition(position);
  };

  const handleCloseAppointmentDetails = () => {
    setSelectedAppointment(null);
    setAppointmentPosition(null);
  };

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
              <IoIosArrowForward  />
            </button>
          </div>
        </div>

        <div className="cal-sched-view-switcher">
          <button
            onClick={() => setView("day")}
            className={`cal-sched-view-button ${
              view === "day" ? "cal-sched-view-button-active" : "cal-sched-view-button-inactive"
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
        {isSidebarVisible && (
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

          <AppointmentDetailsModal
            isOpen={!!selectedAppointment}
            onClose={handleCloseAppointmentDetails}
            appointment={selectedAppointment}
            position={appointmentPosition}
          />
        </div>
      </div>

      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        staff={staff}
      />
      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onDateSelect={setCurrentDate}
      />
    </div>
  );
};

export default CalendarScheduler;

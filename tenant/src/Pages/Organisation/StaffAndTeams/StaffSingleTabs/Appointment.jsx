import React, { useState, useRef } from "react";
import DayView from "../../../../Components/CalendarScheduler/DayView";
import WeekView from "../../../../Components/CalendarScheduler/WeekView";
import MonthView from "../../../../Components/CalendarScheduler/MonthView";
import AppointmentDetailsModal from "../../../../Components/ReusableModal/SchedulerModal/AppointmentDetailsModal";
import AvailabilityModal from "../../../../Components/ReusableModal/SchedulerModal/AvailabilityModal";
import UpcomingAppointments from "./UpcomingAppointments";
import { format, subDays, addDays } from "date-fns";
import { CgExport } from "react-icons/cg";
import { LuPrinter } from "react-icons/lu";
import { HiOutlineCog6Tooth } from "react-icons/hi2";
import { FaPlus } from "react-icons/fa";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import Button from "../../../../Components/Button/Button";
import { SearchInput } from "../../../../Components/Input/Inputs";
import DatePickerModal from "../../../../Components/ReusableModal/SchedulerModal/DatePickerModal";

const Appointment = () => {
  const [activeTab, setActiveTab] = useState("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("month");
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const calendarContainerRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isCalendarViewModalOpen, setIsCalendarViewModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentPosition, setAppointmentPosition] = useState(null);
  
  // State to manage availability
  const [availability, setAvailability] = useState({
    monday: { available: true, startTime: "0:00", endTime: "12:00" },
    tuesday: { available: true, startTime: "0:00", endTime: "12:00" },
    wednesday: { available: false, startTime: "0:00", endTime: "12:00" },
    thursday: { available: true, startTime: "0:00", endTime: "12:00" },
    friday: { available: true, startTime: "0:00", endTime: "12:00" },
    saturday: { available: true, startTime: "0:00", endTime: "12:00" },
    sunday: { available: false, startTime: "0:00", endTime: "12:00" },
  });

  // These would need to be properly implemented based on your data structure
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);

  const formatTime = (date) => {
    return format(date, "h:mma").toLowerCase(); // e.g., "1:30pm"
  };

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const handleToday = () => setCurrentDate(new Date());

  const handlePrev = () =>
    setCurrentDate(
      subDays(currentDate, view === "day" ? 1 : view === "week" ? 7 : 30)
    );

  const handleNext = () =>
    setCurrentDate(
      addDays(currentDate, view === "day" ? 1 : view === "week" ? 7 : 30)
    );

  const appointments = [
    {
      id: 1,
      client: "Kelly Rowland",
      time: formatTime(
        new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate(),
          13,
          30
        )
      ), // 1:30PM yesterday
      start: new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate(),
        13,
        30
      ), // 1:30PM yesterday
      end: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        16,
        30
      ), // 4:30PM yesterday
      color: "#f7c948",
      therapist: "Jonah Gutierrez",
      serviceType: "H 123.4",
      sessionType: "Group Training",
      staffId: 1,
    },
    {
      id: 2,
      client: "Naomi Marley",
      time: formatTime(
        new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 30)
      ), // 1:30PM today
      start: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        13,
        30
      ), // 1:30PM today
      end: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        16,
        30
      ), // 4:30PM today
      color: "#48f794",
      therapist: "Jonah Gutierrez",
      serviceType: "H 123.4",
      sessionType: "Group Training",
      staffId: 1,
    },
    {
      id: 3,
      client: "Naomi Marley",
      time: formatTime(
        new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0)
      ), // 3:00PM today
      start: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        15,
        0
      ), // 3:00PM today
      end: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        18,
        0
      ), // 6:00PM today
      color: "#48f494",
      therapist: "Jonah Gutierrez",
      serviceType: "H 123.4",
      sessionType: "Group Training",
      staffId: 1,
    },
    {
      id: 4,
      client: "Naomi Marley",
      time: formatTime(
        new Date(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate(),
          13,
          30
        )
      ), // 1:30PM tomorrow
      start: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        13,
        30
      ), // 1:30PM tomorrow
      end: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        16,
        30
      ), // 4:30PM tomorrow
      color: "#48f794",
      therapist: "Jonah Gutierrez",
      serviceType: "H 123.4",
      sessionType: "Group Training",
      staffId: 1,
    },
    {
      id: 5,
      client: "Naomi Marley",
      time: formatTime(
        new Date(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate(),
          15,
          30
        )
      ), // 3:30PM tomorrow
      start: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        15,
        30
      ), // 3:30PM tomorrow
      end: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        18,
        30
      ), // 6:30PM tomorrow
      color: "#48f794",
      therapist: "Jonah Gutierrez",
      serviceType: "H 123.4",
      sessionType: "Group Training",
      staffId: 1,
    },
    {
      id: 6,
      client: "Naomi Marley",
      time: formatTime(
        new Date(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate(),
          18,
          0
        )
      ), // 6:00PM tomorrow
      start: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        18,
        0
      ), // 6:00PM tomorrow
      end: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        20,
        0
      ), // 8:00PM tomorrow
      color: "#48f794",
      therapist: "Jonah Gutierrez",
      serviceType: "H 123.4",
      sessionType: "Group Training",
      staffId: 1,
    },
    {
      id: 7,
      client: "Naomi Marley",
      time: formatTime(
        new Date(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate(),
          23,
          30
        )
      ), // 11:30PM tomorrow
      start: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        23,
        30
      ), // 11:30PM tomorrow
      end: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate() + 1,
        1,
        30
      ), // 1:30AM day after tomorrow
      color: "#48f794",
      therapist: "Jonah Gutierrez",
      serviceType: "H 123.4",
      sessionType: "Group Training",
      staffId: 1,
    },
  ];

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
        appt.therapist?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.serviceType?.toLowerCase().includes(searchTerm.toLowerCase())
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

  // Handle saving availability from the modal
  const handleSaveAvailability = (newAvailability) => {
    setAvailability(newAvailability);
    // Optionally, update appointments or other logic based on availability
    console.log("Saved Availability:", newAvailability);
    setIsAvailabilityModalOpen(false); // Close the modal after saving
  };

  return (
    <div className="p-20">
      <div className="tabs">
        <button
          className={`tab ${activeTab === "calendar" ? "active" : ""}`}
          onClick={() => setActiveTab("calendar")}
        >
          Calendar
        </button>

        <button
          className={`tab ${
            activeTab === "upcomingAppointments" ? "active" : ""
          }`}
          onClick={() => setActiveTab("upcomingAppointments")}
        >
          Upcoming Appointments
          <span className="candidate-count">4</span>
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
              <Button
                label="Set availability"
                variant="primary"
                onClick={() => setIsAvailabilityModalOpen(true)}
                icon={<FaPlus />}
              />
            </div>
          </div>

          <div className="cal-sched-filter-section">
            <div className="cal-sched-left-controls">
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
              <button
                onClick={handleFilterClick}
                className="cal-sched-icon-button"
              >
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

            <AppointmentDetailsModal
              isOpen={!!selectedAppointment}
              onClose={handleCloseAppointmentDetails}
              appointment={selectedAppointment}
              position={appointmentPosition}
            />
          </div>
          <DatePickerModal
            isOpen={isDatePickerOpen}
            onClose={() => setIsDatePickerOpen(false)}
            onDateSelect={setCurrentDate}
          />
          
          <AvailabilityModal
            isOpen={isAvailabilityModalOpen}
            onClose={() => setIsAvailabilityModalOpen(false)}
            onSave={handleSaveAvailability}
            initialValues={availability} // Pass current availability as initial values
            isLoading={false} // You can manage this state if needed
          />
        </div>
      ) : (
        <UpcomingAppointments appointments={filteredAppointments} />
      )}
    </div>
  );
};

export default Appointment;
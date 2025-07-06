import React, { useRef } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addDays,
  differenceInDays,
  startOfDay,
} from "date-fns";
import './Scheduler.css'; // Corrected import to match CSS file
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";

const MonthView = ({ date, appointments, onAppointmentClick }) => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const days = eachDayOfInterval({ start, end });
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const firstDayOfMonth = start.getDay();
  const paddedDays = Array(firstDayOfMonth).fill(null).concat(days);
  const totalCells = Math.ceil(paddedDays.length / 7) * 7;
  const nextMonthDays = Array(totalCells - paddedDays.length)
    .fill(null)
    .map((_, i) => addDays(end, i + 1));
  const allDays = [...paddedDays, ...nextMonthDays];
  const calendarRef = useRef(null);

  const handleAppointmentClick = (appt, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const calendarRect = calendarRef.current.getBoundingClientRect();
    const position = {
      x: rect.left - calendarRect.left + rect.width + 10,
      y: rect.top - calendarRect.top,
      appointmentWidth: rect.width,
      appointmentHeight: rect.height,
    };
    onAppointmentClick(appt, position);
  };

  return (
    <div className="month-view-container" ref={calendarRef}>
      {/* Weekdays Header */}
      <div className="month-view-header">
        {daysOfWeek.map((day) => (
          <div key={day} className="month-view-day-header">{day}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="month-view-grid">
        {allDays.map((day, index) => {
          const isCurrentMonth = day && isSameMonth(day, start);
          const dayAppointments = day
            ? appointments.filter((appt) => {
                const apptStart = new Date(appt.start);
                const apptEnd = new Date(appt.end);
                const normalizedDay = startOfDay(day);
                const normalizedApptStart = startOfDay(apptStart);
                const normalizedApptEnd = startOfDay(apptEnd);
                return (
                  normalizedApptStart <= normalizedDay &&
                  normalizedApptEnd >= normalizedDay
                );
              })
            : [];

          return (
            <div
              key={index}
              className={`month-view-day ${
                isCurrentMonth ? "month-view-day-current" : "month-view-day-outside"
              }`}
            >
              {day && (
                <>
                  {/* Day Number */}
                  <div className="month-view-day-number">{format(day, "d")}</div>

                  {/* Appointment Container */}
                  <div className="month-view-appointments">
                    {dayAppointments.map((appt, apptIndex) => {
                      const apptStart = new Date(appt.start);
                      const apptEnd = new Date(appt.end);
                      const isStartDay = isSameDay(startOfDay(apptStart), startOfDay(day));
                      const isEndDay = isSameDay(startOfDay(apptEnd), startOfDay(day));
                      const daysSpanned =
                        differenceInDays(startOfDay(apptEnd), startOfDay(apptStart)) + 1;

                      return (
                        <div
                          key={`${appt.id}-${day.toISOString()}`}
                          onClick={(event) => handleAppointmentClick(appt, event)}
                          className="month-view-appointment"
                          style={{
                            backgroundColor: appt.color,
                          }}
                        >
                          <span className="month-view-appointment-text">{`${appt.time} ${appt.client}`}</span>
                          {daysSpanned > 1 && (
                            <>
                              {isStartDay && (
                                <span className="month-view-appointment-arrow"><IoIosArrowForward  /></span>
                              )}
                              {isEndDay && (
                                <span className="month-view-appointment-arrow"><IoIosArrowBack /></span>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthView;
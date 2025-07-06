import React, { useRef } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import './Scheduler.css'; // Import the CSS

const WeekView = ({ date, appointments, onAppointmentClick }) => {
  const start = startOfWeek(date, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const calendarRef = useRef(null);

  const formatHour = (hour) => {
    if (hour === 0) return "12 am";
    if (hour === 12) return "12 pm";
    if (hour < 12) return `${hour} am`;
    return `${hour - 12} pm`;
  };

  const calculatePositionAndHeight = (start, end, rowHeightPx) => {
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const top = (startHour * rowHeightPx) + 40; // 40px for the header row
    const height = (endHour - startHour) * rowHeightPx;
    return { top: `${top}px`, height: `${height}px` };
  };

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

  const rowHeightPx = 60; // 60px per hour

  return (
    <div className="week-view-container" ref={calendarRef}>
      <div className="week-view-grid">
        <div className="week-view-header-time">All day</div>
        {days.map((day, index) => (
          <div
            key={day}
            className={`week-view-header-day ${index === 6 ? "week-view-header-day-last" : ""}`}
          >
            {format(day, "d EEE")}
          </div>
        ))}

        {hours.map((hour) => (
          <React.Fragment key={hour}>
            <div className="week-view-hour-cell">{formatHour(hour)}</div>
            {days.map((day, index) => (
              <div
                key={`${day}-${hour}`}
                className={`week-view-day-cell ${index < 6 ? "week-view-day-cell-bordered" : ""}`}
                style={{ height: `${rowHeightPx}px` }}
              />
            ))}
          </React.Fragment>
        ))}
      </div>

      {days.map((day, dayIndex) => {
        const dayAppointments = appointments.filter((appt) =>
          isSameDay(new Date(appt.start), day)
        );

        const groupedAppointments = {};
        dayAppointments.forEach((appt) => {
          const start = new Date(appt.start);
          const startHour = Math.floor(start.getHours() + start.getMinutes() / 60);
          if (!groupedAppointments[startHour]) {
            groupedAppointments[startHour] = [];
          }
          groupedAppointments[startHour].push(appt);
        });

        return Object.entries(groupedAppointments).map(([startHour, appts]) => {
          const groupWidth = 11 / appts.length; // Split the column width
          return appts.map((appt, apptIndex) => {
            const start = new Date(appt.start);
            const end = new Date(appt.end);
            const { top, height } = calculatePositionAndHeight(start, end, rowHeightPx);
            const startTime = format(start, "h:mma").toLowerCase();
            const endTime = format(end, "h:mma").toLowerCase();
            const timeRange = `${startTime} - ${endTime}`;

            return (
              <div
                key={appt.id}
                onClick={(event) => handleAppointmentClick(appt, event)}
                className="week-view-appointment"
                style={{
                  backgroundColor: appt.color || "#ffcccb",
                  top: top,
                  height: height,
                  left: `calc(${(dayIndex + 1) * 12.5}% + 4px + ${apptIndex * groupWidth}%)`,
                  width: `${groupWidth}%`,
                }}
              >
                <div className="week-view-appointment-time">{timeRange}</div>
                <div className="week-view-appointment-client">{appt.client || "Unknown Staff"}</div>
              </div>
            );
          });
        });
      })}
    </div>
  );
};

export default WeekView;
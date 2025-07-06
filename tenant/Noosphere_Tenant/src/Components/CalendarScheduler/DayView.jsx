import React, { useRef } from "react";
import { format, isSameDay } from "date-fns";
import './Scheduler.css'; 

const DayView = ({ date, appointments, onAppointmentClick }) => {
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

  const dayAppointments = appointments.filter((appt) =>
    isSameDay(new Date(appt.start), date)
  );

  const rowHeightPx = 60; // 60px per hour

  const groupedAppointments = {};
  dayAppointments.forEach((appt) => {
    const start = new Date(appt.start);
    const startHour = Math.floor(start.getHours() + start.getMinutes() / 60);
    if (!groupedAppointments[startHour]) {
      groupedAppointments[startHour] = [];
    }
    groupedAppointments[startHour].push(appt);
  });

  return (
    <div className="day-view-container" ref={calendarRef}>
      <table className="day-view-table">
        <thead>
          <tr className="day-view-header-row">
            <th className="day-view-header-time">All day</th>
            <th className="day-view-header-date">{format(date, "d EEE")}</th>
          </tr>
        </thead>
        <tbody>
          {hours.map((hour) => (
            <tr key={hour} className="day-view-body-row">
              <td className="day-view-hour-cell">{formatHour(hour)}</td>
              <td
                className="day-view-appointment-cell"
                style={{ height: `${rowHeightPx}px` }}
              ></td>
            </tr>
          ))}
        </tbody>
      </table>

      {Object.entries(groupedAppointments).map(([startHour, appts]) => {
        const groupWidth = 76 / appts.length; // Split the 76% width
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
              className="day-view-appointment"
              style={{
                backgroundColor: appt.color || "#ffcccb",
                top: top,
                height: height,
                left: `calc(20% + 4px + ${apptIndex * groupWidth}%)`,
                width: `${groupWidth}%`,
              }}
            >
              <div className="day-view-appointment-time">{timeRange}</div>
              <div className="day-view-appointment-client">{appt.client || "Unknown Staff"}</div>
            </div>
          );
        });
      })}
    </div>
  );
};

export default DayView;
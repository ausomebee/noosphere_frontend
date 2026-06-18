import React, { useRef, useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  startOfWeek,
  endOfWeek,
  isToday,
} from "date-fns";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import "./Scheduler.css";
import { CgChevronRight } from "react-icons/cg";
import { getContrastTextColor } from "../../Helper/colorContrast";

const MonthView = ({ date, appointments, onAppointmentClick }) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];
  const calendarRef = useRef(null);
  const [dropdown, setDropdown] = useState({ visible: false, day: null, position: { x: 0, y: 0 }, appointments: [] });

  const handleAppointmentClick = (appt, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const calendarRect = calendarRef.current.getBoundingClientRect();
    onAppointmentClick(appt, {
      x: rect.left - calendarRect.left + rect.width + 10,
      y: rect.top - calendarRect.top,
      appointmentWidth: rect.width,
      appointmentHeight: rect.height,
    });
  };

  const handleMoreClick = (day, event) => {
    if (dropdown.visible && dropdown.day && isSameDay(dropdown.day, day)) {
      // Close dropdown if clicking the same day's "+X more" button
      setDropdown({ visible: false, day: null, position: { x: 0, y: 0 }, appointments: [] });
    } else {
      // Open dropdown for the new day
      const rect = event.currentTarget.getBoundingClientRect();
      const calendarRect = calendarRef.current.getBoundingClientRect();
      const appts = dayAppointments(day);
      setDropdown({
        visible: true,
        day,
        position: {
          x: rect.left - calendarRect.left,
          y: rect.top - calendarRect.top + rect.height,
        },
        appointments: appts.slice(3),
      });
    }
  };

  const dayAppointments = (day) =>
    appointments.filter((appt) => isSameDay(new Date(appt.date), day));

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return format(date, "h:mm a");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdown.visible && calendarRef.current && !calendarRef.current.contains(event.target)) {
        setDropdown({ visible: false, day: null, position: { x: 0, y: 0 }, appointments: [] });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdown.visible]);

  return (
    <div className="month-view-container" ref={calendarRef}>
      <div className="month-view-header">
        {daysOfWeek.map((d) => (
          <div key={d} className="month-view-day-header">
            {d}
          </div>
        ))}
      </div>

      <div className="month-view-grid">
        {allDays.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isTodayDate = isToday(day);
          const appts = dayAppointments(day);

          return (
            <div
              key={idx}
              className={`month-view-day ${
                isCurrentMonth ? "month-view-day-current" : "month-view-day-outside"
              } ${isTodayDate ? "month-view-day-today" : ""}`}
            >
              {day && (
                <>
                  <div className="month-view-day-number">{format(day, "d")}</div>
                  <div className="month-view-appointments">
                    {appts.slice(0, 3).map((appt) => (
                      <div
                        key={appt.id}
                        onClick={(e) => handleAppointmentClick(appt, e)}
                        className="month-view-appointment"
                        style={{
                          backgroundColor: appt.colorCode || "#ffcccb",
                          color: getContrastTextColor(appt.colorCode || "#ffcccb"),
                        }}
                      >
                        <span className="month-view-appointment-text flex justify-between">
                          {formatTime(appt.startTime)} {appt.clientName} <CgChevronRight />
                        </span>
                      </div>
                    ))}
                    {appts.length > 3 && (
                      <div
                        className="month-view-more"
                        onClick={(e) => handleMoreClick(day, e)}
                        style={{
                          cursor: "pointer",
                          backgroundColor: "#e0e7ff",
                          color: "#4b5eAA",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontWeight: "500",
                          fontSize: "12px",
                          textAlign: "center",
                          transition: "background-color 0.2s, transform 0.1s",
                          ":hover": {
                            backgroundColor: "#c7d2fe",
                            transform: "scale(1.05)",
                          },
                        }}
                      >
                        +{appts.length - 3} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {dropdown.visible && (
        <div
          style={{
            position: "absolute",
            top: `${dropdown.position.y}px`,
            left: `${dropdown.position.x}px`,
            width: "220px",
            maxHeight: "200px",
            overflowY: "auto",
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            padding: "8px 8px",
          }}
        >
          {dropdown.appointments.map((appt) => (
            <div
              key={appt.id}
              onClick={(e) => handleAppointmentClick(appt, e)}
              style={{
                padding: "10px 12px",
                borderBottom: "1px solid #f1f5f9",
                cursor: "pointer",
                 borderRadius: "20px",
                backgroundColor: appt.colorCode || "#ffcccb",
                color: getContrastTextColor(appt.colorCode || "#ffcccb"),
                transition: "background-color 0.2s",
                ":hover": {
                  backgroundColor: appt.colorCode ? darkenColor(appt.colorCode, 0.1) : "#ffb3b3",
                },
              }}
            >
              <span
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "13px",
                  color: "#1f2937",
                  fontWeight: "400",
                }}
              >
                {formatTime(appt.startTime)} {appt.clientName} <CgChevronRight />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper function to darken a hex color
const darkenColor = (hex, amount) => {
  let color = hex.replace("#", "");
  if (color.length === 3) {
    color = color
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = Math.max(0, parseInt(color.slice(0, 2), 16) * (1 - amount));
  const g = Math.max(0, parseInt(color.slice(2, 4), 16) * (1 - amount));
  const b = Math.max(0, parseInt(color.slice(4, 6), 16) * (1 - amount));
  return `#${Math.round(r).toString(16).padStart(2, "0")}${Math.round(g).toString(16).padStart(2, "0")}${Math.round(b).toString(16).padStart(2, "0")}`;
};

export default MonthView;
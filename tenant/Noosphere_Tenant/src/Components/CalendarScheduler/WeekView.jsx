import React, { useRef, useState, useMemo, useCallback, useEffect } from "react";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  isToday,
  startOfDay,
  isValid,
  
} from "date-fns";
import { CgChevronRight } from "react-icons/cg";
import "./Scheduler.css";

const WeekView = ({ date, appointments, clients, onAppointmentClick }) => {
  const viewDate = useMemo(() => startOfDay(date ? new Date(date) : new Date()), [date]);

  const days = useMemo(() => {
    const start = startOfWeek(viewDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [viewDate]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const calendarRef = useRef(null);
  const [dayColumns, setDayColumns] = useState([]);

  const parseTime = useCallback((timeStr, dateStr) => {
    if (!timeStr || !dateStr) return null;
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(dateStr);
    if (!isValid(d) || isNaN(h) || isNaN(m)) return null;
    d.setHours(h, m, 0, 0);
    return d;
  }, []);

  const formatHour = useCallback((hour) => {
    if (hour === 0) return "12 am";
    if (hour === 12) return "12 pm";
    if (hour < 12) return `${hour} am`;
    return `${hour - 12} pm`;
  }, []);

  const calculatePositionAndHeight = useCallback(
    (startTime, endTime, dateStr, rowHeightPx) => {
      const start = parseTime(startTime, dateStr);
      const end = parseTime(endTime, dateStr);
      if (!start || !end) return { top: "0px", height: "0px" };

      const startHour = start.getHours() + start.getMinutes() / 60;
      const endHour = end.getHours() + end.getMinutes() / 60;
      const top = startHour * rowHeightPx + 40;
      const height = Math.max((endHour - startHour) * rowHeightPx, 20);
      return { top: `${top}px`, height: `${height}px` };
    },
    [parseTime]
  );

  useEffect(() => {
    if (!calendarRef.current) return;

    const grid = calendarRef.current.querySelector(".week-view-grid");
    if (!grid) return;

    const updateColumns = () => {
      const rect = grid.getBoundingClientRect();
      const dayWidth = (rect.width - 80) / 7;
      const newColumns = days.map((_, i) => ({
        left: 80 + i * dayWidth,
        width: dayWidth,
      }));

      setDayColumns((prev) => {
        if (prev.length !== newColumns.length) return newColumns;
        if (
          prev.every(
            (col, i) =>
              col.left === newColumns[i].left && col.width === newColumns[i].width
          )
        ) {
          return prev;
        }
        return newColumns;
      });
    };

    updateColumns();

    const observer = new ResizeObserver(updateColumns);
    observer.observe(grid);

    return () => observer.disconnect();
  }, [days]);

  const processAppointments = useCallback(
    (appts) => {
      if (!appts.length) return [];
      const sorted = [...appts].sort((a, b) => {
        const aTime = parseTime(a.startTime, a.date) || new Date(0);
        const bTime = parseTime(b.startTime, b.date) || new Date(0);
        return aTime - bTime;
      });
      const groups = [];
      let currentGroup = [];
      let currentEnd = sorted[0].endTime;

      sorted.forEach((appt) => {
        const apptStart = parseTime(appt.startTime, appt.date);
        const groupEnd = parseTime(currentEnd, appt.date);
        if (apptStart && groupEnd && apptStart < groupEnd) {
          currentGroup.push(appt);
          const apptEnd = parseTime(appt.endTime, appt.date);
          if (apptEnd && apptEnd > groupEnd) currentEnd = appt.endTime;
        } else {
          if (currentGroup.length) groups.push([...currentGroup]);
          currentGroup = [appt];
          currentEnd = appt.endTime;
        }
      });
      if (currentGroup.length) groups.push(currentGroup);
      return groups;
    },
    [parseTime]
  );

  const handleAppointmentClick = useCallback(
    (appt, event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const calendarRect = calendarRef.current.getBoundingClientRect();
      onAppointmentClick(appt, {
        x: rect.left - calendarRect.left + rect.width + 10,
        y: rect.top - calendarRect.top,
        appointmentWidth: rect.width,
        appointmentHeight: rect.height,
      });
    },
    [onAppointmentClick]
  );

  const rowHeightPx = 60;

  return (
    <div
      className="week-view-container"
      ref={calendarRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        fontFamily: "Arial, sans-serif",
        overflow: "auto",
      }}
    >
      <div
        className="week-view-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "80px repeat(7, 1fr)",
          width: "100%",
        }}
      >
        <div
          style={{
            gridColumn: "1",
            gridRow: "1",
            padding: "10px",
            borderRight: "1px solid #e0e0e0",
            borderBottom: "1px solid #e0e0e0",
            backgroundColor: "#f8f9fa",
            fontWeight: "bold",
          }}
        >
          All day
        </div>
        {days.map((day, index) => {
          const isTodayDate = isToday(day);
          return (
            <div
              key={day.toString()}
              style={{
                gridColumn: `${index + 2}`,
                gridRow: "1",
                padding: "10px",
                borderRight: index < 6 ? "1px solid #e0e0e0" : "none",
                borderBottom: "1px solid #e0e0e0",
                backgroundColor: isTodayDate ? "#e3f2fd" : "#f8f9fa",
                fontWeight: "bold",
                textAlign: "center",
                color: isTodayDate ? "#1976d2" : "inherit",
              }}
            >
              {format(day, "d EEE")}
              {isTodayDate && (
                <div style={{ fontSize: "10px", marginTop: "2px" }}>Today</div>
              )}
            </div>
          );
        })}

        {hours.map((hour) => (
          <React.Fragment key={hour}>
            <div
              style={{
                gridColumn: "1",
                gridRow: `${hour + 2}`,
                padding: "5px 10px",
                borderRight: "1px solid #e0e0e0",
                borderBottom: "1px solid #e0e0e0",
                fontSize: "12px",
                color: "#666",
              }}
            >
              {formatHour(hour)}
            </div>
            {days.map((day, dayIndex) => {
              const isTodayDate = isToday(day);
              return (
                <div
                  key={`${day.toString()}-${hour}`}
                  style={{
                    gridColumn: `${dayIndex + 2}`,
                    gridRow: `${hour + 2}`,
                    borderRight: dayIndex < 6 ? "1px solid #e0e0e0" : "none",
                    borderBottom: "1px solid #e0e0e0",
                    height: `${rowHeightPx}px`,
                    backgroundColor: isTodayDate ? "#f5f9ff" : "transparent",
                  }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {days.map((day, dayIndex) => {
        const dayAppointments = appointments.filter((appt) =>
          isSameDay(new Date(appt.date), day)
        );
        const groups = processAppointments(dayAppointments);

        return groups.flatMap((group, gIdx) =>
          group.map((appt, aIdx) => {
            const { top, height } = calculatePositionAndHeight(
              appt.startTime,
              appt.endTime,
              appt.date,
              rowHeightPx
            );
            const startTime = format(
              parseTime(appt.startTime, appt.date) || new Date(appt.date),
              "h:mma"
            ).toLowerCase();
            const endTime = format(
              parseTime(appt.endTime, appt.date) || new Date(appt.date),
              "h:mma"
            ).toLowerCase();
            const timeRange = `${startTime} - ${endTime}`;

            const groupWidth = dayColumns[dayIndex]?.width || 0;
            const apptWidth = groupWidth / group.length;
            const left = (dayColumns[dayIndex]?.left || 0) + aIdx * apptWidth;

            return (
              <div
                key={`${appt.id}-${appt.date}-${gIdx}-${aIdx}`}
                onClick={(e) => handleAppointmentClick(appt, e)}
                style={{
                  position: "absolute",
                  backgroundColor: appt.colorCode || "#ffcccb",
                  top,
                  height,
                  left: `${left}px`,
                  width: `${apptWidth - 4}px`,
                  borderRadius: "6px",
                  padding: "4px",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                  margin: "0 2px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 4px 8px rgba(0,0,0,0.15)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 2px 4px rgba(0,0,0,0.1)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#333",
                    lineHeight: "1.2",
                    paddingBottom: "4px",
                    borderBottom: "1px solid rgba(0,0,0,0.1)",
                  }}
                >
                  {timeRange}
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#222",
                    textAlign: "left",
                    display: "flex",
                    marginTop: "auto",
                    justifyContent: "space-between",
                    paddingTop: "4px",
                    borderTop: "1px solid rgba(0,0,0,0.1)",
                    lineHeight: "1.2",
                  }}
                >
                  {appt.clientName || "Unknown Client"} <CgChevronRight />
                </div>
              </div>
            );
          })
        );
      })}
    </div>
  );
};

export default WeekView;
import { useMemo, useEffect, useRef } from "react";
import {
  format,
  isSameDay,
  isToday,
  startOfDay,
  isValid,
  parseISO,
} from "date-fns";
import { CgChevronRight } from "react-icons/cg";

// Parse time (e.g., "01:30") with date (e.g., "2025-09-27") to create a Date object
const parseTime = (time, date) => {
  if (!time || !date) {
    return null;
  }
  try {
    const [hours, minutes] = time.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }
    let parsedDate = parseISO(date);
    if (!isValid(parsedDate)) {
      parsedDate = new Date(date);
      if (!isValid(parsedDate)) {
        return null;
      }
    }
    const result = new Date(parsedDate);
    result.setHours(hours, minutes, 0, 0);
    if (!isValid(result)) {
      return null;
    }
    return result;
  } catch (e) {
    return null;
  }
};

// Format hour for grid (e.g., 10 => "10:00 AM")
const formatHour = (hour) => {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
};

// Calculate top and height for appointment positioning
const calculatePositionAndHeight = (startTime, endTime, date, rowHeightPx) => {
  const start = parseTime(startTime, date) || new Date(date);
  const end = parseTime(endTime, date) || new Date(start.getTime() + 30 * 60 * 1000);
  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHour = end.getHours() + end.getMinutes() / 60;
  const top = startHour * rowHeightPx;
  const height = (endHour - startHour) * rowHeightPx;

  return { top, height: Math.max(height, rowHeightPx / 2) };
};

// Group overlapping appointments
const processAppointments = (appointments) => {
  if (!appointments?.length) return [];
  const sorted = [...appointments].sort((a, b) => {
    const aStart = parseTime(a.startTime, a.date) || new Date(a.date);
    const bStart = parseTime(b.startTime, b.date) || new Date(b.date);
    return aStart - bStart;
  });

  const groups = [];
  let currentGroup = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const prevEnd = parseTime(prev.endTime, prev.date) || new Date(prev.date);
    const currStart = parseTime(curr.startTime, curr.date) || new Date(curr.date);
    if (currStart < prevEnd) {
      currentGroup.push(curr);
    } else {
      groups.push(currentGroup);
      currentGroup = [curr];
    }
  }
  if (currentGroup.length) groups.push(currentGroup);
  return groups;
};

const DayView = ({ date, appointments, clients, onAppointmentClick }) => {
  // Normalize viewDate to start of day
  const viewDate = useMemo(() => {
    const d = startOfDay(date ? new Date(date) : new Date());
    return d;
  }, [date]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const rowHeightPx = 60;
  const containerRef = useRef(null);

  // Filter appointments for the current day
  const dayAppointments = useMemo(
    () =>
      appointments.filter((appt) => {
        try {
          let apptDate = parseISO(appt.date);
          if (!isValid(apptDate)) {
            apptDate = new Date(appt.date);
            if (!isValid(apptDate)) {
              return false;
            }
          }
          const normalizedApptDate = startOfDay(apptDate);
          const normalizedViewDate = startOfDay(viewDate);
          const isMatch = isSameDay(normalizedApptDate, normalizedViewDate);
          return isMatch;
        } catch (e) {
          return false;
        }
      }),
    [appointments, viewDate]
  );

  const groups = processAppointments(dayAppointments);

  // Scroll to 11 PM on initial render
  useEffect(() => {
    if (containerRef.current) {
      // 11 PM = 23:00 = 23 * 60px = 1380px from top
      containerRef.current.scrollTo({ top: 1380, behavior: "smooth" });
    }
  }, [viewDate]);

  return (
    <div
      className="day-view-container"
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "840px", // ~14 hours (11 PM to 1 PM) at 60px/hour
        fontFamily: "Arial, sans-serif",
        overflowX: "hidden",
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      {/* Grid for hours and appointments */}
      <div
        className="day-view-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "80px 1fr",
          width: "100%",
          minHeight: `${24 * rowHeightPx}px`, // Ensure full 24-hour grid
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            gridColumn: "1 / span 2",
            gridRow: "1",
            padding: "10px",
            backgroundColor: "#f5f5f5",
            borderBottom: "1px solid #e0e0e0",
            textAlign: "center",
            fontWeight: "600",
            fontSize: "16px",
            color: "#333",
            boxSizing: "border-box",
          }}
        >
          {format(viewDate, "EEEE, MMMM d, yyyy")}
        </div>
        {/* Hour labels */}
        {hours.map((hour) => (
          <div
            key={hour}
            style={{
              gridColumn: "1",
              gridRow: `${hour + 2}`,
              padding: "0 10px",
              borderRight: "1px solid #e0e0e0",
              borderBottom: "1px solid #e0e0e0",
              fontSize: "12px",
              color: "#666",
              height: `${rowHeightPx}px`,
              lineHeight: `${rowHeightPx}px`,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
            }}
          >
            {formatHour(hour)}
          </div>
        ))}
        {/* Hour slots */}
        {hours.map((hour) => (
          <div
            key={`slot-${hour}`}
            style={{
              gridColumn: "2",
              gridRow: `${hour + 2}`,
              borderBottom: "1px solid #e0e0e0",
              height: `${rowHeightPx}px`,
              minHeight: `${rowHeightPx}px`,
              backgroundColor: isToday(viewDate) ? "#f5f9ff" : "transparent",
              boxSizing: "border-box",
              position: "relative",
            }}
          >
            {/* Optional half-hour line for debugging alignment */}
            {/* <div
              style={{
                position: "absolute",
                top: `${rowHeightPx / 2}px`,
                left: 0,
                right: 0,
                borderBottom: "1px dashed #e0e0e0",
              }}
            /> */}
          </div>
        ))}
      </div>
      {/* Appointment cards */}
      {groups.flatMap((group, gIdx) =>
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
          const groupLength = group.length || 1; // Avoid division by zero
          const apptWidth = 100 / groupLength;
          const left = aIdx * apptWidth;

          return (
            <div
              key={`${appt.id}-${appt.date}-${gIdx}-${aIdx}`}
              onClick={(e) => onAppointmentClick(appt, e)}
              style={{
                position: "absolute",
                backgroundColor: appt.colorCode || "#ffcccb",
                top: `${top}px`,
                height: `${height}px`,
                left: `calc(${left}% + 80px + 2px)`,
                width: `calc(${apptWidth}% - 6px)`,
                borderRadius: "6px",
                padding: "4px",
                margin: "1px 2px",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                overflow: "hidden",
                transition: "all 0.2s ease",
                zIndex: 10 + aIdx,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
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
      )}
    </div>
  );
};

export default DayView;
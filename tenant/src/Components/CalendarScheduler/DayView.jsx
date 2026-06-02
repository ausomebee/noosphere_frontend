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
import { formatHour } from "../../Helper/Formatters";
import useFormatSettings from "../../hooks/useFormatSettings";
import "./Scheduler.css";

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
  const { timeFormat } = useFormatSettings();

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
    >
      {/* Grid for hours and appointments */}
      <div
        className="day-view-grid"
        style={{ minHeight: `${24 * rowHeightPx}px` }}
      >
        {/* Header */}
        <div className="day-view-date-header">
          {format(viewDate, "EEEE, MMMM d, yyyy")}
        </div>
        {/* Hour labels */}
        {hours.map((hour) => (
          <div
            key={hour}
            className="day-view-hour-label"
            style={{
              gridRow: `${hour + 2}`,
              height: `${rowHeightPx}px`,
              lineHeight: `${rowHeightPx}px`,
            }}
          >
            {formatHour(hour, timeFormat)}
          </div>
        ))}
        {/* Hour slots */}
        {hours.map((hour) => (
          <div
            key={`slot-${hour}`}
            className="day-view-hour-slot"
            style={{
              gridRow: `${hour + 2}`,
              height: `${rowHeightPx}px`,
              minHeight: `${rowHeightPx}px`,
              backgroundColor: isToday(viewDate) ? "#f5f9ff" : "transparent",
            }}
          />
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
          const groupLength = group.length || 1;
          const apptWidth = 100 / groupLength;
          const left = aIdx * apptWidth;

          return (
            <div
              key={`${appt.id}-${appt.date}-${gIdx}-${aIdx}`}
              className="day-view-appt-card"
              onClick={(e) => onAppointmentClick(appt, e)}
              style={{
                backgroundColor: appt.colorCode || "#ffcccb",
                top: `${top}px`,
                height: `${height}px`,
                left: `calc(${left}% + var(--day-hour-col-width, 80px) + 2px)`,
                width: `calc(${apptWidth}% - 6px)`,
                zIndex: 10 + aIdx,
              }}
            >
              <div className="day-view-appt-time">{timeRange}</div>
              <div className="day-view-appt-client">
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
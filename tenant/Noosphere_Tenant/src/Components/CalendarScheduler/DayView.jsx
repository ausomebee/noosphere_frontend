import React, { useRef } from "react";
import { format, isSameDay } from "date-fns";
import { CgChevronRight } from "react-icons/cg";

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
    <div 
      className="day-view-container" 
      ref={calendarRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        fontFamily: 'Arial, sans-serif',
        overflow: 'auto'
      }}
    >
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        tableLayout: 'fixed'
      }}>
        <thead>
          <tr style={{
            borderBottom: '1px solid #e0e0e0'
          }}>
            <th style={{
              width: '20%',
              padding: '10px',
              textAlign: 'left',
              fontWeight: 'bold',
              backgroundColor: '#f8f9fa',
              borderRight: '1px solid #e0e0e0'
            }}>All day</th>
            <th style={{
              padding: '10px',
              textAlign: 'center',
              fontWeight: 'bold',
              backgroundColor: '#f8f9fa'
            }}>{format(date, "d EEE")}</th>
          </tr>
        </thead>
        <tbody>
          {hours.map((hour) => (
            <tr key={hour} style={{
              borderBottom: '1px solid #e0e0e0'
            }}>
              <td style={{
                width: '20%',
                padding: '5px 10px',
                textAlign: 'left',
                fontSize: '12px',
                color: '#666',
                borderRight: '1px solid #e0e0e0',
                verticalAlign: 'top'
              }}>{formatHour(hour)}</td>
              <td style={{
                height: `${rowHeightPx}px`,
                verticalAlign: 'top'
              }}></td>
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
              style={{
                position: 'absolute',
                backgroundColor: appt.color || "#ffcccb",
                top: top,
                height: height,
                left: `calc(20% + 4px + ${apptIndex * groupWidth}%)`,
                width: `${groupWidth}%`,
                borderRadius: '6px',
                padding: '8px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#333',
                lineHeight: '1.2'
              }}>
                {timeRange}
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#222',
                textAlign: 'left',
                 display: 'flex',
                  marginTop: 'auto',
                  justifyContent: 'space-between',
                paddingTop: '6px',
                borderTop: '1px dashed rgba(0,0,0,0.1)',
                lineHeight: '1.2'
              }}>
                {appt.client || "Unknown Staff"} <CgChevronRight />
              </div>
            </div>
          );
        });
      })}
    </div>
  );
};

export default DayView;
import React, { useRef } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { CgChevronRight } from "react-icons/cg";

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
    const top = startHour * rowHeightPx + 40; // 40px for the header row
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
    <div 
      className="week-view-container" 
      ref={calendarRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        fontFamily: 'Arial, sans-serif',
        overflow: 'auto'
      }}
    >
      <div className="week-view-grid" style={{
        display: 'grid',
        gridTemplateColumns: '80px repeat(7, 1fr)',
        width: '100%'
      }}>
        <div style={{
          gridColumn: '1',
          gridRow: '1',
          padding: '10px',
          borderRight: '1px solid #e0e0e0',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#f8f9fa',
          fontWeight: 'bold'
        }}>All day</div>
        
        {days.map((day, index) => (
          <div
            key={day}
            style={{
              gridColumn: `${index + 2}`,
              gridRow: '1',
              padding: '10px',
              borderRight: index < 6 ? '1px solid #e0e0e0' : 'none',
              borderBottom: '1px solid #e0e0e0',
              backgroundColor: '#f8f9fa',
              fontWeight: 'bold',
              textAlign: 'center'
            }}
          >
            {format(day, "d EEE")}
          </div>
        ))}

        {hours.map((hour, hourIndex) => (
          <React.Fragment key={hour}>
            <div style={{
              gridColumn: '1',
              gridRow: `${hourIndex + 2}`,
              padding: '5px 10px',
              borderRight: '1px solid #e0e0e0',
              borderBottom: '1px solid #e0e0e0',
              fontSize: '12px',
              color: '#666'
            }}>{formatHour(hour)}</div>
            
            {days.map((day, dayIndex) => (
              <div
                key={`${day}-${hour}`}
                style={{
                  gridColumn: `${dayIndex + 2}`,
                  gridRow: `${hourIndex + 2}`,
                  borderRight: dayIndex < 6 ? '1px solid #e0e0e0' : 'none',
                  borderBottom: '1px solid #e0e0e0',
                  height: `${rowHeightPx}px`
                }}
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
          const startHour = Math.floor(
            start.getHours() + start.getMinutes() / 60
          );
          if (!groupedAppointments[startHour]) {
            groupedAppointments[startHour] = [];
          }
          groupedAppointments[startHour].push(appt);
        });

        return Object.entries(groupedAppointments).map(([startHour, appts]) => {
          const groupWidth = 90 / appts.length; // Split the column width
          return appts.map((appt, apptIndex) => {
            const start = new Date(appt.start);
            const end = new Date(appt.end);
            const { top, height } = calculatePositionAndHeight(
              start,
              end,
              rowHeightPx
            );
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
                  left: `calc(${dayIndex * (100/7)}% + 4px + ${apptIndex * (groupWidth/10)}%)`,
                  width: `${groupWidth/10}%`,
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
                  lineHeight: '1.2',
                  paddingBottom: '6px',
                  borderBottom: '1px solid rgba(0,0,0,0.1)'
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
                  borderTop: '1px solid rgba(0,0,0,0.1)',
                  lineHeight: '1.2'
                }}>
                  {appt.client || "Unknown Staff"} <CgChevronRight />
                </div>
              </div>
            );
          });
        });
      })}
    </div>
  );
};

export default WeekView;
import React, { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import './Scheduler.css'; // Import the CSS

const AppointmentDetailsModal = ({
  isOpen,
  onClose,
  appointment,
  position,
}) => {
  const modalRef = useRef(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isOpen || !appointment || !modalRef.current || !position) return;

    const modal = modalRef.current;
    const modalRect = modal.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let { x, y } = position;
    const modalWidth = modalRect.width;
    const modalHeight = modalRect.height;

    if (x + modalWidth > viewportWidth - 20) {
      x = x - modalWidth - 20;
    }
    if (x < 20) {
      x = 20;
    }

    if (y + modalHeight > viewportHeight - 20) {
      y = y - modalHeight - 20;
    }
    if (y < 20) {
      y = 20;
    }

    setAdjustedPosition({ x, y });
  }, [isOpen, appointment, position]);

  if (!isOpen || !appointment) return null;

  const startTime = format(new Date(appointment.start), "h:mma").toLowerCase();
  const endTime = format(new Date(appointment.end), "h:mma").toLowerCase();
  const timeRange = `${startTime} - ${endTime}`;

  return (
    <div
      ref={modalRef}
      className="modal-container"
      style={{
        top: `${adjustedPosition.y}px`,
        left: `${adjustedPosition.x}px`,
      }}
    >
      {/* Header */}
      <div className="modal-header">
        <h2 className="header-title">Appointment details</h2>
        <button onClick={onClose} className="close-button">✕</button>
      </div>

      {/* Body */}
      <div className="modal-body">
        <div className="details-container">
          {/* Client Name */}
          <div className="client-section">
            <div className="client-name">
              <h3 className="client-name-label">Client</h3>
              {appointment.client}
            </div>
            <div className="recurrence-badge">
              <span>Recurs every 2 weeks</span>
            </div>
          </div>

          {/* Details */}
          <div className="details-grid">
            <div className="detail-item">
              <p className="detail-row">
                <span className="bullet">•</span>
                <div className="detail-column">
                  <span className="detail-label">Therapist</span>
                  <span className="detail-value">{appointment.therapist || "Unknown Therapist"}</span>
                </div>
              </p>
              <p className="detail-row">
                <span className="bullet">•</span>
                <div className="detail-column">
                  <span className="detail-label">Service Location</span>
                  <span className="detail-value">{appointment.location || "34 Sunset Blvd Santa Cruz, US"}</span>
                </div>
              </p>
            </div>
            <div className="detail-item">
              <p className="detail-row">
                <span className="bullet">•</span>
                <div className="detail-column">
                  <span className="detail-label">Service Type</span>
                  <span className="detail-value">{appointment.serviceType || "H 123.4"}</span>
                </div>
              </p>
              <p className="detail-row">
                <span className="bullet">•</span>
                <div className="detail-column">
                  <span className="detail-label">Therapy Room</span>
                  <span className="detail-value">{appointment.room || "10"}</span>
                </div>
              </p>
            </div>
            <div className="detail-item">
              <p className="detail-row">
                <span className="bullet">•</span>
                <div className="detail-column">
                  <span className="detail-label">Session Type</span>
                  <span className="detail-value">{appointment.sessionType || "Group Training"}</span>
                </div>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="modal-footer">
        <button onClick={onClose} className="footer-button cancel-button">
          <span className="cancel-icon">✕</span>
          Cancel
        </button>
        <button className="footer-button reschedule-button">
          <i className="fa-solid fa-rotate reschedule-icon"></i>
          Reschedule
        </button>
        <button className="footer-button start-button">
          Start Appointment
        </button>
      </div>
    </div>
  );
};

export default AppointmentDetailsModal;
import React from "react";
import "./AppointmentDetailsModal.css";
import { FiRefreshCw } from "react-icons/fi";
import { format, parse, isValid } from "date-fns";
import { RxCross2 } from "react-icons/rx";
import Button from "../../Button/Button";

const AppointmentDetailsModal = ({
  isOpen,
  onClose,
  appointment,
  onReschedule,
}) => {
  if (!isOpen || !appointment) return null;

  const parseTime = (timeStr, dateStr) => {
    const defaultDate = new Date();
    if (
      !timeStr ||
      !dateStr ||
      typeof timeStr !== "string" ||
      typeof dateStr !== "string"
    ) {
      return defaultDate;
    }

    try {
      const normalizedTime = timeStr.replace(/:\d{2}$/, "");
      const parsedDate = parse(
        `${dateStr} ${normalizedTime}`,
        "yyyy-MM-dd HH:mm",
        new Date()
      );
      if (!isValid(parsedDate)) {
        return defaultDate;
      }
      return parsedDate;
    } catch (error) {
      const [h, m] = timeStr.split(":");
      const d = new Date(dateStr);
      if (!isValid(d)) {
        return defaultDate;
      }
      d.setHours(Number(h) || 0, Number(m?.slice(0, 2)) || 0, 0, 0);
      return isValid(d) ? d : defaultDate;
    }
  };

  const start = parseTime(appointment.startTime, appointment.date);
  const end = parseTime(appointment.endTime, appointment.date);
  const startTime = isValid(start) ? format(start, "h:mm a") : "Invalid Time";
  const endTime = isValid(end) ? format(end, "h:mm a") : "Invalid Time";
  const timeRange = `${startTime} - ${endTime}`;
  const dateDisplay =
    appointment.date && isValid(new Date(appointment.date))
      ? format(new Date(appointment.date), "MM/dd/yyyy")
      : "Invalid Date";

  const getRecurrenceDescription = () => {
    if (!appointment.isRecurring || !appointment.recurrence)
      return "Does not repeat";
    const r = appointment.recurrence;
    if (r.type === "day")
      return r.interval
        ? `Every ${r.interval} days`
        : `Daily${
            r.endType === "after"
              ? ` for ${r.occurrences} occurrences`
              : r.endOn && isValid(new Date(r.endOn))
              ? ` until ${format(new Date(r.endOn), "MM/dd/yyyy")}`
              : ""
          }`;
    if (r.type === "week")
      return `Weekly on ${(r.days || []).join(", ")}${
        r.endType === "on" && r.endOn && isValid(new Date(r.endOn))
          ? ` until ${format(new Date(r.endOn), "MM/dd/yyyy")}`
          : ""
      }`;
    if (r.type === "month")
      return `Monthly on day ${r.day || 1}${
        r.endType === "after"
          ? ` for ${r.occurrences} occurrences`
          : r.endOn && isValid(new Date(r.endOn))
          ? ` until ${format(new Date(r.endOn), "MM/dd/yyyy")}`
          : ""
      }`;
    return "Custom Recurrence";
  };

  return (
    <div className="appointment-details-overlay" onClick={onClose}>
      <div
        className="appointment-details-modal"
        onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside
      >
        {/* Header */}
        <div className="modal-header">
          <h2 className="details-modal-title">Appointment details</h2>
          <button onClick={onClose} className="close-button">
            <RxCross2 size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <div className="client-section">
            <div className="client-name">
              <h3 className="client-name-label">Client</h3>
              {appointment.clientName || "Unknown Client"}
            </div>
            <div className="appointment-frequency-section">
              <h3 className="appointment-frequency-label">
                Appointment Frequency
              </h3>
              <div className="recurrence-badge">
                <span>{getRecurrenceDescription()}</span>
              </div>
            </div>
          </div>

          <div className="details-grid">
            <div className="detail-item">
              <div className="detail-row">
                <span className="bullet">•</span>
                <div className="detail-column">
                  <div className="detail-label">Clinician(s)</div>
                  <div className="detail-value">
                    {appointment.clinicianNames?.join(", ") || "Not assigned"}
                  </div>
                </div>
              </div>
              <div className="detail-row">
                <span className="bullet">•</span>
                <div className="detail-column">
                  <div className="detail-label">Date and Time</div>
                  <div className="detail-value">
                    {appointment.dateDisplay} • {appointment.timeRange}
                  </div>
                </div>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-row">
                <span className="bullet">•</span>
                <div className="detail-column">
                  <div className="detail-label">Service Type</div>
                  <div className="detail-value">
                    {appointment.serviceTypes || "Not specified"}
                  </div>
                </div>
              </div>
              <div className="detail-row">
                <span className="bullet">•</span>
                <div className="detail-column">
                  <div className="detail-label">Service Location</div>
                  <div className="detail-value">
                    {appointment.serviceLocation || "Clinic"}
                  </div>
                </div>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-row">
                <span className="bullet">•</span>
                <div className="detail-column">
                  <div className="detail-label">Session Type</div>
                  <div className="detail-value">
                    {appointment.sessionName || "Group Training"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="details-modal-footer">
          <Button
       className="w-full"
            label="Request Reschedule"
            icon={<FiRefreshCw size={18} />}
            variant="secondary"
            onClick={() => onReschedule(appointment)}
          />
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetailsModal;

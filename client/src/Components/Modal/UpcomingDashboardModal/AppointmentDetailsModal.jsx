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

  // Extract data from the API response structure
  const appointmentData = appointment.originalData || appointment;

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
      // The API sends "HH:MM" (and sometimes "HH:MM:SS"). Trimming with a
      // trailing-group regex ate the MINUTES off "16:07", so every time fell
      // back to "now" — match the parts explicitly instead.
      const parts = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
      if (!parts) return defaultDate;
      const normalizedTime = `${parts[1].padStart(2, "0")}:${parts[2]}`;
      const parsedDate = parse(
        `${dateStr} ${normalizedTime}`,
        "yyyy-MM-dd HH:mm",
        new Date()
      );
      if (!isValid(parsedDate)) {
        return defaultDate;
      }
      return parsedDate;
    } catch {
      const [h, m] = timeStr.split(":");
      const d = new Date(dateStr);
      if (!isValid(d)) {
        return defaultDate;
      }
      d.setHours(Number(h) || 0, Number(m?.slice(0, 2)) || 0, 0, 0);
      return isValid(d) ? d : defaultDate;
    }
  };

  // Parse date and time from API response
  const appointmentDate = appointmentData.date || new Date().toISOString().split('T')[0];
  const startTimeStr = appointmentData.startTime || "00:00";
  const endTimeStr = appointmentData.endTime || "00:00";

  const start = parseTime(startTimeStr, appointmentDate);
  const end = parseTime(endTimeStr, appointmentDate);
  const startTime = isValid(start) ? format(start, "h:mm a") : "Invalid Time";
  const endTime = isValid(end) ? format(end, "h:mm a") : "Invalid Time";
  const timeRange = `${startTime} - ${endTime}`;
  const dateDisplay = appointmentDate && isValid(new Date(appointmentDate))
    ? format(new Date(appointmentDate), "MM/dd/yyyy")
    : "Invalid Date";

  // Extract client information
  const clientName = appointmentData.client
    ? `${appointmentData.client.firstName} ${appointmentData.client.lastName}${
        appointmentData.client.preferredName 
          ? ` (${appointmentData.client.preferredName})` 
          : ""
      }`
    : appointment.clientName || "Unknown Client";

  // Extract clinician names
  const clinicianNames = appointmentData.clinicians
    ? appointmentData.clinicians.map(c => c.fullName).join(", ")
    : appointment.clinician || "Not assigned";

  // Extract service types
  const serviceTypes = appointmentData.appointmentServices
    ? appointmentData.appointmentServices
        .map(service => {
          const code = service.serviceCode?.code || "";
          const description = service.serviceCode?.description || "";
          return `${code}${description ? ` - ${description}` : ""}`;
        })
        .join(", ")
    : appointment.serviceType || "Not specified";

  // Extract session information
  const sessionName = appointmentData.session?.name || appointment.sessionType || "Group Training";
  const serviceLocation = appointmentData.serviceLocation || appointment.serviceLocation || "Clinic";

  const getRecurrenceDescription = () => {
    if (!appointmentData.isRecurring || !appointmentData.recurrence)
      return "Does not repeat";
    
    const r = appointmentData.recurrence;
    
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
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="modal-header">
          <h2 className="details-modal-title">Appointment details</h2>
          <button onClick={onClose} className="close-button" aria-label="Close appointment details">
            <RxCross2 size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <div className="client-section">
            <div className="client-name">
              <h3 className="client-name-label">Client</h3>
              {clientName}
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
                    {clinicianNames}
                  </div>
                </div>
              </div>
              <div className="detail-row">
                <span className="bullet">•</span>
                <div className="detail-column">
                  <div className="detail-label">Date and Time</div>
                  <div className="detail-value">
                    {dateDisplay} • {timeRange}
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
                    {serviceTypes}
                  </div>
                </div>
              </div>
              <div className="detail-row">
                <span className="bullet">•</span>
                <div className="detail-column">
                  <div className="detail-label">Service Location</div>
                  <div className="detail-value">
                    {serviceLocation}
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
                    {sessionName}
                  </div>
                </div>
              </div>
              {appointmentData.requiresTravel !== undefined && (
                <div className="detail-row">
                  <span className="bullet">•</span>
                  <div className="detail-column">
                    <div className="detail-label">Requires Travel</div>
                    <div className="detail-value">
                      {appointmentData.requiresTravel ? "Yes" : "No"}
                    </div>
                  </div>
                </div>
              )}
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
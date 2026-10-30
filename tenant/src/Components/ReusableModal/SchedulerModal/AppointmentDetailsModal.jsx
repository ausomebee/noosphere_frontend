import React, {
  useRef,
  useMemo,
  useEffect,
  useState,
  useCallback,
} from "react";
import Button from "../../Button/Button";
import { RxCross2 } from "react-icons/rx";
import { FiRefreshCw, FiEdit2 } from "react-icons/fi";
import { format, isValid } from "date-fns";
import { useNavigate } from "react-router-dom";

import { showToast } from "../../../Helper/ShowToast";
const AppointmentDetailsModal = ({
  isOpen,
  onClose,
  appointment,
  position,
  onEdit,
  onReschedule,
  onCancel,
  canStart = false,
}) => {
  const modalRef = useRef(null);
  const [modalSize, setModalSize] = useState({ width: 0, height: 0 });
  const navigate = useNavigate();

  
const splitId = useCallback((id) => {
  if (!id) return { uuid: null, timestamp: null };
  if (!id.includes("_")) return { uuid: id, timestamp: null };
  const [uuid, timestamp] = id.split("_");
  return { uuid, timestamp };
}, []);

  // Measure modal size after render
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      setModalSize({ width: rect.width, height: rect.height });
    }
  }, [isOpen]);

  const adjustedPosition = useMemo(() => {
    if (!isOpen || !appointment || !position || !position.x || !position.y) {
      return { x: 50, y: 50 };
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Convert click position to pixels
    const clickX = position.x;
    const clickY = position.y;

    // Use measured modal size or fallback
    const modalWidth = modalSize.width || 400; // fallback width
    const modalHeight = modalSize.height || 300; // fallback height

    const offset = 10; // pixel offset from click position

    // Calculate initial position (below and right of click)
    let x = clickX + offset;
    let y = clickY + offset;

    // Check right boundary
    if (x + modalWidth > vw) {
      x = clickX - modalWidth - offset; // position to the left
    }

    // Check bottom boundary
    if (y + modalHeight > vh) {
      y = clickY - modalHeight - offset; // position above
    }

    // Ensure modal stays within viewport
    x = Math.max(0, Math.min(x, vw - modalWidth));
    y = Math.max(0, Math.min(y, vh - modalHeight));

    // Convert back to viewport units for styling
    return {
      x: (x / vw) * 100,
      y: (y / vh) * 100,
    };
  }, [isOpen, appointment, position, modalSize]);

  if (!isOpen || !appointment) return null;

  // Parse and format start and end times
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


// Updated handler
const handleStartAppointment = () => {
  if (!appointment?.id || !appointment?.clientId) {
    showToast("Missing appointment or client ID", "error");
    return;
  }

  const { uuid: appointmentUuid } = splitId(appointment.id);

  if (!appointmentUuid) {
    showToast("Invalid appointment ID", "error");
    return;
  }

  // Use only the clean UUID part
  navigate(`/appointments/start/${appointmentUuid}/${appointment.clientId}`);
};
  return (
    <div
      ref={modalRef}
      className="appointment-modal-container"
      style={{
        position: "fixed",
        top: `${adjustedPosition.y}vh`,
        left: `${adjustedPosition.x}vw`,
        transform: "none",
        zIndex: 1000,
        maxWidth: "min(700px, 90vw)", // Better responsive handling
        maxHeight: "min(500px, 90vh)",
        overflow: "auto",
        boxSizing: "border-box",
      }}
    >
      {/* Rest of your JSX remains the same */}
      <div className="modal-header">
        <h2 className="header-title">Appointment Details</h2>
        <button onClick={onClose} className="close-button">
          <RxCross2 size={20} />
        </button>
      </div>

      <div className="modal-body">
        <div className="details-container">
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
                  <span className="detail-label">Therapist</span>
                  <span className="detail-value">
                    {appointment.clinicianNames?.join(", ") ||
                      "Unknown Therapist"}
                  </span>
                </div>
              </div>
              <div className="detail-row">
                <span className="bullet">•</span>
                <div className="detail-column">
                  <span className="detail-label">Service Location</span>
                  <span className="detail-value">
                    {appointment.serviceLocation || "Not specified"}
                  </span>
                </div>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-row">
                <span className="bullet">•</span>
                <div className="detail-column">
                  <span className="detail-label">Service Type</span>
                  <span className="detail-value">
                    {appointment.service
                      ?.map((svc) => {
                        const mod = svc.modifierType
                          ? ` (${svc.modifierType})`
                          : "";
                        return `${svc.serviceType}${mod}`;
                      })
                      .join(", ") || "Not specified"}
                  </span>
                </div>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-row">
                <span className="bullet">•</span>
                <div className="detail-column">
                  <span className="detail-label">Session Type</span>
                  <span className="detail-value">
                    {appointment.sessionName || "Unknown Session"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="appointment-modal-footer">
        {onCancel && (
          <div className="flex-1">
            <Button
              label="Cancel"
              icon={<RxCross2 size={20} color="#D92D20" />}
              variant="secondary-danger"
              width="w-full"
              onClick={() => onCancel(appointment)}
            />
          </div>
        )}
        {onReschedule && (
          <div className="flex-1">
            <Button
              label="Reschedule"
              icon={<FiRefreshCw size={20} />}
              variant="secondary"
              width="w-full"
              onClick={() => onReschedule(appointment)}
            />
          </div>
        )}
        {onEdit && (
          <div className="flex-1">
            <Button
              label="Edit"
              icon={<FiEdit2 size={20} />}
              variant="secondary"
              width="w-full"
              onClick={() => onEdit(appointment)}
            />
          </div>
        )}
        {canStart && (
          <div className="flex-1">
            <Button
              label="Start Appointment"
              variant="primary"
              width="w-full"
              onClick={handleStartAppointment}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentDetailsModal;

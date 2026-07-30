import React from "react";
import { format } from "date-fns";
import ReusableModal from "../ReusableModal";

/**
 * Read-only appointment details, opened from a notification. Works for any
 * appointment row shape (Upcoming/Past) — reads generic display fields with
 * safe fallbacks, so it never renders a half-populated edit form.
 */
const Field = ({ label, value }) => (
  <div>
    <p className="text-sm text-gray-400">{label}</p>
    <p className="font-semibold text-gray-700">{value || "—"}</p>
  </div>
);

const fmtDate = (d) => {
  if (!d) return "—";
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return String(d);
  try {
    return format(parsed, "MMM dd, yyyy");
  } catch {
    return String(d);
  }
};

const AppointmentViewModal = ({
  isOpen,
  onClose,
  appointment,
  primaryLabel,
  onPrimary,
}) => {
  if (!isOpen || !appointment) return null;

  const serviceTypes =
    (Array.isArray(appointment.serviceTypes) && appointment.serviceTypes.length
      ? appointment.serviceTypes.join(", ")
      : appointment.serviceType) || "—";

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Appointment details"
      size="md"
      secondaryButtonText="Close"
      onSecondaryButtonClick={onClose}
      primaryButtonText={primaryLabel}
      onPrimaryButtonClick={onPrimary}
    >
      <div className="p-2 grid grid-cols-2 gap-4">
        <Field label="Client" value={appointment.clientName} />
        <Field label="Clinician(s)" value={appointment.therapistName} />
        <Field label="Date" value={fmtDate(appointment.date || appointment.dateTime)} />
        <Field label="Time" value={appointment.time} />
        <Field label="Service Type(s)" value={serviceTypes} />
        <Field label="Session Type" value={appointment.sessionType} />
      </div>
    </ReusableModal>
  );
};

export default AppointmentViewModal;

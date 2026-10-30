import React from "react";
import { format } from "date-fns";
import ReusableModal from "../ReusableModal";
import Button from "../../Button/Button";

/**
 * Read-only details for a past (completed) appointment, opened from a
 * notification. Shows the appointment summary and leads onward to the
 * timesheet (the natural next step for a completed appointment).
 */
const renderValue = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return [v.date, v.time].filter(Boolean).join(" · ") || "—";
  return v;
};

const Field = ({ label, value }) => (
  <div>
    <p className="text-sm text-gray-400">{label}</p>
    <p className="font-semibold text-gray-700">{renderValue(value)}</p>
  </div>
);

const formatDate = (d) => {
  if (!d) return "—";
  try {
    return format(new Date(d), "MMM dd, yyyy");
  } catch {
    return d;
  }
};

const PastAppointmentDetailsModal = ({
  isOpen,
  onClose,
  appointment,
  onViewTimesheet,
}) => {
  if (!isOpen || !appointment) return null;

  const serviceTypes =
    (Array.isArray(appointment.serviceTypes) && appointment.serviceTypes.length
      ? appointment.serviceTypes.join(", ")
      : appointment.serviceType) || "—";

  return (
    <ReusableModal isOpen={isOpen} onClose={onClose} title="Appointment details" size="md">
      <div className="p-2 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Client" value={appointment.clientName} />
          <Field label="Clinician(s)" value={appointment.therapistName} />
          <Field label="Date" value={formatDate(appointment.dateTime)} />
          <Field label="Time" value={appointment.time} />
          <Field label="Service Type(s)" value={serviceTypes} />
          <Field label="Session Type" value={appointment.sessionType} />
        </div>

        <div className="flex justify-end pt-2">
          <Button label="View Timesheet" variant="primary" onClick={onViewTimesheet} />
        </div>
      </div>
    </ReusableModal>
  );
};

export default PastAppointmentDetailsModal;

import React from "react";
import { format } from "date-fns";
import { RxCross2 } from "react-icons/rx";
import { FiEdit, FiRefreshCw } from "react-icons/fi";
import { IoCheckmarkCircleOutline } from "react-icons/io5";
import ReusableModal from "../ReusableModal";
import Button from "../../Button/Button";

/**
 * Read-only appointment details, opened from a notification. Works for any
 * appointment row shape (Upcoming/Past) — reads generic display fields with
 * safe fallbacks, so it never renders a half-populated edit form.
 *
 * Dismiss via the top ✕ or by clicking the backdrop. Each of the action
 * callbacks (start/edit/reschedule/cancel) that is provided renders a button;
 * the caller gates them by permission.
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
  onStart,
  onEdit,
  onReschedule,
  onCancel,
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
      showClose
      closeOnOverlayClick
    >
      <div className="p-2 grid grid-cols-2 gap-4">
        <Field label="Client" value={appointment.clientName} />
        <Field label="Clinician(s)" value={appointment.therapistName} />
        <Field label="Date" value={fmtDate(appointment.date || appointment.dateTime)} />
        <Field label="Time" value={appointment.time} />
        <Field label="Service Type(s)" value={serviceTypes} />
        <Field label="Session Type" value={appointment.sessionType} />
      </div>

      {(onStart || onEdit || onReschedule || onCancel) && (
        <div className="flex flex-col gap-3 mt-6 p-2">
          {onStart && (
            <Button
              label="Start appointment"
              variant="primary"
              icon={<IoCheckmarkCircleOutline />}
              className="w-full"
              onClick={onStart}
            />
          )}
          {onEdit && (
            <Button
              label="Edit appointment"
              variant="secondary"
              icon={<FiEdit />}
              className="w-full"
              onClick={onEdit}
            />
          )}
          {onReschedule && (
            <Button
              label="Reschedule appointment"
              variant="secondary"
              icon={<FiRefreshCw />}
              className="w-full"
              onClick={onReschedule}
            />
          )}
          {onCancel && (
            <Button
              label="Cancel appointment"
              variant="secondary-danger"
              icon={<RxCross2 />}
              className="w-full"
              onClick={onCancel}
            />
          )}
        </div>
      )}
    </ReusableModal>
  );
};

export default AppointmentViewModal;

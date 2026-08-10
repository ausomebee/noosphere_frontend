import React from "react";
import ReusableModal from "../ReusableModal";
import Button from "../../Button/Button";
import { IoCheckmarkCircleOutline } from "react-icons/io5";
import { RxCross2 } from "react-icons/rx";
import { FiEdit } from "react-icons/fi";

/**
 * Compact reschedule-request viewer opened from a notification. Shows the
 * request and the same three actions as the Reschedule Requests table row:
 * Accept, Modify, Reject. Each button delegates to the page's existing
 * handlers (so behaviour stays identical to the table).
 */
// Render any value safely — some row fields (prev/new date & time) are
// { date, time } objects, which can't be rendered directly as React children.
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

const RescheduleRequestActionModal = ({
  isOpen,
  onClose,
  request,
  onApprove,
  onModify,
  onReject,
}) => {
  if (!isOpen || !request) return null;

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Reschedule request"
      size="lg"
      showClose
      closeOnOverlayClick
    >
      <div className="p-2 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Client" value={request.clientName} />
          <Field label="Clinician(s)" value={request.therapistName} />
          <Field label="Previous date & time" value={request.prevDateTime} />
          <Field label="Requested date & time" value={request.newDateTime} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            label="Reject"
            variant="secondary-danger"
            icon={<RxCross2 size={18} />}
            className="flex-1 min-w-0"
            onClick={onReject}
          />
          <Button
            label="Modify"
            variant="secondary"
            icon={<FiEdit size={18} />}
            className="flex-1 min-w-0"
            onClick={onModify}
          />
          <Button
            label="Accept"
            variant="secondary-success"
            icon={<IoCheckmarkCircleOutline size={18} />}
            className="flex-1 min-w-0"
            onClick={onApprove}
          />
        </div>
      </div>
    </ReusableModal>
  );
};

export default RescheduleRequestActionModal;

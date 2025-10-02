import React from 'react';
import DeleteConfirmationModal from '../PipelineModal/DeleteConfirmationModal';


const RejectConfirmationModal = ({ isOpen, onClose, onConfirm, appointments }) => {
  const title = appointments.length > 1 ? "Reject Reschedule Requests" : "Reject Reschedule Request";
  const message = appointments.length > 1 
    ? `Are you sure you want to reject ${appointments.length} reschedule requests?`
    : `Are you sure you want to reject the reschedule request for ${appointments[0]?.clientName}?`;

  // SVG icon for warning (orange color, not red)
  const WarningIcon = () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2L2 19H22L12 2Z"
        fill="#000"
        stroke="#000"
        strokeWidth="2"
      />
      <path
        d="M12 8V12"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16" r="1" fill="white" />
    </svg>
  );

  return (
    <DeleteConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => onConfirm({ appointments })}
      title={title}
      message={message}
      confirmButtonText="Reject"
      confirmButtonColor="#004aba"
      icon={WarningIcon}
      showConfirmButton={true}
      showSecondaryButton={true}
    />
  );
};

export default RejectConfirmationModal;
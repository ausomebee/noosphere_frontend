import React from 'react';
import ReusableModal from './ReusableModal';
import { IoMdAlert } from "react-icons/io";

const ToggleActiveModal = ({
  isOpen,
  onClose,
  onConfirm,
  featureName,
  currentState,
}) => {
  const newState = !currentState; // Toggle the current state
  const actionText = newState ? "enable" : "disable";

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      primaryButtonText={actionText.charAt(0).toUpperCase() + actionText.slice(1)} // "Enable" or "Disable"
      secondaryButtonText="Cancel"
      primaryButtonColor="#000000" // Black for both enable and disable to match the image
      secondaryButtonColor="#ffffff"
      onPrimaryButtonClick={() => onConfirm(newState)}
      onSecondaryButtonClick={onClose}
      showPrimaryButton={true}
      showSecondaryButton={true}
    >
      <div className="delete-confirmation-content">
        <IoMdAlert className="warning-icon" style={{ color: "#000000" }} /> {/* Black icon */}
        <h3>Are you sure</h3>
        <p>Are you sure you want to {actionText} this feature?</p>
      </div>
    </ReusableModal>
  );
};

export default ToggleActiveModal;
import React from 'react';
import ReusableModal from './ReusableModal';
import { IoMdAlert } from "react-icons/io";
import "./ReusableModal.css";

const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText,
  confirmButtonColor,
  confirmButtonLoading = false,
  showConfirmButton = true,
  showSecondaryButton = true, 
  icon: IconComponent, 
}) => {
  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      primaryButtonText={confirmButtonText}
      primaryButtonLoading={confirmButtonLoading}
      secondaryButtonText="Cancel"
      primaryButtonColor={confirmButtonColor}
      secondaryButtonColor="#ffffff"
      onPrimaryButtonClick={onConfirm}
      onSecondaryButtonClick={onClose}
      showPrimaryButton={showConfirmButton}
      showSecondaryButton={showSecondaryButton}
      footerClassName={
        showConfirmButton && !showSecondaryButton
          ? 'center-footer'
          : !showConfirmButton && showSecondaryButton
          ? 'center-footer'
          : ''
      }
    >
      <div className="delete-confirmation-content">
        {IconComponent ? (
          <IconComponent className="warning-icon" />
        ) : (
          <IoMdAlert className="warning-icon" />
        )}
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
    </ReusableModal>
  );
};

export default DeleteConfirmationModal;
import React from 'react';
import ReusableModal from '../ReusableModal';
import { IoMdAlert } from "react-icons/io";


const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText,
  confirmButtonColor,
  showConfirmButton = true,
  showSecondaryButton = true,
  icon: IconComponent,
  loading = false,
}) => {
  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      primaryButtonText={confirmButtonText}
      secondaryButtonText="Cancel"
      primaryButtonColor={confirmButtonColor}
      secondaryButtonColor="#ffffff"
      onPrimaryButtonClick={onConfirm}
      onSecondaryButtonClick={onClose}
      primaryButtonLoading={loading}
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
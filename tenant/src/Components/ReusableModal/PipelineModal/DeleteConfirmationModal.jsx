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
      {/* Self-contained styling (Tailwind) so the modal looks correct on every
          page — it previously relied on CSS that only the JiraBoard imported. */}
      <div className="delete-confirmation-content flex flex-col items-center text-center px-4 py-2">
        {IconComponent ? (
          <IconComponent className="warning-icon text-5xl text-gray-800 mb-3" />
        ) : (
          <IoMdAlert className="warning-icon text-5xl text-gray-800 mb-3" />
        )}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-2">{message}</p>
      </div>
    </ReusableModal>
  );
};

export default DeleteConfirmationModal;
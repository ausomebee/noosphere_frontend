import React, { useState } from "react";
import ReusableModal from "../ReusableModal";

const DeleteModal = ({ isOpen, onClose, title, message, icon, onConfirm }) => {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      primaryButtonText="Delete"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handle}
      onSecondaryButtonClick={onClose}
      primaryButtonColor="#D92D20"
      size="small"
      primaryButtonLoading={loading}
    >
      <div className="text-center">
        {icon && <div className="flex justify-center mb-5">{icon}</div>}
        {title && <h2 className="text-xl mb-4">{title}</h2>}
        {message && <p className="text-gray-600 mb-16">{message}</p>}
      </div>
    </ReusableModal>
  );
};

export default DeleteModal;
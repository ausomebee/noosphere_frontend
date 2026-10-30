import React, { useState } from "react";            // 👈 add useState
import ReusableModal from "../ReusableModal";
import { CgDanger } from "react-icons/cg";

const DeleteLibraryModal = ({ isOpen, onClose, onDelete, rowData }) => {
  const [deleting, setDeleting] = useState(false); // 👈 loading flag

  const handleDelete = async () => {
    setDeleting(true);                             // 👈 start spinner
    try {
      await onDelete(rowData);
    } finally {
      setDeleting(false);                          // 👈 stop spinner
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
      onPrimaryButtonClick={handleDelete}
      onSecondaryButtonClick={onClose}
      primaryButtonColor="#D92D20"
      size="small"
      primaryButtonLoading={deleting}              // 👈 pass loading prop
    >
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="flex items-center justify-center mb-4">
            <CgDanger color="red" size={48} />
          </div>
        </div>
        <h2 className="text-xl mb-4">Delete this library?</h2>
        <p className="text-gray-600 mb-16">
          All associated programs and targets will be lost. This action cannot
          be undone.
        </p>
      </div>
    </ReusableModal>
  );
};

export default DeleteLibraryModal;
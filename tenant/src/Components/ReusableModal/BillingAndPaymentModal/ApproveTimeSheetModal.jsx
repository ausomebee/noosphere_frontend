// ApproveTimeSheetModal.js
import React from "react";
import ReusableModal from "../ReusableModal";
import { useForm } from "react-hook-form";
import { showToast } from "../../../Helper/ShowToast";

import { showValidationErrors } from "../../../Helper/formErrors";
const ApproveTimeSheetModal = ({ isOpen, onClose, onSave }) => {
  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm();

  const handleSave = async () => {
    try {
      await onSave();
      reset();
      onClose();
    } catch (error) {
      console.error("Error approving timesheet:", error);
      showToast("Failed to approve timesheet", "error");
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      primaryButtonText="Approve"
      secondaryButtonText="Cancel"
      primaryButtonDisabled={isSubmitting}
      onPrimaryButtonClick={handleSubmit(handleSave, showValidationErrors)}
      onSecondaryButtonClick={() => {
        reset();
        onClose();
      }}
      size="md"
      primaryButtonLoading={isSubmitting}
      
    >
      <div className="mb-6 space-y-4 text-center ">
        <span className="items-center justify-center flex">
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M24 4C12.96 4 4 12.96 4 24C4 35.04 12.96 44 24 44C35.04 44 44 35.04 44 24C44 12.96 35.04 4 24 4ZM24 40C15.18 40 8 32.82 8 24C8 15.18 15.18 8 24 8C32.82 8 40 15.18 40 24C40 32.82 32.82 40 24 40ZM31.76 16.58L20 28.34L16.24 24.58C15.46 23.8 14.2 23.8 13.42 24.58C12.64 25.36 12.64 26.62 13.42 27.4L18.6 32.58C19.38 33.36 20.64 33.36 21.42 32.58L34.6 19.4C35.38 18.62 35.38 17.36 34.6 16.58C33.82 15.8 32.54 15.8 31.76 16.58Z"
              fill="#039855"
            />
          </svg>
        </span>
        <h2 className="text-gray-550">Confirm Timesheet Approval</h2>
        <p className="text-gray-550">Are you sure you want to approve this timesheet and convert it to a claim?</p>
      </div>
    </ReusableModal>
  );
};

export default ApproveTimeSheetModal;
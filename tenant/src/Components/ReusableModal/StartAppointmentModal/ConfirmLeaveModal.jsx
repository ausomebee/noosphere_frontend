import React from "react";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";

const ConfirmLeaveModal = ({ isOpen, onClose, onConfirm }) => (
  <ReusableModal
    isOpen={isOpen}
    onClose={onClose}
    primaryButtonText="Leave anyway"
    secondaryButtonText="cancel"
    onPrimaryButtonClick={onConfirm}
    onSecondaryButtonClick={onClose}
    primaryButtonColor="#D92D20"
    size="md"
  >
    <div className="text-center">
      <div className="flex justify-center mb-5">
        <svg
          width="56"
          height="56"
          viewBox="0 0 56 56"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="4" y="4" width="48" height="48" rx="24" fill="#FEE4E2" />
          <rect
            x="4"
            y="4"
            width="48"
            height="48"
            rx="24"
            stroke="#FEF3F2"
            stroke-width="8"
          />
          <path
            d="M28 24V28M28 32H28.01M38 28C38 33.5228 33.5228 38 28 38C22.4772 38 18 33.5228 18 28C18 22.4772 22.4772 18 28 18C33.5228 18 38 22.4772 38 28Z"
            stroke="#D92D20"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <h2 className="text-xl mb-4">Are you sure you want to go back?</h2>
      <p className="text-gray-600 mb-16">
        Review your data carefully before leaving. Once you exit, this
        appointment will be automatically marked as completed.
      </p>
    </div>
  </ReusableModal>
);

export default ConfirmLeaveModal;

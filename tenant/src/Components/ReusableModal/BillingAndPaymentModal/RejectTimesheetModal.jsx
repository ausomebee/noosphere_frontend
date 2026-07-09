// RejectTimeSheetModal.js
import React from "react";
import ReusableModal from "../ReusableModal";
import { TextareaInput } from "../../Input/Inputs";
import { useForm } from "react-hook-form";
import { showToast } from "../../../Helper/ShowToast";

const RejectTimeSheetModal = ({ isOpen, onClose, onSave }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    defaultValues: {
      reason: "",
    },
  });

  const handleSave = async (data) => {
    try {
      await onSave(data);
      reset();
      onClose();
    } catch (error) {
      console.error("Error rejecting timesheet:", error);
      showToast("Failed to reject timesheet", "error");
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      primaryButtonDisabled={isSubmitting}
      onPrimaryButtonClick={handleSubmit(handleSave)}
      onSecondaryButtonClick={() => {
        reset();
        onClose();
      }}
      size="md"
      primaryButtonLoading={isSubmitting}
     
    >
      <div className="mb-6 space-y-4 text-center">
        <span className="items-center justify-center flex">
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20 0C8.96 0 0 8.96 0 20C0 31.04 8.96 40 20 40C31.04 40 40 31.04 40 20C40 8.96 31.04 0 20 0ZM22 30H18V26H22V30ZM22 22H18V10H22V22Z"
              fill="#F04438"
            />
          </svg>
        </span>
        <h2 className="text-orange-400">
          Are you sure you want to reject this Timesheet?
        </h2>
        <p className="text-gray-550 mb-6">
          You will not be able to claim payment for any work recorded in this
          period. Please provide a rejection reason to continue
        </p>
        <TextareaInput
          label="Rejection Reason"
          {...register("reason", {
            required: "Rejection reason is required",
            minLength: {
              value: 10,
              message: "Reason must be at least 10 characters long",
            },
          })}
          error={errors.reason?.message}
          placeholder="Enter rejection reason"
        />
      </div>
    </ReusableModal>
  );
};
export default RejectTimeSheetModal;

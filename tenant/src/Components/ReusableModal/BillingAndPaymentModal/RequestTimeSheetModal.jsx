// RequestTimeSheetModal.js
import React from 'react';
import ReusableModal from '../ReusableModal';
import { TextareaInput } from '../../Input/Inputs';
import { useForm } from 'react-hook-form';

const RequestTimeSheetModal = ({ isOpen, onClose, onSave }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      request: "",
    },
  });

  const handleSave = async (data) => {
    try {
      await onSave(data);
      reset();
      onClose();
    } catch (error) {
      console.error("Error requesting update:", error);
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Request Timesheet Update"
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
      <div className="mt-5 space-y-4">
        <TextareaInput
          label="Describe your request"
          {...register("request", {
            required: "Request description is required",
            minLength: {
              value: 10,
              message: "Request must be at least 10 characters long",
            },
          })}
          error={errors.request?.message}
          placeholder="Enter your request details"
        />
      </div>
    </ReusableModal>
  );
};

export default RequestTimeSheetModal;
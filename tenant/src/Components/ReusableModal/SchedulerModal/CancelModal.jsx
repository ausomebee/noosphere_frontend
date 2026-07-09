import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import ReusableModal from "../ReusableModal";
import { TextareaInput } from "../../Input/Inputs";
import { showToast } from "../../../Helper/ShowToast";

const validationSchema = Yup.object({
  reason: Yup.string().required("Cancellation reason is required"),
});

const CancelModal = ({ isOpen, onClose, onSave, appointments }) => {
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(validationSchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await onSave({ appointments, reason: data.reason });
      reset();
      onClose();
    } catch {
      showToast("Failed to cancel appointment", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const onValidationError = (errors) => {
    const firstError = Object.values(errors)[0];
    showToast(firstError?.message || "Please fill in all required fields", "error");
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      primaryButtonText="Cancel Appointment"
      secondaryButtonText="Close"
      onPrimaryButtonClick={handleSubmit(onSubmit, onValidationError)}
      onSecondaryButtonClick={onClose}
      size="medium"
      primaryButtonLoading={isLoading}
    >
      <div>
        <div className="items-center flex justify-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M24 4C12.96 4 4 12.96 4 24C4 35.04 12.96 44 24 44C35.04 44 44 35.04 44 24C44 12.96 35.04 4 24 4ZM26 34H22V30H26V34ZM26 26H22V14H26V26Z"
              fill="black"
            />
          </svg>
        </div>
        <h2 className="text-center text-color-sec text-20">Are you sure?</h2>
        <p className="text-color-sec text-base text-center">
          You're about to cancel this appointment. Please provide a reason for
          the cancellation.
        </p>
        <TextareaInput
          required
          label="Reason"
          placeholder="Enter Reason"
          {...register("reason")}
          error={errors.reason?.message}
        />
      </div>
    </ReusableModal>
  );
};

export default CancelModal;
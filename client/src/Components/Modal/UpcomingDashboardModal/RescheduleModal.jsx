import React from "react";
import ReusableModal from "../ReusableModal";
import { TextInput, TextareaInput } from "../../../Components/Input/Inputs";



const RescheduleModal = ({
  isOpen,
  onClose,
  isLoading = false,
  register,
  errors,
  onSubmit,
}) => {
  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Reschedule appointment"
      primaryButtonText={<>{isLoading ? "Rescheduling..." : "Reschedule"}</>}
      secondaryButtonText="Cancel"
      primaryButtonLoading={isLoading}
      onPrimaryButtonClick={onSubmit}
      onSecondaryButtonClick={onClose}
      size="lg"
    >
      <div style={{ padding: "0 24px 24px" }}>
        <p
          style={{
            margin: "0 0 24px",
            fontSize: "15px",
            color: "#6b7280",
            lineHeight: "1.5",
          }}
        >
          Let's find a time that works for everyone
        </p>

        {/* Native Date Picker */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
            }}
          >
            Choose a new date
          </label>
          <TextInput
            type="date"
            {...(register && register("newDate"))}
            error={errors?.newDate?.message}
            style={{ width: "100%" }}
          />
        </div>

        {/* Native Time Picker */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
            }}
          >
            Choose a new time
          </label>
          <TextInput
            type="time"
            {...(register && register("newTime"))}
            error={errors?.newTime?.message}
            style={{ width: "100%" }}
          />
        </div>

        {/* Message */}
        <div style={{ marginBottom: 24 }}>
          <TextareaInput
            label="Leave a message for the therapist"
            placeholder="Type message"
            rows={4}
            {...(register && register("message"))}
            error={errors?.message?.message}
          />
        </div>
      </div>
    </ReusableModal>
  );
};

export default RescheduleModal;

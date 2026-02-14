import React, { useState } from "react";
import ReusableModal from "../ReusableModal";
import { TextInput, TextareaInput } from "../../../Components/Input/Inputs";
import { showToast } from "../../../Helper/ShowToast";
import api from "../../../api/homeApis";

const RescheduleModal = ({
  isOpen,
  onClose,
  appointment,
  accessToken,
  refreshToken,
  tenantId,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    date: "",
    startTime: "",
    endTime: "",
    reason: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear error on change
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.startTime) newErrors.startTime = "Start time is required";
    if (!formData.endTime) newErrors.endTime = "End time is required";
    if (!formData.reason.trim()) newErrors.reason = "Reason is required";
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = "End time must be after start time";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      await api.RescheduleAppointments({
        tenantId,
        id: (appointment?.id || appointment?.originalData?.id)?.split("_")[0],
        date: new Date(formData.date),
        startTime: formData.startTime,
        endTime: formData.endTime,
        forAll: false,
        reasonForReschedule: formData.reason,
        rescheduled: true,
        accessToken,
        refreshToken,
      });

      // Reset form
      setFormData({ date: "", startTime: "", endTime: "", reason: "" });
      setErrors({});
      onSuccess?.();
    } catch (error) {
      showToast(
        error.message || "Failed to reschedule appointment. Please try again.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ date: "", startTime: "", endTime: "", reason: "" });
    setErrors({});
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Reschedule appointment"
      primaryButtonText={<>{isLoading ? "Rescheduling..." : "Reschedule"}</>}
      secondaryButtonText="Cancel"
      primaryButtonLoading={isLoading}
      onPrimaryButtonClick={handleSubmit}
      onSecondaryButtonClick={handleClose}
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

        {/* Date Picker */}
        <div style={{ marginBottom: 20 }}>
          <TextInput
            label="Choose a new date"
            type="date"
            value={formData.date}
            onChange={handleChange("date")}
            error={errors.date}
          />
        </div>

        {/* Start Time */}
        <div style={{ marginBottom: 20 }}>
          <TextInput
            label="Start time"
            type="time"
            value={formData.startTime}
            onChange={handleChange("startTime")}
            error={errors.startTime}
          />
        </div>

        {/* End Time */}
        <div style={{ marginBottom: 20 }}>
          <TextInput
            label="End time"
            type="time"
            value={formData.endTime}
            onChange={handleChange("endTime")}
            error={errors.endTime}
          />
        </div>

        {/* Reason */}
        <div style={{ marginBottom: 24 }}>
          <TextareaInput
            label="Reason for rescheduling"
            placeholder="Enter your reason for rescheduling"
            row="4"
            value={formData.reason}
            onChange={handleChange("reason")}
            error={errors.reason}
          />
        </div>
      </div>
    </ReusableModal>
  );
};

export default RescheduleModal;

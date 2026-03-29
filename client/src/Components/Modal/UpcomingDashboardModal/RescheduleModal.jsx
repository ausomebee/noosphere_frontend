import { useState, useEffect } from "react";
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

  // Pre-populate form with current appointment data when modal opens
  useEffect(() => {
    if (appointment && isOpen) {
      const data = appointment?.originalData || appointment;
      setFormData({
        date: data?.date ? new Date(data.date).toISOString().split("T")[0] : "",
        startTime: data?.startTime || "",
        endTime: data?.endTime || "",
        reason: "",
      });
    }
  }, [appointment, isOpen]);

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
    if (Object.keys(newErrors).length > 0) {
      showToast("Please fill in all required fields", "error");
      return false;
    }
    return true;
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

        {/* Current appointment summary */}
        {appointment && (
          <div
            style={{
              background: "#f9fafb",
              borderRadius: "10px",
              padding: "14px 16px",
              marginBottom: "20px",
              border: "1px solid #e5e7eb",
            }}
          >
            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280", fontWeight: "600", marginBottom: "6px" }}>
              Current appointment
            </p>
            {(appointment?.originalData?.session?.name || appointment?.sessionType) && (
              <p style={{ margin: "0 0 4px", fontSize: "14px", color: "#374151" }}>
                <strong>Session:</strong> {appointment?.originalData?.session?.name || appointment?.sessionType}
              </p>
            )}
            {(appointment?.originalData?.clinicians?.length > 0 || appointment?.clinician) && (
              <p style={{ margin: "0 0 4px", fontSize: "14px", color: "#374151" }}>
                <strong>Clinician:</strong> {appointment?.originalData?.clinicians?.map(c => c.fullName).join(", ") || appointment?.clinician}
              </p>
            )}
            {appointment?.dateTime && (
              <p style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
                <strong>Date & Time:</strong> {appointment.dateTime.replace("\n", " ")}
              </p>
            )}
          </div>
        )}

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

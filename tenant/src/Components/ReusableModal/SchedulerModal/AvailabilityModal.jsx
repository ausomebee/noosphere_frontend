import React, { useCallback, useMemo, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { SwitchInput, TextInput } from "../../Input/Inputs";
import ReusableModal from "../../ReusableModal/ReusableModal";
import { showToast } from "../../../Helper/ShowToast";

// Reusable Time Range Input Component
const TimeRangeInput = React.memo(
  ({
    startTime,
    endTime,
    onStartTimeChange,
    onEndTimeChange,
    disabled = false,
  }) => {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="custom-time-container">
            <div className="custom-time-div">
              <span className="custom-time-label">AM</span>
            </div>
            <input
              type="time"
              value={startTime || "00:00"} // Changed to "00:00" for valid format
              onChange={(e) => onStartTimeChange(e.target.value)}
              disabled={disabled}
              step="3600"
              className="custom-time-input"
            />
          </div>
        </div>
        <span className="custom-to-text">to</span>
        <div className="flex items-center gap-2">
          <div className="custom-time-container">
            <div className="custom-time-div">
              <span className="custom-time-label">PM</span>
            </div>
            <input
              type="time"
              value={endTime || "12:00"} // Changed to "12:00" for valid format
              onChange={(e) => onEndTimeChange(e.target.value)}
              disabled={disabled}
              step="3600"
              className="custom-time-input"
            />
          </div>
        </div>
      </div>
    );
  }
);

// Day Row Component
const DayRow = React.memo(
  ({
    day,
    isAvailable,
    startTime,
    endTime,
    onToggle,
    onStartTimeChange,
    onEndTimeChange,
  }) => {
    return (
      <div className="flex items-center justify-between p-6 last:border-b-0">
        <div className="flex items-center gap-4 min-w-[120px]">
          <div style={{ marginBottom: "-15px" }}>
            <SwitchInput checked={isAvailable} onChange={onToggle} size="md" />
          </div>
          <span className="text-gray-600 text-lg font-medium capitalize">
            {day}
          </span>
        </div>
        <div className="flex-1 flex justify-end">
          {isAvailable ? (
            <TimeRangeInput
              startTime={startTime}
              endTime={endTime}
              onStartTimeChange={onStartTimeChange}
              onEndTimeChange={onEndTimeChange}
            />
          ) : (
            <div className="w-60">
              <div className="p-2 rounded-lg justify-end flex">
                <div style={{ marginBottom: "-15px" }}>
                <TextInput width="320" placeholder="Not Available" disabled={true} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

const AvailabilityModal = ({
  isOpen,
  onClose,
  onSave,
  initialValues = {},
  isLoading = false,
}) => {
  // Days of the week
  const daysOfWeek = useMemo(
    () => ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    []
  );

  // Default availability state — all off until populated
  const defaultAvailability = useMemo(() => ({
    monday: { available: false, startTime: "09:00", endTime: "17:00" },
    tuesday: { available: false, startTime: "09:00", endTime: "17:00" },
    wednesday: { available: false, startTime: "09:00", endTime: "17:00" },
    thursday: { available: false, startTime: "09:00", endTime: "17:00" },
    friday: { available: false, startTime: "09:00", endTime: "17:00" },
    saturday: { available: false, startTime: "09:00", endTime: "17:00" },
    sunday: { available: false, startTime: "09:00", endTime: "17:00" },
  }), []);

  // Memoize initialValues
  const memoizedInitialValues = useMemo(() => ({ ...initialValues }), [initialValues]);

  // Form setup
  const {
    handleSubmit,
    reset,
    watch,
    setValue,
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    defaultValues: {
      availability: { ...defaultAvailability, ...memoizedInitialValues },
    },
  });

  const availability = watch("availability");

  // Update availability
  const updateDayAvailability = useCallback(
    (day, field, value) => {
      setValue(`availability.${day}.${field}`, value, { shouldDirty: true });
    },
    [setValue]
  );

  // Toggle availability
  const toggleDayAvailability = useCallback(
    (day) => {
      const currentAvailable = availability[day]?.available || false;
      updateDayAvailability(day, "available", !currentAvailable);
    },
    [availability, updateDayAvailability]
  );

  // Handle save
  const handleSave = useCallback(
    async (data) => {
      try {
        await onSave(data.availability);
      } catch {
        showToast("Failed to save availability", "error");
      }
    },
    [onSave]
  );

  const onValidationError = useCallback((errors) => {
    const firstError = Object.values(errors)[0];
    showToast(firstError?.message || "Please fill in all required fields", "error");
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // Reset form every time modal opens with latest data
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      reset({
        availability: { ...defaultAvailability, ...memoizedInitialValues },
      });
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, reset, defaultAvailability, memoizedInitialValues]);

  // Enforce time range
  const enforceTimeRange = useCallback((time, isStart) => {
    const [hours] = time.split(":").map(Number);
    if (isStart) {
      if (hours >= 12) return "11:59";
    } else {
      if (hours < 12) return "12:00";
    }
    return time;
  }, []);

  // Handle time changes
  const onStartTimeChange = useCallback(
    (time, day) => {
      const enforcedTime = enforceTimeRange(time, true);
      updateDayAvailability(day, "startTime", enforcedTime);
    },
    [updateDayAvailability, enforceTimeRange]
  );

  const onEndTimeChange = useCallback(
    (time, day) => {
      const enforcedTime = enforceTimeRange(time, false);
      updateDayAvailability(day, "endTime", enforcedTime);
    },
    [updateDayAvailability, enforceTimeRange]
  );

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Set your availability"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      primaryButtonDisabled={isLoading}
      onPrimaryButtonClick={handleSubmit(handleSave, onValidationError)}
      onSecondaryButtonClick={handleClose}
      size="lg"
      primaryButtonLoading={isLoading}
    >
      <div className="overflow-hidden">
        {daysOfWeek.map((day) => {
          const dayData = availability[day] || defaultAvailability[day];
          return (
            <DayRow
              key={day}
              day={day}
              isAvailable={dayData.available}
              startTime={dayData.startTime}
              endTime={dayData.endTime}
              onToggle={() => toggleDayAvailability(day)}
              onStartTimeChange={(time) => onStartTimeChange(time, day)}
              onEndTimeChange={(time) => onEndTimeChange(time, day)}
            />
          );
        })}
      </div>
    </ReusableModal>
  );
};

export default React.memo(AvailabilityModal);
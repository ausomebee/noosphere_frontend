import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import ReusableModal from "../ReusableModal";
import { GoCalendar } from "react-icons/go";
import { TextInput } from "../../Input/Inputs";
import Button from "../../Button/Button";

// Utility function to convert 12-hour time (e.g., "1:30pm") to 24-hour format (e.g., "13:30")
const convertTo24Hour = (timeStr) => {
  if (!timeStr) return "";
  const match = timeStr.match(/^(\d{1,2}):(\d{2})([ap]m)$/i);
  if (!match) return timeStr;
  let [_, hours, minutes, period] = match;
  hours = parseInt(hours, 10);
  if (period.toLowerCase() === "pm" && hours < 12) hours += 12;
  if (period.toLowerCase() === "am" && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, "0")}:${minutes}`;
};

const RescheduleModal = ({ isOpen, onClose, appointment, onSave }) => {
  console.log(appointment)
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState(null);

  const validationSchema = Yup.object({
    date: Yup.date().required("Date is required"),
    startTime: Yup.string()
      .required("Start time is required")
      .matches(
        /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
        "Invalid time format (use HH:mm, e.g., 13:30)"
      ),
    endTime: Yup.string()
      .required("End time is required")
      .matches(
        /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
        "Invalid time format (use HH:mm, e.g., 13:30)"
      )
      .test(
        "is-after-start",
        "End time must be after start time",
        function (value) {
          const { startTime, date } = this.parent;
          if (!startTime || !value || !date) return false;

          const baseDate = new Date(date);
          if (isNaN(baseDate.getTime())) return false;

          const startParts = startTime.split(":");
          const endParts = value.split(":");
          if (startParts.length !== 2 || endParts.length !== 2) return false;

          const startDateTime = new Date(baseDate);
          startDateTime.setHours(
            parseInt(startParts[0], 10),
            parseInt(startParts[1], 10),
            0,
            0
          );

          let endDateTime = new Date(baseDate);
          endDateTime.setHours(
            parseInt(endParts[0], 10),
            parseInt(endParts[1], 10),
            0,
            0
          );

          if (endDateTime.getTime() <= startDateTime.getTime()) {
            endDateTime.setDate(baseDate.getDate() + 1);
          }

          return endDateTime.getTime() > startDateTime.getTime();
        }
      ),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      startTime: "",
      endTime: "",
    },
  });

  useEffect(() => {
    if (isOpen && appointment) {
      const formattedData = {
        date: appointment.date || new Date().toISOString().split("T")[0],
        startTime: appointment.startTime ? convertTo24Hour(appointment.startTime) : "",
        endTime: appointment.endTime ? convertTo24Hour(appointment.endTime) : "",
      };
      reset(formattedData);
      console.log(formattedData)
    }
  }, [isOpen, appointment, reset]);

  const handleSubmitForm = (data) => {
    const rescheduleData = {
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
    };


    setFormData(rescheduleData);
    setShowConfirmation(true);
  };

  const handleConfirmSave = (scope) => {
    if (!formData) return;

    const rescheduleData = {
      ...formData,
      scope: scope,
    };

    console.log(rescheduleData)

    onSave(rescheduleData);
    reset({
      date: new Date().toISOString().split("T")[0],
      startTime: "",
      endTime: "",
    });
    setFormData(null);
    setShowConfirmation(false);
    onClose();
  };

  const onError = (errors) => {
    console.group("Form Validation Errors");
    const simplifiedErrors = Object.keys(errors).reduce((acc, key) => {
      const error = errors[key];
      if (error.message)
        acc[key] = { message: error.message, type: error.type };
      return acc;
    }, {});
    console.error(
      "Validation failed with errors:",
      JSON.stringify(simplifiedErrors, null, 2)
    );
    console.groupEnd();
  };

  const renderMainForm = () => (
    <div className="space-y-4">
      <TextInput
        label="Date *"
        type="date"
        {...register("date")}
        placeholder="Select a Date"
        width="full"
        error={errors.date?.message}
      />
      <div className="flex gap-4">
        <div className="flex-1">
          <TextInput
            label="Start Time *"
            type="time"
            {...register("startTime")}
            placeholder="Select a Time"
            width="full"
            error={errors.startTime?.message}
          />
        </div>
        <div className="flex-1">
          <TextInput
            label="End Time *"
            type="time"
            {...register("endTime")}
            placeholder="Select a Time"
            width="full"
            error={errors.endTime?.message}
          />
        </div>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="space-y-4">
      <p className="text-base text-center text-gray-600 font-semibold mb-4">
        Would you like to apply changes to:
      </p>
      <div className="flex flex-col gap-2 mb-6">
        <Button
          variant="secondary"
          label="This Event Only"
          onClick={() => handleConfirmSave("this")}
        />
        <Button
          variant="secondary"
          label="All Events in This Series"
          onClick={() => handleConfirmSave("all")}
        />
        <Button
          variant="secondary"
          label="Go Back"
          onClick={() => setShowConfirmation(false)}
        />
      </div>
    </div>
  );

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Reschedule Appointment"
      titleIcon={<GoCalendar />}
      primaryButtonText={showConfirmation ? null : "Save"}
      secondaryButtonText={showConfirmation ? null : "Cancel"}
      onPrimaryButtonClick={showConfirmation ? undefined : handleSubmit(handleSubmitForm, onError)}
      onSecondaryButtonClick={showConfirmation ? undefined : onClose}
      size="medium"
    >
      {showConfirmation ? renderConfirmation() : renderMainForm()}
    </ReusableModal>
  );
};

export default RescheduleModal;
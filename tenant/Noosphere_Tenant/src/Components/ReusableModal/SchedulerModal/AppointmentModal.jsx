import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import ReusableModal from "../ReusableModal";
import { GoCalendar } from "react-icons/go";
import {
  CheckboxInput,
  RadioInput,
  SearchableSelectInput,
  SelectInput,
  TextInput,
} from "../../Input/Inputs";
import ColorPicker from "../../ColorPicker";

const AppointmentModal = ({ isOpen, onClose, staff }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const validationSchema = Yup.object({
    date: Yup.date().required("Date is required"),
    startTime: Yup.string().required("Start time is required"),
    endTime: Yup.string()
      .required("End time is required")
      .test(
        "is-after-start",
        "End time must be after start time",
        function (value) {
          const { startTime } = this.parent;
          return (
            !startTime ||
            !value ||
            new Date(`1970-01-01 ${value}`) >
              new Date(`1970-01-01 ${startTime}`)
          );
        }
      ),
    client: Yup.string().required("Client is required"),
    therapist: Yup.string().required("Therapist is required"),
    sessionType: Yup.string().required("Session type is required"),
    serviceType: Yup.string().required("Service type is required"),
    serviceLocation: Yup.string().required("Service location is required"),
    therapyRoom: Yup.string().required("Therapy room is required"),
    isRecurring: Yup.boolean(),
    recurrenceType: Yup.string().when("isRecurring", {
      is: true,
      then: Yup.string()
        .required("Recurrence type is required")
        .oneOf(["day", "week", "month", "custom"]),
    }),
    recurrenceDays: Yup.array().when("isRecurring", {
      is: true,
      then: Yup.array().of(Yup.string()).min(1, "At least one day is required"),
    }),
    customRecurrenceInterval: Yup.string().when("isRecurring", {
      is: true,
      then: Yup.string().required("Recurrence interval is required"),
    }),
    customRecurrenceUnit: Yup.string().when("isRecurring", {
      is: true,
      then: Yup.string()
        .required("Recurrence unit is required")
        .oneOf(["day", "week", "month"]),
    }),
    customRecurrenceDay: Yup.string().when(["isRecurring", "recurrenceType"], {
      is: (isRecurring, type) => isRecurring && type === "month",
      then: Yup.string().required("Day(s) of month is required"),
    }),
    customRecurrencePosition: Yup.string().when(
      ["isRecurring", "recurrenceType", "customRecurrenceUnit"],
      {
        is: (isRecurring, type, unit) =>
          isRecurring && type === "custom" && unit === "month",
        then: Yup.string()
          .required("Position is required")
          .oneOf(["first", "second", "third", "fourth", "last"]),
      }
    ),
    customRecurrenceWeekday: Yup.string().when(
      ["isRecurring", "recurrenceType", "customRecurrenceUnit"],
      {
        is: (isRecurring, type, unit) =>
          isRecurring && type === "custom" && unit === "month",
        then: Yup.string()
          .required("Weekday is required")
          .oneOf([
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ]),
      }
    ),
    endType: Yup.string()
      .required("End type is required")
      .oneOf(["never", "on", "after"]), // Always required, standalone
    endOn: Yup.date().when("endType", {
      is: "on",
      then: Yup.date().required("End date is required"),
    }),
    occurrences: Yup.number().when("endType", {
      is: "after",
      then: Yup.number().required("Number of occurrences is required").min(1),
    }),
    requiresRBTSupervision: Yup.boolean(),
    supervisors: Yup.string().when("requiresRBTSupervision", {
      is: true,
      then: Yup.string().required("Supervisor is required"),
    }),
    supervisorType: Yup.string().when("requiresRBTSupervision", {
      is: true,
      then: Yup.string().required("Supervisor type is required"),
    }),
    modeOfMeeting: Yup.string().when("requiresRBTSupervision", {
      is: true,
      then: Yup.string().required("Mode of meeting is required"),
    }),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
    control,
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      date: "",
      startTime: "",
      endTime: "",
      client: "",
      therapist: "",
      sessionType: "",
      serviceType: "",
      serviceLocation: "",
      therapyRoom: "",
      isRecurring: false,
      recurrenceType: "day",
      recurrenceDays: [],
      customRecurrenceInterval: "",
      customRecurrenceUnit: "month",
      customRecurrenceDay: "",
      customRecurrencePosition: "",
      customRecurrenceWeekday: "",
      endType: "never", // Default to "never" as a standalone option
      endOn: "",
      occurrences: "",
      requiresRBTSupervision: false,
      supervisors: "",
      supervisorType: "",
      modeOfMeeting: "",
      colorCode: "#000000",
    },
  });

  const isRecurring = watch("isRecurring");
  const recurrenceType = watch("recurrenceType");
  const customRecurrenceUnit = watch("customRecurrenceUnit");
  const endType = watch("endType");
  const requiresRBTSupervision = watch("requiresRBTSupervision");

  const handleSubmitForm = (data) => {
    const appointmentData = {
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      client: data.client,
      therapist: data.therapist,
      sessionType: data.sessionType,
      serviceType: data.serviceType,
      serviceLocation: data.serviceLocation,
      therapyRoom: data.therapyRoom,
      isRecurring: data.isRecurring,
      recurrence: data.isRecurring
        ? {
            type: data.recurrenceType,
            days: data.recurrenceDays,
            interval: data.customRecurrenceInterval,
            unit: data.customRecurrenceUnit,
            day: data.customRecurrenceDay,
            position: data.customRecurrencePosition,
            weekday: data.customRecurrenceWeekday,
            endType: data.endType,
            endOn: data.endOn,
            occurrences: data.occurrences,
          }
        : null,
      requiresRBTSupervision: data.requiresRBTSupervision,
      supervisors: data.supervisors,
      supervisorType: data.supervisorType,
      modeOfMeeting: data.modeOfMeeting,
      colorCode: data.colorCode,
    };

    console.log("Creating appointment:", appointmentData);

    // Add API call or further logic here
    onClose();
  };

  const handleColorChange = (color) => {
    setValue("colorCode", color);
    setShowColorPicker(false);
  };

  // Custom handler for recurrenceDays (checkbox array)
  const handleRecurrenceDaysChange = (e) => {
    const { value, checked } = e.target;
    const currentDays = watch("recurrenceDays") || [];
    setValue(
      "recurrenceDays",
      checked
        ? [...currentDays, value]
        : currentDays.filter((day) => day !== value)
    );
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create a New Appointment"
      titleIcon={<GoCalendar />}
      primaryButtonText="Create Appointment"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(handleSubmitForm)}
      onSecondaryButtonClick={onClose}
      size="medium"
    >
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div>
          <TextInput
            label="Date"
            type="date"
            {...register("date")}
            placeholder="Select a Date"
            width="full"
            error={errors.date?.message}
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <TextInput
              label="Start Time"
              type="time"
              {...register("startTime")}
              placeholder="Select a Time"
              width="full"
              error={errors.startTime?.message}
            />
          </div>
          <div className="flex-1">
            <TextInput
              label="End Time"
              type="time"
              {...register("endTime")}
              placeholder="Select a Time"
              width="full"
              error={errors.endTime?.message}
            />
          </div>
        </div>

        {/* Recurring Event Section */}
        <div className="py-2 px-2 rounded-md bg-gray-100">
          <div>
            <CheckboxInput
              label="This is a recurring event"
              {...register("isRecurring")}
            />
          </div>
          {isRecurring && (
            <>
              <div className="mt-4 space-y-4">
                <p className="text-sm text-gray-400 font-semibold">
                  Repeats every
                </p>
                <div className="flex gap-4">
                  <RadioInput
                    label="Day"
                    {...register("recurrenceType")}
                    value="day"
                  />
                  <RadioInput
                    label="Week"
                    {...register("recurrenceType")}
                    value="week"
                  />
                  <RadioInput
                    label="Month"
                    {...register("recurrenceType")}
                    value="month"
                  />
                  <RadioInput
                    label="Custom"
                    {...register("recurrenceType")}
                    value="custom"
                  />
                </div>

                {recurrenceType === "week" && (
                  <div className="flex gap-2 mt-2">
                    {["Mon", "Tue", "Wed", "Thur", "Fri", "Sat", "Sun"].map(
                      (day) => (
                        <CheckboxInput
                          key={day}
                          label={day}
                          value={day.toLowerCase()}
                          onChange={handleRecurrenceDaysChange}
                          checked={(watch("recurrenceDays") || []).includes(
                            day.toLowerCase()
                          )}
                        />
                      )
                    )}
                    {errors.recurrenceDays?.message && (
                      <div className="error">
                        {errors.recurrenceDays.message}
                      </div>
                    )}
                  </div>
                )}

                {recurrenceType === "month" && (
                  <div>
                    <TextInput
                      label="On day(s) of the month"
                      type="text"
                      {...register("customRecurrenceDay")}
                      placeholder="e.g., 1, 5, 15"
                      width="full"
                      error={errors.customRecurrenceDay?.message}
                    />
                  </div>
                )}

                {recurrenceType === "custom" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <p className="text-sm text-gray-400 font-semibold">
                        Repeats every
                      </p>
                      <TextInput
                        type="text"
                        {...register("customRecurrenceInterval")}
                        width="50"
                        className="rounded-20px mb-4"
                        error={errors.customRecurrenceInterval?.message}
                      />
                      <SelectInput
                        value={watch("customRecurrenceUnit")}
                        onChange={(value) =>
                          setValue("customRecurrenceUnit", value)
                        }
                        options={[
                          { value: "day", label: "Day(s)" },
                          { value: "week", label: "Week(s)" },
                          { value: "month", label: "Month(s)" },
                        ]}
                        className="rounded-20px mb-4"
                        width="full"
                        error={errors.customRecurrenceUnit?.message}
                      />
                    </div>

                    {customRecurrenceUnit === "month" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-4">
                          <RadioInput
                            label="On day"
                            {...register("customRecurrencePosition")}
                            value="on"
                          />
                          <TextInput
                            type="text"
                            {...register("customRecurrenceDay")}
                            width="50"
                            className="rounded-20px"
                            error={errors.customRecurrenceDay?.message}
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <RadioInput
                            label="On the"
                            {...register("customRecurrencePosition")}
                            value="position"
                          />
                          <SelectInput
                            value={watch("customRecurrencePosition")}
                            onChange={(value) =>
                              setValue("customRecurrencePosition", value)
                            }
                            options={[
                              { value: "first", label: "First" },
                              { value: "second", label: "Second" },
                              { value: "third", label: "Third" },
                              { value: "fourth", label: "Fourth" },
                              { value: "last", label: "Last" },
                            ]}
                            className="rounded-20px"
                            width="100"
                            error={errors.customRecurrencePosition?.message}
                          />
                          <SelectInput
                            value={watch("customRecurrenceWeekday")}
                            onChange={(value) =>
                              setValue("customRecurrenceWeekday", value)
                            }
                            options={[
                              { value: "monday", label: "Monday" },
                              { value: "tuesday", label: "Tuesday" },
                              { value: "wednesday", label: "Wednesday" },
                              { value: "thursday", label: "Thursday" },
                              { value: "friday", label: "Friday" },
                              { value: "saturday", label: "Saturday" },
                              { value: "sunday", label: "Sunday" },
                            ]}
                            className="rounded-20px"
                            width="150"
                            error={errors.customRecurrenceWeekday?.message}
                          />
                        </div>
                      </div>
                    )}

                    {customRecurrenceUnit === "week" && (
                      <div className="flex gap-2 mt-4">
                        {["Mon", "Tue", "Wed", "Thur", "Fri", "Sat", "Sun"].map(
                          (day) => (
                            <CheckboxInput
                              key={day}
                              label={day}
                              value={day.toLowerCase()}
                              onChange={handleRecurrenceDaysChange}
                              checked={(watch("recurrenceDays") || []).includes(
                                day.toLowerCase()
                              )}
                            />
                          )
                        )}
                        {errors.recurrenceDays?.message && (
                          <div className="error">
                            {errors.recurrenceDays.message}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-400 font-semibold">End On</p>
              <div className="flex gap-4 mt-2">
                <RadioInput
                  label="Never"
                  {...register("endType")}
                  value="never"
                />
                <RadioInput label="On" {...register("endType")} value="on" />
                <RadioInput
                  label="After"
                  {...register("endType")}
                  value="after"
                />
              </div>

              {endType === "on" && (
                <div className="mt-2">
                  <TextInput
                    label="End On"
                    type="date"
                    {...register("endOn")}
                    width="full"
                    error={errors.endOn?.message}
                  />
                </div>
              )}

              {endType === "after" && (
                <div className="mt-2">
                  <SelectInput
                    label="Number of occurrences"
                    value={watch("occurrences")}
                    onChange={(value) => setValue("occurrences", value)}
                    options={Array.from({ length: 50 }, (_, i) => ({
                      value: (i + 1).toString(),
                      label: (i + 1).toString(),
                    }))}
                    width="full"
                    error={errors.occurrences?.message}
                    className="rounded-12px"
                  />
                </div>
              )}
            </>
          )}
        </div>

      
        <div className="space-y-4 mt-4">
          <SearchableSelectInput
            label="Client *"
            {...register("client")}
            options={[]}
            placeholder="Select Client"
            className="rounded-12px"
            error={errors.client?.message}
          />
          <SearchableSelectInput
            label="Therapist *"
            {...register("therapist")}
            options={staff.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Select Therapist"
            className="rounded-12px"
            error={errors.therapist?.message}
          />
          <SearchableSelectInput
            label="Session Type *"
            {...register("sessionType")}
            options={[]}
            placeholder="Select an Appointment"
            className="rounded-12px"
            error={errors.sessionType?.message}
          />
          <SearchableSelectInput
            label="Service Type *"
            {...register("serviceType")}
            options={[]}
            placeholder="Select a"
            className="rounded-12px"
            error={errors.serviceType?.message}
          />
          <SearchableSelectInput
            label="Service Location *"
            {...register("serviceLocation")}
            options={[]}
            className="rounded-12px"
            error={errors.serviceLocation?.message}
          />
          <SearchableSelectInput
            label="Therapy Room *"
            {...register("therapyRoom")}
            options={[]}
            className="rounded-12px"
            error={errors.therapyRoom?.message}
          />
        </div>

        <div className="py-2 px-2 rounded-md bg-gray-100 mt-4">
          <div>
            <CheckboxInput
              label="This appointment requires RBT supervision"
              {...register("requiresRBTSupervision")}
            />
          </div>
          {requiresRBTSupervision && (
            <div className="space-y-4 mt-4">
              <SearchableSelectInput
                label="Select supervisor(s) *"
                {...register("supervisors")}
                options={[]}
                className="rounded-12px"
                error={errors.supervisors?.message}
              />
              <SearchableSelectInput
                label="Supervisor Type *"
                {...register("supervisorType")}
                options={[]}
                className="rounded-12px"
                error={errors.supervisorType?.message}
              />
              <SearchableSelectInput
                label="Mode of Meeting *"
                {...register("modeOfMeeting")}
                options={[]}
                className="rounded-12px"
                error={errors.modeOfMeeting?.message}
              />
            </div>
          )}
        </div>

        <div className="color-picker-container">
          <div
            className="color-picker-row"
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: "20px",
            }}
          >
            <label style={{ marginRight: "10px" }}>Colour code</label>
            <div
              className="color-preview"
              style={{
                backgroundColor: watch("colorCode") || "#000000",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                display: "inline-block",
              }}
            ></div>
            <button
              className="change-button"
              onClick={() => setShowColorPicker(true)}
              style={{
                marginLeft: "auto",
                color: "#0000EE",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Change
            </button>
          </div>
          {errors.colorCode && (
            <div className="auth-error-message text-red-500 text-xs mt-1">
              {errors.colorCode}
            </div>
          )}
        </div>
        {showColorPicker && (
          <ColorPicker
            color={watch("colorCode")}
            onChange={handleColorChange}
            onClose={() => setShowColorPicker(false)}
          />
        )}
      </form>
    </ReusableModal>
  );
};

export default AppointmentModal;

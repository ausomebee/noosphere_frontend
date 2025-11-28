import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
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
  CustomDatePickerInput,
} from "../../Input/Inputs";
import ColorPicker from "../../ColorPicker";
import Button from "../../Button/Button";
import { FaPlus, FaTrash } from "react-icons/fa";
import DatePicker from "react-multi-date-picker";
import { showToast } from "../../../Helper/ShowToast";
import {format } from "date-fns";
const AppointmentModal = ({
  isOpen,
  onClose,
  initialData,
  isEditMode = false,
  onSave,
  clients,
  sessionTypes,
  staff,
}) => {
 
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Added for loading state
  const datePickerRef = useRef(null);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Map API data to form options
  const clientOptions = clients.map((client) => ({
    value: client.clientId,
    label: `${client.client.firstName || ''} ${client.client.lastName || ''}`.trim() || "Unknown  Client",
  }));

  console.log(staff)

  const clinicianOptions = useMemo(
    () =>
      staff.map((s) => ({
        value: s.id,
        label: s.fullName,
        role: s.roleId,
      })),
    [staff]
  );

  const sessionTypeOptions = useMemo(
    () =>
      sessionTypes.map((st) => ({
        value: st.id,
        label: st.name,
      })),
    [sessionTypes]
  );

  const serviceTypeOptions = Array.from(
    new Set(
      sessionTypes.flatMap((st) =>
        (st.service || []).map((svc) => svc.serviceType)
      )
    )
  ).map((serviceType) => ({
    value: serviceType,
    label: serviceType,
  }));

  const modifierOptions = Array.from(
    new Set(
      sessionTypes.flatMap((st) =>
        (st.service || []).map((svc) => svc.modifierType).filter(Boolean)
      )
    )
  ).map((modifierType) => ({
    value: modifierType,
    label: modifierType,
  }));

  const locationOptions = [
    { value: "Clinic/Center", label: "Clinic/Center" },
    { value: "Home", label: "Home" },
    { value: "School", label: "School" },
    { value: "Community", label: "Community" },
    { value: "Telehealth", label: "Telehealth" },
    { value: "Telephonic", label: "Telephonic" },
    { value: "Other", label: "Other" },
  ];

  const validationSchema = Yup.object({
    date: Yup.date().required("Date is required"),
    startTime: Yup.string()
      .required("Start time is required")
      .matches(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Invalid time format (use HH:mm)"
      ),
    endTime: Yup.string()
      .required("End time is required")
      .matches(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Invalid time format (use HH:mm)"
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
    client: Yup.string().required("Client is required"),
    sessionType: Yup.string().required("Session type is required"),
    clinicians: Yup.array()
      .of(Yup.string())
      .min(1, "At least one clinician is required"),
    service: Yup.array()
      .of(
        Yup.object({
          serviceType: Yup.string().required("Service type is required"),
          modifierType: Yup.string().nullable(),
        })
      )
      .min(1, "At least one service type is required"),
    serviceLocation: Yup.string().required("Service location is required"),
    isRecurring: Yup.boolean(),
    recurrenceType: Yup.string().when("isRecurring", {
      is: true,
      then: (schema) =>
        schema
          .required("Recurrence type is required")
          .oneOf(["day", "week", "month", "custom"]),
      otherwise: (schema) => Yup.string(),
    }),
    recurrenceDays: Yup.array().when(
      ["isRecurring", "recurrenceType", "customRecurrenceUnit"],
      (isRecurring, recurrenceType, customRecurrenceUnit, schema) =>
        isRecurring &&
        (recurrenceType === "week" ||
          (recurrenceType === "custom" && customRecurrenceUnit === "week"))
          ? schema
              .of(Yup.string())
              .min(1, "At least one day is required")
              .required("Recurrence days are required")
          : Yup.array()
    ),
    customRecurrenceInterval: Yup.string()
      .transform((value, originalValue) =>
        originalValue === "" ? undefined : value
      )
      .when(
        ["isRecurring", "recurrenceType"],
        (isRecurring, recurrenceType, schema) =>
          isRecurring && recurrenceType === "custom"
            ? schema.required("Recurrence interval is required")
            : Yup.string()
      ),
    customRecurrenceUnit: Yup.string().when(
      ["isRecurring", "recurrenceType"],
      (isRecurring, recurrenceType, schema) =>
        isRecurring && recurrenceType === "custom"
          ? schema
              .required("Recurrence unit is required")
              .oneOf(["day", "week", "month"])
          : Yup.string()
    ),
    customRecurrenceDay: Yup.array()
      .of(Yup.number().integer().min(1).max(31))
      .when(
        [
          "isRecurring",
          "recurrenceType",
          "customRecurrenceUnit",
          "customRecurrencePosition",
        ],
        (
          isRecurring,
          recurrenceType,
          customRecurrenceUnit,
          customRecurrencePosition,
          schema
        ) =>
          isRecurring &&
          (recurrenceType === "month" ||
            (recurrenceType === "custom" &&
              customRecurrenceUnit === "month" &&
              customRecurrencePosition === "on"))
            ? schema
                .min(1, "At least one day is required")
                .required("Day(s) of month is required")
            : Yup.array()
      ),
    customRecurrencePosition: Yup.string().when(
      ["isRecurring", "recurrenceType", "customRecurrenceUnit"],
      (isRecurring, recurrenceType, customRecurrenceUnit, schema) =>
        isRecurring &&
        recurrenceType === "custom" &&
        customRecurrenceUnit === "month"
          ? schema
              .required("Position is required")
              .oneOf(["on", "first", "second", "third", "fourth", "last"])
          : Yup.string()
    ),
    customRecurrenceWeekday: Yup.string().when(
      [
        "isRecurring",
        "recurrenceType",
        "customRecurrenceUnit",
        "customRecurrencePosition",
      ],
      (
        isRecurring,
        recurrenceType,
        customRecurrenceUnit,
        customRecurrencePosition,
        schema
      ) =>
        isRecurring &&
        recurrenceType === "custom" &&
        customRecurrenceUnit === "month" &&
        customRecurrencePosition !== "on"
          ? schema
              .required("Weekday is required")
              .oneOf([
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
              ])
          : Yup.string()
    ),
    endType: Yup.string()
      .required("End type is required")
      .oneOf(["never", "on", "after"]),
    endOn: Yup.string().test(
      "end-date-validation",
      "End date is required and must be a valid date when recurring and endType is 'on'",
      function (value) {
        const { isRecurring, endType } = this.parent;
        if (isRecurring && endType === "on") {
          return !!value && !isNaN(new Date(value).getTime());
        }
        return true;
      }
    ),
    occurrences: Yup.number()
      .transform((value, originalValue) =>
        originalValue === "" ? undefined : value
      )
      .when(["isRecurring", "endType"], (isRecurring, endType, schema) =>
        isRecurring && endType === "after"
          ? schema
              .required("Number of occurrences is required")
              .min(1, "Number of occurrences must be at least 1")
          : Yup.number()
      ),
    billable: Yup.boolean(),
    requiresTravel: Yup.boolean(),
    colorCode: Yup.string(),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      startTime: "", 
      endTime: "",
      client: "",
      sessionType: "",
      clinicians: [],
      service: [{ serviceType: "", modifierType: "" }],
      serviceLocation: "",
      isRecurring: false,
      recurrenceType: "day",
      recurrenceDays: [],
      customRecurrenceInterval: "",
      customRecurrenceUnit: "month",
      customRecurrenceDay: [],
      customRecurrencePosition: "on",
      customRecurrenceWeekday: "",
      endType: "never",
      endOn: "",
      occurrences: "1",
      billable: true,
      requiresTravel: false,
      colorCode: "#000000",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "service",
  });

  // Watch form fields
  const isRecurring = watch("isRecurring");
  const recurrenceType = watch("recurrenceType");
  const customRecurrenceUnit = watch("customRecurrenceUnit");
  const customRecurrencePosition = watch("customRecurrencePosition");
  const endType = watch("endType");
  const sessionType = watch("sessionType");
  const clinicians = watch("clinicians");
  const service = watch("service");

  useEffect(() => {

    if (initialData && isEditMode) {
    return;
  }
    if (!sessionType) {
      setValue("service", [{ serviceType: "", modifierType: "" }]);
      return;
    }

    const selectedSession = sessionTypes.find((st) => st.id === sessionType);
    if (!selectedSession) {
      setValue("service", [{ serviceType: "", modifierType: "" }]);
      return;
    }

    const mappedServices = (selectedSession.service || []).map((svc) => ({
      serviceType: svc.serviceType || "",
      modifierType: svc.modifierType || "",
    }));

    setValue(
      "service",
      mappedServices.length
        ? mappedServices
        : [{ serviceType: "", modifierType: "" }]
    );

    const now = new Date();
    const end = new Date(
      now.getTime() + (selectedSession.defaultDuration || 60) * 60_000
    );
    setValue("startTime", now.toTimeString().slice(0, 5));
    setValue("endTime", end.toTimeString().slice(0, 5));

    const [firstLoc] = selectedSession.locationsAllowed || ["Clinic/Center"];
    if (firstLoc) setValue("serviceLocation", firstLoc);

    const invalid = clinicians
      .map((id) => clinicianOptions.find((c) => c.value === id))
      .filter(Boolean)
      .filter(
        (clin) => !(selectedSession.staffRolesAllowed || []).includes(clin.role)
      );

    setWarnings((prev) => {
      const next = prev.filter((w) => w.type !== "clinicianRole");
      if (invalid.length)
        next.push({
          type: "clinicianRole",
          message:
            "Please review your selections and ensure only eligible clinicians are assigned to this appointment.",
        });
      return next;
    });
  }, [sessionType, clinicians, sessionTypes, clinicianOptions, setValue]);


useEffect(() => {
  if (initialData && isEditMode) {
    const normalizeTime = (time) => {
      if (!time) return "";
      if (typeof time === "string") {
        const timeWithoutSeconds = time.replace(/:\d{2}$/, "");
        const parts = timeWithoutSeconds.split(":");
        if (parts.length === 2) {
          const hours = parts[0].padStart(2, "0");
          const minutes = parts[1].padStart(2, "0");
          return `${hours}:${minutes}`;
        }
      }
      return time;
    };
    console.log(initialData)

    const formattedData = {
      date: initialData.date
        ? format(new Date(initialData.date), "yyyy-MM-dd")
        : new Date().toISOString().split("T")[0],
      startTime: normalizeTime(initialData.startTime),
      endTime: normalizeTime(initialData.endTime),
      client: initialData.clientId || initialData.client || "",
      sessionType: initialData.sessionType || "",
      clinicians: Array.isArray(initialData.clinicians)
        ? initialData.clinicians.map((c) => c.id.toString()) // Transform to array of IDs
        : [],
      service:
        initialData.service && initialData.service.length > 0
          ? initialData.service
          : [{ serviceType: "", modifierType: "" }],
      serviceLocation: initialData.serviceLocation || "",
      isRecurring: initialData.isRecurring || false,
      recurrenceType: initialData.recurrence?.type || "day",
      recurrenceDays: initialData.recurrence?.days || [],
      customRecurrenceInterval: initialData.recurrence?.interval?.toString() || "",
      customRecurrenceUnit: initialData.recurrence?.unit || "month",
      customRecurrenceDay: initialData.recurrence?.day
        ? Array.isArray(initialData.recurrence.day)
          ? initialData.recurrence.day
          : [parseInt(initialData.recurrence.day)]
        : [],
      customRecurrencePosition: initialData.recurrence?.position || "on",
      customRecurrenceWeekday: initialData.recurrence?.weekday || "",
      endType: initialData.recurrence?.endType || "never",
      endOn: initialData.recurrence?.endOn || "",
      occurrences: initialData.recurrence?.occurrences
        ? initialData.recurrence.occurrences.toString()
        : "1",
      billable: initialData.billable ?? true,
      requiresTravel: initialData.requiresTravel ?? false,
      colorCode: initialData.colorCode || "#000000",
    };

    reset(formattedData);

    
  }
}, [initialData, isEditMode, reset, watch]);

  const handleSubmitForm = async (data) => {
    setIsLoading(true);
    try {
      // Validate service array
      if (data.service.some((svc) => !svc.serviceType)) {
        throw new Error("All service types must be selected");
      }

      const recurrence = data.isRecurring
        ? {
            type: data.recurrenceType,
            endType: data.endType,
            ...(data.endType === "on" && { endOn: data.endOn }),
            ...(data.endType === "after" && {
              occurrences: parseInt(data.occurrences),
            }),
            ...(data.recurrenceType === "week" && {
              days: data.recurrenceDays,
            }),
            ...(data.recurrenceType === "month" && {
              day: data.customRecurrenceDay,
            }),
            ...(data.recurrenceType === "custom" && {
              interval: parseInt(data.customRecurrenceInterval),
              unit: data.customRecurrenceUnit,
              ...(data.customRecurrenceUnit === "week" && {
                days: data.recurrenceDays,
              }),
              ...(data.customRecurrenceUnit === "month" && {
                ...(data.customRecurrencePosition === "on"
                  ? { day: data.customRecurrenceDay }
                  : {
                      position: data.customRecurrencePosition,
                      weekday: data.customRecurrenceWeekday,
                    }),
              }),
            }),
          }
        : null;

      const appointmentData = {
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        client: data.client,
        sessionType: data.sessionType,
        clinicians: data.clinicians,
        service: data.service.map((svc) => ({
          serviceType: svc.serviceType,
          modifierType: svc.modifierType || "",
        })),
        serviceLocation: data.serviceLocation,
        isRecurring: data.isRecurring,
        recurrence,
        billable: data.billable,
        requiresTravel: data.requiresTravel,
        colorCode: data.colorCode,
      };

      
      console.log(
        "Form Data Submitted:",
        JSON.stringify(appointmentData, null, 2)
      );
      console.groupEnd();

      if (isEditMode && data.isRecurring) {
        setShowConfirmation(true);
      } else {
        await onSave(appointmentData);
        reset({
          date: new Date().toISOString().split("T")[0],
          startTime: "",
          endTime: "",
          client: "",
          sessionType: "",
          clinicians: [],
          service: [{ serviceType: "", modifierType: "" }],
          serviceLocation: "",
          isRecurring: false,
          recurrenceType: "day",
          recurrenceDays: [],
          customRecurrenceInterval: "",
          customRecurrenceUnit: "month",
          customRecurrenceDay: [],
          customRecurrencePosition: "on",
          customRecurrenceWeekday: "",
          endType: "never",
          endOn: "",
          occurrences: "1",
          billable: true,
          requiresTravel: false,
          colorCode: "#000000",
        });
        onClose();
      }
    } catch (error) {
      console.error("Submission error:", error.message);
      // Display error to user
      showToast(error.message); // Replace with toast notification if preferred
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSave = async (scope) => {
    setIsLoading(true); // Set loading state
    try {
      const data = watch();
      const recurrence = data.isRecurring
        ? (() => {
            const baseRecurrence = {
              type: data.recurrenceType,
              endType: data.endType,
            };

            if (data.endType === "on") baseRecurrence.endOn = data.endOn;
            if (data.endType === "after")
              baseRecurrence.occurrences = parseInt(data.occurrences);

            if (data.recurrenceType === "week")
              return { ...baseRecurrence, days: data.recurrenceDays };
            if (data.recurrenceType === "month")
              return { ...baseRecurrence, day: data.customRecurrenceDay };
            if (data.recurrenceType === "custom") {
              const customRecurrence = {
                ...baseRecurrence,
                interval: parseInt(data.customRecurrenceInterval),
                unit: data.customRecurrenceUnit,
              };
              if (data.customRecurrenceUnit === "week")
                customRecurrence.days = data.recurrenceDays;
              if (data.customRecurrenceUnit === "month") {
                if (data.customRecurrencePosition === "on")
                  customRecurrence.day = data.customRecurrenceDay;
                else {
                  customRecurrence.position = data.customRecurrencePosition;
                  customRecurrence.weekday = data.customRecurrenceWeekday;
                }
              }
              return customRecurrence;
            }
            return baseRecurrence;
          })()
        : null;

      const appointmentData = {
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        client: data.client,
        sessionType: data.sessionType,
        clinicians: data.clinicians,
        service: data.service,
        serviceLocation: data.serviceLocation,
        isRecurring: data.isRecurring,
        recurrence,
        billable: data.billable,
        requiresTravel: data.requiresTravel,
        colorCode: data.colorCode,
        scope: scope,
      };
   

      await onSave(appointmentData);
      reset({
        date: new Date().toISOString().split("T")[0],
        startTime: "",
        endTime: "",
        client: "",
        sessionType: "",
        clinicians: [],
        service: [{ serviceType: "", modifierType: "" }],
        serviceLocation: "",
        isRecurring: false,
        recurrenceType: "day",
        recurrenceDays: [],
        customRecurrenceInterval: "",
        customRecurrenceUnit: "month",
        customRecurrenceDay: [],
        customRecurrencePosition: "on",
        customRecurrenceWeekday: "",
        endType: "never",
        endOn: "",
        occurrences: "1",
        billable: true,
        requiresTravel: false,
        colorCode: "#000000",
      });
      onClose();
      setShowConfirmation(false);
    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  const onSubmitWithErrorHandling = (data) => {
    handleSubmitForm(data);
  };

  const onError = (errors) => {
    console.group("Form Validation Errors");
    const simplifiedErrors = Object.keys(errors).reduce((acc, key) => {
      const error = errors[key];
      if (error.message)
        acc[key] = { message: error.message, type: error.type };
      else if (Array.isArray(error))
        acc[key] = error.map((item, index) => ({
          index,
          message: item.message,
          type: item.type,
        }));
      else if (typeof error === "object")
        acc[key] = Object.keys(error).reduce((subAcc, subKey) => {
          if (error[subKey].message)
            subAcc[subKey] = {
              message: error[subKey].message,
              type: error[subKey].type,
            };
          return subAcc;
        }, {});
      return acc;
    }, {});
    console.error(
      "Validation failed with errors:",
      JSON.stringify(simplifiedErrors, null, 2)
    );
    console.groupEnd();
  };

  const handleColorChange = (color) => {
    setValue("colorCode", color);
    setShowColorPicker(false);
  };

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

  const handleColorPickerToggle = () => {
    setShowColorPicker(true);
  };

  const mapDays = useCallback(
    ({ date }) => {
      const selectedDays = watch("customRecurrenceDay") || [];
      const isSelected = selectedDays.includes(date.day);
      return {
        className: isSelected ? "highlight-selected" : "",
      };
    },
    [watch]
  );

  const renderMainForm = () => (
    <div className="space-y-4">
      <Controller
        name="client"
        control={control}
        render={({ field }) => (
          <SearchableSelectInput
            label="Client *"
            options={clientOptions}
            placeholder="Select Client"
            className="rounded-12px"
            error={errors.client?.message}
            {...field}
            disabled={isEditMode}
          />
        )}
      />
      <Controller
        name="sessionType"
        control={control}
        render={({ field }) => (
          <SearchableSelectInput
            label="Session Type *"
            options={sessionTypeOptions}
            placeholder="Select Session Type"
            className="rounded-12px"
            error={errors.sessionType?.message}
            {...field}
          />
        )}
      />
      <Controller
        name="clinicians"
        control={control}
        render={({ field }) => (
          <SelectInput
            label="Clinician(s) *"
            options={clinicianOptions}
            placeholder="Select Clinician(s)"
            className="rounded-12px"
            isMulti={true}
            error={errors.clinicians?.message}
            {...field}
          />
        )}
      />
      {warnings.some((w) => w.type === "clinicianRole") && (
        <div className="text-yellow-800 text-sm mb-4">
          {warnings
            .filter((w) => w.type === "clinicianRole")
            .map((warning, index) => (
              <p key={index}>{warning.message}</p>
            ))}
        </div>
      )}
      <p className="text-base text-gray-600 font-semibold">
        Service and CPT Code(s)
      </p>
      {fields.map((item, index) => (
        <div key={item.id} className="flex gap-4 items-center mb-2">
          <div className="flex-1">
            <Controller
              name={`service.${index}.serviceType`}
              control={control}
              render={({ field }) => (
                <SelectInput
                  label={`Service Type * ${index + 1}`}
                  options={serviceTypeOptions}
                  placeholder="Select Service Type"
                  error={errors.service?.[index]?.serviceType?.message}
                  value={field.value || ""}
                  onChange={(value) => field.onChange(value || "")}
                  className="rounded-12px"
                  {...field}
                />
              )}
            />
          </div>
          <div className="flex-1">
            <Controller
              name={`service.${index}.modifierType`}
              control={control}
              render={({ field }) => (
                <SelectInput
                  label={`Modifier ${index + 1}`}
                  options={[{ value: "", label: "None" }, ...modifierOptions]}
                  placeholder="Select Modifier"
                  error={errors.service?.[index]?.modifierType?.message}
                  value={field.value || ""}
                  onChange={(value) => field.onChange(value || "")}
                  className="rounded-12px"
                  {...field}
                />
              )}
            />
          </div>
          {fields.length > 1 && (
            <button
              type="button"
              className="text-red-500 hover:text-red-700"
              onClick={() => remove(index)}
              aria-label="Remove Service"
            >
              <FaTrash />
            </button>
          )}
        </div>
      ))}
      <Button
        icon={<FaPlus />}
        variant="secondary"
        label="Add"
        onClick={() => {
          const currentServices = watch("service");
          if (currentServices.some((svc) => !svc.serviceType)) {
            showToast(
              "Please select a service type for all existing rows before adding a new one."
            );
            return;
          }
          append({ serviceType: "", modifierType: "" });
        }}
      />
      <div className="mt-6">
        <TextInput
          label="Date *"
          type="date"
          {...register("date")}
          placeholder="Select a Date"
          width="full"
          error={errors.date?.message}
        />
      </div>

      <div className="py-2 px-2 rounded-md bg-gray-100 mb-6 mt-6">
        <CheckboxInput
          label="This is a recurring event"
          {...register("isRecurring")}
        />
        {isRecurring && (
          <>
            <p className="text-sm text-gray-400 font-semibold mt-4">
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
              <div className="flex gap-2 mt-2 mb-6">
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
                  <div className="text-red-500 text-xs mt-1">
                    {errors.recurrenceDays.message}
                  </div>
                )}
              </div>
            )}
            {recurrenceType === "month" && (
              <div className="mb-6">
                <Controller
                  name="customRecurrenceDay"
                  control={control}
                  render={({ field }) => (
                    <div className="mt-2">
                      <label className="text-sm text-gray-600 font-semibold mr-05">
                        On day(s) of the month
                      </label>
                      <DatePicker
                        key={forceUpdate}
                        ref={datePickerRef}
                        value={field.value.map((day) => new Date(2025, 0, day))}
                        onChange={(dates) => {
                          const days = dates
                            ? dates.map((date) => date.day).filter(Boolean)
                            : [];
                          field.onChange(days);
                          setForceUpdate((prev) => prev + 1);
                        }}
                        multiple
                        format="D"
                        placeholder="Select days (e.g., 1, 5, 15)"
                        render={(value, openCalendar) => (
                          <CustomDatePickerInput
                            value={value}
                            onClick={openCalendar}
                            onFocus={openCalendar}
                            placeholder="Select days (e.g., 1, 5, 15)"
                            error={errors.customRecurrenceDay}
                          />
                        )}
                        mapDays={mapDays}
                        calendarPosition="bottom-left"
                        className="custom-datepicker ml-4"
                      />
                      {errors.customRecurrenceDay?.message && (
                        <div className="text-red-500 text-xs mt-1">
                          {errors.customRecurrenceDay.message}
                        </div>
                      )}
                    </div>
                  )}
                />
              </div>
            )}
            {recurrenceType === "custom" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <p className="text-sm text-gray-400 font-semibold">
                    Repeats every
                  </p>
                  <div style={{ marginBottom: "-15px" }}>
                    <TextInput
                      type="text"
                      {...register("customRecurrenceInterval")}
                      width="50"
                      className="rounded-20px"
                      error={errors.customRecurrenceInterval?.message}
                    />
                  </div>
                  <div style={{ marginBottom: "-15px" }}>
                    <Controller
                      name="customRecurrenceUnit"
                      control={control}
                      render={({ field }) => (
                        <SelectInput
                          value={field.value}
                          onChange={(value) => field.onChange(value)}
                          options={[
                            { value: "day", label: "Day(s)" },
                            { value: "week", label: "Week(s)" },
                            { value: "month", label: "Month(s)" },
                          ]}
                          className="rounded-20px"
                          width="150"
                          error={errors.customRecurrenceUnit?.message}
                          {...field}
                        />
                      )}
                    />
                  </div>
                </div>
                {customRecurrenceUnit === "month" && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-4">
                      <div style={{ marginBottom: "-20px" }}>
                        <Controller
                          name="customRecurrencePosition"
                          control={control}
                          render={({ field }) => (
                            <RadioInput
                              label="On day"
                              value="on"
                              checked={field.value === "on"}
                              onChange={() => {
                                field.onChange("on");
                                setValue("customRecurrenceWeekday", "");
                              }}
                            />
                          )}
                        />
                      </div>
                      {customRecurrencePosition === "on" && (
                        <Controller
                          name="customRecurrenceDay"
                          control={control}
                          render={({ field }) => (
                            <div className="mt-2">
                              <DatePicker
                                key={forceUpdate}
                                ref={datePickerRef}
                                value={field.value.map(
                                  (day) => new Date(2025, 0, day)
                                )}
                                onChange={(dates) => {
                                  const days = dates
                                    ? dates
                                        .map((date) => date.day)
                                        .filter(Boolean)
                                    : [];
                                  field.onChange(days);
                                  setForceUpdate((prev) => prev + 1);
                                }}
                                multiple
                                format="D"
                                placeholder="Select days (e.g., 1, 5, 15)"
                                render={(value, openCalendar) => (
                                  <CustomDatePickerInput
                                    value={value}
                                    onClick={openCalendar}
                                    onFocus={openCalendar}
                                    placeholder="Select days (e.g., 1, 5, 15)"
                                    error={errors.customRecurrenceDay}
                                  />
                                )}
                                mapDays={mapDays}
                                calendarPosition="bottom-left"
                                className="custom-datepicker"
                                style={{ width: "150px" }}
                              />
                              {errors.customRecurrenceDay?.message && (
                                <div className="text-red-500 text-xs mt-1">
                                  {errors.customRecurrenceDay.message}
                                </div>
                              )}
                            </div>
                          )}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <Controller
                        name="customRecurrencePosition"
                        control={control}
                        render={({ field }) => (
                          <RadioInput
                            label="On the"
                            value="first"
                            checked={field.value !== "on"}
                            onChange={() => {
                              field.onChange("first");
                              setValue("customRecurrenceDay", []);
                            }}
                          />
                        )}
                      />
                      {customRecurrencePosition !== "on" && (
                        <>
                          <Controller
                            name="customRecurrencePosition"
                            control={control}
                            render={({ field }) => (
                              <SelectInput
                                value={field.value}
                                onChange={(value) => field.onChange(value)}
                                options={[
                                  { value: "first", label: "First" },
                                  { value: "second", label: "Second" },
                                  { value: "third", label: "Third" },
                                  { value: "fourth", label: "Fourth" },
                                  { value: "last", label: "Last" },
                                ]}
                                className="rounded-20px"
                                width="200"
                                error={errors.customRecurrencePosition?.message}
                                {...field}
                              />
                            )}
                          />
                          <Controller
                            name="customRecurrenceWeekday"
                            control={control}
                            render={({ field }) => (
                              <SelectInput
                                value={field.value}
                                onChange={(value) => field.onChange(value)}
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
                                width="200"
                                error={errors.customRecurrenceWeekday?.message}
                                {...field}
                              />
                            )}
                          />
                        </>
                      )}
                    </div>
                  </div>
                )}
                {customRecurrenceUnit === "week" && (
                  <div className="flex gap-2 mt-4 mb-6">
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
                      <div className="text-red-500 text-xs mt-1">
                        {errors.recurrenceDays.message}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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
              <TextInput
                label="End On"
                type="date"
                {...register("endOn")}
                width="full"
                error={errors.endOn?.message}
              />
            )}
            {endType === "after" && (
              <Controller
                name="occurrences"
                control={control}
                render={({ field }) => (
                  <SelectInput
                    label="Number of occurrences"
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    options={Array.from({ length: 50 }, (_, i) => ({
                      value: (i + 1).toString(),
                      label: (i + 1).toString(),
                    }))}
                    width="full"
                    error={errors.occurrences?.message}
                    className="rounded-12px"
                    {...field}
                  />
                )}
              />
            )}
          </>
        )}
      </div>

     <div className="flex gap-4">
  <div className="flex-1">
    <Controller
      name="startTime"
      control={control}
      render={({ field }) => (
        <TextInput
          label="Start Time *"
          type="time"
          value={field.value || ""}
          onChange={(e) => {
           
            field.onChange(e.target.value);
          }}
          onBlur={field.onBlur}
          placeholder="HH:MM"
          width="full"
          error={errors.startTime?.message}
        />
      )}
    />
  </div>
  <div className="flex-1">
    <Controller
      name="endTime"
      control={control}
      render={({ field }) => (
        <TextInput
          label="End Time *"
          type="time"
          value={field.value || ""}
          onChange={(e) => {
           
            field.onChange(e.target.value);
          }}
          onBlur={field.onBlur}
          placeholder="HH:MM"
          width="full"
          error={errors.endTime?.message}
        />
      )}
    />
  </div>
</div>
      <div className="py-2 px-2 rounded-md bg-gray-150 mt-6 mb-6">
        <Controller
          name="billable"
          control={control}
          render={({ field }) => (
            <CheckboxInput
              label="This appointment is billable"
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
            />
          )}
        />
      </div>
      <Controller
        name="serviceLocation"
        control={control}
        render={({ field }) => (
          <SelectInput
            label="Service Location *"
            options={locationOptions} // Use all possible locations
            value={field.value}
            onChange={(value) => field.onChange(value)}
            className="rounded-12px"
            isMulti={false}
            error={errors.serviceLocation?.message}
            {...field}
          />
        )}
      />
      <div className="py-2 px-2 rounded-md bg-gray-150 mt-6 mb-6">
        <Controller
          name="requiresTravel"
          control={control}
          render={({ field }) => (
            <CheckboxInput
              label="This appointment requires travel"
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
            />
          )}
        />
      </div>
      <div className="color-picker-container mb-6">
        <div
          className="color-picker-row"
          style={{ display: "flex", alignItems: "center" }}
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
            type="button"
            onClick={handleColorPickerToggle}
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
          <div className="text-red-500 text-xs mt-1">
            {errors.colorCode.message}
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
          isLoading={isLoading}
        />
        <Button
          variant="secondary"
          label="All Events in This Series"
          onClick={() => handleConfirmSave("all")}
          isLoading={isLoading}
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
      title={isEditMode ? "Edit Appointment" : "Create a New Appointment"}
      titleIcon={<GoCalendar />}
      primaryButtonText={
        showConfirmation ? null : isEditMode ? "Save" : "Create Appointment"
      }
      secondaryButtonText={showConfirmation ? null : "Cancel"}
      onPrimaryButtonClick={
        showConfirmation
          ? undefined
          : handleSubmit(onSubmitWithErrorHandling, onError)
      }
      onSecondaryButtonClick={showConfirmation ? undefined : onClose}
      primaryButtonLoading={isLoading} // Pass isLoading to ReusableModal
      size="medium"
    >
      {showConfirmation ? renderConfirmation() : renderMainForm()}
    </ReusableModal>
  );
};

export default AppointmentModal;

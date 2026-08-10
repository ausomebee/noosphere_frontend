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
  RequiredMark,
} from "../../Input/Inputs";
import ColorPicker from "../../ColorPicker";
import Button from "../../Button/Button";
import { FaPlus, FaTrash } from "react-icons/fa";
import DatePicker from "react-multi-date-picker";
import { format } from "date-fns";
import api2 from "../../../api/billingAndPaymentsApi";
import useAuth from "../../../hooks/useAuth";
import { locationOptions, modifierOptions } from "../../../Data/selectOptions";
import useReduxFormDraft from "../../../hooks/useReduxFormDraft";

const AppointmentModal = ({
  isOpen,
  onClose,
  initialData,
  isEditMode = false,
  presetSlot,
  onSave,
  clients,
  sessionTypes,
  staff,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serviceCodes, setServiceCodes] = useState([]);
  const [loadingServiceCodes, setLoadingServiceCodes] = useState(false);

  const { tenantId, accessToken, refreshToken } = useAuth();

  const datePickerRef = useRef(null);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Fetch real service codes from tenant
  const fetchServiceCodes = useCallback(async () => {
    if (!tenantId || !accessToken) return;
    setLoadingServiceCodes(true);
    try {
      const response = await api2.GetTenantServiceCodeByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const data = response?.data || [];
      const options = data
        .filter((item) => !item.isDeleted && item.isActive)
        .map((item) => ({
          value: item.id,
          label: `${item.code} - ${item.description || "No description"}`,
        }));
      setServiceCodes(options);
    } catch (error) {
      console.error("Failed to load service codes:", error);
    } finally {
      setLoadingServiceCodes(false);
    }
  }, [tenantId, accessToken, refreshToken]);

  useEffect(() => {
    if (isOpen) fetchServiceCodes();
  }, [isOpen, fetchServiceCodes]);

  // Map clients and staff
  const clientOptions = useMemo(
    () =>
      clients.map((client) => ({
        value: client.clientId,
        label:
          `${client.client.firstName || ""} ${
            client.client.lastName || ""
          }`.trim() || "Unknown Client",
      })),
    [clients]
  );

  const clinicianOptions = useMemo(
    () =>
      staff
        .filter((s) => s.active !== false)
        .map((s) => ({
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
          serviceCodeId: Yup.string().required("Service code is required"),
          modifier: Yup.string().nullable(),
        })
      )
      .min(1, "At least one service is required"),
    serviceLocation: Yup.string().required("Service location is required"),
    isRecurring: Yup.boolean(),
    recurrenceType: Yup.string().when("isRecurring", {
      is: true,
      then: (schema) =>
        schema
          .required("Recurrence type is required")
          .oneOf(["day", "week", "month", "custom"]),
      otherwise: () => Yup.string(),
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
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(validationSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      startTime: "",
      endTime: "",
      client: "",
      sessionType: "",
      clinicians: [],
      service: [],
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

  // Only persist a draft when creating; in edit mode the appointment record is
  // the source of truth and a stale draft would clobber it / poison isDirty.
  const clearDraft = useReduxFormDraft("add-appointment", { watch, reset, isOpen: isOpen && !isEditMode, exclude: [] });

  const { fields, append, replace, remove } = useFieldArray({
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

  // The fetched tenant service codes don't always include the seeded codes a
  // session type references, so react-select can't render a selected value
  // that isn't in its options. Merge in the serviceCode objects embedded in
  // the selected session type (and the appointment being edited) so the
  // dropdown can always display what was auto-populated.
  const serviceCodeOptions = useMemo(() => {
    const merged = [...serviceCodes];
    const seen = new Set(merged.map((o) => o.value));
    const addCode = (sc) => {
      if (sc?.id && !seen.has(sc.id)) {
        seen.add(sc.id);
        merged.push({
          value: sc.id,
          label: `${sc.code} - ${sc.description || "No description"}`,
        });
      }
    };
    const selected = sessionTypes.find((st) => st.id === sessionType);
    (selected?.sessionTypeServices || []).forEach((svc) =>
      addCode(svc.serviceCode)
    );
    (initialData?.service || []).forEach((svc) => addCode(svc.serviceCode));
    return merged;
  }, [serviceCodes, sessionTypes, sessionType, initialData]);

  // Same problem for modifiers: values like "UB"/"Group" aren't in the static
  // modifier list, so merge any populated modifier values in as options.
  const modifierSelectOptions = useMemo(() => {
    const merged = [...modifierOptions];
    const seen = new Set(merged.map((o) => o.value));
    const addMod = (m) => {
      if (m && !seen.has(m)) {
        seen.add(m);
        merged.push({ value: m, label: m });
      }
    };
    const selected = sessionTypes.find((st) => st.id === sessionType);
    (selected?.sessionTypeServices || []).forEach((svc) => {
      addMod(svc.modifiers?.modifier1);
      addMod(svc.modifiers?.modifier);
    });
    (initialData?.service || []).forEach((svc) =>
      addMod(svc.modifier || svc.modifierType)
    );
    return merged;
  }, [sessionTypes, sessionType, initialData]);

  // Auto-populate service codes and modifiers when session type changes
  useEffect(() => {
    if (isEditMode && initialData) return;

    if (!sessionType) {
      replace([]);
      return;
    }

    const selectedSession = sessionTypes.find((st) => st.id === sessionType);
    if (
      !selectedSession ||
      !selectedSession.sessionTypeServices ||
      selectedSession.sessionTypeServices.length === 0
    ) {
      replace([]);
      return;
    }

    const mappedServices = selectedSession.sessionTypeServices.map((svc) => {
      let defaultModifier =
        svc.modifiers?.modifier1 || svc.modifiers?.modifier || "";
      if (!defaultModifier && svc.serviceCode?.modifiers?.modifier1) {
        defaultModifier = svc.serviceCode.modifiers.modifier1;
      }

      return {
        serviceCodeId: svc.serviceCodeId,
        modifier: defaultModifier,
      };
    });

    replace(mappedServices);

    const duration = selectedSession.defaultDuration || 60;
    const now = new Date();
    const end = new Date(now.getTime() + duration * 60 * 1000);
    setValue("startTime", now.toTimeString().slice(0, 5));
    setValue("endTime", end.toTimeString().slice(0, 5));

    if (
      selectedSession.locationsAllowed &&
      selectedSession.locationsAllowed.length > 0
    ) {
      setValue("serviceLocation", selectedSession.locationsAllowed[0]);
    }
  }, [sessionType, sessionTypes, setValue, replace, isEditMode, initialData]);

  // Create mode opened from a calendar slot: pre-fill only the DATE (the time
  // is left blank and handled by the session-type logic / the user).
  useEffect(() => {
    if (isOpen && !isEditMode && presetSlot?.date) {
      setValue("date", presetSlot.date);
    }
  }, [isOpen, isEditMode, presetSlot, setValue]);

  // Edit mode: populate from initialData
  useEffect(() => {
    if (!isEditMode || !initialData) return;

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

    // Map service correctly: use serviceCodeId and modifierType → modifier
    const mappedServices = (initialData.service || []).map((svc) => ({
      serviceCodeId: svc.serviceCodeId || "",
      modifier: svc.modifierType || "", // ← Key fix: map modifierType → modifier
    }));

    const formattedData = {
      date: initialData.date
        ? format(new Date(initialData.date), "yyyy-MM-dd")
        : new Date().toISOString().split("T")[0],
      startTime: normalizeTime(initialData.startTime),
      endTime: normalizeTime(initialData.endTime),
      client: initialData.clientId || "",
      sessionType: initialData.sessionType || "",
      clinicians: initialData.clinicianIds || [], // Already array of strings
      service:
        mappedServices.length > 0
          ? mappedServices
          : [{ serviceCodeId: "", modifier: "" }],
      serviceLocation: initialData.serviceLocation || "",
      isRecurring: initialData.isRecurring || false,
      recurrenceType: initialData.recurrence?.type || "day",
      recurrenceDays: initialData.recurrence?.days || [],
      customRecurrenceInterval:
        initialData.recurrence?.interval?.toString() || "",
      customRecurrenceUnit: initialData.recurrence?.unit || "month",
      customRecurrenceDay: initialData.recurrence?.day
        ? Array.isArray(initialData.recurrence.day)
          ? initialData.recurrence.day.map(Number)
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
    // Force replace the field array to ensure UI updates
    replace(
      mappedServices.length > 0
        ? mappedServices
        : [{ serviceCodeId: "", modifier: "" }]
    );
  }, [initialData, isEditMode, reset, replace]);
  // Clinician role warning - FIXED
  useEffect(() => {
    if (!sessionType) return;

    const selectedSession = sessionTypes.find((st) => st.id === sessionType);
    if (!selectedSession) return;

    const allowedRoles = selectedSession.staffRolesAllowed || [];

    const invalid = clinicians
      .map((id) => clinicianOptions.find((c) => c.value === id))
      .filter(Boolean)
      .filter((clin) => !allowedRoles.includes(clin.role));

    setWarnings((prev) => {
      const next = prev.filter((w) => w.type !== "clinicianRole");
      if (invalid.length > 0) {
        next.push({
          type: "clinicianRole",
          message:
            "Please review your selections and ensure only eligible clinicians are assigned to this appointment.",
        });
      }
      return next;
    });
  }, [sessionType, clinicians, sessionTypes, clinicianOptions]);

  const handleSubmitForm = async (data) => {
    setIsLoading(true);
    try {
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
        clinicians: data.clinicians, // ← FIXED: No wrapping, just array of IDs
        service: data.service.map((svc) => ({
          serviceCodeId: svc.serviceCodeId,
          modifiers: {
            modifier: svc.modifier || "",
          },
        })),
        serviceLocation: data.serviceLocation,
        isRecurring: data.isRecurring,
        recurrence, // ← FIXED: Now properly included
        billable: data.billable,
        requiresTravel: data.requiresTravel,
        colorCode: data.colorCode,
      };

      if (isEditMode && data.isRecurring) {
        setShowConfirmation(true);
      } else {
        await onSave(appointmentData);
        clearDraft();
        reset({
          date: new Date().toISOString().split("T")[0],
          startTime: "",
          endTime: "",
          client: "",
          sessionType: "",
          clinicians: [],
          service: [],
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
    } catch {
      // Parent handles the error toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSave = async (scope) => {
    setIsLoading(true);
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
        clinicians: data.clinicians, // ← Array of IDs only
        service: data.service.map((svc) => ({
          serviceCodeId: svc.serviceCodeId,
          modifiers: {
            modifier: svc.modifier || "",
          },
        })),
        serviceLocation: data.serviceLocation,
        isRecurring: data.isRecurring,
        recurrence, // ← Included here too
        billable: data.billable,
        requiresTravel: data.requiresTravel,
        colorCode: data.colorCode,
        scope: scope,
      };

      await onSave(appointmentData);
      clearDraft();
      reset({
        date: new Date().toISOString().split("T")[0],
        startTime: "",
        endTime: "",
        client: "",
        sessionType: "",
        clinicians: [],
        service: [],
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
      setIsLoading(false);
    }
  };

  const onSubmitWithErrorHandling = (data) => {
    handleSubmitForm(data);
  };

  const onError = (errors) => {
    console.group("Form Validation Errors");
    console.error(JSON.stringify(errors, null, 2));
    console.groupEnd();
  };

  const handleColorChange = (color) => {
    // ChromePicker fires live while dragging; keep the picker open and let
    // Confirm/Cancel close it (matches the control color picker behaviour).
    setValue("colorCode", color);
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
            required
            label="Client"
            options={clientOptions}
            emptyHint="No clients found. Create one in Clients."
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
            required
            label="Session Type"
            options={sessionTypeOptions}
            emptyHint="No session types found. Create one in Organisation → Practice Settings."
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
            emptyHint="No clinicians found. Create one in Organisation → Staff & Teams."
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
      {fields.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          No services defined for this session type.
        </p>
      ) : (
        fields.map((item, index) => (
          <div key={item.id} className="flex gap-4 items-end mb-4">
            <div className="flex-1">
              <Controller
                name={`service.${index}.serviceCodeId`}
                control={control}
                render={({ field }) => (
                  <SelectInput
                    required={index === 0}
                    label={index === 0 ? "Service Code (CPT/HCPCS)" : ""}
                    options={serviceCodeOptions}
                    emptyHint="No service codes found. Create one in Billing & Payments → Settings → Service Codes."
                    isLoading={loadingServiceCodes}
                    placeholder={
                      loadingServiceCodes
                        ? "Loading codes..."
                        : "Select service code"
                    }
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.service?.[index]?.serviceCodeId?.message}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="flex-1">
              <Controller
                name={`service.${index}.modifier`}
                control={control}
                render={({ field }) => (
                  <SelectInput
                    label={index === 0 ? "Modifier" : ""}
                    options={modifierSelectOptions}
                    placeholder="Select modifier (optional)"
                    isClearable
                    value={field.value}
                    onChange={field.onChange}
                    {...field}
                  />
                )}
              />
            </div>
            <button
              type="button"
              className="shrink-0 mb-1 p-2.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
              onClick={() => remove(index)}
              aria-label="Remove service code"
              title="Remove service code"
            >
              <FaTrash size={16} />
            </button>
          </div>
        ))
      )}
      <Button
        icon={<FaPlus />}
        variant="secondary"
        label="Add Service Code"
        onClick={() => append({ serviceCodeId: "", modifier: "" })}
      />
      <div className="mt-6">
        <TextInput
          required
          label="Date"
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
                      required
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
            <p className="text-sm text-gray-400 font-semibold">
              End On
              <RequiredMark required />
            </p>
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
                    required
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
                required
                label="Start Time"
                type="time"
                value={field.value || ""}
                onChange={(e) => field.onChange(e.target.value)}
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
                required
                label="End Time"
                type="time"
                value={field.value || ""}
                onChange={(e) => field.onChange(e.target.value)}
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
            required
            label="Service Location"
            options={locationOptions}
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
            role="button"
            tabIndex={0}
            onClick={handleColorPickerToggle}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleColorPickerToggle();
            }}
            title="Change colour"
            style={{
              backgroundColor: watch("colorCode") || "#000000",
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              display: "inline-block",
              cursor: "pointer",
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
      <div className="flex flex-col gap-3 mb-6">
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
          variant="ghost"
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
      primaryButtonLoading={isLoading}
      size="medium"
    >
      {showConfirmation ? renderConfirmation() : renderMainForm()}
    </ReusableModal>
  );
};

export default AppointmentModal;

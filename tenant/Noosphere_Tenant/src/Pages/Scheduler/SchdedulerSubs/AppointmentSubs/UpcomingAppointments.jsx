import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomTable from "../../../../Components/Table/CustomTable";
import { FiEdit, FiRefreshCw } from "react-icons/fi";
import { IoCheckmarkCircleOutline } from "react-icons/io5";
import { RxCross2 } from "react-icons/rx";
import AppointmentModal from "../../../../Components/ReusableModal/SchedulerModal/AppointmentModal";
import RescheduleModal from "../../../../Components/ReusableModal/SchedulerModal/RescheduleModal";
import CancelModal from "../../../../Components/ReusableModal/SchedulerModal/CancelModal";
import { useSelector } from "react-redux";
import { showToast } from "../../../../Helper/ShowToast";
import api from "../../../../api/AppointmentApi";
import { format } from "date-fns";

const UpcomingAppointments = ({ counts, setCounts }) => {
  const navigate = useNavigate();
  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const role = useSelector((s) => s.authentication?.user?.role?.name ?? "Client");
  const userId = useSelector((s) => s.authentication?.user?.id);
  const token = useSelector((s) => s.authentication?.user?.token);
  const accessToken = token;
  const refreshToken = token;
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [localAppointments, setLocalAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [sessionTypes, setSessionTypes] = useState([]);
  const [staff, setStaff] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);

  // Fetch appointments based on role
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      let response;
      if (role === "Admin") {
        response = await api.GetUpcomingAppointmentByTenantId({
          tenantId,
          accessToken,
          refreshToken,
        });
      } else {
        response = await api.GetUpcomingAppointmentByStaffId({
          staffId: userId,
          accessToken,
          refreshToken,
        });
      }
      if (response?.data?.data) {
        setAllAppointments(response.data.data);
        setLocalAppointments(
          response.data.data.map((appt) => {
            const serviceTypeText = appt.service?.map((s) => s.serviceType).join(", ") || "N/A";
            const truncatedServiceType =
              serviceTypeText.length > 20
                ? serviceTypeText.substring(0, 20) + "..."
                : serviceTypeText;
            const therapistNames = appt.clinicians?.map((c) => c.fullName) || [];
            const serviceTypes = appt.service?.map((s) => s.serviceType) || [];

            return {
              id: appt.id,
              clientId: appt.clientId,
              clientName: appt.client.fullName,
              therapistName: therapistNames.length > 0 ? therapistNames.join(", ") : "Unassigned",
              serviceType: truncatedServiceType,
              sessionType: appt.session.name,
              date: appt.date,
              time: appt.startTime && appt.endTime ? `${appt.startTime} - ${appt.endTime}` : "",
              hasActions: true,
              therapistNames,
              serviceTypes,
            };
          })
        );
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
      showToast(error.message || "Failed to fetch appointments", "error");
    }
  }, [role, tenantId, userId, accessToken, refreshToken]);

  // Fetch supporting data (clients, sessionTypes, staff)
  const fetchSupportingData = useCallback(async () => {
    try {
      setLoading(true);
      const sessionP = api
        .GetSessionTypeActiveByTenantId({ tenantId, accessToken, refreshToken })
        .then((r) => r.data.data)
        .catch(() => []);
      const clientP = api
        .GetClientByTenantId({ tenantId, accessToken, refreshToken })
        .then((r) => r.data.data)
        .catch(() => []);
      const staffP = api
        .GetTenantStaffByTenantId({ tenantId, accessToken, refreshToken })
        .then((r) => r.data.data)
        .catch(() => []);

      const [sess, clis, stf] = await Promise.all([sessionP, clientP, staffP]);

      setSessionTypes(sess);
      setClients(clis);
      setStaff(stf);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      showToast(error.message || "Failed to fetch supporting data", "error");
    }
  }, [tenantId, accessToken, refreshToken]);

  useEffect(() => {
    fetchAppointments();
    fetchSupportingData();
  }, [fetchAppointments, fetchSupportingData]);

  // Generate unique filter values and custom filter functions
  const filters = useMemo(() => {
    const uniqueTherapistNames = [
      ...new Set(localAppointments.flatMap((appt) => appt.therapistNames || [])),
    ]
      .filter(Boolean)
      .map((name) => ({ value: name, label: name }));
    const uniqueServiceTypes = [
      ...new Set(localAppointments.flatMap((appt) => appt.serviceTypes || [])),
    ]
      .filter(Boolean)
      .map((type) => ({ value: type, label: type }));
    const uniqueSessionTypes = [
      ...new Set(localAppointments.map((appt) => appt.sessionType)),
    ]
      .filter(Boolean)
      .map((type) => ({ value: type, label: type }));
    const uniqueDates = [
      ...new Set(localAppointments.map((appt) => appt.date)),
    ]
      .filter(Boolean)
      .map((date) => ({ value: date, label: date }));

    return [
      
      {
        value: "therapistNames",
        label: "Select Therapist",
        filterValues: uniqueTherapistNames,
        filterFunction: (row, value) => {
          return value ? row.therapistNames.includes(value) : true;
        },
      },
      {
        value: "sessionType",
        label: "Session Type",
        filterValues: uniqueSessionTypes,
        filterFunction: (row, value) => {
          return value ? row.sessionType === value : true;
        },
      },
      {
        value: "serviceTypes",
        label: "Service Type",
        filterValues: uniqueServiceTypes,
        filterFunction: (row, value) => {
          return value ? row.serviceTypes.includes(value) : true;
        },
      },
      {
        value: "dateTime",
        label: "Date",
        filterValues: uniqueDates,
        filterFunction: (row, value) => {
          return value ? row.date === value : true;
        },
      },
      
    ];
  }, [localAppointments]);

  const columns = [
    { header: "Client", key: "clientName", type: "text" },
    { header: "Clinician(s)", key: "therapistName", type: "text" },
    { header: "Service Type(s)", key: "serviceType", type: "text" },
    { header: "Sessions Type", key: "sessionType", type: "text" },
    { header: "Date", key: "date", type: "text" },
    { header: "Time", key: "time", type: "text" },
  ];

  const splitId = (id) => {
    if (!id) {
      showToast("Invalid appointment ID", "error");
      return { uuid: null, timestamp: null };
    }

    if (id.includes("_")) {
      const parts = id.split("_");
      if (parts.length !== 2) {
        showToast("Malformed appointment ID", "error");
        return { uuid: null, timestamp: null };
      }
      return { uuid: parts[0], timestamp: parts[1] };
    }
    return { uuid: id, timestamp: null };
  };

  const toUICard = (apiAppt, masters = []) => {
    if (!apiAppt || typeof apiAppt !== "object") {
      console.error("Invalid apiAppt provided to toUICard");
      return null;
    }

    const normalizeTime = (time) => {
      if (!time) return "";
      const match = time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
      if (!match) {
        console.warn(`Invalid time format: ${time}, returning empty string`);
        return "";
      }
      const [_, hours, minutes] = match;
      return `${hours.padStart(2, "0")}:${minutes}`;
    };

    const normalizeRecurrence = (recurrence) => {
      if (!recurrence) return null;
      const validTypes = ["day", "week", "month", "custom"];
      const validUnits = ["day", "week", "month"];
      const validPositions = ["on", "first", "second", "third", "fourth", "last"];
      const validWeekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      const normalized = {
        type: validTypes.includes(recurrence.type) ? recurrence.type : "day",
        interval: Number.isInteger(recurrence.interval) && recurrence.interval > 0 ? recurrence.interval : 1,
        unit: validUnits.includes(recurrence.unit) ? recurrence.unit : "day",
        days: Array.isArray(recurrence.days) ? recurrence.days : [],
        day: Array.isArray(recurrence.day) ? recurrence.day : [],
        position: validPositions.includes(recurrence.position) ? recurrence.position : "on",
        weekday: validWeekdays.includes(recurrence.weekday) ? recurrence.weekday : "",
        endType: ["never", "on", "after"].includes(recurrence.endType) ? recurrence.endType : "never",
        endOn: recurrence.endOn || "",
        occurrences: Number.isInteger(recurrence.occurrences) && recurrence.occurrences > 0 ? recurrence.occurrences : 1,
      };
      if (normalized.type !== recurrence.type) {
        console.warn(`Invalid recurrence type: ${recurrence.type}, defaulting to ${normalized.type}`);
      }
      return normalized;
    };

    const masterAppt = apiAppt.isRecurringInstance && apiAppt.parentId
      ? masters.find((m) => m.id === apiAppt.parentId) ?? apiAppt
      : apiAppt;

    const cliniciansRaw = apiAppt.clinicians || [];
    const clinicians = cliniciansRaw.map((c) => {
      if (typeof c === "object" && c.id) return c;
      const matched = apiAppt.staff?.find((s) => s.id === c);
      if (!matched) {
        console.warn(`No staff data found for clinician ID: ${c}`);
      }
      return matched ? { id: matched.id, fullName: matched.fullName } : { id: c, fullName: "Unknown Clinician" };
    });

    if (!apiAppt.client?.fullName) {
      console.debug(`Missing client fullName for appointment ID: ${apiAppt.id}`);
    }

    return {
      id: apiAppt.id,
      client: apiAppt.clientId,
      clientId: apiAppt.clientId,
      clientName: apiAppt.client?.fullName || "Unknown Client",
      tenantName: apiAppt.tenant?.companyName || "Unknown Tenant",
      clinicians,
      clinicianNames: clinicians.map((c) => c.fullName || "Unknown Clinician"),
      clinicianIds: clinicians.map((c) => c.id.toString()),
      service: apiAppt.service && apiAppt.service.length > 0
        ? apiAppt.service.map((svc) => ({
            serviceType: svc.serviceType || "",
            modifierType: svc.modifierType || "",
          }))
        : [{ serviceType: "", modifierType: "" }],
      sessionType: apiAppt.sessionId || apiAppt.session?.id || "",
      sessionName: apiAppt.session?.name || "Unknown Session",
      date: apiAppt.date ? format(new Date(apiAppt.date), "yyyy-MM-dd") : "",
      startTime: normalizeTime(apiAppt.startTime),
      endTime: normalizeTime(apiAppt.endTime),
      colorCode: apiAppt.colourCode || "#000000",
      serviceLocation: apiAppt.serviceLocation || "",
      isRecurring: masterAppt.isRecurring || false,
      recurrence: normalizeRecurrence(masterAppt.recurrence),
      billable: apiAppt.isBillable ?? true,
      requiresTravel: apiAppt.requiresTravel ?? false,
      isCanceled: apiAppt.isCanceled || false,
      relatedAppointments: apiAppt.relatedAppointments || [],
      rescheduled: apiAppt.rescheduled || false,
      rescheduleAccepted: apiAppt.rescheduleAccepted || false,
      parentId: apiAppt.parentId || null,
      isRecurringInstance: apiAppt.isRecurringInstance || false,
    };
  };

  const handleEditAppointment = (item) => {
    const originalAppt = allAppointments.find((appt) => appt.id === item.id);
    if (originalAppt) {
      const transformedData = toUICard(originalAppt, allAppointments);
      setSelectedAppointment(transformedData);
      setIsAppointmentModalOpen(true);
    } else {
      console.warn(`Original appointment not found for ID: ${item.id}`);
      setSelectedAppointment(null);
    }
  };

  const handleRescheduleAppointment = (item) => {
    const originalAppt = allAppointments.find((appt) => appt.id === item.id);
    if (originalAppt) {
      const transformedData = toUICard(originalAppt, allAppointments);
      setSelectedAppointment(transformedData);
      setIsRescheduleModalOpen(true);
    } else {
      console.warn(`Original appointment not found for ID: ${item.id}`);
      setSelectedAppointment(null);
    }
  };

  const handleCancelAppointment = (item) => {
    const originalAppt = allAppointments.find((appt) => appt.id === item.id);
    if (originalAppt) {
      const transformedData = toUICard(originalAppt, allAppointments);
      setSelectedAppointment(transformedData);
      setIsCancelModalOpen(true);
    } else {
      console.warn(`Original appointment not found for ID: ${item.id}`);
      setSelectedAppointment(null);
    }
  };

  const handleSaveAppointment = useCallback(
    async (appointmentData) => {
      try {
        const { uuid } = splitId(selectedAppointment?.id);
        if (!uuid) {
          showToast("Invalid appointment ID", "error");
          return;
        }

        const payload = {
          tenantId,
          id: uuid,
          clientId: appointmentData.client,
          sessionId: appointmentData.sessionType,
          clinicians: appointmentData.clinicians.map((id) => ({ id })),
          service: appointmentData.service,
          date: appointmentData.date,
          isRecurring: appointmentData.isRecurring,
          startTime: appointmentData.startTime,
          endTime: appointmentData.endTime,
          recurrence: appointmentData.recurrence || {},
          isBillable: appointmentData.billable,
          serviceLocation: appointmentData.serviceLocation,
          requiresTravel: appointmentData.requiresTravel,
          colourCode: appointmentData.colorCode,
          accessToken,
          refreshToken,
          relatedAppointment: uuid,
          forAll: appointmentData.scope === "all",
        };

        await api.UpdateAppointments(payload);
        showToast("Appointment updated successfully", "success");
        fetchAppointments();
        setIsAppointmentModalOpen(false);
        setSelectedAppointment(null);
      } catch (error) {
        showToast(error.message || "Failed to update appointment", "error");
      }
    },
    [accessToken, refreshToken, tenantId, selectedAppointment, fetchAppointments]
  );

  const handleSaveReschedule = useCallback(
    async (rescheduleData) => {
      try {
        const { uuid } = splitId(selectedAppointment?.id);
        if (!uuid) {
          showToast("Invalid appointment ID", "error");
          return;
        }

        const payload = {
          tenantId,
          id: uuid,
          date: rescheduleData.date,
          startTime: rescheduleData.startTime,
          endTime: rescheduleData.endTime,
          relatedAppointment: uuid,
          rescheduled: true,
          accessToken,
          refreshToken,
          forAll: rescheduleData.scope === "all",
        };

        await api.RescheduleAppointments(payload);
        showToast("Appointment rescheduled successfully", "success");
        fetchAppointments();
        setIsRescheduleModalOpen(false);
        setSelectedAppointment(null);
      } catch (error) {
        showToast(error.message || "Failed to reschedule appointment", "error");
      }
    },
    [accessToken, refreshToken, tenantId, selectedAppointment, fetchAppointments]
  );

  const handleSaveCancel = useCallback(
    async (cancelData) => {
      try {
        const { uuid } = splitId(selectedAppointment?.id);
        if (!uuid) {
          showToast("Invalid appointment ID", "error");
          return;
        }

        const payload = {
          tenantId,
          id: uuid,
          reason: cancelData.reason,
          relatedAppointment: uuid,
          accessToken,
          refreshToken,
          forAll: true,
        };

        await api.CancelAppointments(payload);
        showToast("Appointment canceled successfully", "success");
        setCounts((prev) => ({
          ...prev,
          upcomingAppointments: prev.upcomingAppointments - 1,
          cancelledAppointments: prev.cancelledAppointments + 1,
        }));
        fetchAppointments();
        setIsCancelModalOpen(false);
        setSelectedAppointment(null);
      } catch (error) {
        showToast(error.message || "Failed to cancel appointment", "error");
      }
    },
    [accessToken, refreshToken, tenantId, selectedAppointment, setCounts, fetchAppointments]
  );

  const Actions = [
    {
      type: "dropdown",
      label: "More",
      items: [
        {
          label: "Edit",
          icon: <FiEdit />,
          onClick: (item) => handleEditAppointment(item),
        },
        {
          label: "Reschedule",
          icon: <FiRefreshCw />,
          onClick: (item) => handleRescheduleAppointment(item),
        },
        {
          label: "Cancel",
          icon: <RxCross2 />,
          onClick: (item) => handleCancelAppointment(item),
        },
        {
          label: "Start Appointment",
          icon: <IoCheckmarkCircleOutline />,
          onClick: (item) => navigate(`/start-appointment/details/${item.id}`),
          className: "text-primary font-bold bg-brand-50",
        },
      ],
    },
  ];

  return (
    <div className="appointment-tab-content mt-20">
      <CustomTable
        data={localAppointments}
        columns={columns}
        actions={Actions}
        filters={filters}
        tableName="Upcoming Appointment"
        itemsPerPage={10}
        showActions={true}
        showCheckbox={false}
        loading={loading}
      />
      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => {
          setIsAppointmentModalOpen(false);
          setSelectedAppointment(null);
        }}
        initialData={selectedAppointment}
        isEditMode={!!selectedAppointment}
        onSave={handleSaveAppointment}
        clients={clients}
        sessionTypes={sessionTypes}
        staff={staff}
        tenantId={tenantId}
      />
      <RescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => {
          setIsRescheduleModalOpen(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onSave={handleSaveReschedule}
      />
      <CancelModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setSelectedAppointment(null);
        }}
        onSave={handleSaveCancel}
        appointments={selectedAppointment ? [selectedAppointment] : []}
      />
    </div>
  );
};

export default UpcomingAppointments;
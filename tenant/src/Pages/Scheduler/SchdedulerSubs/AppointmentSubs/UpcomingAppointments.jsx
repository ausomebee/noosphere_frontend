// src/Pages/Scheduler/SchdedulerSubs/AppointmentSubs/UpcomingAppointments.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomTable from "../../../../Components/Table/CustomTable";
import useFocusAppointment from "../../../../hooks/useFocusAppointment";
import AppointmentViewModal from "../../../../Components/ReusableModal/SchedulerModal/AppointmentViewModal";
import { FiEdit, FiRefreshCw } from "react-icons/fi";
import { IoCheckmarkCircleOutline } from "react-icons/io5";
import { RxCross2 } from "react-icons/rx";
import AppointmentModal from "../../../../Components/ReusableModal/SchedulerModal/AppointmentModal";
import RescheduleModal from "../../../../Components/ReusableModal/SchedulerModal/RescheduleModal";
import CancelModal from "../../../../Components/ReusableModal/SchedulerModal/CancelModal";
import useAuth from "../../../../hooks/useAuth";
import usePermissions from "../../../../hooks/usePermissions";
import { showToast, showApiError } from "../../../../Helper/ShowToast";
import api from "../../../../api/AppointmentApi";
import { format } from "date-fns";
import expandForAppointments from "../../../../utils/expandForAppointments";
import {
  clientDisplayName,
  toServiceRows,
} from "../../../../utils/appointmentDisplay";

const UpcomingAppointments = ({ setCounts }) => {
  const navigate = useNavigate();
  const { tenantId, role: authRole, userId, accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();
  const role = authRole?.name ?? "Client";

  // State
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);

  const [clients, setClients] = useState([]);
  const [sessionTypes, setSessionTypes] = useState([]);
  const [staff, setStaff] = useState([]);

  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  // Read-only details opened from a notification.
  const [viewAppt, setViewAppt] = useState(null);

  const splitId = useCallback((id) => {
    if (!id) return { uuid: null, timestamp: null };
    if (!id.includes("_")) return { uuid: id, timestamp: null };
    const [uuid, timestamp] = id.split("_");
    return { uuid, timestamp };
  }, []);

  // Transform raw API appointment to include service array
  const toTableRow = (apiAppt) => ({
    ...apiAppt,
    service: toServiceRows(apiAppt.appointmentServices),
    client: apiAppt.client || null,
    clinicians: apiAppt.clinicians || [],
    session: apiAppt.session || { name: "Unknown Session" },
    colourCode: apiAppt.colourCode || "#3B82F6",
  });

  // Fetch master appointments
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const response =
        role === "Admin"
          ? await api.GetUpcomingAppointmentByTenantId({
              tenantId,
              accessToken,
              refreshToken,
            })
          : await api.GetUpcomingAppointmentByStaffId({
              staffId: userId,
              accessToken,
              refreshToken,
            });

      if (response?.data?.data) {
        // Transform each appointment to include .service
        const transformed = response.data.data.map(toTableRow);
        setMasters(transformed);
      }
    } catch {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setLoading(false);
    }
  }, [role, tenantId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch supporting data
  const fetchSupportingData = useCallback(async () => {
    try {
      const [sess, clis, stf] = await Promise.all([
        api
          .GetSessionTypeActiveByTenantId({
            tenantId,
            accessToken,
            refreshToken,
          })
          .then((r) => r.data.data || []),
        api
          .GetClientByTenantId({ tenantId, accessToken, refreshToken })
          .then((r) => r.data.data || []),
        api
          .GetTenantStaffByTenantId({ tenantId, accessToken, refreshToken })
          .then((r) => r.data.data || []),
      ]);
      setSessionTypes(sess);
      setClients(clis);
      setStaff(stf);
    } catch {
      // No toast: empty/unavailable content is not an error.
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAppointments();
    fetchSupportingData();
  }, [fetchAppointments, fetchSupportingData]);

  // Expand ALL master appointments for upcoming
  const allExpandedAppointments = useMemo(() => {
    if (masters.length === 0) return [];

    const allInstances = [];

    masters.forEach((master) => {
      const instances = expandForAppointments(master, "future");
      allInstances.push(...instances);
    });

    // Sort by date and time
    return allInstances.sort((a, b) => {
      const dateA = new Date(a.date + "T" + a.startTime);
      const dateB = new Date(b.date + "T" + b.startTime);
      return dateA - dateB;
    });
  }, [masters]);

  // Format for table
  const formattedAppointments = useMemo(() => {
    return allExpandedAppointments.map((appt) => {
      const serviceText =
        appt.service?.map((s) => s.serviceType).join(", ") || "N/A";
      const truncated =
        serviceText.length > 20
          ? serviceText.substring(0, 20) + "..."
          : serviceText;

      return {
        id: appt.id,
        clientName: clientDisplayName(appt.client, "Unknown Client"),
        therapistName:
          appt.clinicians?.map((c) => c.fullName).join(", ") || "Unassigned",
        serviceType: truncated,
        sessionType: appt.session?.name || "N/A",
        date: appt.date || "Unknown Date",
        time:
          appt.startTime && appt.endTime
            ? `${appt.startTime} - ${appt.endTime}`
            : "No Time",
        therapistNames: appt.clinicians?.map((c) => c.fullName) || [],
        serviceTypes: appt.service?.map((s) => s.serviceType) || [],
        rawData: appt,
        hasActions: true,
      };
    });
  }, [allExpandedAppointments]);

  // Filters
  const filters = useMemo(() => {
    const names = [
      ...new Set(formattedAppointments.flatMap((a) => a.therapistNames)),
    ]
      .filter(Boolean)
      .map((n) => ({ value: n, label: n }));
    const services = [
      ...new Set(formattedAppointments.flatMap((a) => a.serviceTypes)),
    ]
      .filter(Boolean)
      .map((s) => ({ value: s, label: s }));
    const sessions = [
      ...new Set(formattedAppointments.map((a) => a.sessionType)),
    ]
      .filter(Boolean)
      .map((s) => ({ value: s, label: s }));
    const dates = [...new Set(formattedAppointments.map((a) => a.date))]
      .filter(Boolean)
      .map((d) => ({
        value: d,
        label: format(new Date(d), "MMM dd, yyyy"),
      }));

    return [
      {
        value: "therapistNames",
        label: "Clinician",
        filterValues: names,
        filterFunction: (row, val) => !val || row.therapistNames.includes(val),
      },
      {
        value: "sessionType",
        label: "Session Type",
        filterValues: sessions,
        filterFunction: (row, val) => !val || row.sessionType === val,
      },
      {
        value: "serviceTypes",
        label: "Service Type",
        filterValues: services,
        filterFunction: (row, val) => !val || row.serviceTypes.includes(val),
      },
      {
        value: "dateTime",
        label: "Date",
        filterValues: dates,
        filterFunction: (row, val) => !val || row.date === val,
        filter_type: "dateTime",
      },
    ];
  }, [formattedAppointments]);

  // Table columns
  const columns = [
    { header: "Client", key: "clientName", type: "text" },
    { header: "Clinician(s)", key: "therapistName", type: "text" },
    { header: "Service Type(s)", key: "serviceType", type: "text" },
    { header: "Session Type", key: "sessionType", type: "text" },
    { header: "Date", key: "date", type: "dateTime" },
    { header: "Time", key: "time", type: "text" },
  ];

  // Convert to modal format
  const toUICard = (appt) => ({
    ...appt.rawData,
    client: appt.rawData.client?.id || appt.rawData.clientId,
    clinicians: (appt.rawData.clinicians || []).map((c) => ({
      id: c.id?.toString(),
      fullName: c.fullName,
    })),
    service: appt.rawData.service || [],
    sessionType: appt.rawData.session?.id || appt.rawData.sessionId,
    colorCode: appt.rawData.colourCode || "",
  });

  // Action handlers
  const handleEdit = (item) => {
    setSelectedAppointment(toUICard(item));
    setIsAppointmentModalOpen(true);
  };

  const handleReschedule = (item) => {
    setSelectedAppointment(toUICard(item));
    setIsRescheduleModalOpen(true);
  };

  const handleCancel = (item) => {
    setSelectedAppointment(toUICard(item));
    setIsCancelModalOpen(true);
  };

  // Fallback for the notification deep-link: fetch the single appointment by id
  // and shape it into a view row, so the details modal opens even when the row
  // isn't in the loaded list (e.g. the list endpoint failed, or it's created
  // just now). Mirrors toTableRow so the Edit action keeps working.
  const fetchApptForView = useCallback(
    async (id) => {
      try {
        const res = await api.GetClientAppointmentDetails({
          Id: id,
          accessToken,
          refreshToken,
        });
        const appt = res?.data?.data ?? res?.data ?? null;
        if (!appt) return null;
        const rawData = toTableRow(appt);
        const therapistNames = rawData.clinicians
          .map((c) => c.fullName)
          .filter(Boolean);
        const serviceTypes = rawData.service
          .map((s) => s.serviceType)
          .filter(Boolean);
        return {
          id: appt.id,
          clientName: clientDisplayName(appt.client, "Unknown Client"),
          therapistName: therapistNames.join(", ") || "Unassigned",
          serviceType: serviceTypes.join(", ") || "N/A",
          serviceTypes,
          sessionType: rawData.session?.name || "N/A",
          date: appt.date,
          time:
            appt.startTime && appt.endTime
              ? `${appt.startTime} - ${appt.endTime}`
              : "",
          therapistNames,
          rawData,
          hasActions: true,
        };
      } catch {
        return null;
      }
    },
    [accessToken, refreshToken],
  );

  // When arriving from a notification, show read-only details (not the edit
  // form, which renders half-populated before its option lists have loaded).
  useFocusAppointment(formattedAppointments, setViewAppt, fetchApptForView);

  const handleSaveAppointment = async (data) => {
    try {
      const payload = {
        tenantId,
        clientId: data.client,
        sessionId: data.sessionType,
        clinicians: data.clinicians.map((id) => ({ id })),
        service: data.service,
        date: data.date,
        isRecurring: data.isRecurring,
        startTime: data.startTime,
        endTime: data.endTime,
        recurrence: data.recurrence || {},
        isBillable: data.billable,
        serviceLocation: data.serviceLocation,
        requiresTravel: data.requiresTravel,
        colourCode: data.colorCode,
        accessToken,
        refreshToken,
      };

      if (data.scope) {
        const { uuid } = splitId(selectedAppointment?.id);
        await api.UpdateAppointments({
          ...payload,
          id: uuid,
          forAll: data.scope === "all",
        });
      } else {
        await api.CreateAppointments(payload);
      }
      showToast("Appointment updated!", "success");
      fetchAppointments();
      setIsAppointmentModalOpen(false);
    } catch (err) {
      showApiError(err, "UPDATE_APPOINTMENT");
    }
  };

  const handleSaveReschedule = async (data) => {
    try {
      await api.RescheduleAppointments({
        tenantId,
        id: selectedAppointment.id,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        forAll: data.scope === "all",
        accessToken,
        refreshToken,
      });
      showToast("Rescheduled!", "success");
      fetchAppointments();
      setIsRescheduleModalOpen(false);
    } catch (err) {
      showApiError(err, "RESCHEDULE_APPOINTMENT");
    }
  };

  const handleSaveCancel = async (data) => {
    try {
      await api.CancelAppointments({
        tenantId,
        id: selectedAppointment.id,
        reason: data.reason,
        forAll: true,
        accessToken,
        refreshToken,
      });
      showToast("Cancelled!", "success");
      setCounts((prev) => ({
        ...prev,
        upcomingAppointments: prev.upcomingAppointments - 1,
        cancelledAppointments: prev.cancelledAppointments + 1,
      }));
      fetchAppointments();
      setIsCancelModalOpen(false);
    } catch (err) {
      showApiError(err, "CANCEL_APPOINTMENT");
    }
  };

  const getAppointmentUuid = useCallback((id) => {
    if (!id) return null;
    return id.includes("_") ? id.split("_")[0] : id;
  }, []);

  const handleStartAppointment = useCallback(
    (item) => {
      const appointmentId = getAppointmentUuid(item.id);
      const clientId = item.rawData?.client?.id || item.rawData?.clientId;

      if (!appointmentId || !clientId) {
        showToast("Cannot start: missing appointment or client ID", "error");
        return;
      }

      navigate(`/appointments/start/${appointmentId}/${clientId}`);
    },
    [navigate, getAppointmentUuid],
  );

  // Actions dropdown
  const Actions = [
    {
      type: "dropdown",
      label: "Actions",
      items: [
        hasPermission("edit_appointments") && { label: "Edit", icon: <FiEdit />, onClick: handleEdit },
        hasPermission("reschedule_appointments") && {
          label: "Reschedule",
          icon: <FiRefreshCw />,
          onClick: handleReschedule,
        },
        hasPermission("cancel_appointments") && { label: "Cancel", icon: <RxCross2 />, onClick: handleCancel },
        hasPermission("start_appointments") && {
          label: "Start Appointment",
          icon: <IoCheckmarkCircleOutline />,
          onClick: handleStartAppointment,
          className: "text-primary font-bold bg-brand-50",
        },
      ].filter(Boolean),
    },
  ];

  return (
    <div className="appointment-tab-content mt-20">
      <CustomTable
        data={formattedAppointments}
        columns={columns}
        actions={Actions}
        filters={filters}
        tableName="Upcoming Appointments"
        itemsPerPage={10}
        loading={loading}
        showActions={true}
        showCheckbox={false}
      />

      <AppointmentViewModal
        isOpen={!!viewAppt}
        appointment={viewAppt}
        onClose={() => setViewAppt(null)}
        onStart={
          hasPermission("start_appointments")
            ? () => {
                const appt = viewAppt;
                setViewAppt(null);
                if (appt) handleStartAppointment(appt);
              }
            : undefined
        }
        onEdit={
          hasPermission("edit_appointments")
            ? () => {
                const appt = viewAppt;
                setViewAppt(null);
                if (appt) handleEdit(appt);
              }
            : undefined
        }
        onReschedule={
          hasPermission("reschedule_appointments")
            ? () => {
                const appt = viewAppt;
                setViewAppt(null);
                if (appt) handleReschedule(appt);
              }
            : undefined
        }
        onCancel={
          hasPermission("cancel_appointments")
            ? () => {
                const appt = viewAppt;
                setViewAppt(null);
                if (appt) handleCancel(appt);
              }
            : undefined
        }
      />

      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => {
          setIsAppointmentModalOpen(false);
          setSelectedAppointment(null);
        }}
        initialData={selectedAppointment}
        isEditMode={true}
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

// src/Pages/Scheduler/SchdedulerSubs/AppointmentSubs/RescheduleRequests.jsx
import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import CustomTable from "../../../../Components/Table/CustomTable";
import Button from "../../../../Components/Button/Button";
import { IoCheckmarkCircleOutline } from "react-icons/io5";
import { RxCross2 } from "react-icons/rx";
import RescheduleModal from "../../../../Components/ReusableModal/SchedulerModal/RescheduleModal";
import RejectConfirmationModal from "../../../../Components/ReusableModal/SchedulerModal/RejectConfirmationModal";
import RescheduleRequestActionModal from "../../../../Components/ReusableModal/SchedulerModal/RescheduleRequestActionModal";
import useFocusAppointment from "../../../../hooks/useFocusAppointment";
import useAuth from "../../../../hooks/useAuth";
import usePermissions from "../../../../hooks/usePermissions";
import ErrorFallback from "../../../../Components/ErrorFallback";
import api from "../../../../api/AppointmentApi";
import { formatTime } from "../../../../Helper/Formatters";
import { showToast } from "../../../../Helper/ShowToast";
import useFormatSettings from "../../../../hooks/useFormatSettings";
import {
  clientDisplayName,
  normalizeRescheduleRequest,
} from "../../../../utils/appointmentDisplay";
import { useLocation } from "react-router-dom";

const RescheduleRequests = ({ setCounts = () => {}, clientId }) => {
  const { tenantId, role: authRole, userId, accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();
  const { timeFormat } = useFormatSettings();
  const location = useLocation();
  const role = authRole?.name ?? "Client";

  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // The single request opened from a notification (shows Accept/Modify/Reject).
  const [actionRequest, setActionRequest] = useState(null);

  // Hold the latest setCounts in a ref so callers that pass an inline (or the
  // default noop) setCounts don't destabilize fetchRescheduleRequests and spin
  // the fetch effect into an infinite loop.
  const setCountsRef = useRef(setCounts);
  useEffect(() => {
    setCountsRef.current = setCounts;
  }, [setCounts]);

  // Build a table row from a reschedule request (or, for the notification
  // deep-link, a bare appointment plus the proposed slot). Both paths go
  // through the same normaliser so the row shape is always identical.
  const toTableRow = useCallback(
    (raw, proposed = null) => {
      const r = normalizeRescheduleRequest(raw, proposed);

      const serviceText = r.services.map((s) => s.serviceType).join(", ") || "N/A";

      const therapistNames = r.clinicians.map((c) => c.fullName).filter(Boolean);
      const serviceTypes = r.services.map((s) => s.serviceType).filter(Boolean);

      const slotTime = (start, end) =>
        start && end
          ? `${formatTime(start, timeFormat)} - ${formatTime(end, timeFormat)}`
          : "N/A";

      return {
        // Row id is the request id when we have one, else the appointment id.
        id: r.requestId || r.appointmentId,
        // The notification's entityId is the APPOINTMENT id, so keep it around
        // for the deep-link to match against.
        appointmentId: r.appointmentId,
        clientId: r.clientId,
        clientName: clientDisplayName(r.client, "Unknown Client"),
        therapistName: therapistNames.join(", ") || "Unassigned",
        serviceType: serviceText,
        sessionType: r.session?.name || "N/A",
        prevDateTime: {
          date: r.previous.date || "N/A",
          time: slotTime(r.previous.startTime, r.previous.endTime),
        },
        newDateTime: {
          date: r.requested.date || "N/A",
          time: slotTime(r.requested.startTime, r.requested.endTime),
        },
        // Raw requested date/time for the Modify modal to prefill. The modal
        // (convertTo24Hour/toDateInput) normalizes these itself, so pass raw
        // values — NOT formatTime() output, whose 12-hour "HH:MM:SS AM/PM"
        // form the modal's parser rejects, leaving it blank.
        date: r.requested.date,
        startTime: r.requested.startTime,
        endTime: r.requested.endTime,
        reason: r.reason,
        hasActions: true,
        hasCheckbox: true,
        therapistNames,
        serviceTypes,
      };
    },
    [timeFormat],
  );

  // Fetch reschedule requests
  const fetchRescheduleRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await (clientId
        ? api.GetRescheduleAppointmentReqByClientId({
            clientId,
            accessToken,
            refreshToken,
          })
        : role === "Staff"
          ? api.GetRescheduleAppointmentReqByStaffId({
              staffId: userId,
              accessToken,
              refreshToken,
            })
          : api.GetRescheduleAppointmentReqByTenantId({
              tenantId,
              accessToken,
              refreshToken,
            }));

      const rawData = response?.data?.data || [];
      const mappedAppointments = rawData.map((r) => toTableRow(r));

      setAppointments(mappedAppointments);
      setCountsRef.current((prev) => ({
        ...prev,
        rescheduleRequests: mappedAppointments.length,
      }));
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message || "Failed to fetch reschedule requests");
    } finally {
      setLoading(false);
    }
  }, [tenantId, userId, role, clientId, accessToken, refreshToken, toTableRow]);

  useEffect(() => {
    fetchRescheduleRequests();
  }, [fetchRescheduleRequests]);

  // Filters
  const filters = useMemo(() => {
    const uniqueTherapistNames = [
      ...new Set(appointments.flatMap((appt) => appt.therapistNames || [])),
    ]
      .filter(Boolean)
      .map((name) => ({ value: name, label: name }));

    const uniqueServiceTypes = [
      ...new Set(appointments.flatMap((appt) => appt.serviceTypes || [])),
    ]
      .filter(Boolean)
      .map((type) => ({ value: type, label: type }));

    const uniqueSessionTypes = [
      ...new Set(appointments.map((appt) => appt.sessionType)),
    ]
      .filter(Boolean)
      .map((type) => ({ value: type, label: type }));

    const uniqueDates = [...new Set(appointments.map((appt) => appt.date))]
      .filter(Boolean)
      .map((date) => ({ value: date, label: date }));

    return [
      {
        value: "therapistNames",
        label: "Select Therapist",
        filterValues: uniqueTherapistNames,
        filterFunction: (row, value) =>
          !value || row.therapistNames.includes(value),
      },
      {
        value: "sessionType",
        label: "Session Type",
        filterValues: uniqueSessionTypes,
        filterFunction: (row, value) => !value || row.sessionType === value,
      },
      {
        value: "serviceTypes",
        label: "Service Type",
        filterValues: uniqueServiceTypes,
        filterFunction: (row, value) =>
          !value || row.serviceTypes.includes(value),
      },
      {
        value: "dateTime",
        label: "Date",
        filterValues: uniqueDates,
        filterFunction: (row, value) => !value || row.date === value,
      },
    ];
  }, [appointments]);

  const columns = useMemo(
    () => [
      { header: "Client", key: "clientName", type: "text" },
      { header: "Clinician(s)", key: "therapistName", type: "text", width: "clamp(150px, 16vw, 260px)" },
      { header: "Service Type(s)", key: "serviceType", type: "text", width: "clamp(150px, 16vw, 260px)" },
      { header: "Session Type", key: "sessionType", type: "text", width: "clamp(130px, 13vw, 220px)" },
      { header: "Prev. Date & Time", key: "prevDateTime", type: "day_time" },
      { header: "New Date & Time", key: "newDateTime", type: "day_time" },
    ],
    [],
  );

  const handleApprove = useCallback(
    async (items, clearSelection) => {
      try {
        const appointments = items.map((item) => ({ id: item.id }));
        if (!appointments.length) throw new Error("No appointments selected");

        await api.ApproveRescheduledReq({
          appointments,
          accessToken,
          refreshToken,
        });

        setAppointments((prev) =>
          prev.filter((appt) => !items.some((item) => item.id === appt.id)),
        );
        setCountsRef.current((prev) => ({
          ...prev,
          rescheduleRequests: prev.rescheduleRequests - items.length,
          upcomingAppointments: prev.upcomingAppointments + items.length,
        }));
        setSelectedItems([]);
        clearSelection();
        showToast("Reschedule request approved", "success");
      } catch (err) {
        console.error("Approve Error:", err);
        setError(err.message || "Failed to approve");
        showToast(err.message || "Failed to approve reschedule request", "error");
      }
    },
    [accessToken, refreshToken],
  );

  const handleReject = useCallback((items) => {
    setSelectedAppointment(items);
    setIsRejectModalOpen(true);
  }, []);

  const handleSaveReject = useCallback(
    async (rejectData, clearSelection) => {
      try {
        const appointments = Array.isArray(rejectData.appointments)
          ? rejectData.appointments.map((a) => ({ id: a.id }))
          : [{ id: rejectData.appointments.id }];

        await api.RejectRescheduledReq({
          appointments,
          accessToken,
          refreshToken,
        });

        setAppointments((prev) =>
          prev.filter((appt) => !appointments.some((a) => a.id === appt.id)),
        );
        setCountsRef.current((prev) => ({
          ...prev,
          rescheduleRequests: prev.rescheduleRequests - appointments.length,
          cancelledAppointments:
            prev.cancelledAppointments + appointments.length,
        }));
        setIsRejectModalOpen(false);
        setSelectedAppointment(null);
        setSelectedItems([]);
        clearSelection();
        showToast("Reschedule request rejected", "success");
      } catch (err) {
        console.error("Reject Error:", err);
        setError(err.message || "Failed to reject");
        showToast(err.message || "Failed to reject reschedule request", "error");
      }
    },
    [accessToken, refreshToken],
  );

  const handleModify = useCallback((items) => {
    setSelectedAppointment(items.length === 1 ? items[0] : items);
    setIsRescheduleModalOpen(true);
  }, []);

  const handleSaveReschedule = useCallback(
    async (rescheduleData, clearSelection) => {
      try {
        const items = Array.isArray(rescheduleData)
          ? rescheduleData
          : [rescheduleData];

        // The modal returns the new date/time but not the appointment id, so
        // pull it from the selected appointment(s) — the endpoint requires it.
        const selected = Array.isArray(selectedAppointment)
          ? selectedAppointment
          : selectedAppointment
            ? [selectedAppointment]
            : [];

        await Promise.all(
          items.map((item, i) =>
            api.RescheduleAppointments({
              tenantId,
              id: item.id ?? selected[i]?.id ?? selected[0]?.id,
              date: item.date,
              startTime: item.startTime,
              endTime: item.endTime,
              forAll: item.scope === "all",
              rescheduled: true,
              accessToken,
              refreshToken,
            }),
          ),
        );

        fetchRescheduleRequests(); // Refresh list
        setIsRescheduleModalOpen(false);
        setSelectedAppointment(null);
        setSelectedItems([]);
        clearSelection();
        showToast("Appointment rescheduled", "success");
      } catch (err) {
        setError(err.message || "Failed to modify reschedule");
        showToast(err.message || "Failed to reschedule appointment", "error");
      }
    },
    [
      tenantId,
      accessToken,
      refreshToken,
      fetchRescheduleRequests,
      selectedAppointment,
    ],
  );

  const handleSelectionChange = useCallback((rows, items, reset = false) => {
    if (reset) {
      setSelectedItems([]);
      setSelectedAppointment(null);
    } else {
      setSelectedItems(items);
    }
  }, []);

  const handleModalClose = useCallback(() => {
    setIsRejectModalOpen(false);
    setIsRescheduleModalOpen(false);
    setSelectedAppointment(null);
    handleSelectionChange([], [], true);
  }, [handleSelectionChange]);

  // Open the request's action modal when arriving from a notification.
  // Opened from a notification: its entityId is the appointment id, so fetch
  // that appointment directly and pair it with the slot the client proposed
  // (carried on the notification). This opens the modal without waiting for —
  // or depending on — the request list.
  const fetchRequestForNotification = useCallback(
    async (appointmentId) => {
      const proposed = location.state?.proposedSlot || null;
      try {
        const res = await api.GetClientAppointmentDetails({
          Id: appointmentId,
          accessToken,
          refreshToken,
        });
        const appt = res?.data?.data ?? res?.data ?? null;
        if (appt) return toTableRow(appt, proposed);
      } catch {
        // Fall through to the list match below.
      }
      // Fallback: the request may already be in the loaded list.
      return (
        appointments.find((a) => a.appointmentId === appointmentId) || null
      );
    },
    [accessToken, refreshToken, toTableRow, appointments, location.state],
  );

  useFocusAppointment(appointments, setActionRequest, fetchRequestForNotification);

  const Actions = [
    {
      type: "dropdown",
      label: "More",
      items: [
        hasPermission("reschedule_appointments") && {
          label: "Approve",
          onClick: (item) =>
            handleApprove([item], () => handleSelectionChange([], [], true)),
        },
        hasPermission("reschedule_appointments") && {
          label: "Reject",
          onClick: (item) => handleReject([item]),
        },
        hasPermission("reschedule_appointments") && {
          label: "Modify",
          onClick: (item) => handleModify([item]),
        },
      ].filter(Boolean),
    },
  ];

  return (
    <div className="appointment-tab-content mt-20">
      {selectedItems.length > 0 && hasPermission("reschedule_appointments") && (
        <div className="flex justify-end mb-4 gap-4">
          <Button
            label="Approve"
            variant="secondary-success"
            icon={<IoCheckmarkCircleOutline size={24} />}
            onClick={() =>
              handleApprove(selectedItems, () =>
                handleSelectionChange([], [], true),
              )
            }
          />
          <Button
            label="Reject"
            variant="secondary-danger"
            icon={<RxCross2 size={24} />}
            onClick={() => handleReject(selectedItems)}
          />
        </div>
      )}

      {error && <ErrorFallback message="Something went wrong loading reschedule requests. Please try again." onRetry={() => window.location.reload()} />}

      <CustomTable
        data={appointments}
        columns={columns}
        actions={Actions}
        filters={filters}
        tableName="Reschedule Requests"
        itemsPerPage={10}
        showActions={true}
        showCheckbox={true}
        onSelectionChange={handleSelectionChange}
        loading={loading}
      />

      <RescheduleRequestActionModal
        isOpen={!!actionRequest}
        request={actionRequest}
        onClose={() => setActionRequest(null)}
        onApprove={() => {
          if (actionRequest) handleApprove([actionRequest], () => {});
          setActionRequest(null);
        }}
        onModify={() => {
          if (actionRequest) handleModify([actionRequest]);
          setActionRequest(null);
        }}
        onReject={() => {
          if (actionRequest) handleReject([actionRequest]);
          setActionRequest(null);
        }}
      />

      <RescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={handleModalClose}
        appointment={selectedAppointment}
        onSave={(data) =>
          handleSaveReschedule(data, () => handleSelectionChange([], [], true))
        }
      />

      <RejectConfirmationModal
        isOpen={isRejectModalOpen}
        onClose={handleModalClose}
        onConfirm={(data) =>
          handleSaveReject(data, () => handleSelectionChange([], [], true))
        }
        appointments={
          Array.isArray(selectedAppointment)
            ? selectedAppointment
            : selectedAppointment
              ? [selectedAppointment]
              : []
        }
      />
    </div>
  );
};

export default RescheduleRequests;

// src/Pages/Scheduler/SchdedulerSubs/AppointmentSubs/RescheduleRequests.jsx
import React, { useMemo, useState, useCallback, useEffect } from "react";
import CustomTable from "../../../../Components/Table/CustomTable";
import Button from "../../../../Components/Button/Button";
import { IoCheckmarkCircleOutline } from "react-icons/io5";
import { RxCross2 } from "react-icons/rx";
import RescheduleModal from "../../../../Components/ReusableModal/SchedulerModal/RescheduleModal";
import RejectConfirmationModal from "../../../../Components/ReusableModal/SchedulerModal/RejectConfirmationModal";
import useAuth from "../../../../hooks/useAuth";
import usePermissions from "../../../../hooks/usePermissions";
import ErrorFallback from "../../../../Components/ErrorFallback";
import api from "../../../../api/AppointmentApi";
import { formatTime } from "../../../../Helper/Formatters";
import useFormatSettings from "../../../../hooks/useFormatSettings";

const RescheduleRequests = ({ setCounts }) => {
  const { tenantId, role: authRole, userId, accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();
  const { timeFormat } = useFormatSettings();
  const role = authRole?.name ?? "Client";

  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toTableRow = (apiAppt) => {
    const service = (apiAppt.appointmentServices || []).map((as) => {
      const modifier = as.modifiers?.modifier
        ? ` (${as.modifiers.modifier})`
        : "";

      const code = as.serviceCode?.code || "Unknown";

      return {
        serviceType: `${code}${modifier}`,
        modifierType: as.modifiers?.modifier || "",
      };
    });

    const client = apiAppt.client || {};
    const clientFullName = [client.firstName, client.lastName]
      .filter(Boolean)
      .join(" ") || "Unknown Client";

    return {
      ...apiAppt,
      service: service.length > 0 ? service : [],
      client: { ...client, fullName: clientFullName },
      clinicians: apiAppt.clinicians || [],
      session: apiAppt.session || { name: "Unknown Session" },
      colourCode: apiAppt.colourCode || "#3B82F6",
    };
  };

  // Fetch reschedule requests
  const fetchRescheduleRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await (role === "Staff"
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
      const transformed = rawData.map(toTableRow);

      const mappedAppointments = transformed.map((appt) => {
        const serviceText =
          appt.service?.map((s) => s.serviceType).join(", ") || "N/A";
        const truncatedServiceType =
          serviceText.length > 20
            ? serviceText.substring(0, 20) + "..."
            : serviceText;

        const therapistNames = appt.clinicians?.map((c) => c.fullName) || [];
        const serviceTypes = appt.service?.map((s) => s.serviceType) || [];

        return {
          id: appt.id,
          clientId: appt.clientId,
          clientName: appt.client?.fullName || "Unknown Client",
          therapistName:
            therapistNames.length > 0
              ? therapistNames.join(", ")
              : "Unassigned",
          serviceType: truncatedServiceType,
          sessionType: appt.session?.name || "N/A",
          prevDateTime: {
            date: appt.previousDate || "N/A",
            time:
              appt.previousStartTime && appt.previousEndTime
                ? `${formatTime(
                    appt.previousStartTime, timeFormat,
                  )} - ${formatTime(appt.previousEndTime, timeFormat)}`
                : "N/A",
          },
          newDateTime: {
            date: appt.date,
            time: `${formatTime(appt.startTime, timeFormat)} - ${formatTime(
              appt.endTime, timeFormat,
            )}`,
          },
          date: appt.date,
          startTime: formatTime(appt.startTime, timeFormat),
          endTime: formatTime(appt.endTime, timeFormat),
          hasActions: true,
          hasCheckbox: true,
          therapistNames,
          serviceTypes,
        };
      });

      setAppointments(mappedAppointments);
      setCounts((prev) => ({
        ...prev,
        rescheduleRequests: mappedAppointments.length,
      }));
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message || "Failed to fetch reschedule requests");
    } finally {
      setLoading(false);
    }
  }, [tenantId, userId, role, accessToken, refreshToken, setCounts]);

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
      { header: "Clinician(s)", key: "therapistName", type: "text" },
      { header: "Service Type(s)", key: "serviceType", type: "text" },
      { header: "Session Type", key: "sessionType", type: "text" },
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
        setCounts((prev) => ({
          ...prev,
          rescheduleRequests: prev.rescheduleRequests - items.length,
          upcomingAppointments: prev.upcomingAppointments + items.length,
        }));
        setSelectedItems([]);
        clearSelection();
      } catch (err) {
        console.error("Approve Error:", err);
        setError(err.message || "Failed to approve");
      }
    },
    [accessToken, refreshToken, setCounts],
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
        setCounts((prev) => ({
          ...prev,
          rescheduleRequests: prev.rescheduleRequests - appointments.length,
          cancelledAppointments:
            prev.cancelledAppointments + appointments.length,
        }));
        setIsRejectModalOpen(false);
        setSelectedAppointment(null);
        setSelectedItems([]);
        clearSelection();
      } catch (err) {
        console.error("Reject Error:", err);
        setError(err.message || "Failed to reject");
      }
    },
    [accessToken, refreshToken, setCounts],
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

        await Promise.all(
          items.map((item) =>
            api.RescheduleAppointments({
              tenantId,
              id: item.id,
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
      } catch (err) {
        setError(err.message || "Failed to modify reschedule");
      }
    },
    [tenantId, accessToken, refreshToken, fetchRescheduleRequests],
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

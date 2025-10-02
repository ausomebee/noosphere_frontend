import React, { useMemo, useState, useCallback, useEffect } from "react";
import CustomTable from "../../../../Components/Table/CustomTable";
import Button from "../../../../Components/Button/Button";
import { IoCheckmarkCircleOutline } from "react-icons/io5";
import { RxCross2 } from "react-icons/rx";
import RescheduleModal from "../../../../Components/ReusableModal/SchedulerModal/RescheduleModal";
import { useSelector } from "react-redux";
import api from "../../../../api/AppointmentApi";
import RejectConfirmationModal from "../../../../Components/ReusableModal/SchedulerModal/RejectConfirmationModal";

// Convert 24-hour time to 12-hour AM/PM
const convertTo12Hour = (timeStr) => {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const adjustedHours = hours % 12 || 12;
  return `${adjustedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
};

const RescheduleRequests = ({ counts, setCounts }) => {
  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const role = useSelector((s) => s.authentication?.user?.role?.name ?? "Client");
  const userId = useSelector((s) => s.authentication?.user?.id);
  const token = useSelector((s) => s.authentication?.user?.token);
  const accessToken = token;
  const refreshToken = token;
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch reschedule requests based on role
  const fetchRescheduleRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await (role === "Staff"
        ? api.GetRescheduleAppointmentReqByStaffId({ staffId: userId, accessToken, refreshToken })
        : api.GetRescheduleAppointmentReqByTenantId({ tenantId, accessToken, refreshToken }));

      const mappedAppointments = response.data.data.map((appt) => {
        const serviceTypeText = appt.service?.map((s) => s.serviceType).join(", ") || "N/A";
        const truncatedServiceType =
          serviceTypeText.length > 20
            ? serviceTypeText.substring(0, 20) + "..."
            : serviceTypeText;

        // Separate arrays for filtering
        const therapistNames = appt.clinicians?.map((c) => c.fullName) || [];
        const serviceTypes = appt.service?.map((s) => s.serviceType) || [];

        return {
          id: appt.id,
          clientId: appt.clientId,
          clientName: appt.client.fullName,
          therapistName: therapistNames.length > 0 ? therapistNames.join(", ") : "Unassigned",
          serviceType: truncatedServiceType,
          sessionType: appt.session.name,
          prevDateTime: {
            date: appt.previousDate || "N/A",
            time: appt.previousStartTime && appt.previousEndTime
              ? `${convertTo12Hour(appt.previousStartTime)} - ${convertTo12Hour(appt.previousEndTime)}`
              : "N/A",
          },
          newDateTime: {
            date: appt.date,
            time: `${convertTo12Hour(appt.startTime)} - ${convertTo12Hour(appt.endTime)}`,
          },
          date: appt.date,
          startTime: convertTo12Hour(appt.startTime),
          endTime: convertTo12Hour(appt.endTime),
          hasActions: true,
          hasCheckbox: true,
          // Arrays for filtering
          therapistNames,
          serviceTypes,
        };
      });

      setAppointments(mappedAppointments);
      setCounts((prev) => ({ ...prev, rescheduleRequests: mappedAppointments.length }));
    } catch (err) {
      setError(err.message || "Failed to fetch reschedule requests");
    } finally {
      setLoading(false);
    }
  }, [tenantId, userId, role, accessToken, refreshToken, setCounts]);

  useEffect(() => {
    fetchRescheduleRequests();
  }, [fetchRescheduleRequests]);

  // Generate unique filter values and custom filter functions
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
    const uniqueDates = [
      ...new Set(appointments.map((appt) => appt.date)),
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
  }, [appointments]);

  const columns = useMemo(() => [
    { header: "Client", key: "clientName", type: "text" },
    { header: "Clinician(s)", key: "therapistName", type: "text" },
    { header: "Service Type(s)", key: "serviceType", type: "text" },
    { header: "Sessions Type", key: "sessionType", type: "text" },
    { header: "Prev. Date & Time", key: "prevDateTime", type: "day_time" },
    { header: "New Date & Time", key: "newDateTime", type: "day_time" },
  ], []);

  const handleApprove = useCallback(
    async (items, clearSelection) => {
      try {
        const appointments = items.map((item) => ({ id: item.id }));
        if (!appointments.length) {
          throw new Error("No appointments selected");
        }
        await api.ApproveRescheduledReq({ appointments, accessToken, refreshToken });
        setAppointments((prev) => prev.filter((appt) => !items.some((item) => item.id === appt.id)));
        setCounts((prev) => ({
          ...prev,
          rescheduleRequests: prev.rescheduleRequests - items.length,
          upcomingAppointments: prev.upcomingAppointments + items.length,
        }));
        setSelectedItems([]);
        clearSelection();
      } catch (err) {
        console.error("Approve Error:", err);
        setError(err.message || "Failed to approve reschedule requests");
      }
    },
    [accessToken, refreshToken, setCounts]
  );

  const handleReject = useCallback((items) => {
    setSelectedAppointment(items);
    setIsRejectModalOpen(true);
  }, []);

  const handleSaveReject = useCallback(
    async (rejectData, clearSelection) => {
      try {
        const appointments = Array.isArray(rejectData.appointments)
          ? rejectData.appointments.map((appt) => ({ id: appt.id }))
          : [{ id: rejectData.appointments.id }];
        if (!appointments.length) {
          throw new Error("No appointments selected");
        }
        await api.RejectRescheduledReq({ appointments, accessToken, refreshToken });
        setAppointments((prev) => prev.filter((appt) => !appointments.some((item) => item.id === appt.id)));
        setCounts((prev) => ({
          ...prev,
          rescheduleRequests: prev.rescheduleRequests - appointments.length,
          cancelledAppointments: prev.cancelledAppointments + appointments.length,
        }));
        setIsRejectModalOpen(false);
        setSelectedAppointment(null);
        setSelectedItems([]);
        clearSelection();
      } catch (err) {
        console.error("Reject Error:", err);
        setError(err.message || "Failed to reject reschedule requests");
      }
    },
    [accessToken, refreshToken, setCounts]
  );

  const handleModify = useCallback((items) => {
    if (items.length === 1) {
      const appt = items[0];
      setSelectedAppointment({
        ...appt,
        date: appt.newDateTime.date,
        startTime: appt.startTime,
        endTime: appt.endTime,
      });
    } else {
      setSelectedAppointment(items);
    }
    setIsRescheduleModalOpen(true);
  }, []);

  const handleSaveReschedule = useCallback(async (rescheduleData, clearSelection) => {
    try {
      const isArray = Array.isArray(rescheduleData);
      const items = isArray ? rescheduleData : [rescheduleData];
      
      await Promise.all(
        items.map((item) => {
          return api.RescheduleAppointments({
            tenantId,
            id: item.id,
            date: new Date(item.date),
            startTime: item.startTime,
            endTime: item.endTime,
            relatedAppointment: item.relatedAppointment || null,
            forAll: item.scope === "all",
            rescheduled: true,
            accessToken,
            refreshToken,
          });
        })
      );

      setAppointments((prev) =>
        isArray
          ? prev.map((appt) =>
              rescheduleData.some((item) => item.id === appt.id)
                ? {
                    ...appt,
                    newDateTime: {
                      date: rescheduleData.find((item) => item.id === appt.id).date,
                      time: `${convertTo12Hour(rescheduleData.find((item) => item.id === appt.id).startTime)} - ${convertTo12Hour(rescheduleData.find((item) => item.id === appt.id).endTime)}`,
                    },
                    date: rescheduleData.find((item) => item.id === appt.id).date,
                    startTime: convertTo12Hour(rescheduleData.find((item) => item.id === appt.id).startTime),
                    endTime: convertTo12Hour(rescheduleData.find((item) => item.id === appt.id).endTime),
                  }
                : appt
            )
          : prev.map((appt) =>
              appt.id === rescheduleData.id
                ? {
                    ...appt,
                    newDateTime: {
                      date: rescheduleData.date,
                      time: `${convertTo12Hour(rescheduleData.startTime)} - ${convertTo12Hour(rescheduleData.endTime)}`,
                    },
                    date: rescheduleData.date,
                    startTime: convertTo12Hour(rescheduleData.startTime),
                    endTime: convertTo12Hour(rescheduleData.endTime),
                  }
                : appt
            )
      );
      setIsRescheduleModalOpen(false);
      setSelectedAppointment(null);
      setSelectedItems([]);
      clearSelection();
    } catch (err) {
      setError(err.message || "Failed to reschedule appointments");
    }
  }, [tenantId, accessToken, refreshToken]);

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
        {
          label: "Approve",
          icon: null,
          onClick: (item) => handleApprove([item], () => handleSelectionChange([], [], true)),
        },
        {
          label: "Reject",
          icon: null,
          onClick: (item) => handleReject([item]),
        },
        {
          label: "Modify",
          icon: null,
          onClick: (item) => handleModify([item]),
        },
      ],
    },
  ];

  return (
    <div className="appointment-tab-content mt-20">
      {selectedItems.length > 0 && (
        <div className="justify-end flex mb-4">
          <Button
            label="Approve"
            variant="secondary-success"
            icon={<IoCheckmarkCircleOutline size={24} />}
            onClick={() => handleApprove(selectedItems, () => handleSelectionChange([], [], true))}
          />
          <Button
            label="Reject"
            variant="secondary-danger"
            icon={<RxCross2 size={24} />}
            onClick={() => handleReject(selectedItems)}
          />
        </div>
      )}
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
        onSave={(data) => handleSaveReschedule(data, () => handleSelectionChange([], [], true))}
      />
      <RejectConfirmationModal
        isOpen={isRejectModalOpen}
        onClose={handleModalClose}
        onConfirm={(data) => handleSaveReject(data, () => handleSelectionChange([], [], true))}
        appointments={Array.isArray(selectedAppointment) ? selectedAppointment : selectedAppointment ? [selectedAppointment] : []}
      />
    </div>
  );
};

export default RescheduleRequests;
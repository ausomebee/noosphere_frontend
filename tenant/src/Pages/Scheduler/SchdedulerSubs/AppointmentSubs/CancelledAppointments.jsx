// src/Pages/Scheduler/SchdedulerSubs/AppointmentSubs/CancelledAppointments.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import CustomTable from "../../../../Components/Table/CustomTable";
import api from "../../../../api/AppointmentApi";

const CancelledAppointments = () => {
  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const role = useSelector(
    (s) => s.authentication?.user?.role?.name ?? "Client"
  );
  const userId = useSelector((s) => s.authentication?.user?.id);
   const accessToken = useSelector((s) => s.authentication?.user?.accessToken);
   const refreshToken = useSelector((s) => s.authentication?.user?.refreshToken);

  const [localAppointments, setLocalAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // FIXED: Transform appointmentServices → service array (same as other tabs)
  const toTableRow = (apiAppt) => {
    const service = (apiAppt.appointmentServices || []).map((as) => {
      const modifier = as.modifiers?.modifier
        ? ` (${as.modifiers.modifier})`
        : "";

      // Known serviceCodeId → code mapping
      const knownCodes = {
        "4e304a36-8fe8-41fd-85f1-0398a25a50dd": "97158",
        // Add more mappings as needed
      };

      const code = knownCodes[as.serviceCodeId] || "Unknown";

      return {
        serviceType: `${code}${modifier}`,
        modifierType: as.modifiers?.modifier || "",
      };
    });

    return {
      ...apiAppt,
      service: service.length > 0 ? service : [],
      client: apiAppt.client || { fullName: "Unknown Client" },
      clinicians: apiAppt.clinicians || [],
      session: apiAppt.session || { name: "Unknown Session" },
      colourCode: apiAppt.colourCode || "#3B82F6",
    };
  };

  // Transform appointments for table display
  const transformAppointments = (appointments) => {
    if (!Array.isArray(appointments)) {
      console.error("API response data is not an array:", appointments);
      return [];
    }

    return appointments.map((appt) => {
      const transformed = toTableRow(appt); // Apply service fix

      const date = new Date(transformed.date);
      date.setHours(date.getHours() + 1);
      const cancelTime = transformed.cancelTime
        ? new Date(transformed.cancelTime)
        : null;
      if (cancelTime) cancelTime.setHours(cancelTime.getHours() + 1);

      const serviceTypeText =
        transformed.service?.map((s) => s.serviceType).join(", ") || "N/A";
      const truncatedServiceType =
        serviceTypeText.length > 20
          ? serviceTypeText.substring(0, 20) + "..."
          : serviceTypeText;

      const formatTimeToAMPM = (timeStr) => {
        if (!timeStr) return "";
        const [hours, minutes] = timeStr.split(":").map(Number);
        const date = new Date();
        date.setHours(hours, minutes);
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: "Africa/Lagos",
        });
      };
      const formattedTime = `${formatTimeToAMPM(
        transformed.startTime
      )} - ${formatTimeToAMPM(transformed.endTime)}`;

      const therapistNames =
        transformed.clinicians?.map((c) => c.fullName) || [];
      const serviceTypes = transformed.service?.map((s) => s.serviceType) || [];

      return {
        id: transformed.id,
        clientId: transformed.clientId,
        clientName: transformed.client?.fullName || "N/A",
        therapistName: therapistNames.join(", ") || "N/A",
        serviceType: truncatedServiceType,
        sessionType:
          transformed.session?.name || transformed.serviceLocation || "N/A",
        date: date.toLocaleDateString("en-US", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        time: formattedTime,
        hasActions: true,
        therapistNames,
        serviceTypes,
        cancellation: {
          cancelledBy: transformed.canceledBy || "N/A",
          dateOfCancellation: cancelTime
            ? cancelTime.toLocaleDateString("en-US", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : "N/A",
          timeOfCancellation: cancelTime
            ? cancelTime.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
                timeZone: "Africa/Lagos",
              })
            : "N/A",
          reason: transformed.reasonForCancel || "No reason provided",
        },
      };
    });
  };

  // Filters
  const filters = useMemo(() => {
    const uniqueTherapistNames = [
      ...new Set(
        localAppointments.flatMap((appt) => appt.therapistNames || [])
      ),
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

    const uniqueDates = [...new Set(localAppointments.map((appt) => appt.date))]
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
        value: "date",
        label: "Date",
        filterValues: uniqueDates,
        filterFunction: (row, value) => !value || row.date === value,
      },
    ];
  }, [localAppointments]);

  const columns = useMemo(
    () => [
      { header: "Client", key: "clientName", type: "text" },
      { header: "Clinician(s)", key: "therapistName", type: "text" },
      { header: "Service Type(s)", key: "serviceType", type: "text" },
      { header: "Session Type", key: "sessionType", type: "text" },
      { header: "Date", key: "date", type: "text" },
      { header: "Time", key: "time", type: "text" },
    ],
    []
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const handleActionClick = (row) => {
    setSelectedAppointment(row);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
  };

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        let response;
        if (role === "Admin" || role === "Owner") {
          response = await api.GetCancelledAppointmentByTenantId({
            tenantId,
            accessToken,
            refreshToken,
          });
        } else if (role === "Therapist" || role === "Clinician") {
          response = await api.GetCancelledAppointmentByStaffId({
            staffId: userId,
            accessToken,
            refreshToken,
          });
        } else {
          console.warn(`Role ${role} not supported for fetching appointments`);
          setLocalAppointments([]);
          return;
        }

        const rawData = response?.data?.data || [];
        const transformed = transformAppointments(rawData);
        setLocalAppointments(transformed);
      } catch (err) {
        console.error("Error fetching cancelled appointments:", err);
        setLocalAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    if (tenantId || userId) {
      fetchAppointments();
    } else {
      setLocalAppointments([]);
      setLoading(false);
    }
  }, [tenantId, userId, role, accessToken, refreshToken]);

  return (
    <div className="appointment-tab-content mt-20">
      <CustomTable
        data={localAppointments}
        columns={columns}
        actionText="See more"
        filters={filters}
        tableName="Cancelled Appointments"
        itemsPerPage={10}
        showActions={true}
        showCheckbox={false}
        loading={loading}
        actionLinkPrefix="/timesheet/"
        onActionClick={handleActionClick}
      />

      {isModalOpen && selectedAppointment && (
        <div className="modal-overlay">
          <div className="cancel-modal-content">
            <div className="cancel-modal-header">
              <h2>Cancellation details</h2>
              <button className="cancel-close-button" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="cancel-modal-body">
              <div className="grid grid-cols-3 mb-6">
                <div>
                  <h3>Cancelled by</h3>
                  <p>
                    {selectedAppointment.cancellation?.cancelledBy || "N/A"}
                  </p>
                </div>
                <div>
                  <h3>Date of Cancellation</h3>
                  <p>
                    {selectedAppointment.cancellation?.dateOfCancellation ||
                      "N/A"}
                  </p>
                </div>
                <div>
                  <h3>Time of Cancellation</h3>
                  <p>
                    {selectedAppointment.cancellation?.timeOfCancellation ||
                      "N/A"}
                  </p>
                </div>
              </div>
              <div>
                <h3>Reason for Cancellation</h3>
                <p>
                  {selectedAppointment.cancellation?.reason ||
                    "No reason provided"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CancelledAppointments;

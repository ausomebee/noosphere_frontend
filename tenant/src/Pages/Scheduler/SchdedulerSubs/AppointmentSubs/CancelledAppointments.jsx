import React, { useMemo, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import CustomTable from "../../../../Components/Table/CustomTable";
import api from "../../../../api/AppointmentApi"; // Adjust the import path as needed

const CancelledAppointments = () => {
  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const role = useSelector(
    (s) => s.authentication?.user?.role?.name ?? "Client"
  );
  const userId = useSelector((s) => s.authentication?.user?.id);
  const token = useSelector((s) => s.authentication?.user?.token);
  const accessToken = token;
  const refreshToken = token;

  const [localAppointments, setLocalAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Function to transform API response to table data format
  const transformAppointments = (appointments) => {
    if (!Array.isArray(appointments)) {
      console.error("API response data is not an array:", appointments);
      return [];
    }

    return appointments.map((appt) => {
      const date = new Date(appt.date);
      date.setHours(date.getHours() + 1);
      const cancelTime = appt.cancelTime ? new Date(appt.cancelTime) : null;
      if (cancelTime) cancelTime.setHours(cancelTime.getHours() + 1);

      // Concatenate service types for display
      const serviceTypeText =
        appt.service?.map((s) => s.serviceType).join(", ") || "N/A";
      const truncatedServiceType =
        serviceTypeText.length > 20
          ? serviceTypeText.substring(0, 20) + "..."
          : serviceTypeText;

      // Format startTime and endTime to AM/PM
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
        appt.startTime
      )} - ${formatTimeToAMPM(appt.endTime)}`;

      // Separate arrays for filtering
      const therapistNames = appt.clinicians?.map((c) => c.fullName) || [];
      const serviceTypes = appt.service?.map((s) => s.serviceType) || [];

      return {
        id: appt.id,
        clientId: appt.clientId,
        clientName: appt.client?.fullName || "N/A",
        therapistName: therapistNames.join(", ") || "N/A", // Concatenated for display
        serviceType: truncatedServiceType, // Concatenated for display
        sessionType: appt.session?.name || appt.serviceLocation || "N/A",
        date: date.toLocaleDateString("en-US", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        time: formattedTime,
        hasActions: true,
        // Arrays for filtering
        therapistNames,
        serviceTypes,
        cancellation: {
          cancelledBy: appt.canceledBy || "N/A",
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
          reason: appt.reasonForCancel || "No reason provided",
        },
      };
    });
  };


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
      value: "date",
      label: "Date",
      filterValues: uniqueDates,
      filterFunction: (row, value) => {
        return value ? row.date === value : true;
      },
    },
    
  ];
}, [localAppointments]);


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
        const transformedData = transformAppointments(response.data.data || []);
        setLocalAppointments(transformedData);
      } catch (err) {
        console.error("Error fetching appointments:", err);
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
    console.log(`Opening modal for appointment: ${row.id}`);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
  };

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

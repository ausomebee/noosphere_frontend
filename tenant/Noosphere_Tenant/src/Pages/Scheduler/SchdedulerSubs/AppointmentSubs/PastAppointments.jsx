import React, { useCallback, useEffect, useMemo, useState } from "react";
import CustomTable from "../../../../Components/Table/CustomTable";
import api from "../../../../api/AppointmentApi";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../../../Helper/ShowToast";

const PastAppointments = () => {
  const navigate = useNavigate();
  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const role = useSelector((s) => s.authentication?.user?.role?.name ?? "Client");
  const userId = useSelector((s) => s.authentication?.user?.id);
  const token = useSelector((s) => s.authentication?.user?.token);
  const accessToken = token;
  const refreshToken = token;
  const [localAppointments, setLocalAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch past appointments based on role
  const fetchPastAppointments = useCallback(async () => {
    try {
      setLoading(true);
      let response;
      if (role === "Admin") {
        response = await api.GetPastAppointmentByTenantId({
          tenantId,
          accessToken,
          refreshToken,
        });
      } else {
        response = await api.GetPastAppointmentByStaffId({
          staffId: userId,
          accessToken,
          refreshToken,
        });
      }
      if (response?.data?.data) {
        const transformedAppointments = response.data.data.map((appt) => {
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
            clientName: appt.client?.fullName || "Unknown Client",
            therapistName: therapistNames.length > 0 ? therapistNames.join(", ") : "Unassigned",
            serviceType: truncatedServiceType,
            sessionType: appt.session?.name || "Unknown Session",
            date: appt.date || "",
            time: appt.startTime && appt.endTime ? `${appt.startTime} - ${appt.endTime}` : "",
            hasActions: true,
            therapistNames,
            serviceTypes,
          };
        });
        setLocalAppointments(transformedAppointments);
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
      showToast(error.message || "Failed to fetch past appointments", "error");
    }
  }, [role, tenantId, userId, accessToken, refreshToken]);

  useEffect(() => {
    fetchPastAppointments();
  }, [fetchPastAppointments]);

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

  const columns = [
    { header: "Client", key: "clientName", type: "text" },
    { header: "Clinician(s)", key: "therapistName", type: "text" },
    { header: "Service Type(s)", key: "serviceType", type: "text" },
    { header: "Session Type", key: "sessionType", type: "text" },
    { header: "Date", key: "date", type: "text" },
    { header: "Time", key: "time", type: "text" },
  ];

  const handleActionClick = (row) => {
    navigate(`billing/timesheet`);
  };

  return (
    <div className="appointment-tab-content mt-20">
      <CustomTable
        data={localAppointments}
        columns={columns}
        actionText="View"
        filters={filters}
        tableName="Past Appointments"
        itemsPerPage={10}
        showActions={true}
        showCheckbox={false}
        actionLinkPrefix="/timesheet/"
        onActionClick={handleActionClick}
        loading={loading}
      />
    </div>
  );
};

export default PastAppointments;
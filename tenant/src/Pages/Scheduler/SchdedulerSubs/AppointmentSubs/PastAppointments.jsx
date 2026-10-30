// src/Pages/Scheduler/SchdedulerSubs/AppointmentSubs/PastAppointments.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import CustomTable from "../../../../Components/Table/CustomTable";
import PastAppointmentDetailsModal from "../../../../Components/ReusableModal/SchedulerModal/PastAppointmentDetailsModal";
import useFocusAppointment from "../../../../hooks/useFocusAppointment";
import api from "../../../../api/AppointmentApi";
import useAuth from "../../../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import expandForAppointments from "../../../../utils/expandForAppointments";

const PastAppointments = () => {
  const navigate = useNavigate();
  const { tenantId, role: authRole, userId, accessToken, refreshToken } = useAuth();
  const role = authRole?.name ?? "Client";

  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  // The past appointment opened from a notification (read-only details).
  const [detailsAppt, setDetailsAppt] = useState(null);

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
        // Transform raw data to include .service
        const transformed = response.data.data.map(toTableRow);
        setMasters(transformed);
      } else {
        setMasters([]);
      }
    } catch (error) {
      console.error("Failed to load past appointments:", error);
    } finally {
      setLoading(false);
    }
  }, [role, tenantId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPastAppointments();
  }, [fetchPastAppointments]);

  // Expand ALL master appointments for past appointments
  const allExpandedAppointments = useMemo(() => {
    if (masters.length === 0) return [];

    const allInstances = [];

    masters.forEach((master) => {
      const instances = expandForAppointments(master, "past");
      allInstances.push(...instances);
    });

    // Sort by date and time (most recent first)
    return allInstances.sort((a, b) => {
      const dateA = new Date(a.date + "T" + a.startTime);
      const dateB = new Date(b.date + "T" + b.startTime);
      return dateB - dateA;
    });
  }, [masters]);

  // Format appointments for table
  const formattedAppointments = useMemo(() => {
    return allExpandedAppointments.map((appt) => {
      const serviceText =
        appt.service?.map((s) => s.serviceType).join(", ") || "N/A";
      const clinicians =
        appt.clinicians?.map((c) => c.fullName).join(", ") || "Unassigned";

      return {
        id: appt.id,
        clientName: appt.client?.fullName || "Unknown",
        therapistName: clinicians,
        serviceType: serviceText,
        sessionType: appt.session?.name || "Unknown",
        dateTime: appt.date,
        time: `${appt.startTime} - ${appt.endTime}`,
        therapistNames: appt.clinicians?.map((c) => c.fullName) || [],
        serviceTypes: appt.service?.map((s) => s.serviceType) || [],
        rawData: appt,
        hasActions: true,
      };
    });
  }, [allExpandedAppointments]);

  // Filters
  const filters = useMemo(() => {
    const clinicians = [
      ...new Set(formattedAppointments.map((a) => a.therapistName)),
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

    const dates = [...new Set(formattedAppointments.map((a) => a.dateTime))]
      .filter(Boolean)
      .map((d) => ({
        value: d,
        label: format(new Date(d), "MMM dd, yyyy"),
      }));

    return [
      {
        value: "therapistName",
        label: "Clinician",
        filterValues: clinicians,
        filterFunction: (row, val) => !val || row.therapistName === val,
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
        filterFunction: (row, val) => !val || row.dateTime === val,
        filter_type: "dateTime",
      },
    ];
  }, [formattedAppointments]);

  // Table columns
  const columns = [
    { header: "Client", key: "clientName", type: "text" },
    { header: "Clinician(s)", key: "therapistName", type: "text", width: "clamp(150px, 16vw, 260px)" },
    { header: "Service Type(s)", key: "serviceType", type: "text", width: "clamp(150px, 16vw, 260px)" },
    { header: "Session Type", key: "sessionType", type: "text", width: "clamp(130px, 13vw, 220px)" },
    { header: "Date", key: "dateTime", type: "dateTime" },
    { header: "Time", key: "time", type: "text" },
  ];

  // Open the past appointment's details when arriving from a notification.
  useFocusAppointment(formattedAppointments, setDetailsAppt);

  return (
    <div className="appointment-tab-content mt-20">
      <CustomTable
        data={formattedAppointments}
        columns={columns}
        actionText="View Timesheet"
        onActionClick={() => navigate("/billing/timesheets")}
        filters={filters}
        tableName="Past Appointments"
        itemsPerPage={10}
        loading={loading}
        showActions={true}
        showCheckbox={false}
      />

      <PastAppointmentDetailsModal
        isOpen={!!detailsAppt}
        appointment={detailsAppt}
        onClose={() => setDetailsAppt(null)}
        onViewTimesheet={() => {
          setDetailsAppt(null);
          navigate("/billing/timesheets");
        }}
      />
    </div>
  );
};

export default PastAppointments;

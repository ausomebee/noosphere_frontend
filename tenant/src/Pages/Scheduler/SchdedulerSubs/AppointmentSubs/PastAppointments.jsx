import React, { useCallback, useEffect, useMemo, useState } from "react";
import CustomTable from "../../../../Components/Table/CustomTable";
import api from "../../../../api/AppointmentApi";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../../../Helper/ShowToast";
import { format } from "date-fns";
import expandForAppointments from "../../../../utils/expandForAppointments"; // CORRECTED IMPORT

const PastAppointments = () => {
  const navigate = useNavigate();
  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const role = useSelector((s) => s.authentication?.user?.role?.name ?? "Client");
  const userId = useSelector((s) => s.authentication?.user?.id);
  const token = useSelector((s) => s.authentication?.user?.token);
  const accessToken = token;
  const refreshToken = token;

  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPastAppointments = useCallback(async () => {
    try {
      setLoading(true);
      let response;
      if (role === "Admin") {
        response = await api.GetPastAppointmentByTenantId({ tenantId, accessToken, refreshToken });
      } else {
        response = await api.GetPastAppointmentByStaffId({ staffId: userId, accessToken, refreshToken });
      }

      if (response?.data?.data) {
        setMasters(response.data.data);
      }
    } catch (error) {
      showToast("Failed to load past appointments", "error");
    } finally {
      setLoading(false);
    }
  }, [role, tenantId, userId, accessToken, refreshToken]);

  useEffect(() => {
    fetchPastAppointments();
  }, [fetchPastAppointments]);

  // Expand ALL master appointments for past appointments
  const allExpandedAppointments = useMemo(() => {
    if (masters.length === 0) return [];

    const allInstances = [];
    
    masters.forEach(master => {
      const instances = expandForAppointments(master, "past");
      allInstances.push(...instances);
    });

    // Sort by date and time (most recent first)
    return allInstances.sort((a, b) => {
      const dateA = new Date(a.date + 'T' + a.startTime);
      const dateB = new Date(b.date + 'T' + b.startTime);
      return dateB - dateA;
    });
  }, [masters]);

  // Format appointments for table
  const formattedAppointments = useMemo(() => {
    return allExpandedAppointments.map(appt => {
      const serviceText = appt.service?.map(s => s.serviceType).join(", ") || "N/A";
      const truncated = serviceText.length > 20 ? serviceText.substring(0, 20) + "..." : serviceText;
      const clinicians = appt.clinicians?.map(c => c.fullName).join(", ") || "Unassigned";

      return {
        id: appt.id,
        clientName: appt.client?.fullName || "Unknown",
        therapistName: clinicians,
        serviceType: truncated,
        sessionType: appt.session?.name || "Unknown",
        dateTime: appt.date, // CHANGED FROM 'date' TO 'dateTime'
        time: `${appt.startTime} - ${appt.endTime}`,
        therapistNames: appt.clinicians?.map(c => c.fullName) || [],
        serviceTypes: appt.service?.map(s => s.serviceType) || [],
        rawData: appt,
        hasActions: true,
      };
    });
  }, [allExpandedAppointments]);

  // Filters - UPDATED DATE FILTER
  const filters = useMemo(() => {
    const clinicians = [...new Set(formattedAppointments.map(a => a.therapistName))].filter(Boolean).map(n => ({ value: n, label: n }));
    const services = [...new Set(formattedAppointments.flatMap(a => a.serviceTypes))].filter(Boolean).map(s => ({ value: s, label: s }));
    const sessions = [...new Set(formattedAppointments.map(a => a.sessionType))].filter(Boolean).map(s => ({ value: s, label: s }));
    
    // For date filter, we don't need filterValues since it's a date range picker
    const dates = [...new Set(formattedAppointments.map(a => a.dateTime))].filter(Boolean).map(d => ({
      value: d,
      label: format(new Date(d), "MMM dd, yyyy")
    }));

    return [
      { 
        value: "therapistName", 
        label: "Clinician", 
        filterValues: clinicians, 
        filterFunction: (row, val) => !val || row.therapistName === val 
      },
      { 
        value: "sessionType", 
        label: "Session Type", 
        filterValues: sessions, 
        filterFunction: (row, val) => !val || row.sessionType === val 
      },
      { 
        value: "serviceTypes", 
        label: "Service Type", 
        filterValues: services, 
        filterFunction: (row, val) => !val || row.serviceTypes.includes(val) 
      },
      { 
        value: "dateTime", // This now matches the column key
        label: "Date", 
        filterValues: dates, 
        filterFunction: (row, val) => !val || row.dateTime === val,
        filter_type: "dateTime" // This tells CustomTable it's a date range filter
      },
    ];
  }, [formattedAppointments]);

  // Table columns - UPDATED DATE COLUMN
  const columns = [
    { header: "Client", key: "clientName", type: "text" },
    { header: "Clinician(s)", key: "therapistName", type: "text" },
    { header: "Service Type(s)", key: "serviceType", type: "text" },
    { header: "Session Type", key: "sessionType", type: "text" },
    { header: "Date", key: "dateTime", type: "dateTime" }, // CHANGED KEY TO 'dateTime'
    { header: "Time", key: "time", type: "text" },
  ];

  return (
    <div className="appointment-tab-content mt-20">
      <CustomTable
        data={formattedAppointments}
        columns={columns}
        actionText="View Timesheet"
        onActionClick={() => navigate("/billing/timesheet")}
        filters={filters}
        tableName="Past Appointments"
        itemsPerPage={10}
        loading={loading}
        showActions={true}
      />
    </div>
  );
};

export default PastAppointments;
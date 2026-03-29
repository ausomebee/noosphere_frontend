import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import useAuth from "../../../hooks/useAuth";
import CustomTable from "../../../Components/Table/CustomTable";
import api from "../../../api/AppointmentApi";
import { formatTime } from "../../../Helper/Formatters";
import useFormatSettings from "../../../hooks/useFormatSettings";
import { showToast } from "../../../Helper/ShowToast";
import "../Reports.css";

const RescheduledAppointmentsReport = () => {
  const navigate = useNavigate();
  const { tenantId, role: authRole, userId, accessToken, refreshToken } = useAuth();
  const { timeFormat } = useFormatSettings();
  const role = authRole?.name ?? "";

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const response = await (role === "Staff"
          ? api.GetRescheduleAppointmentReqByStaffId({ staffId: userId, accessToken, refreshToken })
          : api.GetRescheduleAppointmentReqByTenantId({ tenantId, accessToken, refreshToken }));

        const rawData = response?.data?.data || [];
        const mapped = rawData.map((appt) => {
          const serviceText = (appt.appointmentServices || [])
            .map((as) => as.serviceCode?.code || "Unknown")
            .join(", ");
          const truncated = serviceText.length > 20 ? serviceText.substring(0, 20) + "..." : serviceText;
          const therapistNames = (appt.clinicians || []).map((c) => c.fullName);
          const serviceTypes = (appt.appointmentServices || []).map((as) => as.serviceCode?.code || "Unknown");

          return {
            id: appt.id,
            clientName: appt.client ? `${appt.client.firstName || ""} ${appt.client.lastName || ""}`.trim() || "N/A" : "N/A",
            therapistName: therapistNames.join(", ") || "N/A",
            serviceType: truncated || "N/A",
            sessionType: appt.session?.name || "N/A",
            prevDateTime: {
              date: appt.previousDate || "N/A",
              time: appt.previousStartTime && appt.previousEndTime
                ? `${formatTime(appt.previousStartTime, timeFormat)} - ${formatTime(appt.previousEndTime, timeFormat)}`
                : "N/A",
            },
            newDateTime: {
              date: appt.date || "N/A",
              time: `${formatTime(appt.startTime, timeFormat)} - ${formatTime(appt.endTime, timeFormat)}`,
            },
            date: appt.date,
            hasActions: false,
            hasCheckbox: false,
            therapistNames,
            serviceTypes,
          };
        });
        setAppointments(mapped);
      } catch (err) {
        console.error("Failed to fetch rescheduled appointments:", err);
        showToast("Failed to load rescheduled appointments", "error");
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };
    if (tenantId || userId) fetch();
    else setLoading(false);
  }, [tenantId, userId, role, accessToken, refreshToken]);

  const filters = useMemo(() => {
    const unique = (arr) => [...new Set(arr)].filter(Boolean).map((v) => ({ value: v, label: v }));
    return [
      { value: "therapistNames", label: "Select Therapist", filterValues: unique(appointments.flatMap((a) => a.therapistNames)), filterFunction: (row, v) => !v || row.therapistNames.includes(v) },
      { value: "sessionType", label: "Session Type", filterValues: unique(appointments.map((a) => a.sessionType)), filterFunction: (row, v) => !v || row.sessionType === v },
      { value: "serviceTypes", label: "Service Type", filterValues: unique(appointments.flatMap((a) => a.serviceTypes)), filterFunction: (row, v) => !v || row.serviceTypes.includes(v) },
      { value: "date", label: "Date", filterValues: unique(appointments.map((a) => a.date)), filterFunction: (row, v) => !v || row.date === v },
    ];
  }, [appointments]);

  const columns = useMemo(() => [
    { header: "Client", key: "clientName" },
    { header: "Therapist", key: "therapistName" },
    { header: "Service Type(s)", key: "serviceType" },
    { header: "Session Type", key: "sessionType" },
    { header: "Prev. Date & Time", key: "prevDateTime", type: "day_time" },
    { header: "New Date & Time", key: "newDateTime", type: "day_time" },
  ], []);

  return (
    <div className="report-subpage">
      <div className="report-subpage-header">
        <button className="report-back-btn" onClick={() => navigate("/reports")}>
          <FaArrowLeft size={13} /> Back
        </button>
      </div>
      <div className="report-subpage-titles">
        <p className="report-subpage-parent">Reports</p>
        <h2 className="report-subpage-name">Rescheduled Appointments</h2>
      </div>

      <CustomTable
        data={appointments}
        columns={columns}
        filters={filters}
        tableName="Rescheduled Appointments"
        itemsPerPage={10}
        showActions={false}
        showCheckbox={false}
        loading={loading}
      />
    </div>
  );
};

export default RescheduledAppointmentsReport;

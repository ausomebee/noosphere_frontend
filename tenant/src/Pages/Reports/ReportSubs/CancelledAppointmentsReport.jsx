import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import useAuth from "../../../hooks/useAuth";
import CustomTable from "../../../Components/Table/CustomTable";
import api from "../../../api/AppointmentApi";
import "../Reports.css";

const formatTimeToAMPM = (timeStr) => {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(hours, minutes);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
};

const CancelledAppointmentsReport = () => {
  const navigate = useNavigate();
  const { tenantId, role: authRole, userId, accessToken, refreshToken } = useAuth();
  const role = authRole?.name ?? "";

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const transformAppointments = (rawData) => {
    if (!Array.isArray(rawData)) return [];
    return rawData.map((appt) => {
      const serviceText = (appt.appointmentServices || [])
        .map((as) => as.serviceCode?.code || "Unknown")
        .join(", ");
      const truncated = serviceText.length > 20 ? serviceText.substring(0, 20) + "..." : serviceText;

      const cancelTime = appt.cancelTime ? new Date(appt.cancelTime) : null;
      const therapistNames = (appt.clinicians || []).map((c) => c.fullName);
      const serviceTypes = (appt.appointmentServices || []).map((as) => as.serviceCode?.code || "Unknown");

      return {
        id: appt.id,
        clientName: appt.client ? `${appt.client.firstName || ""} ${appt.client.lastName || ""}`.trim() || "N/A" : "N/A",
        therapistName: therapistNames.join(", ") || "N/A",
        serviceType: truncated || "N/A",
        sessionType: appt.session?.name || appt.serviceLocation || "N/A",
        date: appt.date ? new Date(appt.date).toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" }) : "N/A",
        time: `${formatTimeToAMPM(appt.startTime)} - ${formatTimeToAMPM(appt.endTime)}`,
        hasActions: true,
        therapistNames,
        serviceTypes,
        cancellation: {
          cancelledBy: appt.canceledBy || "N/A",
          dateOfCancellation: cancelTime ? cancelTime.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" }) : "N/A",
          timeOfCancellation: cancelTime ? cancelTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "N/A",
          reason: appt.reasonForCancel || "No reason provided",
        },
      };
    });
  };

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        let response;
        if (role === "Admin" || role === "Owner") {
          response = await api.GetCancelledAppointmentByTenantId({ tenantId, accessToken, refreshToken });
        } else {
          response = await api.GetCancelledAppointmentByStaffId({ staffId: userId, accessToken, refreshToken });
        }
        setAppointments(transformAppointments(response?.data?.data || []));
      } catch (err) {
        console.error("Failed to fetch cancelled appointments:", err);
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
    { header: "Date", key: "date" },
    { header: "Time", key: "time" },
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
        <h2 className="report-subpage-name">Cancelled Appointments</h2>
      </div>

      <CustomTable
        data={appointments}
        columns={columns}
        filters={filters}
        tableName="Cancelled Appointments"
        itemsPerPage={10}
        showActions={true}
        showCheckbox={false}
        loading={loading}
        actionText="See more"
        onActionClick={(row) => { setSelectedAppointment(row); setIsModalOpen(true); }}
      />

      {isModalOpen && selectedAppointment && (
        <div className="modal-overlay">
          <div className="cancel-modal-content">
            <div className="cancel-modal-header">
              <h2>Cancellation details</h2>
              <button className="cancel-close-button" onClick={() => { setIsModalOpen(false); setSelectedAppointment(null); }}>×</button>
            </div>
            <div className="cancel-modal-body">
              <div className="grid grid-cols-3 mb-6">
                <div><h3>Cancelled by</h3><p>{selectedAppointment.cancellation?.cancelledBy || "N/A"}</p></div>
                <div><h3>Date of Cancellation</h3><p>{selectedAppointment.cancellation?.dateOfCancellation || "N/A"}</p></div>
                <div><h3>Time of Cancellation</h3><p>{selectedAppointment.cancellation?.timeOfCancellation || "N/A"}</p></div>
              </div>
              <div><h3>Reason for Cancellation</h3><p>{selectedAppointment.cancellation?.reason || "No reason provided"}</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CancelledAppointmentsReport;

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { format } from "date-fns";
import { SelectInput } from "../../../Components/Input/Inputs";
import CustomTable from "../../../Components/Table/CustomTable";
import useAuth from "../../../hooks/useAuth";
import appointmentApi from "../../../api/AppointmentApi";
import reportsApi from "../../../api/reportsApi";
import { showToast } from "../../../Helper/ShowToast";
import "../Reports.css";

const calcDuration = (start, end) => {
  if (!start || !end) return "—";
  const diffMs = new Date(end) - new Date(start);
  if (diffMs <= 0) return "—";
  const mins = Math.round(diffMs / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const toRow = (session) => {
  const appt = session.appointment || {};
  return {
    id: session.id,
    date: appt.date ? format(new Date(appt.date + "T00:00:00"), "MM/dd/yyyy") : "—",
    appointmentTime: appt.startTime && appt.endTime ? `${appt.startTime} – ${appt.endTime}` : "—",
    sessionStart: session.startTime
      ? { date: format(new Date(session.startTime), "MM/dd/yyyy"), time: format(new Date(session.startTime), "hh:mma") }
      : { date: "—", time: "—" },
    duration: calcDuration(session.startTime, session.endTime),
    location: appt.serviceLocation || "—",
    billable: appt.isBillable ? "Yes" : "No",
    supervisorStatus: session.supervisorApprovalStatus || "—",
    clientStatus: session.clientApprovalStatus || "—",
  };
};

const columns = [
  { header: "Date", key: "date" },
  { header: "Appt. Time", key: "appointmentTime" },
  { header: "Session Start", key: "sessionStart", type: "day_time" },
  { header: "Duration", key: "duration" },
  { header: "Location", key: "location" },
  { header: "Billable", key: "billable" },
  { header: "Supervisor Status", key: "supervisorStatus" },
  { header: "Client Status", key: "clientStatus" },
];

const AttendanceBySessionTypeReport = () => {
  const navigate = useNavigate();
  const { tenantId, accessToken, refreshToken } = useAuth();

  const [sessionTypeOptions, setSessionTypeOptions] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [tableData, setTableData] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const res = await appointmentApi.GetSessionTypeActiveByTenantId({ tenantId, accessToken, refreshToken });
        const types = res?.data?.data || res?.data || [];
        setSessionTypeOptions(types.map((t) => ({ value: t.id, label: t.name || t.id })));
      } catch {
        showToast("Failed to load session types", "error");
      } finally {
        setLoadingOptions(false);
      }
    };
    if (tenantId && accessToken) fetchTypes();
  }, [tenantId, accessToken, refreshToken]);

  const handleSelect = useCallback(async (typeId) => {
    setSelectedType(typeId);
    if (!typeId) { setTableData([]); return; }
    setLoadingData(true);
    try {
      const sessions = await reportsApi.getSessionsBySessionType({ tenantId, sessionTypeId: typeId, accessToken, refreshToken });
      setTableData(sessions.map(toRow));
    } catch (err) {
      showToast(err.message || "Failed to fetch sessions", "error");
      setTableData([]);
    } finally {
      setLoadingData(false);
    }
  }, [tenantId, accessToken, refreshToken]);

  return (
    <div className="report-subpage">
      <div className="report-subpage-header">
        <button className="report-back-btn" onClick={() => navigate("/reports")}>
          <FaArrowLeft size={13} /> Back
        </button>
      </div>
      <div className="report-subpage-titles">
        <p className="report-subpage-parent">Reports</p>
        <h2 className="report-subpage-name">Attendance by Session Types</h2>
      </div>

      <div className="report-filter-row">
        <div style={{ width: 320 }}>
          <SelectInput
            label="Session Type"
            value={selectedType}
            onChange={(e) => handleSelect(e.target.value)}
            options={sessionTypeOptions}
            placeholder={loadingOptions ? "Loading..." : "Select a session type"}
          />
        </div>
      </div>

      <CustomTable
        data={tableData}
        columns={columns}
        tableName="Attendance by Session Type"
        itemsPerPage={10}
        showActions={false}
        showCheckbox={false}
        loading={loadingData}
      />
    </div>
  );
};

export default AttendanceBySessionTypeReport;

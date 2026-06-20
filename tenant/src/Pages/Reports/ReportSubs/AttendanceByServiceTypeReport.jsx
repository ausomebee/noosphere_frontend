import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { format } from "date-fns";
import { SelectInput } from "../../../Components/Input/Inputs";
import CustomTable from "../../../Components/Table/CustomTable";
import useAuth from "../../../hooks/useAuth";
import billingApi from "../../../api/billingAndPaymentsApi";
import reportsApi from "../../../api/reportsApi";
import { showToast, showApiError } from "../../../Helper/ShowToast";
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

const AttendanceByServiceTypeReport = () => {
  const navigate = useNavigate();
  const { tenantId, accessToken, refreshToken } = useAuth();

  const [serviceCodeOptions, setServiceCodeOptions] = useState([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [tableData, setTableData] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const res = await billingApi.GetTenantServiceCodeByTenantId({ tenantId, accessToken, refreshToken });
        const codes = res?.data?.data || res?.data || [];
        setServiceCodeOptions(codes.map((c) => ({ value: c.id, label: c.code || c.name || c.id })));
      } catch {
        // No toast: empty/unavailable content is not an error.
      } finally {
        setLoadingOptions(false);
      }
    };
    if (tenantId && accessToken) fetchCodes();
  }, [tenantId, accessToken, refreshToken]);

  const handleSelect = useCallback(async (codeId) => {
    setSelectedCode(codeId);
    if (!codeId) { setTableData([]); return; }
    setLoadingData(true);
    try {
      const sessions = await reportsApi.getSessionsByServiceCode({ tenantId, serviceCodeId: codeId, accessToken, refreshToken });
      setTableData(sessions.map(toRow));
    } catch (err) {
      showApiError(err, "LOAD_SESSIONS");
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
        <h2 className="report-subpage-name">Attendance by Service Types</h2>
      </div>

      <div className="report-filter-row">
        <div style={{ width: 320 }}>
          <SelectInput
            label="Service Code"
            value={selectedCode}
            onChange={(e) => handleSelect(e.target.value)}
            options={serviceCodeOptions}
            emptyHint="No service codes found. Create one in Billing & Payments → Settings → Service Codes."
            placeholder={loadingOptions ? "Loading..." : "Select a service code"}
          />
        </div>
      </div>

      <CustomTable
        data={tableData}
        columns={columns}
        tableName="Attendance by Service Type"
        itemsPerPage={10}
        showActions={false}
        showCheckbox={false}
        loading={loadingData}
      />
    </div>
  );
};

export default AttendanceByServiceTypeReport;

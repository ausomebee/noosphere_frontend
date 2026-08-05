import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { format } from "date-fns";
import CustomTable from "../../../Components/Table/CustomTable";
import useAuth from "../../../hooks/useAuth";
import reportsApi from "../../../api/reportsApi";
import { showApiError } from "../../../Helper/ShowToast";
import "../Reports.css";

const toRow = (log) => ({
  id: log.logId,
  timestamp: {
    date: format(new Date(log.createdAt), "MM/dd/yyyy"),
    time: format(new Date(log.createdAt), "hh:mma"),
  },
  admin: log.admin ? `${log.admin.firstName} ${log.admin.lastName}`.trim() : "—",
  action: log.action || "—",
  details: log.details || "—",
  reason: log.reason || "—",
  feature: log.feature || log.module || "—",
});

const columns = [
  { header: "Timestamp", key: "timestamp", type: "day_time" },
  { header: "Admin", key: "admin" },
  { header: "Feature", key: "feature" },
  { header: "Action", key: "action" },
  { header: "Details", key: "details" },
  { header: "Reason", key: "reason" },
];

const PAGE_SIZE = 20;
const FETCH_LIMIT = 100;

const AuditLogsReport = () => {
  const navigate = useNavigate();
  const { tenantId, accessToken, refreshToken } = useAuth();

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pull every log so the table paginates client-side with its own pager,
  // instead of the external Previous/Next controls we had before.
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const first = await reportsApi.getActivityLogs({ tenantId, page: 1, limit: FETCH_LIMIT, accessToken, refreshToken });
      let logs = first.data || [];
      const totalPages = first.meta?.totalPages || 1;
      for (let p = 2; p <= totalPages; p++) {
        const res = await reportsApi.getActivityLogs({ tenantId, page: p, limit: FETCH_LIMIT, accessToken, refreshToken });
        logs = logs.concat(res.data || []);
      }
      setTableData(logs.map(toRow));
    } catch (err) {
      showApiError(err, "LOAD_AUDIT_LOGS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId && accessToken) fetchLogs();
  }, [tenantId, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="report-subpage">
      <div className="report-subpage-header">
        <button className="report-back-btn" onClick={() => navigate("/reports")}>
          <FaArrowLeft size={13} /> Back
        </button>
      </div>
      <div className="report-subpage-titles">
        <p className="report-subpage-parent">Reports</p>
        <h2 className="report-subpage-name">Audit Logs</h2>
      </div>

      <CustomTable
        data={tableData}
        columns={columns}
        tableName="Audit Logs"
        itemsPerPage={PAGE_SIZE}
        showActions={false}
        showCheckbox={false}
        loading={loading}
      />
    </div>
  );
};

export default AuditLogsReport;

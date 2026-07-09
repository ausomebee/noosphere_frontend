import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { format } from "date-fns";
import CustomTable from "../../../Components/Table/CustomTable";
import useAuth from "../../../hooks/useAuth";
import reportsApi from "../../../api/reportsApi";
import { showApiError } from "../../../Helper/ShowToast";
import "../Reports.css";

const toRow = (log) => {
  let extra = {};
  if (log.details && typeof log.details === "object") {
    extra = log.details;
  } else if (log.details && typeof log.details === "string") {
    try { extra = JSON.parse(log.details); } catch { /* ignore */ }
  }
  return {
    id: log.logId,
    timestamp: {
      date: format(new Date(log.createdAt), "MM/dd/yyyy"),
      time: format(new Date(log.createdAt), "hh:mma"),
    },
    accessedBy: log.admin
      ? `${log.admin.firstName} ${log.admin.lastName}`.trim()
      : extra.email || "—",
    ipAddress: extra.ipAddress || extra.ip || log.ipAddress || "—",
    userAgent: extra.userAgent || log.userAgent || "—",
    location: extra.location || log.location || "—",
    sessionId: extra.sessionId || log.sessionId || "—",
    outcome: extra.outcome || log.outcome || log.action || "—",
  };
};

const columns = [
  { header: "Timestamp", key: "timestamp", type: "day_time" },
  { header: "Accessed by", key: "accessedBy" },
  { header: "IP Address", key: "ipAddress" },
  { header: "User Agent", key: "userAgent" },
  { header: "Location", key: "location" },
  { header: "Session ID", key: "sessionId" },
  { header: "Outcome", key: "outcome" },
];

const LIMIT = 20;

const LoginLogsReport = () => {
  const navigate = useNavigate();
  const { tenantId, accessToken, refreshToken } = useAuth();

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const fetchLogs = async (p) => {
    setLoading(true);
    try {
      const result = await reportsApi.getActivityLogs({
        tenantId,
        page: p,
        limit: LIMIT,
        featureNames: "login",
        accessToken,
        refreshToken,
      });
      setTableData((result.data || []).map(toRow));
      setMeta(result.meta || { total: 0, totalPages: 1 });
      setPage(p);
    } catch (err) {
      showApiError(err, "LOAD_LOGIN_LOGS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId && accessToken) fetchLogs(1);
  }, [tenantId, accessToken]);

  return (
    <div className="report-subpage">
      <div className="report-subpage-header">
        <button className="report-back-btn" onClick={() => navigate("/reports")}>
          <FaArrowLeft size={13} /> Back
        </button>
      </div>
      <div className="report-subpage-titles">
        <p className="report-subpage-parent">Reports</p>
        <h2 className="report-subpage-name">Login Logs</h2>
      </div>

      <CustomTable
        data={tableData}
        columns={columns}
        tableName="Login Logs"
        itemsPerPage={LIMIT}
        showActions={false}
        showCheckbox={false}
        loading={loading}
      />

      {meta.totalPages > 1 && (
        <div className="report-pagination">
          <button className="report-page-btn" disabled={page <= 1} onClick={() => fetchLogs(page - 1)}>
            Previous
          </button>
          <span className="report-page-info">Page {page} of {meta.totalPages}</span>
          <button className="report-page-btn" disabled={page >= meta.totalPages} onClick={() => fetchLogs(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default LoginLogsReport;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { format } from "date-fns";
import CustomTable from "../../../Components/Table/CustomTable";
import useAuth from "../../../hooks/useAuth";
import reportsApi from "../../../api/reportsApi";
import { showApiError } from "../../../Helper/ShowToast";
import "../Reports.css";

// The only address on a log entry is the tenant's own, so this is where the
// account is registered rather than where the sign-in came from.
const toLocation = (log) => {
  const loc = log.tenant?.location || log.client?.location;
  if (typeof loc === "string") return loc || "—";
  if (!loc || typeof loc !== "object") return "—";
  return [loc.city, loc.country].filter(Boolean).join(", ") || "—";
};

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
    // `accessedBy` is the actor the API names directly; the admin/client
    // relations only cover logs raised on their behalf.
    accessedBy:
      log.accessedBy ||
      (log.admin
        ? `${log.admin.firstName} ${log.admin.lastName}`.trim()
        : "") ||
      extra.email ||
      "—",
    ipAddress: extra.ipAddress || extra.ip || log.ipAddress || "—",
    userAgent: extra.userAgent || log.userAgent || "—",
    location: extra.location || log.location || toLocation(log),
    outcome: extra.outcome || log.outcome || log.action || "—",
  };
};

const columns = [
  { header: "Timestamp", key: "timestamp", type: "day_time" },
  { header: "Accessed by", key: "accessedBy", type: "accent", truncate: true },
  { header: "IP Address", key: "ipAddress", truncate: true },
  { header: "User Agent", key: "userAgent", truncate: true },
  { header: "Location", key: "location", truncate: true },
  { header: "Outcome", key: "outcome" },
];

const PAGE_SIZE = 20;
const FETCH_LIMIT = 100;

const LoginLogsReport = () => {
  const navigate = useNavigate();
  const { tenantId, accessToken, refreshToken } = useAuth();

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pull every log so the table paginates client-side with its own pager,
  // instead of the external Previous/Next controls we had before.
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const first = await reportsApi.getActivityLogs({
        tenantId,
        page: 1,
        limit: FETCH_LIMIT,
        featureNames: "login",
        accessToken,
        refreshToken,
      });
      let logs = first.data || [];
      const totalPages = first.meta?.totalPages || 1;
      for (let p = 2; p <= totalPages; p++) {
        const res = await reportsApi.getActivityLogs({
          tenantId,
          page: p,
          limit: FETCH_LIMIT,
          featureNames: "login",
          accessToken,
          refreshToken,
        });
        logs = logs.concat(res.data || []);
      }
      setTableData(logs.map(toRow));
    } catch (err) {
      showApiError(err, "LOAD_LOGIN_LOGS");
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
        <h2 className="report-subpage-name">Login Logs</h2>
      </div>

      <CustomTable
        data={tableData}
        columns={columns}
        tableName="Login Logs"
        itemsPerPage={PAGE_SIZE}
        showActions={false}
        showCheckbox={false}
        loading={loading}
      />
    </div>
  );
};

export default LoginLogsReport;

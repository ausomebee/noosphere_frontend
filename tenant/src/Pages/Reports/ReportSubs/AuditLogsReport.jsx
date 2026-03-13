import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { format } from "date-fns";
import CustomTable from "../../../Components/Table/CustomTable";
import useAuth from "../../../hooks/useAuth";
import reportsApi from "../../../api/reportsApi";
import { showToast } from "../../../Helper/ShowToast";
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

const LIMIT = 20;

const AuditLogsReport = () => {
  const navigate = useNavigate();
  const { tenantId, accessToken, refreshToken } = useAuth();

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const fetchLogs = async (p) => {
    setLoading(true);
    try {
      const result = await reportsApi.getActivityLogs({ tenantId, page: p, limit: LIMIT, accessToken, refreshToken });
      setTableData((result.data || []).map(toRow));
      setMeta(result.meta || { total: 0, totalPages: 1 });
      setPage(p);
    } catch (err) {
      showToast(err.message || "Failed to fetch audit logs", "error");
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
        <h2 className="report-subpage-name">Audit Logs</h2>
      </div>

      <CustomTable
        data={tableData}
        columns={columns}
        tableName="Audit Logs"
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

export default AuditLogsReport;

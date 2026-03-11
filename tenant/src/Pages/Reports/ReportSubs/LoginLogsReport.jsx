import React from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import CustomTable from "../../../Components/Table/CustomTable";
import "../Reports.css";

const DUMMY_LOGIN_LOGS = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  hasActions: false,
  timestamp: { date: "12/12/2024", time: "12:45pm" },
  accessedBy: "tenantstaff...",
  ipAddress: "fe80:0:0:0:7...",
  userAgent: "Mozilla/5.0(Win...",
  location: "Lagos, Nigeria",
  sessionId: "SID-12345",
  outcome: "SUCCESS",
}));

const columns = [
  { header: "Timestamp", key: "timestamp", type: "day_time" },
  { header: "Accessed by", key: "accessedBy" },
  { header: "IP Address", key: "ipAddress" },
  { header: "User Agent", key: "userAgent" },
  { header: "Location", key: "location" },
  { header: "Session ID", key: "sessionId" },
  { header: "Outcome", key: "outcome" },
];

const LoginLogsReport = () => {
  const navigate = useNavigate();

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
        data={DUMMY_LOGIN_LOGS}
        columns={columns}
        tableName="Login Logs"
        itemsPerPage={10}
        showActions={false}
        showCheckbox={false}
        hideSearch={false}
        hideTableActions={false}
      />
    </div>
  );
};

export default LoginLogsReport;

import React from "react";
import { useNavigate } from "react-router-dom";
import "./Reports.css";

const appointmentReports = [
  { label: "Cancelled Appointments", path: "/reports/cancelled-appointments" },
  { label: "Rescheduled Appointments", path: "/reports/rescheduled-appointments" },
  { label: "Attendance by Service Type", path: "/reports/attendance-service-type" },
  { label: "Attendance by Session Types", path: "/reports/attendance-session-type" },
];

const logReports = [
  { label: "Audit Logs", path: "/reports/audit-logs" },
  { label: "Login Logs", path: "/reports/login-logs" },
];

const ReportCard = ({ icon, title, description, items }) => {
  const navigate = useNavigate();
  return (
    <div className="report-card">
      <div className="report-card-header">
        <span className="report-card-icon">{icon}</span>
        <h2 className="report-card-title">{title}</h2>
        <p className="report-card-desc">{description}</p>
      </div>
      <ul className="report-card-list">
        {items.map((item) => (
          <li key={item.path} className="report-card-item" onClick={() => navigate(item.path)}>
            <span>{item.label}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#004ABA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </li>
        ))}
      </ul>
    </div>
  );
};

const Reports = () => {
  return (
    <div className="reports-page">
      <h1 className="reports-title">Reports</h1>
      <div className="reports-grid">
        <ReportCard
          icon={
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#004ABA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
          title="Appointments"
          description="Reports related to appointments"
          items={appointmentReports}
        />
        <ReportCard
          icon={
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#004ABA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <polyline points="9 12 10.5 13.5 13.5 10.5" />
              <polyline points="9 16 10.5 17.5 13.5 14.5" />
            </svg>
          }
          title="Logs"
          description="Reports related to appointments"
          items={logReports}
        />
      </div>
    </div>
  );
};

export default Reports;

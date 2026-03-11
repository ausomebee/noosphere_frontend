import React from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import CustomTable from "../../../Components/Table/CustomTable";
import "../Reports.css";

const DUMMY_DATA = [
  { id: "1", clientName: "Oliver Khan", therapistName: "Wunmi Alade", serviceType: "Supervisor sessi...", sessionType: "Tele-health Session", prevDateTime: { date: "12/12/2024", time: "12:45pm - 4:15pm" }, newDateTime: { date: "14/12/2024", time: "12:45pm - 4:15pm" } },
  { id: "2", clientName: "Oliver Khan", therapistName: "Wunmi Alade", serviceType: "Adaptive Behavi...", sessionType: "1:1 coaching", prevDateTime: { date: "12/12/2024", time: "12:45pm - 4:15pm" }, newDateTime: { date: "14/12/2024", time: "12:45pm - 4:15pm" } },
  { id: "3", clientName: "Oliver Khan", therapistName: "Wunmi Alade", serviceType: "1 to 1 training mo...", sessionType: "Group coaching", prevDateTime: { date: "12/12/2024", time: "12:45pm - 4:15pm" }, newDateTime: { date: "14/12/2024", time: "12:45pm - 4:15pm" } },
  { id: "4", clientName: "Oliver Khan", therapistName: "Wunmi Alade", serviceType: "Adaptive Behavi...", sessionType: "Parent/Caregiver...", prevDateTime: { date: "12/12/2024", time: "12:45pm - 4:15pm" }, newDateTime: { date: "14/12/2024", time: "12:45pm - 4:15pm" } },
];

const uniqueSessionTypes = [...new Set(DUMMY_DATA.map((r) => r.sessionType))].map((v) => ({ value: v, label: v }));

const filters = [
  {
    value: "sessionType",
    label: "Select Session Type(s)",
    filterValues: uniqueSessionTypes,
    filterFunction: (row, value) => !value || row.sessionType === value,
  },
];

const columns = [
  { header: "Client", key: "clientName" },
  { header: "Therapist", key: "therapistName" },
  { header: "Service Type(s)", key: "serviceType" },
  { header: "Session Type", key: "sessionType" },
  { header: "Prev. Date & Time", key: "prevDateTime", type: "day_time" },
  { header: "New Date & Time", key: "newDateTime", type: "day_time" },
];

const AttendanceBySessionTypeReport = () => {
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
        <h2 className="report-subpage-name">Attendance by Session Types</h2>
      </div>

      <CustomTable
        data={DUMMY_DATA}
        columns={columns}
        filters={filters}
        tableName="Attendance by Session Type"
        itemsPerPage={10}
        showActions={false}
        showCheckbox={false}
      />
    </div>
  );
};

export default AttendanceBySessionTypeReport;

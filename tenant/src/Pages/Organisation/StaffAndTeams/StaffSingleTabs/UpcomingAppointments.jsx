import React from 'react';
import CustomTable from '../../../../Components/Table/CustomTable';
import { formatDate, formatTime } from '../../../../Helper/Formatters';
import useFormatSettings from '../../../../hooks/useFormatSettings';

const UpcomingAppointments = ({ appointments, loading = false }) => {
  const { dateFormat, timeFormat } = useFormatSettings();

  const getTimeStr = (isoStr) => {
    if (!isoStr) return null;
    const d = new Date(isoStr);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  const formatApptTime = (appt) => {
    const startStr = getTimeStr(appt.start);
    const endStr = getTimeStr(appt.end);
    const fmtStart = startStr ? formatTime(startStr, timeFormat) : null;
    const fmtEnd = endStr ? formatTime(endStr, timeFormat) : null;
    if (fmtStart && fmtEnd) return `${fmtStart} - ${fmtEnd}`;
    if (fmtStart) return fmtStart;
    return "N/A";
  };

  const tableData = appointments.map(appt => ({
    id: appt.id,
    clientName: appt.clientName || appt.client || "Unknown Client",
    serviceType: appt.serviceType || "N/A",
    sessionType: appt.sessionType || appt.sessionName || "N/A",
    date: appt.start ? formatDate(appt.start, dateFormat) : "N/A",
    time: formatApptTime(appt),
  }));

  return (
    <div>
      <CustomTable
        data={tableData}
        columns={[
          { header: "Client", key: "clientName" },
          { header: "Service Type(s)", key: "serviceType", width: "clamp(150px, 16vw, 260px)" },
          { header: "Session Type", key: "sessionType", width: "clamp(130px, 13vw, 220px)" },
          { header: "Date", key: "date" },
          { header: "Time", key: "time" },
        ]}
        loading={loading}
        showActions={false}
        showCheckbox={false}
        itemsPerPage={10}
        hideSearch
        hideTableActions
      />
    </div>
  );
};

export default UpcomingAppointments;

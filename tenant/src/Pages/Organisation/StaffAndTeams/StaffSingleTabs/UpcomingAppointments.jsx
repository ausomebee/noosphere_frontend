import React from 'react';
import CustomTable from '../../../../Components/Table/CustomTable';
import { format } from 'date-fns';

const UpcomingAppointments = ({ appointments, loading = false }) => {
  const formatTime = (appt) => {
    const startStr = appt.start ? format(new Date(appt.start), "h:mm a") : null;
    const endStr = appt.end ? format(new Date(appt.end), "h:mm a") : null;
    if (startStr && endStr) return `${startStr} - ${endStr}`;
    if (startStr) return startStr;
    return "N/A";
  };

  const tableData = appointments.map(appt => ({
    id: appt.id,
    clientName: appt.clientName || appt.client || "Unknown Client",
    serviceType: appt.serviceType || "N/A",
    sessionType: appt.sessionType || appt.sessionName || "N/A",
    date: appt.start ? format(new Date(appt.start), "MMM dd, yyyy") : "N/A",
    time: formatTime(appt),
  }));

  return (
    <div>
      <CustomTable
        data={tableData}
        columns={[
          { header: "Client", key: "clientName" },
          { header: "Service Type(s)", key: "serviceType" },
          { header: "Session Type", key: "sessionType" },
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

import React from 'react';
import CustomTable from '../../../../Components/Table/CustomTable';
import { format } from 'date-fns';

const UpcomingAppointments = ({ appointments }) => {
    console.log(appointments)
  // Check if filteredAppointments is undefined or null
  if (!appointments) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading appointments...
      </div>
    );
  }

  // Check if filteredAppointments is empty
  if (appointments.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No upcoming appointments found.
      </div>
    );
  }

  // Format the appointment data for the table
  const tableData = appointments.map(appt => ({
    id: appt.id,
    clientName: appt.client || "Unknown Client",
    serviceType: appt.serviceType || "N/A",
    sessionType: appt.sessionType || "N/A",
    date: appt.start ? format(new Date(appt.start), "MMM dd, yyyy") : "N/A",
    time: appt.time || (appt.start ? format(new Date(appt.start), "h:mm a") : "N/A"),
    rawDate: appt.start, // Keep the raw date for sorting if needed
    hasActions: true,
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
        actions={[
          {
            type: "dropdown",
            label: "More",
            items: [
              {
                label: "View Details",
                onClick: (row) => console.log("View appointment:", row),
              },
              {
                label: "Reschedule",
                onClick: (row) => console.log("Reschedule appointment:", row),
              },
              {
                label: "Cancel",
                onClick: (row) => console.log("Cancel appointment:", row),
              },
            ],
          },
        ]}
        showActions
        showCheckbox={false}
        itemsPerPage={10}
        hideSearch
        hideTableActions
      />
    </div>
  );
};

export default UpcomingAppointments;
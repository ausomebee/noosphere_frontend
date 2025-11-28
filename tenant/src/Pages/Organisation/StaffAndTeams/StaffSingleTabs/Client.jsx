import React from "react";
import CustomTable from "../../../../Components/Table/CustomTable";

const Client = () => {
  const appointments = [
    {
      id: 1,
      client: "Kelly Rowland",
      dateAdded: "1/10/2024",
      email: "email@email.com",
      emergencyContact: "Michael Scoffied",
      phoneNo: "201 764 4579",
      status: "Active",
      hasActions: true,
    },
    {
      id: 2,
      client: "Kelly Rowland",
      dateAdded: "1/10/2024",
      email: "email@email.com",
      emergencyContact: "Michael Scoffied",
      phoneNo: "201 764 4579",
      status: "Active",
      hasActions: true,
    },
    {
      id: 3,
      client: "Kelly Rowland",
      dateAdded: "1/10/2024",
      email: "email@email.com",
      emergencyContact: "Michael Scoffied",
      phoneNo: "201 764 4579",
      status: "Active",
      hasActions: true,
    },
    {
      id: 4,
      client: "Kelly Rowland",
      dateAdded: "1/10/2024",
      email: "email@email.com",
      emergencyContact: "Michael Scoffied",
      phoneNo: "201 764 4579",
      status: "Active",
      hasActions: true,
    },
    {
      id: 5,
      client: "Kelly Rowland",
      dateAdded: "1/10/2024",
      email: "email@email.com",
      emergencyContact: "Michael Scoffied",
      phoneNo: "201 764 4579",
      status: "Active",
      hasActions: true,
    },
    {
      id: 6,
      client: "Kelly Rowland",
      dateAdded: "1/10/2024",
      email: "email@email.com",
      emergencyContact: "Michael Scoffied",
      phoneNo: "201 764 4579",
      status: "Active",
      hasActions: true,
    },
    {
      id: 7,
      client: "Kelly Rowland",
      dateAdded: "1/10/2024",
      email: "email@email.com",
      emergencyContact: "Michael Scoffied",
      phoneNo: "201 764 4579",
      status: "Active",
      hasActions: true,
    },
  ];

  // Format the appointment data for the table
  const tableData = appointments.map((appt) => ({
    id: appt.id,
    clientName: appt.client || "Unknown Client",
    dateAdded: appt.dateAdded || "N/A",
    email: appt.email || "N/A",
    emergencyContact: appt.emergencyContact || "N/A",
    phoneNo: appt.phoneNo || "N/A",
    status: appt.status || "N/A",
    hasActions: appt.hasActions || true,
  }));

  return (
    <div className="p-20">
      <CustomTable
        data={tableData}
        columns={[
          { header: "Name", key: "clientName", type: "text" },
          { header: "Date Added", key: "dateAdded", type: "text" },
          { header: "Email", key: "email", type: "text" },
          { header: "Emergency Contact", key: "emergencyContact", type: "text" },
          { header: "Phone", key: "phoneNo", type: "text" },
          { header: "Status", key: "status", type: "active" }, // Changed key to 'status' and added type
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

export default Client;
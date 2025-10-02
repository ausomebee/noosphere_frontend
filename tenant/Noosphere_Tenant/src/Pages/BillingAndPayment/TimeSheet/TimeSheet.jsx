import React, { useMemo } from "react";
import DashboardLayout from "../../../Layout/TenantLayout";
import CustomTable from "../../../Components/Table/CustomTable";
import { useNavigate } from "react-router-dom";

const TimeSheet = () => {
    const navigate = useNavigate();
  const columns = [
    { header: "Date", key: "dateTime", type: "date" },
    { header: "Therapist", key: "therapist", type: "text" },
    { header: "Client Name", key: "clientName", type: "text" },
    { header: "Total Hour(s)", key: "hours", type: "text" },
    { header: "Session Type", key: "sessionType", type: "text" },
    { header: "Approval Status", key: "statusText", type: "statusText" },
  ];

  const tableData = [
    {
        id: 1,
      dateTime: "12/10/2024",
      therapist: "Uche Jenkins",
      clientName: "Philip Thomson",
      hours: "4",
      sessionType: "In House",
      statusText: "Pending",
      hasActions: true,
    },
    {
        id: 2,
      dateTime: "12/10/2024",
      therapist: "Uche Jenkins",
      clientName: "Philip Thomson",
      hours: "4",
      sessionType: "In House",
      statusText: "Approved",
      hasActions: true,
    },
    {
        id: 3,
      dateTime: "12/10/2024",
      therapist: "Uche Jenkins",
      clientName: "Philip Thomson",
      hours: "4",
      sessionType: "In House",
      statusText: "Pending",
      hasActions: true,
    },
    {
        id: 4,
      dateTime: "12/10/2024",
      therapist: "Uche Jenkins",
      clientName: "Philip Thomson",
      hours: "4",
      sessionType: "In House",
      statusText: "In-Revision",
      hasActions: true,
    },
    {
        id: 5,
      dateTime: "12/10/2024",
      therapist: "Uche Jenkins",
      clientName: "Philip Thomson",
      hours: "4",
      sessionType: "In House",
      statusText: "Rejected",
      hasActions: true,
    },
    {
        id: 6,
      dateTime: "12/10/2024",
      therapist: "Uche Jenkins",
      clientName: "Philip Thomson",
      hours: "4",
      sessionType: "In House",
      statusText: "Pending",
      hasActions: true,
    },
    {
        id: 7,
      dateTime: "12/10/2024",
      therapist: "Uche Jenkins",
      clientName: "Philip Thomson",
      hours: "4",
      sessionType: "In House",
      statusText: "Approved",
      hasActions: true,
    },
    {
        id: 8,
      dateTime: "12/10/2024",
      therapist: "Uche Jenkins",
      clientName: "Philip Thomson",
      hours: "4",
      sessionType: "In House",
      statusText: "Pending",
      hasActions: true,
    },
    {
        id: 9,
      dateTime: "12/10/2024",
      therapist: "Uche Jenkins",
      clientName: "Philip Thomson",
      hours: "4",
      sessionType: "In House",
      statusText: "In-Revision",
      hasActions: true,
    },
    {
        id: 10,
      dateTime: "12/10/2024",
      therapist: "Uche Jenkins",
      clientName: "Philip Thomson",
      hours: "4",
      sessionType: "In House",
      statusText: "Rejected",
      hasActions: true,
    },
    {
        id: 11,
      dateTime: "12/10/2024",
      therapist: "Uche Jenkins",
      clientName: "Philip Thomson",
      hours: "4",
      sessionType: "In House",
      statusText: "Rejected",
      hasActions: true,
    },
  ];

  const actions = [
    {
      type: "dropdown",
      label: "More",
      items: [
        {
          label: "View",
         onClick: (row) => {
            // Navigate to /billing/timesheets/:id
            navigate(`/billing/timesheets/${row.id}`);
          },
        },
        {
          label: "Edit",
         onClick: (row) => {
            // Navigate to /billing/timesheets/:id
            navigate(`/billing/timesheets/${row.id}`);
          },
        },

        {
          label: "Delete",
          onClick: (row) => {
            setSelectedRow(row);
        
          },
          className: "remove",
        },
      ],
      className: "more-dropdown",
    },
  ];

  const filters = useMemo(
    () => [
      { value: "sessionType", label: "Session Type" },
      { value: "serviceType", label: "Service Type" },
      { value: "dateTime", label: "Date" },
    ],
    []
  );

  return (
    <DashboardLayout>
      <div>
        <h1 className="appointment-sched-title">Timesheets</h1>
        <h3 className="text-xl text-gray-700 font-500">
          Manage and track your hours and service delivery
        </h3>
      </div>

      <div className="mt-32">
        <CustomTable
          data={tableData}
          columns={columns}
          actions={actions}
          filters={filters}
          tableName="Timesheets"
          itemsPerPage={10}
          showActions={true}
          showCheckbox={false}
          // loading={[]}
        />
      </div>
    </DashboardLayout>
  );
};

export default TimeSheet;

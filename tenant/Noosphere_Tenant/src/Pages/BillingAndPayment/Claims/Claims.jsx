import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../../Layout/TenantLayout";
import CustomTable from "../../../Components/Table/CustomTable";

// import api from "../../../../api/AppointmentApi";


const Claims = () => {
  const navigate = useNavigate();
  const [tableData, setTableData] = useState([
    {
      id: "1",
      date: "12/10/2024",
      createdBy: "Uche Jenkins",
      clientName: "Philip Thomson",
      totalValues: "$400",
      timeSheetNumber: "T12850",
      payer: "Medicaid",
      hasActions: true,
    },
    {
      id: "2",
      date: "12/10/2024",
      createdBy: "Uche Jenkins",
      clientName: "Philip Thomson",
      totalValues: "$400",
      timeSheetNumber: "T12851",
      payer: "Medicaid",
      hasActions: true,
    },
    {
      id: "3",
      date: "12/10/2024",
      createdBy: "Uche Jenkins",
      clientName: "Philip Thomson",
      totalValues: "$400",
      timeSheetNumber: "T12852",
      payer: "Medicaid",
      hasActions: true,
    },
    {
      id: "4",
      date: "12/10/2024",
      createdBy: "Uche Jenkins",
      clientName: "Philip Thomson",
      totalValues: "$400",
      timeSheetNumber: "T12853",
      payer: "Medicaid",
      hasActions: true,
    },
    {
      id: "5",
      date: "12/10/2024",
      createdBy: "Uche Jenkins",
      clientName: "Philip Thomson",
      totalValues: "$400",
      timeSheetNumber: "T12854",
      payer: "Medicaid",
      hasActions: true,
    },
    {
      id: "6",
      date: "12/10/2024",
      createdBy: "Uche Jenkins",
      clientName: "Philip Thomson",
      totalValues: "$400",
      timeSheetNumber: "T12855",
      payer: "Medicaid",
      hasActions: true,
    },
    {
      id: "7",
      date: "12/10/2024",
      createdBy: "Uche Jenkins",
      clientName: "Philip Thomson",
      totalValues: "$400",
      timeSheetNumber: "T12856",
      payer: "Medicaid",
      hasActions: true,
    },
    {
      id: "8",
      date: "12/10/2024",
      createdBy: "Uche Jenkins",
      clientName: "Philip Thomson",
      totalValues: "$400",
      timeSheetNumber: "T12857",
      payer: "Medicaid",
      hasActions: true,
    },
  ]);



  const columns = [
    { header: "Date Created", key: "date", type: "dateTime" },
    { header: "Created By", key: "createdBy", type: "text" },
    { header: "Client Name", key: "clientName", type: "text" },
    { header: "Total Value", key: "totalValues", type: "text" },
    { header: "TimeSheet Number", key: "timeSheetNumber", type: "text" },
    { header: "Payer", key: "payer", type: "text" }, // Changed type to "text" as "payer" is not a standard type
  ];

  const filters = useMemo(
    () => [
      {
        value: "payer",
        label: "Payer",
        filterFunction: (row, value) => (value ? row.payer === value : true),
      },
      {
        value: "clientName",
        label: "Client Name",
        filterFunction: (row, value) => (value ? row.clientName === value : true),
      },
      {
        value: "createdBy",
        label: "Created By",
        filterFunction: (row, value) => (value ? row.createdBy === value : true),
      },
      {
        value: "date",
        label: "Date",
        filterFunction: (row, value) => (value ? row.date === value : true),
      },
    ],
    []
  );





  const handleActionClick = (row) => {
    navigate(`/billing/claims/view/${row.id}`);
  };

  return (
    <DashboardLayout>
      <div>
        <h1 className="appointment-sched-title">Claims</h1>
        <h3 className="text-xl text-gray-700 font-500">Manage your claims</h3>
      </div>

      
      <div className="mt-32">

        <CustomTable
          data={tableData}
          columns={columns}
          filters={filters}
          tableName="Claims"
          itemsPerPage={10}
          showActions={true}
          showCheckbox={false}
          actionText="View"
          actionLinkPrefix="/claims/view/"
          onActionClick={handleActionClick}
      //  loading={loading}
        />
      </div>
     
    </DashboardLayout>
  );
};

export default Claims;
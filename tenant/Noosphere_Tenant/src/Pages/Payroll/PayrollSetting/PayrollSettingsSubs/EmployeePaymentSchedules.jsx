import React, { useState } from "react";
import CustomTable from "../../../../Components/Table/CustomTable";

const EmployeePaymentSchedules = () => {
  const [scheduleData, setScheduleTableData] = useState([
    {
      id: 1,
      Name: "Hourly",
      isActive: true,
    },
    {
      id: 2,
      Name: "Daily",
      isActive: true,
    },
    {
      id: 3,
      Name: "Weekly",
      isActive: true,
    },
    {
      id: 4,
      Name: "Monthly",
      isActive: true,
    },
  ]);

   const Columns = [
    { header: "Name", key: "Name", type: "text" },
    { header: "Status", key: "isActive", type: "active" },
  ];

  return (
    <div>
      <CustomTable
        data={scheduleData}
        columns={Columns}
        tableName="Payment Schedule"
        itemsPerPage={10}
        showActions={false}
        showCheckbox={false}
        hideSearch={true}
      />
    </div>
  );
};

export default EmployeePaymentSchedules;

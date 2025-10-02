import React, { useState } from "react";
import Button from "../../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../../Components/Table/CustomTable";
import PayrollCycleModal from "../../../../Components/ReusableModal/PayrollModal/NewPayrollCycleModal";


const PayrollCycles = () => {
  const [tableData, setTableData] = useState([
    {
      id: 1,
      name: "Monthly Cycle",
      appliesTo: "All Employees",
      intervals: 30,
      startDate: "2025-01-01",
      autoRun: true,
      periodInterval: "30 days",
      autoRunPayroll: "Enabled",
      hasActions: true,
    },
    {
      id: 2,
      name: "Weekly Cycle",
      appliesTo: "Full-Time",
      intervals: 7,
      startDate: "2025-01-06",
      autoRun: true,
      periodInterval: "7 days",
      autoRunPayroll: "Enabled",
      hasActions: true,
    },
    {
      id: 3,
      name: "Daily",
      appliesTo: "Part-Time",
      intervals: 1,
      startDate: "2025-01-07",
      autoRun: false,
      periodInterval: "1 day",
      autoRunPayroll: "Disabled",
      hasActions: true,
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [selectedRow, setSelectedRow] = useState(null);

  const Columns = [
    { header: "Name", key: "name", type: "text" },
    { header: "Period Interval (Days)", key: "periodInterval", type: "text" },
    { header: "Auto run Payroll", key: "autoRunPayroll", type: "text" },
  ];

  const Actions = [
    {
      type: "dropdown",
      label: "More",
      items: [
        {
          label: "View",
          onClick: (row) => {
            setSelectedRow(row);
            setMode("view");
            setIsModalOpen(true);
          },
        },
        {
          label: "Edit",
          onClick: (row) => {
            setSelectedRow(row);
            setMode("edit");
            setIsModalOpen(true);
          },
        },
        {
          label: "Deactivate",
          onClick: (row) => {
            setTableData(tableData.map((item) =>
              item.id === row.id ? { ...item, autoRun: false, autoRunPayroll: "Disabled" } : item
            ));
          },
          className: "remove",
        },
      ],
      className: "more-dropdown",
    },
  ];

  const handleSave = (data) => {
    const formattedData = {
      ...data,
      id: mode === "add" ? tableData.length + 1 : selectedRow.id,
      periodInterval: `${data.intervals} day${data.intervals === 1 ? "" : "s"}`,
      autoRunPayroll: data.autoRun ? "Enabled" : "Disabled",
      hasActions: true,
    };

    if (mode === "add") {
      setTableData([...tableData, formattedData]);
    } else if (mode === "edit") {
      setTableData(
        tableData.map((item) =>
          item.id === selectedRow.id ? formattedData : item
        )
      );
    }
    setIsModalOpen(false);
  };

  return (
    <div>
      <div className="justify-end flex mt-6">
        <Button
          label="Add a new Cycle"
          variant="secondary"
          icon={<FaPlus />}
          onClick={() => {
            setSelectedRow(null);
            setMode("add");
            setIsModalOpen(true);
          }}
        />
      </div>
      <div className="mt-32">
        <CustomTable
          data={tableData}
          columns={Columns}
          actions={Actions}
          tableName="Payroll Cycles"
          itemsPerPage={10}
          showActions={true}
          showCheckbox={false}
          hideSearch={true}
          hideTableActions={true}
        />
      </div>
      <PayrollCycleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        mode={mode}
        initialData={selectedRow || {}}
      />
    </div>
  );
};

export default PayrollCycles;
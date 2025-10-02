import React, { useState } from "react";
import Button from "../../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../../Components/Table/CustomTable";
import PayrollItemModal from "../../../../Components/ReusableModal/PayrollModal/NewIncomeItemModal";


const IncomeItems = () => {
  const [tableData, setTableData] = useState([
    {
      id: 1,
      name: "Overwork Commission",
      unitType: "Flat Rate",
      rate: 100,
      rates: "$100",
      status: true,
      hasActions: true,
    },
    {
      id: 2,
      name: "Capital Compensation",
      unitType: "Percentage based",
      unit: 10,
      rates: "10% of Basic Pay",
      duration: "basic_pay",
      status: true,
      hasActions: true,
    },
    {
      id: 3,
      name: "Extraordinary work",
      unitType: "Time based",
      unit: 30,
      rates: "$30 per hour",
      unitMinutes: 60,
      duration: "hours",
      status: true,
      hasActions: true,
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [selectedRow, setSelectedRow] = useState(null);

  const Columns = [
    { header: "Name", key: "name", type: "text" },
    { header: "Type", key: "unitType", type: "text" },
    { header: "Rate", key: "rates", type: "text" },
    { header: "Status", key: "status", type: "active" },
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
              item.id === row.id ? { ...item, status: false } : item
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
      rates: formatRateDisplay(data),
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

  const formatRateDisplay = (data) => {
    if (data.unitType === "Flat Rate") {
      return `$${data.rate}`;
    } else if (data.unitType === "Percentage based") {
      return `${data.unit}% of ${data.duration === "basic_pay" ? "Basic Pay" : "Overtime"}`;
    } else if (data.unitType === "Time based") {
      return `$${data.unit} per ${data.duration === "hours" ? "hour" : "minute"}`;
    }
    return "";
  };

  return (
    <div>
      <div className="justify-end flex mt-6">
        <Button
          label="Add an Income Item"
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
          tableName="Income Items"
          itemsPerPage={10}
          showActions={true}
          showCheckbox={false}
          hideSearch={true}
          hideTableActions={true}
        />
      </div>
      <PayrollItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        mode={mode}
        initialData={selectedRow || {}}
        isDeduction={false}
      />
    </div>
  );
};

export default IncomeItems;
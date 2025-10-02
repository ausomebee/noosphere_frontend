import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../../Components/Table/CustomTable";
import AddRoundingRule from "../../../../Components/ReusableModal/BillingAndPaymentModal/AddRoundingRule"; // Adjust the import path

const RoundingRules = () => {
  const navigate = useNavigate();
  const [tableData, setTableData] = useState([
    {
      id: 1,
      roundingRule: "15-Minute Increment Rounding",
      description: "Round session time to the nearest 15-minute increment",
      isActive: true,
      hasActions: true,
    },
    {
      id: 2,
      roundingRule: "15-Minute Increment Rounding",
      description: "Round session time to the nearest 15-minute increment",
      isActive: true,
      hasActions: true,
    },
    {
      id: 3,
      roundingRule: "15-Minute Increment Rounding",
      description: "Round session time to the nearest 15-minute increment",
      isActive: true,
      hasActions: true,
    },
    {
      id: 4,
      roundingRule: "15-Minute Increment Rounding",
      description: "Round session time to the nearest 15-minute increment",
      isActive: true,
      hasActions: true,
    },
    {
      id: 5,
      roundingRule: "15-Minute Increment Rounding",
      description: "Round session time to the nearest 15-minute increment",
      isActive: true,
      hasActions: true,
    },
    {
      id: 6,
      roundingRule: "15-Minute Increment Rounding",
      description: "Round session time to the nearest 15-minute increment",
      isActive: true,
      hasActions: true,
    },
    {
      id: 7,
      roundingRule: "15-Minute Increment Rounding",
      description: "Round session time to the nearest 15-minute increment",
      isActive: true,
      hasActions: true,
    },
    {
      id: 8,
      roundingRule: "15-Minute Increment Rounding",
      description: "Round session time to the nearest 15-minute increment",
      isActive: true,
      hasActions: true,
    },
    {
      id: 9,
      roundingRule: "15-Minute Increment Rounding",
      description: "Round session time to the nearest 15-minute increment",
      isActive: true,
      hasActions: true,
    },
    {
      id: 10,
      roundingRule: "15-Minute Increment Rounding",
      description: "Round session time to the nearest 15-minute increment",
      isActive: true,
      hasActions: true,
    },
    {
      id: 11,
      roundingRule: "15-Minute Increment Rounding",
      description: "Round session time to the nearest 15-minute increment",
      isActive: true,
      hasActions: true,
    },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [mode, setMode] = useState("add");

  const columns = [
    { header: "Rounding Rule", key: "roundingRule", type: "text" },
    { header: "Description", key: "description", type: "text" },
    { header: "Status", key: "isActive", type: "active" },
  ];

  const actions = [
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
            setTableData(tableData.filter((item) => item.id !== row.id));
          },
          className: "remove",
        },
      ],
      className: "more-dropdown",
    },
  ];

  const handleSave = (data) => {
    const updatedRule = {
      id: selectedRow?.id || Date.now(),
      roundingRule: data.parentRole || data.ruleName,
      description: data.description,
      isActive: data.status !== undefined ? data.status : true,
      hasActions: true,
      minutes: data.minutes || 0,
      hours: data.hours || 0,
      unit: data.unit || 0,
      unitMinutes: data.unitMinutes || 0,
    };

    if (mode === "edit" && selectedRow) {
      setTableData(
        tableData.map((item) => (item.id === selectedRow.id ? updatedRule : item))
      );
    } else {
      setTableData([...tableData, updatedRule]);
    }
  };

  return (
    <div>
      <h2 className="text-20px mt-6 text-gray-400">
        Setup and manage how time is rounded for your sessions
      </h2>

      <div className="justify-end flex mt-6">
        <Button
          label="Add a New Rounding Rule"
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
          columns={columns}
          actions={actions}
          tableName="Rounding Rules"
          itemsPerPage={10}
          showActions={true}
          showCheckbox={false}
        />
      </div>

      <AddRoundingRule
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRow(null);
          setMode("add");
        }}
        onSave={handleSave}
        mode={mode}
        initialData={selectedRow || {}}
        onDelete={() => setTableData(tableData.filter((item) => item.id !== selectedRow?.id))}
      />
    </div>
  );
};

export default RoundingRules;
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../../Components/Table/CustomTable";
import AddServiceCodeModal from "../../../../Components/ReusableModal/BillingAndPaymentModal/AddServiceCodeModal";


const ServiceCodes = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [tableData, setTableData] = useState([
    {
      id: 1,
      serviceCodes: "H0015",
      modifiers: "M23.9, M45.9, M67.8",
      rates: "$100",
      unitTime: "15 mins",
      description: "General Consultation",
      isActive: true,
      hasActions: true,
    },
    {
      id: 2,
      serviceCodes: "H0015",
      modifiers: "M23.9, M45.9, M67.8",
      rates: "$100",
      unitTime: "15 mins",
      description: "General Consultation",
      isActive: true,
      hasActions: true,
    },
    {
      id: 3,
      serviceCodes: "H0015",
      modifiers: "M23.9, M45.9, M67.8",
      rates: "$100",
      unitTime: "15 mins",
      description: "General Consultation",
      isActive: true,
      hasActions: true,
    },
    {
      id: 4,
      serviceCodes: "H0015",
      modifiers: "M23.9, M45.9, M67.8",
      rates: "$100",
      unitTime: "15 mins",
      description: "General Consultation",
      isActive: true,
      hasActions: true,
    },
    {
      id: 5,
      serviceCodes: "H0015",
      modifiers: "M23.9, M45.9, M67.8",
      rates: "$100",
      unitTime: "15 mins",
      description: "General Consultation",
      isActive: true,
      hasActions: true,
    },
    {
      id: 6,
      serviceCodes: "H0015",
      modifiers: "M23.9, M45.9, M67.8",
      rates: "$100",
      unitTime: "15 mins",
      description: "General Consultation",
      isActive: true,
      hasActions: true,
    },
    {
      id: 7,
      serviceCodes: "H0015",
      modifiers: "M23.9, M45.9, M67.8",
      rates: "$100",
      unitTime: "15 mins",
      description: "General Consultation",
      isActive: true,
      hasActions: true,
    },
    {
      id: 8,
      serviceCodes: "H0015",
      modifiers: "M23.9, M45.9, M67.8",
      rates: "$100",
      unitTime: "15 mins",
      description: "General Consultation",
      isActive: true,
      hasActions: true,
    },
    {
      id: 9,
      serviceCodes: "H0015",
      modifiers: "M23.9, M45.9, M67.8",
      rates: "$100",
      unitTime: "15 mins",
      description: "General Consultation",
      isActive: true,
      hasActions: true,
    },
    {
      id: 10,
      serviceCodes: "H0015",
      modifiers: "M23.9, M45.9, M67.8",
      rates: "$100",
      unitTime: "15 mins",
      description: "General Consultation",
      isActive: true,
      hasActions: true,
    },
    {
      id: 11,
      serviceCodes: "H0015",
      modifiers: "M23.9, M45.9, M67.8",
      rates: "$100",
      unitTime: "15 mins",
      description: "General Consultation",
      isActive: true,
      hasActions: true,
    },
  ]);
  
  const columns = [
    { header: "Service Code", key: "serviceCodes", type: "text" },
    { header: "Modifiers", key: "modifiers", type: "text" },
    { header: "Unit Rate", key: "rates", type: "text" },
    { header: "Time per Unit", key: "unitTime", type: "text" },
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
            navigate(`/billing/timesheets/${row.id}`);
          },
        },
        {
          label: "Edit",
          onClick: (row) => {
            setSelectedService(row);
            setIsModalOpen(true);
          },
        },
      ],
      className: "more-dropdown",
    },
  ];

  const filters = [
    { value: "unitType", label: "Unit Type" },
    { value: "status", label: "Status" },
  ];

  const handleSave = (data) => {
    const newModifiers = data.modifiers.map((m) => ({
      modifier: m.modifier,
      ratePerUnit: m.ratePerUnit,
    }));
    const updatedService = {
      id: selectedService?.id || Date.now(),
      serviceCodes: data.code,
      modifiers: data.modifiers.map((m) => m.modifier).join(", ") || "None",
      rates: `$${data.ratePerUnit}`,
      unitTime: `${data.unitDuration} mins`,
      description: data.description,
      isActive: data.status,
      hasActions: true,
    };

    if (selectedService) {
      // Edit existing service
      setTableData(
        tableData.map((item) =>
          item.id === selectedService.id ? updatedService : item
        )
      );
    } else {
      // Add new service
      setTableData([...tableData, updatedService]);
    }
  };

  return (
    <div>
      <h2 className="text-20px mt-6 text-gray-400">
        Setup and manage Service (CPT) codes for the services your organization
        offers
      </h2>

      <div className="justify-end flex mt-6">
        <Button
          label="Add a Service Code"
          variant="secondary"
          icon={<FaPlus />}
          onClick={() => {
            setSelectedService(null);
            setIsModalOpen(true);
          }}
        />
      </div>

      <div className="mt-32">
        <CustomTable
          data={tableData}
          columns={columns}
          actions={actions}
          filters={filters}
          tableName="Service Codes"
          itemsPerPage={10}
          showActions={true}
          showCheckbox={false}
        />
      </div>

      <AddServiceCodeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        mode={selectedService ? "edit" : "add"}
        initialData={selectedService || {}}
      />
    </div>
  );
};

export default ServiceCodes;
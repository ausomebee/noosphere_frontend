import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../../Components/Table/CustomTable";
import AddPayerModal from "../../../../Components/ReusableModal/BillingAndPaymentModal/AddPayerModal"; // Adjust the import path
import AddInsuranceTypeModal from "../../../../Components/ReusableModal/BillingAndPaymentModal/AddInsuranceTypeModal"; // Adjust the import path

const PayersAndInsurance = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("payers");
  const [payerModalOpen, setPayerModalOpen] = useState(false);
  const [insuranceTypeModalOpen, setInsuranceTypeModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [mode, setMode] = useState("add");

  const [insuranceTypeTableData, setInsuranceTypeTableData] = useState([
    {
      id: 1,
      insureType: "Tricare",
      description: "Civilian care component of the military",
      isActive: true,
      hasActions: true,
    },
    {
      id: 2,
      insureType: "Medicaid",
      description: "Coverage for low-income people",
      isActive: true,
      hasActions: true,
    },
    {
      id: 3,
      insureType: "Medicare",
      description: "Different services",
      isActive: true,
      hasActions: true,
    },
    {
      id: 4,
      insureType: "Champ VA",
      description: "Civilian Health and Medical Program",
      isActive: true,
      hasActions: true,
    },
  ]);

  const [payerTableData, setPayerTableData] = useState([
    {
      id: 1,
      payerName: "Catalight",
      insureType: "Group Health Plan",
      isActive: true,
      hasActions: true,
    },
    {
      id: 2,
      payerName: "Medical",
      insureType: "Medicaid",
      isActive: true,
      hasActions: true,
    },
    {
      id: 3,
      payerName: "Regional Centre",
      insureType: "Tricare",
      isActive: true,
      hasActions: true,
    },
  ]);

  const insuranceTypeColumns = [
    { header: "Insurance Type", key: "insureType", type: "text" },
    { header: "Description", key: "description", type: "text" },
    { header: "Status", key: "isActive", type: "active" },
  ];

  const payerTypeColumns = [
    { header: "Payer Name", key: "payerName", type: "text" },
    { header: "Insurance Type", key: "insureType", type: "text" },
    { header: "Status", key: "isActive", type: "active" },
  ];

  const insuranceTypeActions = [
    {
      type: "dropdown",
      label: "More",
      items: [
        {
          label: "View",
          onClick: (row) => {
            setSelectedRow(row);
            setMode("view");
            setInsuranceTypeModalOpen(true);
          },
        },
        {
          label: "Edit",
          onClick: (row) => {
            setSelectedRow(row);
            setMode("edit");
            setInsuranceTypeModalOpen(true);
          },
        },
        {
          label: "Deactivate",
          onClick: (row) => {
            setInsuranceTypeTableData(insuranceTypeTableData.filter((item) => item.id !== row.id));
          },
          className: "remove",
        },
      ],
      className: "more-dropdown",
    },
  ];

  const payerActions = [
    {
      type: "dropdown",
      label: "More",
      items: [
        {
          label: "View",
          onClick: (row) => {
            navigate(`/billing/settings/view-payer/${row.id}/${row.payerName}`);
          },
        },
        {
          label: "Edit",
          onClick: (row) => {
            setSelectedRow(row);
            setMode("edit");
            setPayerModalOpen(true);
          },
        },
        {
          label: "Deactivate",
          onClick: (row) => {
            setPayerTableData(payerTableData.filter((item) => item.id !== row.id));
          },
          className: "remove",
        },
      ],
      className: "more-dropdown",
    },
  ];

  const handlePayerSave = (data) => {
    const updatedPayer = {
      id: selectedRow?.id || Date.now(),
      payerName: data.payerName,
      insureType: data.insuranceType,
      isActive: true, // Adjust based on your logic if status is managed
      hasActions: true,
      email: data.email,
      phoneNumber: data.phoneNumber,
      tplCode: data.tplCode,
      carrierPayerId: data.carrierPayerId,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      country: data.country,
      code: data.code,
      description: data.description,
      unitType: data.unitType,
      unitDuration: data.unitDuration,
      unitCurrency: data.unitCurrency,
      ratePerUnit: data.ratePerUnit,
      roundingRule: data.roundingRule,
      modifiers: data.modifiers,
      billable: data.billable,
    };

    if (mode === "edit" && selectedRow) {
      setPayerTableData(
        payerTableData.map((item) => (item.id === selectedRow.id ? updatedPayer : item))
      );
    } else {
      setPayerTableData([...payerTableData, updatedPayer]);
    }
  };

  const handleInsuranceTypeSave = (data) => {
    const updatedInsuranceType = {
      id: selectedRow?.id || Date.now(),
      insureType: data.insuranceType,
      description: initialData.description || "", // Retain existing description or leave blank
      isActive: true, // Adjust based on your logic if status is managed
      hasActions: true,
    };

    if (mode === "edit" && selectedRow) {
      setInsuranceTypeTableData(
        insuranceTypeTableData.map((item) =>
          item.id === selectedRow.id ? updatedInsuranceType : item
        )
      );
    } else {
      setInsuranceTypeTableData([...insuranceTypeTableData, updatedInsuranceType]);
    }
  };

  return (
    <div>
      <h2 className="text-20px mt-6 text-gray-400">
        Manage the Payers & Insurance your organization works with
      </h2>

      <div className="tabs mt-20">
        <button
          className={`tab flex items-center justify-center ${
            activeTab === "payers" ? "active" : ""
          }`}
          onClick={() => setActiveTab("payers")}
        >
          <span>Payers</span>
        </button>
        <button
          className={`tab flex items-center justify-center ${
            activeTab === "insuranceTypes" ? "active" : ""
          }`}
          onClick={() => setActiveTab("insuranceTypes")}
        >
          <span>Insurance Types</span>
        </button>
      </div>
      {activeTab === "payers" && (
        <div>
          <div className="justify-end flex mt-6">
            <Button
              label="Add a Payer"
              variant="secondary"
              icon={<FaPlus />}
              onClick={() => {
                setSelectedRow(null);
                setMode("add");
                setPayerModalOpen(true);
              }}
            />
          </div>

          <div className="mt-32">
            <CustomTable
              data={payerTableData}
              columns={payerTypeColumns}
              actions={payerActions}
              tableName="Payers"
              itemsPerPage={10}
              showActions={true}
              showCheckbox={false}
            />
          </div>
        </div>
      )}

      {activeTab === "insuranceTypes" && (
        <div>
          <div className="justify-end flex mt-6">
            <Button
              label="Add an Insurance Type"
              variant="secondary"
              icon={<FaPlus />}
              onClick={() => {
                setSelectedRow(null);
                setMode("add");
                setInsuranceTypeModalOpen(true);
              }}
            />
          </div>
          <div className="mt-32">
            <CustomTable
              data={insuranceTypeTableData}
              columns={insuranceTypeColumns}
              actions={insuranceTypeActions}
              tableName="Insurance Types"
              itemsPerPage={10}
              showActions={true}
              showCheckbox={false}
            />
          </div>
        </div>
      )}

      <AddPayerModal
        isOpen={payerModalOpen}
        onClose={() => {
          setPayerModalOpen(false);
          setSelectedRow(null);
          setMode("add");
        }}
        onSave={handlePayerSave}
        mode={mode}
        initialData={selectedRow || {}}
        onDelete={() => setPayerTableData(payerTableData.filter((item) => item.id !== selectedRow?.id))}
      />

      <AddInsuranceTypeModal
        isOpen={insuranceTypeModalOpen}
        onClose={() => {
          setInsuranceTypeModalOpen(false);
          setSelectedRow(null);
          setMode("add");
        }}
        onSave={handleInsuranceTypeSave}
        mode={mode}
        initialData={selectedRow || {}}
        isLoading={false} // Adjust if loading state is needed
      />
    </div>
  );
};

export default PayersAndInsurance;
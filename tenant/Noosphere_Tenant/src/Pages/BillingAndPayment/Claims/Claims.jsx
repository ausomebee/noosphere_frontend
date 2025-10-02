import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../../Layout/TenantLayout";
import Button from "../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../Components/Table/CustomTable";

// import api from "../../../../api/AppointmentApi";
import AddClaimModal from "../../../Components/ReusableModal/BillingAndPaymentModal/AddClaimModal";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const handleAddClaim = () => {
    setIsModalOpen(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSaveClaim = async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      // Placeholder API call; replace with your actual API
      const response = await api.CreateClaim({
        timeSheetId: data.timeSheet,
      });
      const newClaim = response.data;
      // Transform the new claim to match tableData structure
      const formattedClaim = {
        id: newClaim.id || `${Date.now()}`, // Use API-provided ID or fallback to timestamp
        date: new Date().toLocaleDateString("en-US", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        createdBy: newClaim.createdBy || "Current User", // Replace with actual user data
        clientName: newClaim.clientName || "Unknown Client", // Replace with actual client data
        totalValues: newClaim.totalValues || "$0", // Replace with actual value
        timeSheetNumber: newClaim.timeSheetNumber || "Unknown",
        payer: newClaim.payer || "Unknown",
        hasActions: true,
      };
      setTableData((prev) => [formattedClaim, ...prev]);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error creating claim:", err);
      setError("Failed to create claim. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (row) => {
    navigate(`/billing/claims/view/${row.id}`);
  };

  return (
    <DashboardLayout>
      <div>
        <h1 className="appointment-sched-title">Claims</h1>
        <h3 className="text-xl text-gray-700 font-500">Manage your claims</h3>
      </div>

      <div className="justify-end flex mt-6">
        <Button
          label="Add a new Claim"
          variant="primary"
          icon={<FaPlus />}
          onClick={handleAddClaim}
        />
      </div>
      <div className="mt-32">
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
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
       
        />
      </div>
      <AddClaimModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveClaim}
        isLoading={isLoading}
      />
    </DashboardLayout>
  );
};

export default Claims;
import React, { useState, useEffect } from "react";
import DashboardLayout from "../../../../Layout/TenantLayout";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaEdit, FaPlus } from "react-icons/fa";
import AddPayerModal from "../../../../Components/ReusableModal/BillingAndPaymentModal/AddPayerModal";
import { FiEdit3 } from "react-icons/fi";
import Button from "../../../../Components/Button/Button";
import CustomTable from "../../../../Components/Table/CustomTable";
import AddServiceCodeModal from "../../../../Components/ReusableModal/BillingAndPaymentModal/AddServiceCodeModal";

const SingleViewPayer = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [payerData, setPayerData] = useState(null);
  const [loadingPayer, setLoadingPayer] = useState(true);
  const [showPayerModal, setShowPayerModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  // Mock API call to fetch full payer data
  useEffect(() => {
    const fetchPayerData = async () => {
      try {
        const mockPayerData = {
          id: parseInt(id),
          payerName: "Catalight",
          email: "catalight@example.com",
          insuranceType: "Group Health Plan",
          phoneNumber: "123-456-7890",
          tplCode: "TPL123",
          carrierPayerId: "CAR001",
          address: "123 Main St",
          city: "San Francisco",
          state: "CA",
          zip: "94105",
          country: "US",
          code: "SVC001",
          description: "Primary payer for health services",
          unitType: "Adaptive behavior treatment",
          unitDuration: 60,
          unitCurrency: "USD",
          ratePerUnit: 100.0,
          roundingRule: "Nearest",
          modifiers: [
            { modifier: "M23.9", ratePerUnit: 50.0 },
            { modifier: "M45.9", ratePerUnit: 75.0 },
          ],
          billable: true,
        };
        setPayerData(mockPayerData);
      } catch (error) {
        console.error("Error fetching payer data:", error);
      } finally {
        setLoadingPayer(false);
      }
    };

    fetchPayerData();
  }, [id]);

  const [tableData, setTableData] = useState([
    {
      id: 1,
      name: "Adaptive behaviour treatment",
      code: "97153",
      rates: "$100",
      modifiers: "M23.9, M45.9, M67.8",
      isActive: true,
      hasActions: true,
    },
    {
      id: 2,
      name: "Adaptive behaviour treatment",
      code: "97153",
      rates: "$100",
      modifiers: "M23.9, M45.9, M67.8",
      isActive: true,
      hasActions: true,
    },
    {
      id: 3,
      name: "Adaptive behaviour treatment",
      code: "97153",
      rates: "$100",
      modifiers: "M23.9, M45.9, M67.8",
      isActive: true,
      hasActions: true,
    },
    {
      id: 4,
      name: "Adaptive behaviour treatment",
      code: "97153",
      rates: "$100",
      modifiers: "M23.9, M45.9, M67.8",
      isActive: true,
      hasActions: true,
    },
    {
      id: 5,
      name: "Adaptive behaviour treatment",
      code: "97153",
      rates: "$100",
      modifiers: "M23.9, M45.9, M67.8",
      isActive: true,
      hasActions: true,
    },
    {
      id: 6,
      name: "Adaptive behaviour treatment",
      code: "97153",
      rates: "$100",
      modifiers: "M23.9, M45.9, M67.8",
      isActive: true,
      hasActions: true,
    },
    {
      id: 7,
      name: "Adaptive behaviour treatment",
      code: "97153",
      rates: "$100",
      modifiers: "M23.9, M45.9, M67.8",
      isActive: true,
      hasActions: true,
    },
    {
      id: 8,
      name: "Adaptive behaviour treatment",
      code: "97153",
      rates: "$100",
      modifiers: "M23.9, M45.9, M67.8",
      isActive: true,
      hasActions: true,
    },
    {
      id: 9,
      name: "Adaptive behaviour treatment",
      code: "97153",
      rates: "$100",
      modifiers: "M23.9, M45.9, M67.8",
      isActive: true,
      hasActions: true,
    },
  ]);

  const columns = [
    { header: "Name", key: "name", type: "text" },
    { header: "Rate", key: "rates", type: "text" },
    { header: "Code", key: "code", type: "text" },
    { header: "Modifiers", key: "modifiers", type: "text" },
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

  const handlePayerSave = (data) => {
    setPayerData((prev) => ({ ...prev, ...data }));
    setShowPayerModal(false);
  };

  const handleCloseModal = () => {
    setShowPayerModal(false);
  };

  const handleSave = (data) => {
    if (selectedService) {
      // Edit existing service
      setTableData(
        tableData.map((item) =>
          item.id === selectedService.id ? { ...item, ...data, id: item.id } : item
        )
      );
    } else {
      // Add new service
      const newService = {
        id: Date.now(), // Unique ID for new entry
        name: data.name,
        code: data.code,
        rates: data.rates,
        modifiers: data.modifiers.join(", "), // Assuming modifiers is an array
        isActive: true,
        hasActions: true,
      };
      setTableData([...tableData, newService]);
    }
    setIsModalOpen(false);
    setSelectedService(null);
  };

  return (
    <DashboardLayout>
      <div className="program-column-header flex gap-4 items-center">
        <div onClick={() => navigate(-1)}>
          <button className="back-button">
            <FaArrowLeft />
            <span className="primary-text">Back</span>
          </button>
        </div>

        <div className="breadcrumb-trail">
          <span className="breadcrumb-segment">Payers</span>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-current">
            {payerData?.payerName || "Unknown Payer"}
          </span>
        </div>
      </div>
      <h2 className="font-bold text-lg text-gray-700-em mb-4 mt-20">
        Payer Information
      </h2>
      <div className="flex justify-between bg-gray-200 rounded-lg w-full p-20 mb-6">
        {loadingPayer ? (
          <div className="flex justify-center items-center w-full py-8">
            <div>Loading...</div> {/* Replace with LoadingSpinner if defined */}
          </div>
        ) : (
          <>
            <OrgGrid data={payerData || {}} />
            <div>
              <div
                className="bg-white-bg p-5 rounded-md self-start cursor-pointer"
                onClick={() => {
                  setShowPayerModal(true);
                }}
              >
                <FiEdit3 size={32} />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between items-center mt-20">
        <h2 className="font-bold text-lg text-gray-700-em mb-4">Authorization</h2>
        <div>
          <Button
            label="Add Service Code"
            variant="secondary"
            icon={<FaPlus />}
            onClick={() => {
              setSelectedService(null);
              setIsModalOpen(true);
            }}
          />
        </div>
      </div>
      <div className="mt-32">
        <CustomTable
          data={tableData}
          columns={columns}
          actions={actions}
          tableName="Authorizations"
          itemsPerPage={5}
          showActions={true}
          showCheckbox={false}
        />
      </div>

      {/* AddPayerModal for editing with full data */}
      <AddPayerModal
        isOpen={showPayerModal}
        onClose={handleCloseModal}
        onSave={handlePayerSave}
        mode="edit"
        initialData={payerData || {}}
        onDelete={() => {
          setShowPayerModal(false);
        }}
      />

      <AddServiceCodeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedService(null);
        }}
        onSave={handleSave}
        mode={selectedService ? "edit" : "add"}
        initialData={selectedService || {}}
      />
    </DashboardLayout>
  );
};

const OrgGrid = ({ data }) => {
  const {
    payerName,
    payerEmail: email,
    insuranceType,
    phoneNumber,
    tplCode,
    carrierPayerId,
    address,
  } = data;

  return (
    <>
      <div className="grid grid-cols-3 items-start w-full">
        <div className="flex flex-col gap-2">
          <Field label="Payer Name" value={payerName || "--"} />
          <Field label="Payer Email" value={email || "--"} />
        </div>
        <div className="flex flex-col gap-2">
          <Field label="Insurance Type" value={insuranceType || "--"} />
          <Field label="Phone" value={phoneNumber || "--"} />
        </div>
        <div className="flex flex-col gap-2">
          <Field label="TPL Code" value={tplCode || "--"} />
          <Field label="Carrier Payer ID" value={carrierPayerId || "--"} />
        </div>
        <div className="flex flex-col gap-2 border-t">
          <Field label="Address" value={address || "--"} />
        </div>
      </div>
    </>
  );
};

const Field = ({ label, value, isLink }) => (
  <div className="items-center gap-4">
    <p className="text-sm text-gray-400">{label}</p>
    {isLink && value !== "--" ? (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-blue-600"
      >
        {value}
      </a>
    ) : (
      <p className="font-semibold text-gray-600">{value}</p>
    )}
  </div>
);

export default SingleViewPayer;
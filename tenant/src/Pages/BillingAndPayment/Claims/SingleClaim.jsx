import React, { useCallback, useRef, useState } from "react";
import DashboardLayout from "../../../Layout/TenantLayout";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import {
  exportTableData,
  printTableData,
  exportTableToPDF,
} from "../../../utils/TableUtils";
import AccordionTable from "../../../Components/Table/AccordionTable";

const SingleClaim = () => {
  const navigate = useNavigate();
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportButtonRef = useRef(null);
  const exportDropdownRef = useRef(null);
  const tableContainerRef = useRef(null);

  const handleExportCSV = useCallback(() => {
    setExportDropdownOpen(false);
  }, []);

  const handleExportPDF = useCallback(() => {
    setExportDropdownOpen(false);
  }, []);

  const handlePrint = useCallback(() => {
    // Implement print logic if needed
  }, []);

  const toggleExportDropdown = useCallback(() => {
    setExportDropdownOpen((prev) => !prev);
  }, []);

  const data = {
    clientName: "Philip Thomson",
    clientInsID: "1234674849093090",
    clinicians: "Estee Lauder",
    clinicianNPI: "157774555800K",
    date: "12/04/24",
    timesheetId: "T12347",
    serviceLocation: "19 - Tele-health Session",
    location: "6500 Campus Clave drive, East Irving, AZ, 756032715",
    practiceNPI: "9999Y385800K",
  };

  const columns = [
    { key: "diagnosisCode", header: "Diagnosis Code" },
    { key: "description", header: "Description" },
  ];

  const initialServiceData = {
    0: [
      {
        serviceCode: "H2002",
        modifiers: "BT",
        units: "40",
        unitRate: "40",
      },
    ],
  };

  const tableData = [
    {
      diagnosisCode: "F84.2",
      description: "Adaptive treatment",
    },
    {
      diagnosisCode: "F84.2",
      description: "Adaptive treatment",
    },
    {
      diagnosisCode: "F84.2",
      description: "Adaptive treatment",
    },
  ];

  const handleServiceDataChange = (serviceData) => {
    console.log("Service data changed:", serviceData);
    // Save to state or send to API
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
          <span className="breadcrumb-segment">Claims</span>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-current">View Claims</span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 mt-20 mx-auto">
        <h1 className="font-bold text-lg text-white-light mb-4">
          General Information
        </h1>
        <div className="flex gap-2">
          <div className="relative">
            <button onClick={toggleExportDropdown} ref={exportButtonRef}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            {exportDropdownOpen && (
              <div
                className="action-dropdown export-dropdown absolute right-0 mt-1 bg-white rounded-md shadow-lg py-1 z-10"
                ref={exportDropdownRef}
              >
                <button
                  className="dropdown-item px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  onClick={handleExportCSV}
                >
                  Export as CSV
                </button>
                <button
                  className="dropdown-item px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  onClick={handleExportPDF}
                >
                  Export as PDF
                </button>
              </div>
            )}
          </div>
          <button onClick={handlePrint}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
          </button>
        </div>
      </div>
      <div className="bg-gray-200 rounded-lg w-full p-20 ">
        <div className="grid grid-cols-3 items-start w-full mb-6">
          <div className="flex flex-col gap-2">
            <Field label="Client" value={data.clientName || "--"} />
            <Field
              label="client Insurance ID"
              value={data.clientInsID || "--"}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Field label="Clinician" value={data.clinicians || "--"} />
            <Field label="clinician NPI" value={data.clinicianNPI || "--"} />
          </div>
          <div className="flex flex-col gap-2">
            <Field label="Date" value={data.date || "--"} />
            <Field label="TimeSheet" value={data.timesheetId || "--"} />
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t ">
          <div className="mt-6">
            <Field
              label="Service Location"
              value={data.serviceLocation || "--"}
            />
            <Field label="Practice Location" value={data.location || "--"} />
            <Field label="Practice NPI" value={data.practiceNPI || "--"} />
          </div>
        </div>
      </div>
      <div className="mt-60">
        <div>
          <h3 className="text-lg font-semibold mb-6 text-gray-400 text-center ">
            Service Information
          </h3>
          <div>
            <AccordionTable
              data={tableData}
              columns={columns}
              tableName="View Claims"
              itemsPerPage={10}
              onServiceDataChange={handleServiceDataChange}
              initialServiceData={initialServiceData}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
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

export default SingleClaim;

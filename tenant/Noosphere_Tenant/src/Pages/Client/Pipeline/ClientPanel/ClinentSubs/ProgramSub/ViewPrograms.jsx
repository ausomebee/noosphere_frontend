import React, { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaChevronDown, FaArrowLeft } from "react-icons/fa";
import DashboardLayout from "../../../../../../Layout/TenantLayout";
import Button from "../../../../../../Components/Button/Button";
import CustomTable from "../../../../../../Components/Table/CustomTable"; // Adjust path if needed

const ViewPrograms = () => {
  const navigate = useNavigate();
  const { clientId } = useParams(); // Assuming you're using route params
  const triggerRef = useRef(null);

  // Mock dynamic names (replace with real data from props/params/context)
  const ClientName = "John Doe";
  const ProgramName = "Speech Therapy Program";

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Table Columns
  const columns = useMemo(
    () => [
      { header: "Target", key: "target" },
      { header: "Description", key: "description" },
    ],
    []
  );

  // Table Data
  const tableData = useMemo(
    () => [
      {
        id: "1",
        target: "Target 1",
        description: "Client will independently request desired items using 2-word phrases in 4/5 opportunities.",
        hasActions: true
      },
      {
        id: "2",
        target: "Target 2",
        description: "Client will follow 2-step directions with 80% accuracy across 3 sessions.",
        hasActions: true
    },

      {
        id: "3",
        target: "Target 3",
        description: "Client will use pronouns correctly in structured sentences during play.",
        hasActions: true
    },
      {
        id: "4",
        target: "Target 4",
        description: "Client will initiate social interactions with peers in 70% of opportunities.",
        hasActions: true
    },
    ],
    []
  );

  // Dropdown Actions
  const actions = [
    {
      type: "dropdown",
      items: [
        {
          label: "Record Data",
          onClick: (row) =>
            navigate(
              `/target-single/${ProgramName}/${row.target}?targetId=${row.id}&clientId=${clientId}`
            ),
        },
        {
          label: "View Data",
          onClick: (row) =>
            navigate(
              `/target-single/${ProgramName}/${row.target}?targetId=${row.id}&clientId=${clientId}`
            ),
        },
        {
          label: "Remove Target",
          onClick: () => console.log("Remove target"),
          className: "remove",
        },
      ],
    },
  ];

  const handleNewTarget = (type) => {
    setIsDropdownOpen(false);
    if (type === "library") {
      // Open library modal or navigate
      console.log("New Target from Library");
    } else {
      // Open custom target form
      console.log("New Custom Target");
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="program-column-header flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="back-button flex items-center gap-2 text-blue-600 hover:text-blue-800"
        >
          <FaArrowLeft />
          <span className="font-medium">Back</span>
        </button>

        <div className="breadcrumb-trail text-gray-600">
          <span>{ClientName}</span>
          <span className="mx-2">›</span>
          <span className="font-semibold text-gray-900">{ProgramName}</span>
        </div>
      </div>

      {/* New Button + Dropdown */}
      <div className="client-dropdown-wrapper flex justify-end mb-6 ">
     <div
          ref={triggerRef}
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          style={{ cursor: "pointer" }}
        >
          <Button
            label="New"
            variant="primary"
            icon={<FaChevronDown />}
            iconPosition="right"
            
          />

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="client-dropdown-menu w-200">
              <button
                onClick={() => handleNewTarget("library")}
                className="client-dropdown-item"
              >
                New Target from Library
              </button>
              <button
                onClick={() => handleNewTarget("custom")}
                className="client-dropdown-item"
              >
                New Custom Target
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <CustomTable
        data={tableData}
        columns={columns}
        actions={actions}
        tableName="Program Targets"
        itemsPerPage={10}
        showCheckbox={false}
        showActions={true}
      />
    </DashboardLayout>
  );
};

export default ViewPrograms;
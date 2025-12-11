import React, { useState } from "react";
import ReusableTable from "../../Components/Table/ReuseableTable";
import { FiEye, FiMoreVertical } from "react-icons/fi";
import "./Programs.css";
import DashboardLayout from "../../layouts/ClientLayout";

const Programs = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

  // Simplified data structure
  const [programs, setPrograms] = useState([
    {
      id: 1,
      programName: "Program 1",
      targets: [
        {
          id: 1,
          name: "Target 1",
          description: "Description lorem ipsum dolor sit amet",
        },
        {
          id: 2,
          name: "Target 1",
          description: "Description lorem ipsum dolor sit amet",
        },
        {
          id: 3,
          name: "Target 1",
          description: "Description lorem ipsum dolor sit amet",
        },
      ],
    },
    {
      id: 2,
      programName: "Program 2",
      targets: [
        { id: 4, name: "Target 2", description: "Description for target 2" },
      ],
    },
  ]);

  // Table columns - just program name
  const columns = [
    {
      key: "programName",
      title: "Program",
      render: (value) => (
        <div className="program-name-cell">
          <div className="program-name">{value}</div>
        </div>
      ),
    },
  ];

  // Single action - View Performance
  const actions = [
    {
      label: "View Performance",
      icon: <FiEye size={16} />,
      onClick: (row) => handleViewPerformance(row),
    //   render: (row) => (
    //     <button onClick={() => handleViewPerformance(row)}>
    //       <FiMoreVertical size={16} />
    //     </button>
    //   ),
    },
  ];

  // Render expanded row showing targets
  const renderExpandedRow = (row) => (
    <div className="targets-expanded-content">
      <div className="targets-list">
        {row.targets.map((target) => (
          <div key={target.id} className="target-item">
            <div className="target-info">
              <h5 className="target-name">{target.name}</h5>
              <p className="target-description">{target.description}</p>

              <button
                className="target-action-btn"
                onClick={() => handleTargetPerformance(target, row)}
              >
                <FiEye size={14} />
                <span>View Performance</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Handler functions
  const handleViewPerformance = (program) => {
    console.log("View performance for program:", program.programName);
  };

  const handleTargetPerformance = (target, program) => {
    console.log(
      "View performance for target:",
      target.name,
      "in program:",
      program.programName
    );
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  return (
    <DashboardLayout>
      <div className="programs-container">
        <div className="programs-header">
          <div className="programs-subtitle">
            <h1 className="programs-title">Programs</h1>
            <span className="new-count">4 new</span>
          </div>
          <div>
            <p>See your program and treatment information here</p>
          </div>
        </div>

        <ReusableTable
          title=""
          subtitle=""
          tabs={[]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          columns={columns}
          data={programs}
          searchPlaceholder="Search programs..."
          onSearch={handleSearch}
          showFilters={false}
          showViewToggle={false}
          emptyState={{
            icon: null,
            title: "No programs found",
            subtitle: "Get started by creating your first program",
          }}
          actions={actions}
          renderExpandedRow={renderExpandedRow}
           pagination={{ currentPage, totalPages: 10 }}
            onPageChange={setCurrentPage}
        />
      </div>
    </DashboardLayout>
  );
};

export default Programs;

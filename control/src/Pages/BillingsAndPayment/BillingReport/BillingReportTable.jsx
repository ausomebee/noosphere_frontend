import React from "react";
import { useNavigate } from "react-router-dom";
import CustomTable from "../../../Components/Table/CustomTable";
import { FaArrowLeft } from "react-icons/fa";

// Unfinished: nothing imports this screen, and the table has no data source or
// column definitions yet. The declarations below keep it from throwing if it is
// ever mounted.
const BillingReportTable = () => {
  const navigate = useNavigate();
  const tableDataState = [];
  const columns = [];

  const handleFilterChange = () => {};

  const filters = [
    {
      key: "filter_type",
      value: "",
      options: [
        { value: "", label: "Select Filter" },
        { value: "date_created", label: "Date Created" },
        { value: "assign_to", label: "Assign To" },
        { value: "stage_completion", label: "Stage Completion" },
        { value: "clear_filters", label: "Clear Filters" },
      ],
    },
  ];
  return (
    <>
      <div className="tenant-header">
        <div onClick={() => navigate(-1)} className="back-link" role="button" tabIndex={0} aria-label="Go back">
          <FaArrowLeft /> Back
        </div>
        <div className="tenant-title-container">
          <h1 className="tenant-title">Billing</h1>
          <h2 className="tenant-title-breadcrumbs">
            Reports/{" "}
            <span className="tenant-title-breadcrumbs-org">ACME Corp</span>
          </h2>
        </div>
      </div>
      <CustomTable
        data={tableDataState}
        columns={columns}
        filters={filters}
        onFilterChange={handleFilterChange}
       
      />
    </>
  );
};

export default BillingReportTable;

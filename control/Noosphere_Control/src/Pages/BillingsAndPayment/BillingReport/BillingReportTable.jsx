import React from "react";
import CustomTable from "../../../Components/Table/CustomTable";
import Layout from "../../Layout/ControlLayout";

const BillingReportTable = () => {
  const handleFilterChange = (key, value) => {
    console.log(`Filter changed: ${key} = ${value}`);
  };

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
    <Layout>
      <div className="tenant-header">
        <div onClick={() => navigate(-1)} className="back-link">
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
    </Layout>
  );
};

export default BillingReportTable;

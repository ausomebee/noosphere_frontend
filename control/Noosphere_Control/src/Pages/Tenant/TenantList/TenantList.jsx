import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../Layout/ControlLayout";
import "./TenantList.css";
import CustomTable from "../../../Components/Table/CustomTable";

const TenantList = () => {
  const navigate = useNavigate();

  const [filterValues, setFilterValues] = useState({
    dateAdded: "Date Added",
  });

  const filters = [
    {
      key: "dateAdded",
      value: filterValues.dateAdded,
      options: [
        { value: "Date Added", label: "Date Added" },
        { value: "Plan", label: "Plan" },
      ],
    },
  ];

  const overviewStats = [
    { label: "Total Tenants", value: "9.2k" },
    { label: "Total No of Tenant Clients", value: "320.4k" },
    { label: "Total No of Tenant Staff", value: "40.1k" },
  ];

  const columns = [
    { key: "name", header: "NAME" },
    { key: "date_created", header: "Date Created" },
    { key: "plan", header: "Plan", type: "plan" },
    { key: "status", header: "Account Status", type: "status" },
    { key: "account_officer", header: "Account Officer" },
  ];

  // Scatter Sample Tenant Data
  const tableData = [
    {
      name: "ACME Corp",
      date_created: "12/10/2024",
      plan: "Enterprise",
      status: "Active",
      account_officer: "Olivia Rhye",
      hasCheckbox: true,
      hasActions: true,
    },
    {
      name: "Beta Holdings",
      date_created: "03/02/2023",
      plan: "Gold",
      status: "InActive",
      account_officer: "Ethan Clarke",
      hasCheckbox: true,
      hasActions: true,
    },
    {
      name: "Gamma Inc",
      date_created: "07/07/2024",
      plan: "Basic",
      status: "Active",
      account_officer: "Sophia Turner",
      hasCheckbox: true,
      hasActions: true,
    },
    {
      name: "Delta Partners",
      date_created: "01/12/2022",
      plan: "Enterprise",
      status: "Active",
      account_officer: "Liam Martinez",
      hasCheckbox: true,
      hasActions: true,
    },
    {
      name: "Zeta Services",
      date_created: "09/11/2023",
      plan: "Gold",
      status: "Suspended",
      account_officer: "Ava James",
      hasCheckbox: true,
      hasActions: true,
    },
    {
      name: "Beta Holdings",
      date_created: "03/02/2023",
      plan: "Gold",
      status: "Blocked",
      account_officer: "Ethan Clarke",
      hasCheckbox: true,
      hasActions: true,
    },
    {
      name: "Gamma Inc",
      date_created: "07/07/2024",
      plan: "Basic",
      status: "Active",
      account_officer: "Sophia Turner",
      hasCheckbox: true,
      hasActions: true,
    },
    {
      name: "Delta Partners",
      date_created: "01/12/2022",
      plan: "Enterprise",
      status: "Active",
      account_officer: "Liam Martinez",
      hasCheckbox: true,
      hasActions: true,
    },
    {
      name: "ACME Corp",
      date_created: "12/10/2024",
      plan: "Enterprise",
      status: "Active",
      account_officer: "Olivia Rhye",
      hasCheckbox: true,
      hasActions: true,
    },
    {
      name: "Beta Holdings",
      date_created: "03/02/2023",
      plan: "Gold",
      status: "Active",
      account_officer: "Ethan Clarke",
      hasCheckbox: true,
      hasActions: true,
    },
    {
      name: "Gamma Inc",
      date_created: "07/07/2024",
      plan: "Basic",
      status: "Active",
      account_officer: "Sophia Turner",
      hasCheckbox: true,
      hasActions: true,
    },
  ];

  const actions = [
    {
      label: "View Tenant",
      onClick: (row) => {
        navigate("/tenants/tenant-lists/overview");
      },
    },
    {
      label: "Delete Tenant",
      className: "remove",
      onClick: (row) => {
        navigate("/tenants/tenant-lists");
      },
    },
  ];

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Layout>
      <div className="tenant-page-container">
        <div className="tenant-page-header">
          <h1 className="tenant-page-title">Tenants</h1>
          <p className="tenant-page-subtitle">
            Manage NooSphere tenants seamlessly
          </p>
        </div>

        <h3 className="tenant-section-label">Overview</h3>
        <div className="overview-card-wrapper">
          {overviewStats.map((stat, idx) => (
            <div className="overview-card" key={idx}>
              <label>{stat.label}</label>
              <p>{stat.value}</p>
            </div>
          ))}
        </div>

        <h3 className="tenant-section-label">All Tenants</h3>
        <CustomTable
          columns={columns}
          data={tableData}
          actions={actions}
          filters={filters}
          onFilterChange={handleFilterChange}
          itemsPerPage={10}
        />
      </div>
    </Layout>
  );
};

export default TenantList;

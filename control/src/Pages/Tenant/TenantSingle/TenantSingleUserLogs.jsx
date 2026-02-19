import React, { useState, useMemo } from 'react';
import { FaArrowLeft } from "react-icons/fa";

import "./TenantSingle.css";
import { Link } from "react-router-dom";
import CustomTable from '../../../Components/Table/CustomTable';

const TenantSingleUserLogs = () => {
  const [tableDataState, setTableDataState] = useState([
    {
      activityId: "ACT5739",
      description: "Adding a new appointment",
      dateTime: "12/10/2023 11:34 PM",
      user: "Admin",
      status: "Failed",
      category: "Appointment & Scheduling",
      hasActions: true,
      hasCheckbox: true,
    },
    {
      activityId: "ACT5739",
      description: "Editing Staff profile",
      dateTime: "12/10/2023 11:34 PM",
      user: "Admin",
      status: "Success",
      category: "Staff Management",
      hasActions: true,
      hasCheckbox: true,
    },
    {
      activityId: "ACT5739",
      description: "Editing Staff schedule",
      dateTime: "12/10/2023 11:34 PM",
      user: "Admin",
      status: "Success",
      category: "Staff Management",
      hasActions: true,
      hasCheckbox: true,
    },
    {
      activityId: "ACT5739",
      description: "Editing Staff permissions",
      dateTime: "12/10/2023 11:34 PM",
      user: "Admin",
      status: "Success",
      category: "Staff Management",
      hasActions: true,
      hasCheckbox: true,
    },
    {
      activityId: "ACT5739",
      description: "Editing Staff role",
      dateTime: "12/10/2023 11:34 PM",
      user: "Admin",
      status: "Success",
      category: "Staff Management",
      hasActions: true,
      hasCheckbox: true,
    },
    {
      activityId: "ACT5739",
      description: "Editing Staff details",
      dateTime: "12/10/2023 11:34 PM",
      user: "Admin",
      status: "Failed",
      category: "Staff Management",
      hasActions: true,
      hasCheckbox: true,
    },
    {
      activityId: "ACT5739",
      description: "Uploading client data",
      dateTime: "12/10/2023 11:34 PM",
      user: "Admin",
      status: "Failed",
      category: "Client Management",
      hasActions: true,
      hasCheckbox: true,
    },
    {
      activityId: "ACT5739",
      description: "Deactivating client account",
      dateTime: "12/10/2023 11:34 PM",
      user: "Admin",
      status: "Success",
      category: "Client Management",
      hasActions: true,
      hasCheckbox: true,
    },
    {
      activityId: "ACT5739",
      description: "Generating report",
      dateTime: "12/10/2023 11:34 PM",
      user: "Admin",
      status: "Success",
      category: "Reporting",
      hasActions: true,
      hasCheckbox: true,
    },
    {
      activityId: "ACT5739",
      description: "Adding a new schedule",
      dateTime: "12/10/2023 11:34 PM",
      user: "Admin",
      status: "Success",
      category: "Appointment & Scheduling",
      hasActions: true,
      hasCheckbox: true,
    },
  ]);

  const [activeTab, setActiveTab] = useState("All");
  const [viewIssueId, setViewIssueId] = useState(null);

  // Define tabs based on categories
  const tabs = [
    { name: "All", count: tableDataState.length },
    {
      name: "Appointment & Scheduling",
      count: tableDataState.filter((item) => item.category === "Appointment & Scheduling").length,
    },
    {
      name: "Client Management",
      count: tableDataState.filter((item) => item.category === "Client Management").length,
    },
    {
      name: "Staff Management",
      count: tableDataState.filter((item) => item.category === "Staff Management").length,
    },
    {
      name: "Reporting",
      count: tableDataState.filter((item) => item.category === "Reporting").length,
    },
    // Add more categories here if needed
  ];

  // Define columns (same for all tabs)
  const columns = [
    { key: "activityId", header: "ACTIVITY ID" },
    { key: "description", header: "DESCRIPTION" },
    { key: "dateTime", header: "DATE & TIME" },
    { key: "user", header: "USER" },
    { key: "status", header: "STATUS", type: "status" },
  ];

  const actions = [
    {
      label: "View Issue",
      onClick: (row) => {
        setViewIssueId(row.activityId);
      },
    },
    {
      label: "Delete Issue",
      className: "remove",
      onClick: (row) => {
      },
    },
  ];

  // Filter data based on the active tab
  const filteredData =
    activeTab === "All"
      ? tableDataState
      : tableDataState.filter((item) => item.category === activeTab);

  // Define all possible filters
  const allFilters = [
    {
      key: "category",
      value: "",
      options: [
        { value: "", label: "Category" },
        { value: "Appointment & Scheduling", label: "Appointment & Scheduling" },
        { value: "Client Management", label: "Client Management" },
        { value: "Staff Management", label: "Staff Management" },
        { value: "Reporting", label: "Reporting" },
      ],
    },
    {
      key: "user",
      value: "",
      options: [
        { value: "", label: "User" },
        { value: "Admin", label: "Admin" },
        // Add more users if needed
      ],
    },
    {
      key: "status",
      value: "",
      options: [
        { value: "", label: "Status" },
        { value: "Success", label: "Success" },
        { value: "Failed", label: "Failed" },
      ],
    },
  ];

  // State to manage filter values
  const [filterValues, setFilterValues] = useState({
    category: "",
    user: "",
    status: "",
  });

  // Compute filters based on activeTab
  const filters = useMemo(() => {
    if (activeTab === "All") {
      return allFilters.map((filter) => ({
        ...filter,
        value: filterValues[filter.key],
      }));
    } else {
      // When a specific tab is active, remove the category filter since the tab already filters by category
      return allFilters
        .filter((filter) => filter.key !== "category")
        .map((filter) => ({
          ...filter,
          value: filterValues[filter.key],
        }));
    }
  }, [activeTab, filterValues]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <>
      <div className="tenant-header">
        <Link to="/tenants/tenant-list" className="back-link">
          <FaArrowLeft /> Back
        </Link>
        <div className="tenant-title-container">
          <h1 className="tenant-title">Tenant</h1>
          <h2 className="tenant-title-breadcrumbs">
            Tenants /{" "}
            <span className="tenant-title-breadcrumbs-org">ACME Corp</span>
          </h2>
        </div>
      </div>

      <div className="invoices-tabs-container">
        <div className="tenants-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              className={`tenants-tab ${
                activeTab === tab.name ? "active" : ""
              }`}
              onClick={() => setActiveTab(tab.name)}
            >
              <span>{tab.name.toUpperCase()}</span>
            </button>
          ))}
        </div>

        <CustomTable
          data={filteredData}
          columns={columns}
          filters={filters}
          onFilterChange={handleFilterChange}
          actions={actions}
          showActions={true}
          itemsPerPage={10}
          tableName="Activity History"
        />
      </div>
    </>
  );
};

export default TenantSingleUserLogs;
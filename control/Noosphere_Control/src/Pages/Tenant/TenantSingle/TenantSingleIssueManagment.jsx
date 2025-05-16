import React, { useState, useMemo } from "react";
import { FaArrowLeft } from "react-icons/fa";
import Layout from "../../Layout/ControlLayout";
import "./TenantSingle.css";
import { Link } from "react-router-dom";
import Button from "../../../Components/Button/Button";
import Chart from "react-apexcharts";
import { SelectInput } from "../../../Components/Input/Inputs";
import CustomTable from "../../../Components/Table/CustomTable";
import TenantListViewIssues from "../TenantList/TenantListViewIssues";

const TenantSingleIssueManagement = () => {
  // Table data
  const [tableDataState, setTableDataState] = useState([
    {
      id: "1",
      name: "Error logging in",
      time: "12/10/2024",
      category: "Login Issues",
      severity: "Critical",
      logged_by: "James Smith",
      assigned_to: "James Smith",
      status: "Pending",
      hasActions: true,
      hasCheckbox: true,
    },
    {
      id: "2",
      name: "Can't find appointment",
      time: "12/13/2024",
      category: "Appointment Creation",
      severity: "Critical",
      logged_by: "Thomas Brown",
      assigned_to: "Thomas Brown",
      status: "Resolved",
      hasActions: true,
      hasCheckbox: true,
    },
    {
      id: "3",
      name: "Can't Login",
      time: "1/10/2024",
      category: "Billing",
      severity: "Critical",
      logged_by: "Matthew Johnson",
      assigned_to: "Matthew Johnson",
      status: "Resolved",
      hasActions: true,
      hasCheckbox: true,
    },
    {
      id: "4",
      name: "Unable to create invoice",
      time: "2/1/2024",
      category: "Invoicing",
      severity: "Low",
      logged_by: "James Smith",
      assigned_to: "James Smith",
      status: "Resolved",
      hasActions: true,
      hasCheckbox: true,
    },
    {
      id: "5",
      name: "Unable to create form",
      time: "2/1/2024",
      category: "Creating a Form",
      severity: "Medium",
      logged_by: "James Smith",
      assigned_to: "James Smith",
      status: "Resolved",
      hasActions: true,
      hasCheckbox: true,
    },
    {
      id: "6",
      name: "Unable to create appointment",
      time: "2/1/2024",
      category: "Appointment Creation",
      severity: "High",
      logged_by: "Tom Perez",
      assigned_to: "Tom Perez",
      status: "Resolved",
      hasActions: true,
      hasCheckbox: true,
    },
    {
      id: "7",
      name: "Error logging in",
      time: "2/1/2024",
      category: "Reporting",
      severity: "Medium",
      logged_by: "James Smith",
      assigned_to: "James Smith",
      status: "Unresolved",
      hasActions: true,
      hasCheckbox: true,
    },
  ]);

  const [activeTab, setActiveTab] = useState("All");
  const [viewIssueId, setViewIssueId] = useState(null);

  // Define tabs
  const tabs = [
    { name: "All", count: tableDataState.length },
    {
      name: "Resolved",
      count: tableDataState.filter((item) => item.status === "Resolved").length,
    },
    {
      name: "Pending",
      count: tableDataState.filter((item) => item.status === "Pending").length,
    },
  ];

  // Define columns based on the active tab
  const columns =
    activeTab === "All"
      ? [
          { key: "name", header: "NAME" },
          { key: "time", header: "TIME" },
          { key: "category", header: "CATEGORY" },
          { key: "severity", header: "SEVERITY", type: "severity" },
          { key: "status", header: "STATUS", type: "status" },
        ]
      : [
          { key: "name", header: "NAME" },
          { key: "time", header: "TIME" },
          { key: "category", header: "CATEGORY" },
          { key: "severity", header: "SEVERITY", type: "severity" },
          { key: "logged_by", header: "LOGGED BY" },
          { key: "assigned_to", header: "ASSIGNED TO" },
        ];

  const actions = [
    {
      label: "View Issue",
      onClick: (row) => {
        setViewIssueId(row.id);
      },
    },
    {
      label: "Delete Issue",
      className: "remove",
      onClick: (row) => {
        console.log(`Deleting issue: ${row.id}`);
      },
    },
  ];

  const filteredData =
    activeTab === "All"
      ? tableDataState
      : tableDataState.filter((item) => item.status === activeTab);

  // Define all possible filters
  const allFilters = [
    {
      key: "category",
      value: "",
      options: [
        { value: "", label: "Category" },
        { value: "Login Issues", label: "Login Issues" },
        { value: "Appointment Creation", label: "Appointment Creation" },
        { value: "Billing", label: "Billing" },
        { value: "Invoicing", label: "Invoicing" },
        { value: "Creating a Form", label: "Creating a Form" },
        { value: "Reporting", label: "Reporting" },
      ],
    },
    {
      key: "severity",
      value: "",
      options: [
        { value: "", label: "Severity" },
        { value: "Critical", label: "Critical" },
        { value: "High", label: "High" },
        { value: "Medium", label: "Medium" },
        { value: "Low", label: "Low" },
      ],
    },
    {
      key: "status",
      value: "",
      options: [
        { value: "", label: "Status" },
        { value: "Pending", label: "Pending" },
        { value: "Resolved", label: "Resolved" },
        { value: "Unresolved", label: "Unresolved" },
      ],
    },
  ];

  // State to manage filter values
  const [filterValues, setFilterValues] = useState({
    category: "",
    severity: "",
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
      return allFilters
        .filter((filter) => filter.key !== "status")
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

  // Data for the Top Issue donut chart
  const topIssueData = {
    series: [30, 25, 20, 15, 10],
    options: {
      chart: {
        type: "donut",
        height: 180,
      },
      labels: ["Issue A", "Issue B", "Issue C", "Issue D", "Issue E"],
      colors: ["#1D4ED8", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE"],
      dataLabels: {
        enabled: false,
      },
      legend: {
        show: false,
      },
      plotOptions: {
        pie: {
          donut: {
            size: "50%",
          },
        },
      },
      tooltip: {
        y: {
          formatter: (val) => `${val}%`,
        },
      },
    },
  };

  return (
    <Layout>
      {viewIssueId ? (
        <TenantListViewIssues
          issueId={viewIssueId}
          onBack={() => setViewIssueId(null)}
        />
      ) : (
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

          <h3 className="tenant-header-gen">Overview</h3>

          <div className="issue-overview-section">
            <div className="issue-overview-cards">
              <div className="issue-overview-card">
                <h4>All Issues</h4>
                <p className="issue-overview-value">10.2K</p>
              </div>
              <div className="issue-overview-card">
                <h4>Active Issues</h4>
                <p className="issue-overview-value">9.2K</p>
                <a href="#" className="issue-view-link">
                  View
                </a>
              </div>
              <div className="issue-overview-card">
                <h4>Avg Resolution Time</h4>
                <p className="issue-overview-value">98 hrs</p>
              </div>
              <div className="issue-overview-card">
                <h4>Resolved Issues</h4>
                <p className="issue-overview-value">40.2K</p>
                <a href="#" className="issue-view-link">
                  View
                </a>
              </div>
              <div className="issue-overview-card issue-top-issue-card">
                <div className="issue-top-issue-header">
                  <h4>Top Issue</h4>
                  <SelectInput
                    options={[
                      { value: "by_percentage", label: "BY %" },
                      { value: "by_count", label: "BY COUNT" },
                    ]}
                  />
                </div>
                <div className="issue-top-issue-chart">
                  <Chart
                    options={topIssueData.options}
                    series={topIssueData.series}
                    type="donut"
                    height={180}
                  />
                </div>
                <Button label="SEE BREAKDOWN" variant="primary" width="100%" />
              </div>
            </div>
          </div>

          <h3 className="tenant-header-gen">Issue Log</h3>

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
                  {tab.count > 0 && (
                    <span className="tab-count">{tab.count}</span>
                  )}
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
              tableName="Issue Log"
            />
          </div>
        </>
      )}
    </Layout>
  );
};

export default TenantSingleIssueManagement;

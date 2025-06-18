import React, { useState, useEffect } from "react";
import Layout from "../Layout/ControlLayout";
import { SelectInput } from "../../Components/Input/Inputs";
import Chart from "react-apexcharts";
import Button from "../../Components/Button/Button";
import ReusableModal from "../../Components/ReusableModal/ReusableModal";
import Pagination from "../../Components/Table/Pagination";
import "./IssueManagement.css";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../Components/Table/CustomTable";
import AddIssueModal from "../../Components/ReusableModal/AddAnIssue";
import { useSelector } from "react-redux";
import api2 from "../../api/TenantApis";
import ViewIssue from "./ViewIssue";

const IssueManagement = () => {
  const [selectedFilter, setSelectedFilter] = useState("by category");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddIssueModalOpen, setIsAddIssueModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [filterValue, setFilterValue] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [tenantList, setTenantList] = useState([]);
  const [issueData, setIssueData] = useState([
    {
      id: 1,
      issue_id: "ISS-2393",
      category: "Login Issues",
      priority: "Enterprise Critical",
      logged_by: "James Ca...",
      date_reported: "12/10/2024",
      date_updated: "15/10/2024",
      assigned_to: "Angelina ka...",
      status: "In-Progress",
      hasActions: true,
    },
    {
      id: 2,
      issue_id: "ISS-2709",
      category: "Billing & Payments",
      priority: "Enterprise High",
      logged_by: "James Ca...",
      date_reported: "12/10/2024",
      date_updated: "15/10/2024",
      assigned_to: "James Har...",
      status: "Not-Started",
      hasActions: true,
    },
    {
      id: 3,
      issue_id: "ISS-8790",
      category: "Scheduling",
      priority: "Critical",
      logged_by: "James Ca...",
      date_reported: "12/10/2024",
      date_updated: "15/10/2024",
      assigned_to: "Jamie Vardy",
      status: "Resolved",
      hasActions: true,
    },
    {
      id: 4,
      issue_id: "ISS-8899",
      category: "Login Issues",
      priority: "High",
      logged_by: "James Ca...",
      date_reported: "12/10/2024",
      date_updated: "15/10/2024",
      assigned_to: "Richard De...",
      status: "Unassigned",
      hasActions: true,
    },
    {
      id: 5,
      issue_id: "ISS-2709",
      category: "Login Issues",
      priority: "Medium",
      logged_by: "James Ca...",
      date_reported: "12/10/2024",
      date_updated: "15/10/2024",
      assigned_to: "Celine Dion",
      status: "In-Progress",
      hasActions: true,
    },
    {
      id: 6,
      issue_id: "ISS-2709",
      category: "Login Issues",
      priority: "Low",
      logged_by: "James Ca...",
      date_reported: "12/10/2024",
      date_updated: "15/10/2024",
      assigned_to: "Alvarra Akr...",
      status: "Not-Started",
      hasActions: true,
    },
    {
      id: 7,
      issue_id: "ISS-2709",
      category: "Login Issues",
      priority: "Critical",
      logged_by: "James Ca...",
      date_reported: "12/10/2024",
      date_updated: "15/10/2024",
      assigned_to: "Luther Van...",
      status: "Resolved",
      hasActions: true,
    },
  ]);
  const itemsPerPage = 5;
  const [selectedIssue, setSelectedIssue] = useState(null);

  const token = useSelector((state) => state.authentication?.user?.token);
  const accessToken = token;
  const refreshToken = token;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [adminsResponse, tenantsResponse] = await Promise.all([
          api2.getAllAdmins({ accessToken, refreshToken }).then((response) => ({
            type: "admins",
            response,
          })),
          api2.getAllTenants({ accessToken, refreshToken }).then((response) => ({
            type: "tenants",
            response,
          })),
        ]);

        const errors = {};

        if (adminsResponse.type === "admins") {
          if (!Array.isArray(adminsResponse.response.data?.data)) {
            setStaffList([]);
            errors.admins = "Invalid admins data received from API";
          } else {
            const adminsData = adminsResponse.response.data.data.map((a) => ({
              staffId: a.id || "",
              name: a.fullName || a.id || "Unnamed Admin",
            }));
            setStaffList(adminsData);
          }
        }

        if (tenantsResponse.type === "tenants") {
          if (!Array.isArray(tenantsResponse.response.data?.data)) {
            setTenantList([]);
            errors.tenants = "Invalid tenants data received from API";
          } else {
            const tenantsData = tenantsResponse.response.data.data.map((t) => ({
              tenantId: t.id || "",
              name: t.companyName || t.id || "Unnamed Tenant",
              isEnterprise: t.isEnterprise || false,
            }));
            setTenantList(tenantsData);
          }
        }

        if (Object.keys(errors).length > 0) {
          console.error("API fetch errors:", errors);
        }
      } catch (err) {
        console.error(`Failed to fetch data: ${err.message}`);
        setStaffList([]);
        setTenantList([]);
      }
    };

    fetchData();
  }, [accessToken, refreshToken]);

  const handleFilterChange = (key, value) => {
    setFilterValue(value);
    setActiveTab("all");
  };

  const handleAddIssue = (newIssue) => {
    const tenant = tenantList.find((t) => t.tenantId === newIssue.tenantId);
    const staff = staffList.find((s) => s.staffId === newIssue.assignToStaff);
    const newIssueData = {
      id: issueData.length + 1,
      issue_id: `ISS-${Math.floor(1000 + Math.random() * 9000)}`,
      category: newIssue.category,
      priority: newIssue.priority,
      logged_by: newIssue.createdBy || "Unknown",
      date_reported: new Date().toLocaleDateString("en-US"),
      date_updated: new Date().toLocaleDateString("en-US"),
      assigned_to: staff?.name || "Unassigned",
      status: "Not-Started",
      hasActions: true,
    };
    setIssueData([newIssueData, ...issueData]);
    setIsAddIssueModalOpen(false);
  };

  const issuesStats = [
    { key: "all", label: "All", count: "1200" },
    { key: "unassigned", label: "Unassigned", count: "123" },
    { key: "in_progress", label: "In-Progress", count: "123" },
    { key: "not_started", label: "Not Started", count: "24" },
    { key: "resolved", label: "Resolved", count: "585" },
  ];

  const getTopIssueData = () => {
    switch (selectedFilter) {
      case "by category":
        return {
          series: [48, 20, 15, 14.9, 14],
          options: {
            chart: { type: "donut", height: 180 },
            labels: [
              "Account & Access",
              "Billing & Payments",
              "Scheduling",
              "Login Issues",
              "User Management & Roles",
            ],
            colors: ["#1D4ED8", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE"],
            dataLabels: { enabled: false },
            legend: { show: false },
            plotOptions: { pie: { donut: { size: "50%" } } },
            tooltip: { y: { formatter: (val) => `${val}%` } },
          },
        };
      case "by status":
        return {
          series: [48, 20, 15, 14.9],
          options: {
            chart: { type: "donut", height: 180 },
            labels: ["Resolved", "In Progress", "Not Started", "Unassigned"],
            colors: ["#1D4ED8", "#3B82F6", "#60A5FA", "#93C5FD"],
            dataLabels: { enabled: false },
            legend: { show: false },
            plotOptions: { pie: { donut: { size: "50%" } } },
            tooltip: { y: { formatter: (val) => `${val}%` } },
          },
        };
      case "by date reported":
        return {
          series: [48, 20, 15, 14.9, 14],
          options: {
            chart: { type: "donut", height: 180 },
            labels: [
              "12/10/2024",
              "12/9/2024",
              "12/8/2024",
              "12/7/2024",
              "12/6/2024",
            ],
            colors: ["#1D4ED8", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE"],
            dataLabels: { enabled: false },
            legend: { show: false },
            plotOptions: { pie: { donut: { size: "50%" } } },
            tooltip: { y: { formatter: (val) => `${val}%` } },
          },
        };
      case "by assigned to":
        return {
          series: [48, 20, 15, 14.9, 14],
          options: {
            chart: { type: "donut", height: 180 },
            labels: [
              "Angelina ka...",
              "James Har...",
              "Jamie Vardy",
              "Richard De...",
              "Celine Dion",
            ],
            colors: ["#1D4ED8", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE"],
            dataLabels: { enabled: false },
            legend: { show: false },
            plotOptions: { pie: { donut: { size: "50%" } } },
            tooltip: { y: { formatter: (val) => `${val}%` } },
          },
        };
      default:
        return {
          series: [30, 25, 20, 15, 10],
          options: {
            chart: { type: "donut", height: 180 },
            labels: ["Issue A", "Issue B", "Issue C", "Issue D", "Issue E"],
            colors: ["#1D4ED8", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE"],
            dataLabels: { enabled: false },
            legend: { show: false },
            plotOptions: { pie: { donut: { size: "50%" } } },
            tooltip: { y: { formatter: (val) => `${val}%` } },
          },
        };
    }
  };

  const getModalData = () => {
    const data = {
      "by category": [
        { category: "Account & Access", count: 4800 },
        { category: "Billing & Payments", count: 2000 },
        { category: "Scheduling", count: 1500 },
        { category: "Login Issues", count: 1490 },
        { category: "User Management & Roles", count: 1400 },
      ],
      "by status": [
        { category: "Resolved", count: 4800 },
        { category: "In Progress", count: 2000 },
        { category: "Not Started", count: 1500 },
        { category: "Unassigned", count: 1490 },
      ],
      "by date reported": [
        { category: "12/10/2024", count: 4800 },
        { category: "12/9/2024", count: 2000 },
        { category: "12/8/2024", count: 1500 },
        { category: "12/7/2024", count: 1490 },
        { category: "12/6/2024", count: 1400 },
      ],
      "by assigned to": [
        { category: "Angelina ka...", count: 4800 },
        { category: "James Har...", count: 2000 },
        { category: "Jamie Vardy", count: 1500 },
        { category: "Richard De...", count: 1490 },
        { category: "Celine Dion", count: 1400 },
      ],
    };
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return data[selectedFilter] ? data[selectedFilter].slice(startIdx, endIdx) : [];
  };

  const totalPages = Math.ceil(
    {
      "by category": 5,
      "by status": 4,
      "by date reported": 5,
      "by assigned to": 5,
    }[selectedFilter] / itemsPerPage || 1
  );

  const topIssueData = getTopIssueData();

  const allColumns = [
    { key: "issue_id", header: "Issue ID" },
    { key: "category", header: "Category" },
    { key: "priority", header: "Priority", type: "priority" },
    { key: "logged_by", header: "Logged by" },
    { key: "date_reported", header: "Date reported", type: "date" },
    { key: "date_updated", header: "Last Updated", type: "date" },
    { key: "assigned_to", header: "Assigned to" },
    { key: "status", header: "Issue Status", type: "status" },
  ];

  const filteredColumns = allColumns.filter((col) => col.key !== "status");

  const activeActions = [
    { label: "View Issue", onClick: (row) => setSelectedIssue(row) },
  ];

  const filters = [
    {
      key: "filter_type",
      value: "",
      options: [
        { value: "", label: "Select Filter" },
        { value: "category", label: "Category" },
        { value: "priority", label: "Priority" },
        { value: "date_reported", label: "Date Reported" },
        { value: "date_updated", label: "Last Updated" },
        { value: "assigned_to", label: "Assigned to" },
        { value: "clear_filters", label: "Clear Filters" },
      ],
    },
  ];

  if (selectedIssue) {
    return (
      <ViewIssue
        issue={selectedIssue}
        onBack={() => setSelectedIssue(null)}
      />
    );
  }

  return (
    <Layout>
      <div className="billing-board-header">
        <div className="billing-board-title">
          <h1>Issues Management</h1>
          <p>Manage all customer related issues here</p>
        </div>
      </div>

      <div className="issue-mgmt-overview-section">
        <h3 className="tenant-section-label">Overview</h3>
        <div className="issue-mgmt-overview-cards">
          <div className="issue-mgmt-overview-card-container">
            <div className="issue-mgmt-overview-card-one">
              <div className="issue-mgmt-overview-card">
                <h4>All Issues</h4>
                <div className="issue-mgmt-overview-value-container">
                  <p className="issue-mgmt-overview-value">10.2K</p>
                </div>
              </div>
              <div className="issue-mgmt-overview-card">
                <h4>Assigned Issues</h4>
                <div className="issue-mgmt-overview-value-container">
                  <p className="issue-mgmt-overview-value">9.2K</p>
                </div>
              </div>
              <div className="issue-mgmt-overview-card">
                <h4>Issues In Progress</h4>
                <div className="issue-mgmt-overview-value-container">
                  <p className="issue-mgmt-overview-value">8K</p>
                </div>
              </div>
            </div>
            <div className="issue-mgmt-overview-card-two">
              <div className="issue-mgmt-overview-card">
                <h4>Resolved Issues</h4>
                <div className="issue-mgmt-overview-value-container">
                  <p className="issue-mgmt-overview-value">40.2K</p>
                </div>
              </div>
              <div className="issue-mgmt-overview-card">
                <h4>Avg Resolution Time</h4>
                <div className="issue-mgmt-overview-value-container">
                  <p className="issue-mgmt-overview-value">98 hrs</p>
                </div>
              </div>
            </div>
          </div>
          <div className="issue-mgmt-overview-card issue-mgmt-top-issue-card">
            <div className="issue-mgmt-top-issue-header">
              <h4>Top Issue</h4>
              <div>
                <SelectInput
                  options={[
                    { value: "by category", label: "by Category" },
                    { value: "by priority", label: "By Priority" },
                    { value: "by status", label: "By Status" },
                    { value: "by date reported", label: "By Date Reported" },
                    { value: "by assigned to", label: "By Assigned to" },
                  ]}
                  className="issue-mgmt-top-issue-select"
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  value={selectedFilter}
                />
              </div>
            </div>
            <div className="issue-mgmt-top-issue-chart">
              <Chart
                options={topIssueData.options}
                series={topIssueData.series}
                type="donut"
                height={180}
              />
            </div>
            <Button
              label="See breakdown"
              variant="primary"
              width="100%"
              onClick={() => setIsModalOpen(true)}
            />
          </div>
        </div>
      </div>
      <div className="issue-mgmt-issue-log-section">
        <h3 className="tenant-section-label">Issue Log</h3>
        <div className="subscription-tabs-container">
          {issuesStats.map((tab) => (
            <button
              key={tab.key}
              className={`subscription-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label} <span className="candidate-count">{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="add-issue-buttons">
          <Button
            label="Log an Issue"
            icon={<FaPlus />}
            iconPosition="left"
            width="200px"
            variant="primary"
            aria-label="Add a new issue"
            onClick={() => setIsAddIssueModalOpen(true)}
          />
        </div>
        <div className="issue-mgt-table-container">
          <CustomTable
            data={issueData}
            columns={allColumns}
            filters={filters}
            onFilterChange={handleFilterChange}
            actions={activeActions}
            showActions={true}
            itemsPerPage={10}
            tableName="Issue Management"
            showCheckbox={false}
            hasStatusDot={false}
          />
        </div>
      </div>

      <ReusableModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Top Issue by ${selectedFilter.replace("by ", "")}`}
        primaryButtonText="Close"
        secondaryButtonText="Cancel"
        primaryButtonColor="#000000"
        secondaryButtonColor="#ffffff"
      >
        <div className="issue-mgt-modal-content">
          {getModalData().map((item, index) => (
            <div key={index} className="modal-item">
              <span>{item.category}</span>
              <span>{item.count}</span>
            </div>
          ))}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </ReusableModal>

      <AddIssueModal
        isOpen={isAddIssueModalOpen}
        onClose={() => setIsAddIssueModalOpen(false)}
        onSave={handleAddIssue}
        tenantList={tenantList}
        staffList={staffList}
      />
    </Layout>
  );
};

export default IssueManagement;
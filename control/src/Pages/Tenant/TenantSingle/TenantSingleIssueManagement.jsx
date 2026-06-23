import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "./TenantSingle.css";
import Button from "../../../Components/Button/Button";
import Chart from "react-apexcharts";
import CustomTable from "../../../Components/Table/CustomTable";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";
import TableFilterModal from "../../../Components/ReusableModal/TableFilterModal";
import TableFilterDateModal from "../../../Components/ReusableModal/TableFilterDateModal";
import ViewIssue from "../../IssueManagement/ViewIssue";
import useAuth from "../../../hooks/useAuth";
import issueApi from "../../../api/IssueApi";
import tenantApi from "../../../api/TenantApis";
import { showToast, showApiError } from "../../../Helper/ShowToast";
import { formatDate } from "../../../Helper/Formatters";
import { SectionSpinner } from "../../../Components/LoadingSpinner";
import usePersistedTab from "../../../hooks/usePersistedTab";

const TenantSingleIssueManagement = () => {
  const { tenantId } = useParams();
  const { accessToken, refreshToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [issues, setIssues] = useState([]);
  const [tenant, setTenant] = useState(null);
  const [activeTab, setActiveTab] = usePersistedTab("control:tenantIssueManagement", "all");
  const [viewIssue, setViewIssue] = useState(null);
  const [breakdownModal, setBreakdownModal] = useState(false);

  // Modal-based filters
  const [openFilterModal, setOpenFilterModal] = useState(null); // "category"|"severity"|"status"|"date"
  const [activeFilters, setActiveFilters] = useState({ category: "", severity: "", status: "", dateRange: null });

  const fetchOverview = useCallback(async () => {
    try {
      const res = await issueApi.GetTenantManagementOverview({
        tenantId,
        accessToken,
        refreshToken,
      });
      setOverview(res.data || res);
    } catch (err) {
      if (import.meta.env.DEV) console.warn("Overview error:", err.message);
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchIssues = useCallback(async (status) => {
    try {
      const res = await issueApi.GetTenantIssuesByStatus({
        tenantId,
        status,
        accessToken,
        refreshToken,
      });
      setIssues(res.data || []);
    } catch (err) {
      showApiError(err, "LOAD_ISSUES");
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTenant = useCallback(async () => {
    try {
      const res = await tenantApi.GetSingleTenant({ tenantId, accessToken, refreshToken });
      setTenant(res.data || res || null);
    } catch (err) {
      if (import.meta.env.DEV) console.warn("Tenant fetch error:", err.message);
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.allSettled([
        fetchOverview(),
        fetchIssues(activeTab),
        fetchTenant(),
      ]);
      setLoading(false);
    };
    loadAll();
  }, []);

  useEffect(() => {
    fetchIssues(activeTab);
  }, [activeTab, fetchIssues]);

  const tenantName = tenant?.companyName || tenant?.contactPerson || "Tenant";

  // Overview stats — API returns { "_count": { "_all": N } } for count fields
  const totalIssues = overview?.totalIssues?._count?._all ?? overview?.totalIssues ?? 0;
  const activeIssues = overview?.activeIssues?._count?._all ?? overview?.activeIssues ?? 0;
  const resolvedIssues = overview?.resolvedIssues?._count?._all ?? overview?.resolvedIssues ?? 0;
  const avgResolutionTime = overview?.averageResolutionTime ?? overview?.avgResolutionTime ?? "—";
  // API returns count as _count.category — normalise to a flat list
  const normalisedCategories = useMemo(() => {
    const raw = overview?.countByCategory;
    const cats = Array.isArray(raw) ? raw : [];
    return cats.map((c) => ({
      category: c.category || c.name || "Unknown",
      count: c._count?.category ?? c.count ?? 0,
    }));
  }, [overview?.countByCategory]);

  // Donut chart — top 5 categories
  const top5Categories = useMemo(() => {
    return [...normalisedCategories]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [normalisedCategories]);

  const chartData = useMemo(() => {
    const baseChart = { type: "donut", height: 180, animations: { enabled: false } };
    if (top5Categories.length === 0) {
      return {
        series: [1],
        options: {
          chart: baseChart,
          labels: ["No data"],
          colors: ["#E5E7EB"],
          dataLabels: { enabled: false },
          legend: { show: false },
          plotOptions: { pie: { donut: { size: "50%" } } },
        },
      };
    }
    return {
      series: top5Categories.map((c) => c.count),
      options: {
        chart: baseChart,
        labels: top5Categories.map((c) => c.category),
        colors: ["#1D4ED8", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE"],
        dataLabels: { enabled: false },
        legend: { show: false },
        plotOptions: { pie: { donut: { size: "50%" } } },
        tooltip: { y: { formatter: (val) => `${val}` } },
      },
    };
  }, [top5Categories]);

  const issueLogFilters = useMemo(() => [
    {
      key: "filter_type",
      options: [
        { value: "", label: "Filter by..." },
        { value: "category", label: "Category" },
        { value: "severity", label: "Severity" },
        ...(activeTab === "all" ? [{ value: "status", label: "Status" }] : []),
        { value: "date", label: "Date" },
        { value: "clear_filters", label: "Clear Filters" },
      ],
    },
  ], [activeTab]);

  const handleIssueFilterTypeSelect = (type) => {
    setOpenFilterModal(type);
  };

  // Tab counts — status values match backend enum exactly
  const tabs = useMemo(() => [
    { name: "all", label: "All", count: totalIssues },
    { name: "Not Started", label: "Not Started", count: null },
    { name: "In Progress", label: "In Progress", count: null },
    { name: "Unassigned", label: "Unassigned", count: null },
    { name: "Resolved", label: "Resolved", count: resolvedIssues },
  ], [totalIssues, resolvedIssues]);

  // Table columns
  const columns = useMemo(() => {
    if (activeTab === "all") {
      return [
        { key: "issue_id", header: "ISSUE ID" },
        { key: "name", header: "NAME" },
        { key: "time", header: "TIME" },
        { key: "category", header: "CATEGORY" },
        { key: "severity", header: "SEVERITY", type: "severity" },
        { key: "status", header: "STATUS", type: "status" },
      ];
    }
    return [
      { key: "issue_id", header: "ISSUE ID" },
      { key: "name", header: "NAME" },
      { key: "time", header: "TIME" },
      { key: "category", header: "CATEGORY" },
      { key: "severity", header: "SEVERITY", type: "severity" },
      { key: "logged_by", header: "LOGGED BY" },
      { key: "assigned_to", header: "ASSIGNED TO" },
    ];
  }, [activeTab]);

  // Map API data to table rows
  const tableData = useMemo(
    () =>
      issues.map((issue, index) => ({
        id: issue.id,
        issue_id: `ISS-${String(index + 1).padStart(3, "0")}`,
        name: issue.title || "—",
        time: issue.createdAt
          ? formatDate(issue.createdAt)
          : "—",
        category: issue.category || "—",
        severity: issue.priority || "—",
        status: issue.status || "—",
        logged_by: issue.loggedBy
          ? `${issue.loggedBy.firstName || ""} ${issue.loggedBy.lastName || ""}`.trim() || "—"
          : "—",
        assigned_to: issue.assignedTo
          ? `${issue.assignedTo.firstName || ""} ${issue.assignedTo.lastName || ""}`.trim() || "—"
          : "—",
        hasActions: true,
        hasCheckbox: true,
        _raw: issue,
        _date: issue.createdAt ? new Date(issue.createdAt) : null,
      })),
    [issues]
  );

  // Derive unique option values for filter modals
  const categoryOptions = useMemo(() => [
    { value: "", label: "All Categories" },
    ...[...new Set(tableData.map((r) => r.category).filter((c) => c && c !== "—"))].map((c) => ({ value: c, label: c })),
  ], [tableData]);

  const severityOptions = useMemo(() => [
    { value: "", label: "All Severities" },
    ...[...new Set(tableData.map((r) => r.severity).filter((s) => s && s !== "—"))].map((s) => ({ value: s, label: s })),
  ], [tableData]);

  const statusOptions = useMemo(() => [
    { value: "", label: "All Statuses" },
    ...[...new Set(tableData.map((r) => r.status).filter((s) => s && s !== "—"))].map((s) => ({ value: s, label: s })),
  ], [tableData]);

  // Apply modal filters client-side
  const filteredTableData = useMemo(() => {
    return tableData.filter((row) => {
      if (activeFilters.category && row.category !== activeFilters.category) return false;
      if (activeFilters.severity && row.severity !== activeFilters.severity) return false;
      if (activeFilters.status && row.status !== activeFilters.status) return false;
      if (activeFilters.dateRange?.start && row._date) {
        const { start, end } = activeFilters.dateRange;
        if (end) {
          const endOfDay = new Date(end);
          endOfDay.setHours(23, 59, 59, 999);
          if (row._date < start || row._date > endOfDay) return false;
        } else {
          if (row._date < start) return false;
        }
      }
      return true;
    });
  }, [tableData, activeFilters]);


  const actions = [
    {
      label: "View Issue",
      onClick: (row) => {
        setViewIssue(row._raw);
      },
    },
  ];

  if (viewIssue) {
    return (
      <ViewIssue
        issue={{ id: viewIssue.id }}
        onBack={() => {
          setViewIssue(null);
          fetchIssues(activeTab);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="tenant-list-container">
        <SectionSpinner />
      </div>
    );
  }

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
            <span className="tenant-title-breadcrumbs-org">{tenantName}</span>
          </h2>
        </div>
      </div>

      <h3 className="tenant-header-gen">Overview</h3>

      <div className="issue-overview-section">
        <div className="issue-overview-cards">
          <div className="issue-overview-card">
            <h4>All Issues</h4>
            <p className="issue-overview-value">
              {totalIssues.toLocaleString()}
            </p>
          </div>
          <div className="issue-overview-card">
            <h4>Active Issues</h4>
            <p className="issue-overview-value">
              {activeIssues.toLocaleString()}
            </p>
            <span className="issue-view-link" style={{ cursor: "pointer" }} onClick={() => setActiveTab("pending")}>
              View
            </span>
          </div>
          <div className="issue-overview-card">
            <h4>Avg Resolution Time</h4>
            <p className="issue-overview-value">
              {typeof avgResolutionTime === "number"
                ? `${avgResolutionTime} hrs`
                : avgResolutionTime}
            </p>
          </div>
          <div className="issue-overview-card">
            <h4>Resolved Issues</h4>
            <p className="issue-overview-value">
              {resolvedIssues.toLocaleString()}
            </p>
            <span className="issue-view-link" style={{ cursor: "pointer" }} onClick={() => setActiveTab("Resolved")}>
              View
            </span>
          </div>
          <div className="issue-overview-card issue-top-issue-card">
            <div className="issue-top-issue-header">
              <h4>Top Issue</h4>
            </div>
            <div className="issue-top-issue-chart">
              <Chart
                key={`donut-${top5Categories.length}`}
                options={chartData.options}
                series={chartData.series}
                type="donut"
                height={180}
              />
            </div>
            <Button
              label="SEE BREAKDOWN"
              variant="primary"
              width="100%"
              onClick={() => setBreakdownModal(true)}
            />
          </div>
        </div>
      </div>

      <h3 className="tenant-header-gen">Issue Log</h3>

      <div className="invoices-tabs-container">
        <div className="tenants-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              className={`tenants-tab ${activeTab === tab.name ? "active" : ""}`}
              onClick={() => setActiveTab(tab.name)}
            >
              <span>{tab.label.toUpperCase()}</span>
              {tab.count > 0 && (
                <span className="tab-count">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        <CustomTable
          data={filteredTableData}
          columns={columns}
          filters={issueLogFilters}
          onFilterTypeSelect={handleIssueFilterTypeSelect}
          actions={actions}
          showActions={true}
          itemsPerPage={10}
          tableName="Issue Log"
        />

        {/* Filter modals */}
        <TableFilterModal
          isOpen={openFilterModal === "category"}
          onClose={() => setOpenFilterModal(null)}
          title="Filter by Category"
          label="Select category"
          options={categoryOptions}
          onApply={(val) => setActiveFilters((prev) => ({ ...prev, category: val }))}
        />
        <TableFilterModal
          isOpen={openFilterModal === "severity"}
          onClose={() => setOpenFilterModal(null)}
          title="Filter by Severity"
          label="Select severity"
          options={severityOptions}
          onApply={(val) => setActiveFilters((prev) => ({ ...prev, severity: val }))}
        />
        <TableFilterModal
          isOpen={openFilterModal === "status"}
          onClose={() => setOpenFilterModal(null)}
          title="Filter by Status"
          label="Select status"
          options={statusOptions}
          onApply={(val) => setActiveFilters((prev) => ({ ...prev, status: val }))}
        />
        <TableFilterDateModal
          isOpen={openFilterModal === "date"}
          onClose={() => setOpenFilterModal(null)}
          title="Filter by date"
          onApply={(range) => setActiveFilters((prev) => ({ ...prev, dateRange: range }))}
        />
      </div>

      {/* See Breakdown Modal */}
      <ReusableModal
        isOpen={breakdownModal}
        onClose={() => setBreakdownModal(false)}
        title="Issue Category Breakdown"
        secondaryButtonText="Close"
        onSecondaryButtonClick={() => setBreakdownModal(false)}
      >
        <div className="breakdown-list">
          {normalisedCategories.length === 0 ? (
            <p style={{ color: "#6b7280", textAlign: "center" }}>No category data available</p>
          ) : (
            [...normalisedCategories]
              .sort((a, b) => b.count - a.count)
              .map((cat, idx) => (
                <div key={idx} className="breakdown-item">
                  <span className="breakdown-category">{cat.category}</span>
                  <span className="breakdown-count">{cat.count}</span>
                </div>
              ))
          )}
        </div>
      </ReusableModal>
    </>
  );
};

export default TenantSingleIssueManagement;

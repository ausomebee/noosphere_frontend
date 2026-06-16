import usePageTitle from "../../hooks/usePageTitle";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import useAuth from "../../hooks/useAuth";

import { SelectInput } from "../../Components/Input/Inputs";
import Chart from "react-apexcharts";
import Button from "../../Components/Button/Button";
import ReusableModal from "../../Components/ReusableModal/ReusableModal";
import Pagination from "../../Components/Table/Pagination";
import "./IssueManagement.css";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../Components/Table/CustomTable";
import AddIssueModal from "../../Components/ReusableModal/AddAnIssueModal";
import ViewIssue from "./ViewIssue";
import api from "../../api/IssueApi";
import api2 from "../../api/TenantApis";
import LoadingSpinner from "../../Components/LoadingSpinner";
import { showToast, showApiError } from "../../Helper/ShowToast";
import { formatDate } from "../../Helper/Formatters";

const IssueManagement = () => {
  const { accessToken, refreshToken } = useAuth();

  usePageTitle("Issues");
  const [selectedFilter, setSelectedFilter] = useState("by category");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddIssueModalOpen, setIsAddIssueModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [filterValue, setFilterValue] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [tenantList, setTenantList] = useState([]);
  const [issueData, setIssueData] = useState([]);
  const [metrics, setMetrics] = useState({
    All: 0,
    NotStarted: 0,
    Resolved: 0,
    InProgress: 0,
    Unassigned: 0,
  });
  const [resolutionTime, setResolutionTime] = useState("0.00");
  const [statusPercentages, setStatusPercentages] = useState([]);
  const [categoryPercentages, setCategoryPercentages] = useState([]);
  const [dateCreatedPercentages, setDateCreatedPercentages] = useState([]);
  const [assigneePercentages, setAssigneePercentages] = useState([]);
  const [priorityPercentages, setPriorityPercentages] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isIssueLoading, setIsIssueLoading] = useState(false);
  const [isAddingIssue, setIsAddingIssue] = useState(false);
  const itemsPerPage = 5;
  const cache = useRef(new Map());
  const staffCache = useRef([]);
  const tenantCache = useRef([]);

  const formatNumber = useCallback((num) => {
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return num.toString();
  }, []);

  const staffMap = useMemo(
    () => new Map(staffList.map((s) => [s.staffId, s.name])),
    [staffList]
  );
  const tenantMap = useMemo(
    () => new Map(tenantList.map((t) => [t.tenantId, t.name])),
    [tenantList]
  );

  const formatStatus = (status) => {
  if (!status) return "Not-Started";

  // Normalize status to remove spaces and unify case
  const normalized = status.replace(/\s/g, "").toLowerCase();

  const statusMap = {
    inprogress: "In-Progress",
    notstarted: "Not-Started",
    completed: "Completed",
    open: "Open",
  };

  return (
    statusMap[normalized] ||
    status.replace(/([a-z])([A-Z])/g, "$1-$2") || // fallback: insert hyphen
    "Not-Started"
  );
};


  const formatPriority = (priority) => {
    const priorityMap = {
      EP1: "Enterprise Critical",
      EP2: "Enterprise High",
      P1: "Critical",
      P2: "High",
      P3: "Medium",
      P4: "Low",
    };

    return priorityMap[priority] || priority || "N/A";
  };

  const fetchData = useCallback(async () => {
    const controller = new AbortController();
    setLoading(true);
    const errors = [];
    try {
      const status =
        activeTab === "all"
          ? "all"
          : activeTab
              .replace("in_progress", "In Progress")
              .replace("not_started", "Not Started")
              .replace("unassigned", "Unassigned")
              .replace("resolved", "Resolved");

      const results = await Promise.allSettled([
        api2.getAllAdmins({ accessToken, refreshToken }),
        api2.getAllTenants({ accessToken, refreshToken }),
        api.GetIssuesByStatus({ status, accessToken, refreshToken }),
        api.GetMetricAndStatusCount({ accessToken, refreshToken }),
        api.GetResolutionTime({ accessToken, refreshToken }),
        api.GetStatusPercentageAndCount({ accessToken, refreshToken }),
        api.GetCategoryPercentageAndCount({ accessToken, refreshToken }),
        api.GetDateCreatedPercentageAndCount({ accessToken, refreshToken }),
        api.GetAssigneePercentageAndCount({ accessToken, refreshToken }),
        api.GetPriorityPercentageAndCount({ accessToken, refreshToken }),
      ]);

      const [
        adminsResult,
        tenantsResult,
        issuesResult,
        metricsResult,
        resolutionTimeResult,
        statusPercentagesResult,
        categoryPercentagesResult,
        dateCreatedPercentagesResult,
        assigneePercentagesResult,
        priorityPercentagesResult,
      ] = results;

      // Process admins
      if (adminsResult.status === "fulfilled") {
        const adminsData = Array.isArray(adminsResult.value.data?.data)
          ? adminsResult.value.data.data.map((a) => ({
              staffId: a.id || "",
              name: `${a.firstName || ""} ${a.lastName || ""}`.trim() || a.id || "Unnamed Admin",
            }))
          : [];
        staffCache.current = adminsData;
        setStaffList(adminsData);
      } else {
        errors.push("Failed to load staff list.");
        setStaffList(staffCache.current);
        if (import.meta.env.DEV) console.error("Admins error:", adminsResult.reason);
      }

      // Process tenants
      if (tenantsResult.status === "fulfilled") {
        const tenantsData = Array.isArray(tenantsResult.value.data?.data)
          ? tenantsResult.value.data.data.map((t) => ({
              tenantId: t.id || "",
              name: t.companyName || t.id || "Unnamed Tenant",
              isEnterprise: t.BillingPlan?.[0]?.planType === "ENTERPRISE", // Handle array
            }))
          : [];
        tenantCache.current = tenantsData;
        setTenantList(tenantsData);
      } else {
        errors.push("Failed to load tenant list.");
        setTenantList(tenantCache.current);
        if (import.meta.env.DEV) console.error("Tenants error:", tenantsResult.reason);
      }

      // Process issues
      if (issuesResult.status === "fulfilled") {
        const issues = Array.isArray(issuesResult.value.data)
          ? issuesResult.value.data.map((issue, index) => ({
              id: issue.id,
              issue_id: `ISS-00${index + 1}`,
              category: issue.category || "N/A",
              status: formatStatus(issue.status),
              priority: formatPriority(issue.priority),
              logged_by:
                (issue.loggedBy
                  ? `${issue.loggedBy.firstName || ""} ${issue.loggedBy.lastName || ""}`.trim()
                  : "") ||
                issue.tenant?.companyName ||
                "Unknown",
              date_reported: formatDate(issue.createdAt),
              date_updated: formatDate(issue.updatedAt),
              assigned_to: issue.assignedTo
                ? `${issue.assignedTo.firstName || ""} ${issue.assignedTo.lastName || ""}`.trim() || "Unassigned"
                : "Unassigned",
              hasActions: true,
              title: issue.title || "N/A",
              description: issue.description || "No description provided",
              attachments: issue.attachments || [],
              comments: issue.comments || [],
              Logs: issue.logs || [],
              resolutionDeadline: formatDate(issue.resolutionDeadline) || "N/A",
            }))
          : [];
        setIssueData(issues);
      } else {
        errors.push("Failed to load issues.");
        setIssueData([]);
        if (import.meta.env.DEV) console.error("Issues error:", issuesResult.reason);
      }

      // Process metrics
      if (metricsResult.status === "fulfilled") {
        setMetrics({
          All: metricsResult.value.data?.All?._count?._all ?? 0,
          NotStarted: metricsResult.value.data?.NotStarted?._count?._all ?? 0,
          Resolved: metricsResult.value.data?.Resolved?._count?._all ?? 0,
          InProgress: metricsResult.value.data?.InProgress?._count?._all ?? 0,
          Unassigned: metricsResult.value.data?.Unassigned?._count?._all ?? 0,
        });
      } else {
        errors.push("Failed to load metrics.");
        setMetrics({
          All: 0,
          NotStarted: 0,
          Resolved: 0,
          InProgress: 0,
          Unassigned: 0,
        });
        if (import.meta.env.DEV) console.error("Metrics error:", metricsResult.reason);
      }

      // Process resolution time
      if (resolutionTimeResult.status === "fulfilled") {
        setResolutionTime(resolutionTimeResult.value.data ?? "0.00");
      } else {
        errors.push("Failed to load resolution time.");
        setResolutionTime("0.00");
        if (import.meta.env.DEV) console.error("Resolution time error:", resolutionTimeResult.reason);
      }

      // Process percentages
      if (statusPercentagesResult.status === "fulfilled") {
        const d = statusPercentagesResult.value.data;
        setStatusPercentages(Array.isArray(d) ? d : []);
      } else {
        errors.push("Failed to load status percentages.");
        setStatusPercentages([]);
        if (import.meta.env.DEV) console.error(
          "Status percentages error:",
          statusPercentagesResult.reason
        );
      }

      if (categoryPercentagesResult.status === "fulfilled") {
        const d2 = categoryPercentagesResult.value.data;
        setCategoryPercentages(Array.isArray(d2) ? d2 : []);
      } else {
        errors.push("Failed to load category percentages.");
        setCategoryPercentages([]);
        if (import.meta.env.DEV) console.error(
          "Category percentages error:",
          categoryPercentagesResult.reason
        );
      }

      if (dateCreatedPercentagesResult.status === "fulfilled") {
        const d3 = dateCreatedPercentagesResult.value.data;
        setDateCreatedPercentages(Array.isArray(d3) ? d3 : []);
      } else {
        errors.push("Failed to load date created percentages.");
        setDateCreatedPercentages([]);
        if (import.meta.env.DEV) console.error(
          "Date created percentages error:",
          dateCreatedPercentagesResult.reason
        );
      }

      if (assigneePercentagesResult.status === "fulfilled") {
        const d4 = assigneePercentagesResult.value.data;
        setAssigneePercentages(Array.isArray(d4) ? d4 : []);
      } else {
        errors.push("Failed to load assignee percentages.");
        setAssigneePercentages([]);
        if (import.meta.env.DEV) console.error(
          "Assignee percentages error:",
          assigneePercentagesResult.reason
        );
      }

      if (priorityPercentagesResult.status === "fulfilled") {
        const d5 = priorityPercentagesResult.value.data;
        setPriorityPercentages(Array.isArray(d5) ? d5 : []);
      } else {
        errors.push("Failed to load priority percentages.");
        setPriorityPercentages([]);
        if (import.meta.env.DEV) console.error(
          "Priority percentages error:",
          priorityPercentagesResult.reason
        );
      }

    } catch (err) {
      if (err.name !== "AbortError") {
        if (import.meta.env.DEV) console.error("Fetch error:", err);
      }
    } finally {
      setLoading(false);
    }
    return () => controller.abort();
  }, [accessToken, refreshToken, activeTab, formatDate]);

  useEffect(() => {
    const cleanup = fetchData();
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [fetchData]);

  const handleFilterChange = useCallback((key, value) => {
    setFilterValue(value);
    setActiveTab("all");
  }, []);

  const handleAddIssue = useCallback(
    async (newIssue, onSuccess) => {
      setIsAddingIssue(true);
        try {
        const formData = new FormData();
        formData.append("title", newIssue.title || "");
        formData.append("description", newIssue.description || "");
        formData.append("category", newIssue.category || "");
        formData.append("priority", newIssue.priority || "");
        formData.append("tenantId", newIssue.tenantId || "");
        formData.append("adminId", newIssue.assignToStaff || "");
        formData.append(
          "resolutionDeadline",
          newIssue.resolutionDeadline || ""
        );
        formData.append("adminLoggedById", newIssue.adminLoggedById || "");
        formData.append("assignToStaff", newIssue.assignToStaff || "");
        if (newIssue.image) {
          formData.append("attachment", newIssue.image);
        }

        const response = await api.CreateIssue({
          accessToken,
          refreshToken,
          payload: formData,
        });

        const newIssueData = {
          id: response.data?.id || issueData.length + 1,
          issue_id: `ISS-00${issueData.length + 1}`,
          category: newIssue.category || "N/A",
          status: formatStatus(newIssue.status),
          priority: formatPriority(newIssue.priority),
          logged_by:
            newIssue.createdBy || tenantMap.get(newIssue.tenantId) || "Unknown",
          date_reported: formatDate(new Date()),
          date_updated: formatDate(new Date()),
          assigned_to: staffMap.get(newIssue.assignToStaff) || "Unassigned",

          hasActions: true,
          title: response.data?.title || "N/A",
          description: response.data?.description || "No description provided",
          attachments: response.data?.attachments || [],
          comments: response.data?.comments || [],
          Logs: response.data?.logs || [],
          resolutionDeadline: formatDate(newIssue.resolutionDeadline) || "N/A",
        };
        setIssueData([newIssueData, ...issueData]);
        cache.current.clear();
        showToast("Issue added successfully", "success");
        onSuccess();
      } catch (err) {
        showToast("Failed to add issue.", "error");
        if (import.meta.env.DEV) console.error("Error adding issue:", err);
      } finally {
        setIsAddingIssue(false);
      }
    },
    [accessToken, refreshToken, issueData, staffMap, tenantMap, formatDate]
  );

  const handleViewIssue = useCallback(
    async (row) => {
      setIsIssueLoading(true);
        const cacheKey = `issue_${row.id}`;
      if (cache.current.has(cacheKey)) {
        setSelectedIssue(cache.current.get(cacheKey));
        setIsIssueLoading(false);
        return;
      }
      try {
        const response = await api.GetIssueById({
          id: row.id,
          accessToken,
          refreshToken,
        });
        const issue = {
          id: response.data?.id || row.id,
          issue_id: response.data?.issueId || row.issue_id,
          category: response.data?.category || row.category,
          priority: response.data?.priority || row.priority,
          logged_by:
            `${response.data?.loggedBy?.firstName || ""} ${response.data?.loggedBy?.lastName || ""}`.trim() ||
            response.data?.tenant?.companyName ||
            row.logged_by,
          date_reported: formatDate(
            response.data?.createdAt || row.date_reported
          ),
          date_updated: formatDate(
            response.data?.updatedAt || row.date_updated
          ),
          assigned_to: response.data?.assignedTo ? `${response.data.assignedTo.firstName || ""} ${response.data.assignedTo.lastName || ""}`.trim() || "Unassigned" : "Unassigned",
          status: response.data?.status?.replace(/\s/g, "") || row.status,
          title: response.data?.title || "N/A",
          description: response.data?.description || "No description provided",
          attachments: response.data?.attachments || [],
          comments: response.data?.comments || [],
          Logs: response.data?.logs || [],
          resolutionDeadline:
            formatDate(response.data?.resolutionDeadline) || "N/A",
        };
        cache.current.set(cacheKey, issue);
        setSelectedIssue(issue);
      } catch (err) {
        showApiError(err, "LOAD_ISSUE");
        if (import.meta.env.DEV) console.error("Error fetching issue:", err);
      } finally {
        setIsIssueLoading(false);
      }
    },
    [accessToken, refreshToken, formatDate]
  );

  const issuesStats = useMemo(
    () => [
      { key: "all", label: "All", count: formatNumber(metrics.All) },
      {
        key: "unassigned",
        label: "Unassigned",
        count: formatNumber(metrics.Unassigned),
      },
      {
        key: "in_progress",
        label: "In-Progress",
        count: formatNumber(metrics.InProgress),
      },
      {
        key: "not_started",
        label: "Not Started",
        count: formatNumber(metrics.NotStarted),
      },
      {
        key: "resolved",
        label: "Resolved",
        count: formatNumber(metrics.Resolved),
      },
    ],
    [metrics, formatNumber]
  );

  const chartOptions = useMemo(
    () => ({
      chart: { type: "donut", height: 180 },
      colors: ["#1D4ED8", "#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE"],
      dataLabels: { enabled: false },
      legend: { show: false },
      plotOptions: { pie: { donut: { size: "50%" } } },
      tooltip: { y: { formatter: (val) => `${val}%` } },
    }),
    []
  );

  const getTopIssueData = useMemo(() => {
    const dataMap = {
      "by category": categoryPercentages,
      "by status": statusPercentages,
      "by date reported": dateCreatedPercentages,
      "by assigned to": assigneePercentages,
      "by priority": priorityPercentages,
    };
    const raw = dataMap[selectedFilter] || [];
    const data = Array.isArray(raw) ? raw : [];
    const top5 = data.slice(0, 5);
    const series = top5.map((item) => parseFloat(item.percentage) || 0);
    const labels = top5.map((item) => {
      if (item.category) return item.category;
      if (item.status) return item.status;
      if (item.createdAt) return formatDate(item.createdAt);
      if (item.assignedTo) {
        return typeof item.assignedTo === "object"
          ? `${item.assignedTo.firstName || ""} ${item.assignedTo.lastName || ""}`.trim() || "Unassigned"
          : item.assignedTo || "Unassigned";
      }
      if (item.priority) return item.priority;
      return "Unknown";
    });

    return {
      series: series.length ? series : [1],
      options: {
        ...chartOptions,
        labels: labels.length ? labels : ["No Data"],
      },
    };
  }, [
    selectedFilter,
    categoryPercentages,
    statusPercentages,
    dateCreatedPercentages,
    assigneePercentages,
    priorityPercentages,
    chartOptions,
    formatDate,
  ]);

  const getModalData = useMemo(() => {
    const dataMap = {
      "by category": categoryPercentages,
      "by status": statusPercentages,
      "by date reported": dateCreatedPercentages,
      "by assigned to": assigneePercentages,
      "by priority": priorityPercentages,
    };
    const raw2 = dataMap[selectedFilter] || [];
    const data = Array.isArray(raw2) ? raw2 : [];
    if (selectedFilter === "by status" || selectedFilter === "by priority") {
      return data.map((item) => ({
        category: item.status || item.priority || "Unknown",
        count: item.count || 0,
      }));
    }
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return data.slice(startIdx, endIdx).map((item) => ({
      category:
        item.category ||
        formatDate(item.createdAt) ||
        (item.assignedTo
          ? typeof item.assignedTo === "object"
            ? `${item.assignedTo.firstName || ""} ${item.assignedTo.lastName || ""}`.trim() || "Unassigned"
            : item.assignedTo
          : null) ||
        item.priority ||
        "Unknown",
      count: item.count || 0,
    }));

    
  }, [
    selectedFilter,
    categoryPercentages,
    statusPercentages,
    dateCreatedPercentages,
    assigneePercentages,
    priorityPercentages,
    currentPage,
    formatDate,
  ]);

  const totalPages = useMemo(() => {
    const dataMap = {
      "by category": categoryPercentages.length,
      "by status": 0,
      "by date reported": dateCreatedPercentages.length,
      "by assigned to": assigneePercentages.length,
      "by priority": 0,
    };
    return selectedFilter === "by status" || selectedFilter === "by priority"
      ? 1
      : Math.ceil((dataMap[selectedFilter] || 1) / itemsPerPage);
  }, [
    selectedFilter,
    categoryPercentages,
    dateCreatedPercentages,
    assigneePercentages,
  ]);

  const allColumns = useMemo(
    () => [
      { key: "issue_id", header: "Issue ID" },
      { key: "category", header: "Category" },
      { key: "priority", header: "Priority", type: "priority" },
      { key: "logged_by", header: "Logged by" },
      { key: "date_reported", header: "Date reported", type: "date" },
      { key: "date_updated", header: "Last Updated", type: "date" },
      { key: "assigned_to", header: "Assigned to" },
      { key: "status", header: "Issue Status", type: "status" },
    ],
    []
  );

  const filteredColumns = useMemo(
    () => allColumns.filter((col) => col.key !== "status"),
    [allColumns]
  );

  const activeActions = useMemo(
    () => [{ label: "View Issue", onClick: handleViewIssue }],
    [handleViewIssue]
  );

  const filters = useMemo(
    () => [
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
    ],
    []
  );

  const selectOptions = useMemo(
    () => [
      { value: "by category", label: "by Category" },
      { value: "by status", label: "By Status" },
      { value: "by date reported", label: "By Date Reported" },
      { value: "by assigned to", label: "By Assigned to" },
      { value: "by priority", label: "By Priority" },
    ],
    []
  );

  if (selectedIssue) {
    return (
      <ViewIssue
        issue={selectedIssue}
        onBack={() => setSelectedIssue(null)}
        tenant={tenantList}
        staffList={staffList}
      />
    );
  }

  return (
    <>
      {loading && <LoadingSpinner />}
      {(isIssueLoading || isAddingIssue) && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1000,
          }}
        >
          <LoadingSpinner />
        </div>
      )}
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
                  <p className="issue-mgmt-overview-value">
                    {formatNumber(metrics.All)}
                  </p>
                </div>
              </div>
              <div className="issue-mgmt-overview-card">
                <h4>Assigned Issues</h4>
                <div className="issue-mgmt-overview-value-container">
                  <p className="issue-mgmt-overview-value">
                    {formatNumber(metrics.All - metrics.Unassigned)}
                  </p>
                </div>
              </div>
              <div className="issue-mgmt-overview-card">
                <h4>Issues In Progress</h4>
                <div className="issue-mgmt-overview-value-container">
                  <p className="issue-mgmt-overview-value">
                    {formatNumber(metrics.InProgress)}
                  </p>
                </div>
              </div>
            </div>
            <div className="issue-mgmt-overview-card-two">
              <div className="issue-mgmt-overview-card">
                <h4>Resolved Issues</h4>
                <div className="issue-mgmt-overview-value-container">
                  <p className="issue-mgmt-overview-value">
                    {formatNumber(metrics.Resolved)}
                  </p>
                </div>
              </div>
              <div className="issue-mgmt-overview-card">
                <h4>Avg Resolution Time</h4>
                <div className="issue-mgmt-overview-value-container">
                  <p className="issue-mgmt-overview-value">
                    {resolutionTime} hrs
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="issue-mgmt-overview-card issue-mgmt-top-issue-card">
            <div className="issue-mgmt-top-issue-header">
              <h4>Top Issue</h4>
              <div>
                <SelectInput
                  options={selectOptions}
                  className="issue-mgmt-top-issue-select"
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  value={selectedFilter}
                />
              </div>
            </div>
            <div className="issue-mgmt-top-issue-chart">
              <Chart
                options={getTopIssueData.options}
                series={getTopIssueData.series}
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
              className={`subscription-tab ${
                activeTab === tab.key ? "active" : ""
              }`}
              onClick={() => {
                setActiveTab(tab.key);
                setCurrentPage(1);
              }}
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
            columns={activeTab === "all" ? allColumns : filteredColumns}
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
          {getModalData.map((item, index) => (
            <div key={index} className="modal-item">
              <span>{item.category}</span>
              <span>{item.count}</span>
            </div>
          ))}
          {selectedFilter !== "by status" &&
            selectedFilter !== "by priority" && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
        </div>
      </ReusableModal>

      <AddIssueModal
        isOpen={isAddIssueModalOpen}
        onClose={() => setIsAddIssueModalOpen(false)}
        onSave={handleAddIssue}
        tenantList={tenantList}
        staffList={staffList}
      />
    </>
  );
};

export default IssueManagement;

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Chart from "react-apexcharts";
import "./TenantList.css";
import CustomTable from "../../../Components/Table/CustomTable";
import Button from "../../../Components/Button/Button";
import { FaArrowLeft } from "react-icons/fa";
import { IoIosArrowForward } from "react-icons/io";
import tenantApi from "../../../api/TenantApis";
import useAuth from "../../../hooks/useAuth";
import { showToast } from "../../../Helper/ShowToast";
import { formatDateTime as formatDate } from "../../../Helper/Formatters";
import { SectionSpinner } from "../../../Components/LoadingSpinner";

const LIMIT = 20;

const TenantListUsageStatistics = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { accessToken, refreshToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showActiveSessionsGraph, setShowActiveSessionsGraph] = useState(false);
  const [showServerRequestsGraph, setShowServerRequestsGraph] = useState(false);
  const [showSessionsTable, setShowSessionsTable] = useState(false);

  // Server requests table (moved from user logs)
  const [serverRequests, setServerRequests] = useState([]);
  const [serverMeta, setServerMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [serverPage, setServerPage] = useState(1);
  const [serverLoading, setServerLoading] = useState(false);

  const [serverFilters, setServerFilters] = useState([
    {
      key: "filter_type",
      value: "",
      options: [
        { value: "", label: "Select Filter" },
        { value: "date_created", label: "Date Created" },
      ],
    },
  ]);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await tenantApi.GetTenantUsageStatistics({ accessToken, refreshToken, tenantId });
      setStats(res?.data || res || null);
    } catch (err) {
      showToast(err.message || "Failed to load usage statistics", "error");
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshToken, tenantId]);

  const fetchServerRequests = useCallback(async (page) => {
    try {
      setServerLoading(true);
      const res = await tenantApi.GetTenantServerRequest({
        accessToken,
        refreshToken,
        tenantId,
        page,
        limit: LIMIT,
      });
      setServerRequests(res?.data?.data || res?.data || []);
      setServerMeta(res?.data?.meta || { total: 0, page: 1, totalPages: 1 });
    } catch (err) {
      showToast(err.message || "Failed to load server requests", "error");
    } finally {
      setServerLoading(false);
    }
  }, [accessToken, refreshToken, tenantId]);

  useEffect(() => {
    fetchStats();
    fetchServerRequests(1);
  }, [fetchStats, fetchServerRequests]);

  useEffect(() => {
    if (serverPage !== 1) fetchServerRequests(serverPage);
  }, [serverPage, fetchServerRequests]);

  const handleFilterChange = (key, value) => {
    setServerFilters((prev) =>
      prev.map((f) => (f.key === key ? { ...f, value } : f))
    );
  };

  // Build chart data from API response, filling 0 for missing months
  const ALL_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const fillMonths = (graph) => {
    const map = {};
    (graph || []).forEach((g) => {
      // period is like "Dec 2025" — extract short month name
      const shortMonth = g.period?.split(" ")[0];
      if (shortMonth) map[shortMonth] = (map[shortMonth] || 0) + g.session_count;
    });
    return {
      categories: ALL_MONTHS,
      values: ALL_MONTHS.map((m) => map[m] || 0),
    };
  };

  const sessionGraph = stats?.tenantSessionGraph || [];

  // New API shape: getTenantServerRequestGraphLastYear: { labels: [...], values: [...] }
  const srGraph = stats?.getTenantServerRequestGraphLastYear || {};
  const srLabels = srGraph.labels || [];
  const srValues = srGraph.values || [];

  const filledSessions = fillMonths(sessionGraph);

  // Fill from labels/values format instead of period/session_count
  const serverRequestMap = {};
  srLabels.forEach((label, i) => {
    const shortMonth = label?.split(" ")[0];
    if (shortMonth) serverRequestMap[shortMonth] = (serverRequestMap[shortMonth] || 0) + (srValues[i] || 0);
  });
  const filledServerRequests = {
    categories: ALL_MONTHS,
    values: ALL_MONTHS.map((m) => serverRequestMap[m] || 0),
  };

  const sessionCategories = filledSessions.categories;
  const sessionValues = filledSessions.values;
  const serverRequestCategories = filledServerRequests.categories;
  const serverRequestValues = filledServerRequests.values;

  const buildChartOptions = (categories, id) => ({
    chart: { type: "area", height: 200, toolbar: { show: false }, id },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.3 },
    },
    xaxis: {
      categories,
      labels: { style: { colors: "#6B7280" } },
    },
    yaxis: { labels: { show: false } },
    colors: ["#3B82F6"],
    tooltip: { x: { format: "MMM" } },
  });

  const sessionsChartData = {
    series: [{ name: "Sessions", data: sessionValues }],
    options: buildChartOptions(sessionCategories, "sessions-chart"),
  };

  const activeSessionsChartData = {
    series: [{ name: "Active Sessions", data: sessionValues }],
    options: buildChartOptions(sessionCategories, "active-sessions-chart"),
  };

  const serverRequestsChartData = {
    series: [{ name: "Server Requests", data: serverRequestValues }],
    options: buildChartOptions(serverRequestCategories, "server-requests-chart"),
  };

  // Table for chart data (toggled by "View data table") — always 12 months
  const activeFilledData = showServerRequestsGraph ? filledServerRequests : filledSessions;

  const graphTableColumns = [
    { key: "period", header: "PERIOD" },
    { key: "count", header: "COUNT" },
  ];

  const graphTableData = activeFilledData.categories.map((month, i) => ({
    period: month,
    count: activeFilledData.values[i],
  }));

  // Server requests table columns
  const serverColumns = [
    { key: "method", header: "METHOD" },
    { key: "statusCode", header: "STATUS CODE" },
    { key: "durationMs", header: "DURATION (ms)" },
    { key: "ipAddress", header: "IP ADDRESS" },
    { key: "errorMessage", header: "ERROR" },
    { key: "dateTime", header: "DATE & TIME" },
  ];

  const serverTableData = serverRequests.map((req) => ({
    id: req.id,
    method: req.method || "—",
    statusCode: req.statusCode ?? "—",
    durationMs: req.durationMs != null ? `${req.durationMs}ms` : "—",
    ipAddress: req.ipAddress || "—",
    errorMessage: req.errorMessage || "—",
    dateTime: formatDate(req.createdAt),
  }));

  if (loading) {
    return (
      <div className="tenant-payment-page">
        <SectionSpinner />
      </div>
    );
  }

  const breadcrumbParts = ["Tenants", "Usage Statistics"];

  return (
    <div className="tenant-payment-page">
      <div className="tenant-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>
        <div className="header-info">
          <h1>Tenants</h1>
          <p className="breadcrumb">
            {breadcrumbParts.map((part, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <span
                    className={
                      index === breadcrumbParts.length - 1
                        ? "breadcrumb-separator breadcrumb-separator-bold"
                        : "breadcrumb-separator"
                    }
                  >
                    {" / "}
                  </span>
                )}
                <span className={index === breadcrumbParts.length - 1 ? "breadcrumb-active" : ""}>
                  {part}
                </span>
              </React.Fragment>
            ))}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="usage-statistics-cards">
        <div className="usage-card">
          <h3>Total Clients</h3>
          <p className="usage-value">
            {stats?.tenantClientsCount != null ? stats.tenantClientsCount.toLocaleString() : "—"}
          </p>
        </div>
        <div className="usage-card">
          <h3>Total Sessions</h3>
          <p className="usage-value">
            {stats?.tenantSessionCount != null ? stats.tenantSessionCount.toLocaleString() : "—"}
          </p>
          <button
            className="view-graph-button"
            onClick={() => {
              setShowActiveSessionsGraph(!showActiveSessionsGraph);
              setShowServerRequestsGraph(false);
              setShowSessionsTable(false);
            }}
          >
            View graph
          </button>
        </div>
        <div className="usage-card">
          <h3>Number of Server Requests</h3>
          <p className="usage-value">
            {stats?.serverRequestsCount != null ? stats.serverRequestsCount.toLocaleString() : "—"}
          </p>
          <button
            className="view-graph-button"
            onClick={() => {
              setShowServerRequestsGraph(!showServerRequestsGraph);
              setShowActiveSessionsGraph(false);
              setShowSessionsTable(false);
            }}
          >
            View graph
          </button>
        </div>
      </div>

      {/* Chart Section */}
      <div className="usage-graph-section">
        <div className="graph-header">
          <div className="graph-title-headers">
            <h3>
              {showActiveSessionsGraph
                ? "Sessions over time"
                : showServerRequestsGraph
                ? "Server Requests over time"
                : "Sessions over time"}
            </h3>
          </div>
          <div className="graph-controls">
            <Button
              label={showSessionsTable ? "View graph" : "View data table"}
              variant="action"
              icon={<IoIosArrowForward size={20} />}
              iconPosition="right"
              width="150px"
              onClick={() => setShowSessionsTable((v) => !v)}
            />
          </div>
        </div>

        <div className="graph-container">
          {showSessionsTable ? (
            <div className="graph-data-table">
              <table className="features-table">
                <thead>
                  <tr>
                    {graphTableColumns.map((col) => (
                      <th key={col.key}>{col.header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {graphTableData.length === 0 ? (
                    <tr>
                      <td colSpan={2} style={{ textAlign: "center", color: "#9ca3af" }}>
                        No data available
                      </td>
                    </tr>
                  ) : (
                    graphTableData.map((row, i) => (
                      <tr key={i}>
                        <td>{row.period}</td>
                        <td>{row.count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : showActiveSessionsGraph ? (
            <Chart
              options={activeSessionsChartData.options}
              series={activeSessionsChartData.series}
              type="area"
              height={200}
            />
          ) : showServerRequestsGraph ? (
            <Chart
              options={serverRequestsChartData.options}
              series={serverRequestsChartData.series}
              type="area"
              height={200}
            />
          ) : (
            <Chart
              options={sessionsChartData.options}
              series={sessionsChartData.series}
              type="area"
              height={200}
            />
          )}
        </div>
      </div>

      {/* Server Requests Table */}
      <h3 className="tenant-header-gen">SERVER REQUESTS</h3>
      {serverLoading ? (
        <SectionSpinner />
      ) : (
        <>
          <CustomTable
            data={serverTableData}
            columns={serverColumns}
            filters={serverFilters}
            onFilterChange={handleFilterChange}
            showActions={false}
            showCheckbox={false}
            itemsPerPage={LIMIT}
            tableName="Server Requests"
          />
          {serverMeta.totalPages > 1 && (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 16,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <button
                className="btn btn-outline"
                disabled={serverPage <= 1}
                onClick={() => setServerPage((p) => p - 1)}
              >
                Previous
              </button>
              <span style={{ fontSize: 14, color: "#6b7280" }}>
                Page {serverMeta.page} of {serverMeta.totalPages}
              </span>
              <button
                className="btn btn-outline"
                disabled={serverPage >= serverMeta.totalPages}
                onClick={() => setServerPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TenantListUsageStatistics;

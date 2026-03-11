import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "./TenantSingle.css";
import CustomTable from "../../../Components/Table/CustomTable";
import TableFilterModal from "../../../Components/ReusableModal/TableFilterModal";
import tenantApi from "../../../api/TenantApis";
import useAuth from "../../../hooks/useAuth";
import { showToast } from "../../../Helper/ShowToast";
import { SectionSpinner } from "../../../Components/LoadingSpinner";

const LIMIT = 20;

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const TenantSingleUserLogs = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { accessToken, refreshToken } = useAuth();

  const [activeTab, setActiveTab] = useState("activity");
  const [loading, setLoading] = useState(true);
  const [tenantName, setTenantName] = useState("");
  const [openFilterModal, setOpenFilterModal] = useState(null);
  const [activityFiltersActive, setActivityFiltersActive] = useState({ action: "", module: "" });
  const [serverFiltersActive, setServerFiltersActive] = useState({ method: "", statusCode: "" });

  const [activityLogs, setActivityLogs] = useState([]);
  const [activityMeta, setActivityMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [activityPage, setActivityPage] = useState(1);

  const [serverRequests, setServerRequests] = useState([]);
  const [serverMeta, setServerMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [serverPage, setServerPage] = useState(1);

  const fetchActivityLogs = useCallback(
    async (page) => {
      try {
        setLoading(true);
        const res = await tenantApi.GetTenantActivityLog({
          accessToken,
          refreshToken,
          tenantId,
          page,
          limit: LIMIT,
        });
        setActivityLogs(res.data?.data || []);
        setActivityMeta(res.data?.meta || { total: 0, page: 1, totalPages: 1 });
      } catch (err) {
        showToast(err.message || "Failed to load activity logs", "error");
      } finally {
        setLoading(false);
      }
    },
    [accessToken, refreshToken, tenantId]
  );

  const fetchServerRequests = useCallback(
    async (page) => {
      try {
        setLoading(true);
        const res = await tenantApi.GetTenantServerRequest({
          accessToken,
          refreshToken,
          tenantId,
          page,
          limit: LIMIT,
        });
        setServerRequests(res.data?.data || []);
        setServerMeta(res.data?.meta || { total: 0, page: 1, totalPages: 1 });
      } catch (err) {
        showToast(err.message || "Failed to load server requests", "error");
      } finally {
        setLoading(false);
      }
    },
    [accessToken, refreshToken, tenantId]
  );

  useEffect(() => {
    tenantApi
      .GetSingleTenant({ tenantId, accessToken, refreshToken })
      .then((res) => {
        const d = res.data || res;
        setTenantName(d.companyName || d.contactPerson || "Tenant");
      })
      .catch(() => {});
    fetchActivityLogs(1);
  }, []);

  useEffect(() => {
    if (activityPage !== 1) fetchActivityLogs(activityPage);
  }, [activityPage]);

  useEffect(() => {
    if (activeTab === "server") fetchServerRequests(serverPage);
  }, [serverPage]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "server" && serverRequests.length === 0) {
      fetchServerRequests(serverPage);
    }
  };

  const activityColumns = [
    { key: "action", header: "ACTION" },
    { key: "details", header: "DETAILS" },
    { key: "user", header: "USER" },
    { key: "module", header: "MODULE" },
    { key: "dateTime", header: "DATE & TIME" },
  ];

  const serverColumns = [
    { key: "method", header: "METHOD" },
    { key: "statusCode", header: "STATUS CODE" },
    { key: "durationMs", header: "DURATION (ms)" },
    { key: "ipAddress", header: "IP ADDRESS" },
    { key: "errorMessage", header: "ERROR" },
    { key: "dateTime", header: "DATE & TIME" },
  ];

  const activityFilters = [
    {
      key: "filter_type",
      options: [
        { value: "", label: "Filter by..." },
        { value: "action", label: "Action" },
        { value: "module", label: "Module" },
        { value: "clear_filters", label: "Clear Filters" },
      ],
    },
  ];

  const serverFilters = [
    {
      key: "filter_type",
      options: [
        { value: "", label: "Filter by..." },
        { value: "method", label: "Method" },
        { value: "statusCode", label: "Status Code" },
        { value: "clear_filters", label: "Clear Filters" },
      ],
    },
  ];

  const activityData = activityLogs.map((log) => ({
    id: log.logId,
    action: log.action || "—",
    details: log.details || log.reason || "—",
    user: log.admin
      ? `${log.admin.firstName || ""} ${log.admin.lastName || ""}`.trim() || log.admin.email
      : log.client
      ? "Client"
      : "—",
    module: log.module || "—",
    dateTime: formatDate(log.createdAt),
  }));

  const serverData = serverRequests.map((req) => ({
    id: req.id,
    method: req.method || "—",
    statusCode: req.statusCode ?? "—",
    durationMs: req.durationMs != null ? `${req.durationMs}ms` : "—",
    ipAddress: req.ipAddress || "—",
    errorMessage: req.errorMessage || "—",
    dateTime: formatDate(req.createdAt),
  }));

  const filteredActivityData = useMemo(() => activityData.filter((row) => {
    if (activityFiltersActive.action && row.action !== activityFiltersActive.action) return false;
    if (activityFiltersActive.module && row.module !== activityFiltersActive.module) return false;
    return true;
  }), [activityData, activityFiltersActive]);

  const filteredServerData = useMemo(() => serverData.filter((row) => {
    if (serverFiltersActive.method && row.method !== serverFiltersActive.method) return false;
    if (serverFiltersActive.statusCode && String(row.statusCode) !== String(serverFiltersActive.statusCode)) return false;
    return true;
  }), [serverData, serverFiltersActive]);

  const actionOptions = useMemo(() => [
    { value: "", label: "All Actions" },
    ...[...new Set(activityData.map((r) => r.action).filter((v) => v && v !== "—"))].map((v) => ({ value: v, label: v })),
  ], [activityData]);

  const moduleOptions = useMemo(() => [
    { value: "", label: "All Modules" },
    ...[...new Set(activityData.map((r) => r.module).filter((v) => v && v !== "—"))].map((v) => ({ value: v, label: v })),
  ], [activityData]);

  const methodOptions = useMemo(() => [
    { value: "", label: "All Methods" },
    ...[...new Set(serverData.map((r) => r.method).filter((v) => v && v !== "—"))].map((v) => ({ value: v, label: v })),
  ], [serverData]);

  const statusCodeOptions = useMemo(() => [
    { value: "", label: "All Status Codes" },
    ...[...new Set(serverData.map((r) => String(r.statusCode)).filter((v) => v && v !== "—"))].map((v) => ({ value: v, label: v })),
  ], [serverData]);

  const handleActivityFilterTypeSelect = (type) => setOpenFilterModal(`activity-${type}`);
  const handleServerFilterTypeSelect = (type) => setOpenFilterModal(`server-${type}`);

  const tabs = [
    { key: "activity", label: "Activity Logs", count: activityMeta.total },
    { key: "server", label: "Server Requests", count: serverMeta.total },
  ];

  const currentMeta = activeTab === "activity" ? activityMeta : serverMeta;
  const currentPage = activeTab === "activity" ? activityPage : serverPage;
  const setCurrentPage = activeTab === "activity" ? setActivityPage : setServerPage;

  return (
    <>
      <div className="tenant-header">
        <div onClick={() => navigate(-1)} className="back-link">
          <FaArrowLeft /> Back
        </div>
        <div className="tenant-title-container">
          <h1 className="tenant-title">Tenant</h1>
          <h2 className="tenant-title-breadcrumbs">
            Tenants /{" "}
            <span className="tenant-title-breadcrumbs-org">
              {tenantName || "..."}
            </span>
          </h2>
        </div>
      </div>

      <div className="invoices-tabs-container">
        <div className="tenants-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`tenants-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => handleTabChange(tab.key)}
            >
              <span>{tab.label.toUpperCase()}</span>
              {tab.count > 0 && (
                <span className="tab-count">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <SectionSpinner />
        ) : activeTab === "activity" ? (
          <CustomTable
            data={filteredActivityData}
            columns={activityColumns}
            filters={activityFilters}
            onFilterTypeSelect={handleActivityFilterTypeSelect}
            showActions={false}
            showCheckbox={false}
            itemsPerPage={LIMIT}
            tableName="Activity Logs"
          />
        ) : (
          <CustomTable
            data={filteredServerData}
            columns={serverColumns}
            filters={serverFilters}
            onFilterTypeSelect={handleServerFilterTypeSelect}
            showActions={false}
            showCheckbox={false}
            itemsPerPage={LIMIT}
            tableName="Server Requests"
          />
        )}

        <TableFilterModal
          isOpen={openFilterModal === "activity-action"}
          onClose={() => setOpenFilterModal(null)}
          title="Filter by Action"
          label="Select action"
          options={actionOptions}
          onApply={(val) => setActivityFiltersActive((p) => ({ ...p, action: val }))}
        />
        <TableFilterModal
          isOpen={openFilterModal === "activity-module"}
          onClose={() => setOpenFilterModal(null)}
          title="Filter by Module"
          label="Select module"
          options={moduleOptions}
          onApply={(val) => setActivityFiltersActive((p) => ({ ...p, module: val }))}
        />
        <TableFilterModal
          isOpen={openFilterModal === "server-method"}
          onClose={() => setOpenFilterModal(null)}
          title="Filter by Method"
          label="Select method"
          options={methodOptions}
          onApply={(val) => setServerFiltersActive((p) => ({ ...p, method: val }))}
        />
        <TableFilterModal
          isOpen={openFilterModal === "server-statusCode"}
          onClose={() => setOpenFilterModal(null)}
          title="Filter by Status Code"
          label="Select status code"
          options={statusCodeOptions}
          onApply={(val) => setServerFiltersActive((p) => ({ ...p, statusCode: val }))}
        />

        {!loading && currentMeta.totalPages > 1 && (
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
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </button>
            <span style={{ fontSize: 14, color: "#6b7280" }}>
              Page {currentMeta.page} of {currentMeta.totalPages}
            </span>
            <button
              className="btn btn-outline"
              disabled={currentPage >= currentMeta.totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default TenantSingleUserLogs;

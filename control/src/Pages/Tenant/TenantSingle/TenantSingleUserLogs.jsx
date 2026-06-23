import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "./TenantSingle.css";
import CustomTable from "../../../Components/Table/CustomTable";
import tenantApi from "../../../api/TenantApis";
import useAuth from "../../../hooks/useAuth";
import { showToast, showApiError } from "../../../Helper/ShowToast";
import { formatDateTime as formatDate } from "../../../Helper/Formatters";
import { SectionSpinner } from "../../../Components/LoadingSpinner";
import usePersistedTab from "../../../hooks/usePersistedTab";

const LIMIT = 20;

const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;

const mapLog = (log) => ({
  id: log.logId,
  action: log.action || "—",
  details: log.details || log.reason || "—",
  user: log.admin
    ? `${log.admin.firstName || ""} ${log.admin.lastName || ""}`.trim() || log.admin.email
    : log.tenant
    ? log.tenant.contactPerson || log.tenant.companyName || "—"
    : "—",
  feature: log.feature ? capitalize(log.feature) : "—",
  dateTime: formatDate(log.createdAt),
});

const TenantSingleUserLogs = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { accessToken, refreshToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [tenantName, setTenantName] = useState("");
  const [grouped, setGrouped] = useState({});
  const [activeTab, setActiveTab] = usePersistedTab("control:tenantUserLogs", "All");

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await tenantApi.GetTenantFeatureActivityLogs({
        accessToken,
        refreshToken,
        tenantId,
        page: 1,
        limit: LIMIT,
      });
      const data = res?.data?.data || res?.data || {};
      setGrouped(data);
    } catch (err) {
      showApiError(err, "LOAD_ACTIVITY_LOGS");
    } finally {
      setLoading(false);
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    tenantApi
      .GetSingleTenant({ tenantId, accessToken, refreshToken })
      .then((res) => {
        const d = res.data || res;
        setTenantName(d.companyName || d.contactPerson || "Tenant");
      })
      .catch(() => {
        // Non-critical — fallback name "Tenant" is already set
      });
    fetchLogs();
  }, []);

  // All feature keys from the response
  const featureKeys = useMemo(() => Object.keys(grouped), [grouped]);

  // Counts per feature
  const counts = useMemo(() => {
    const c = { All: 0 };
    featureKeys.forEach((key) => {
      const len = Array.isArray(grouped[key]) ? grouped[key].length : 0;
      c[key] = len;
      c.All += len;
    });
    return c;
  }, [grouped, featureKeys]);

  // Logs for the active tab
  const activeLogs = useMemo(() => {
    if (activeTab === "All") {
      return featureKeys.flatMap((key) => (Array.isArray(grouped[key]) ? grouped[key] : []));
    }
    return Array.isArray(grouped[activeTab]) ? grouped[activeTab] : [];
  }, [activeTab, grouped, featureKeys]);

  const tableData = useMemo(() => activeLogs.map(mapLog), [activeLogs]);

  const columns = [
    { key: "action",   header: "ACTION" },
    { key: "details",  header: "DETAILS" },
    { key: "user",     header: "USER" },
    { key: "feature",  header: "FEATURE" },
    { key: "dateTime", header: "DATE & TIME" },
  ];

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
            <span className="tenant-title-breadcrumbs-org">{tenantName || "..."}</span>
          </h2>
        </div>
      </div>

      <div className="invoices-tabs-container">
        <h3 className="tenant-header-gen">ACTIVITY LOGS</h3>

        {loading ? (
          <SectionSpinner />
        ) : (
          <>
            <div className="tenants-tabs">
              {/* All tab */}
              <button
                className={`tenants-tab ${activeTab === "All" ? "active" : ""}`}
                onClick={() => setActiveTab("All")}
              >
                <span>All</span>
                {counts.All > 0 && <span className="tab-count">{counts.All}</span>}
              </button>

              {/* One tab per feature key */}
              {featureKeys.map((key) => (
                <button
                  key={key}
                  className={`tenants-tab ${activeTab === key ? "active" : ""}`}
                  onClick={() => setActiveTab(key)}
                >
                  <span>{capitalize(key)}</span>
                  {counts[key] > 0 && <span className="tab-count">{counts[key]}</span>}
                </button>
              ))}
            </div>

            <CustomTable
              data={tableData}
              columns={columns}
              showActions={false}
              showCheckbox={false}
              itemsPerPage={LIMIT}
              tableName="Activity Logs"
            />
          </>
        )}
      </div>
    </>
  );
};

export default TenantSingleUserLogs;

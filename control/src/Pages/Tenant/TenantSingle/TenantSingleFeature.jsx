import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import "./TenantSingle.css";
import Button from "../../../Components/Button/Button";
import { FiArrowUpRight } from "react-icons/fi";
import { CheckboxInput, SwitchInput } from "../../../Components/Input/Inputs";
import tenantApi from "../../../api/TenantApis";
import useAuth from "../../../hooks/useAuth";
import { showToast } from "../../../Helper/ShowToast";
import { SectionSpinner } from "../../../Components/LoadingSpinner";
import Chart from "react-apexcharts";

const TenantSingleFeature = () => {
  const { tenantId } = useParams();
  const { accessToken, refreshToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [selectAll, setSelectAll] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [featuresRes, statsRes] = await Promise.allSettled([
        tenantApi.GetTenantFeatures({ accessToken, refreshToken, tenantId }),
        tenantApi.GetTenantUsageStatistics({ accessToken, refreshToken, tenantId }),
      ]);

      if (featuresRes.status === "fulfilled") {
        const raw = featuresRes.value?.data || featuresRes.value;
        setSubscription(raw);
        // Features may be nested inside plan.features, or at root as features array
        const featureList =
          raw?.plan?.features ||
          raw?.features ||
          raw?.data?.features ||
          [];
        setFeatures(
          featureList.map((f) => ({
            id: f.id || f.featureId,
            name: f.name || f.featureName || f.title || "—",
            active: f.active ?? f.enabled ?? f.isActive ?? true,
            checked: false,
          }))
        );
      } else {
        if (import.meta.env.DEV)
          console.warn("Features fetch error:", featuresRes.reason?.message);
      }

      if (statsRes.status === "fulfilled") {
        setUsageStats(statsRes.value?.data || statsRes.value);
      } else {
        if (import.meta.env.DEV)
          console.warn("Usage stats error:", statsRes.reason?.message);
      }
    } catch (err) {
      showToast(err.message || "Failed to load features", "error");
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshToken, tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleActive = (index) => {
    setFeatures((prev) =>
      prev.map((f, i) => (i === index ? { ...f, active: !f.active } : f))
    );
  };

  const handleCheckboxChange = (index) => {
    setFeatures((prev) =>
      prev.map((f, i) => (i === index ? { ...f, checked: !f.checked } : f))
    );
  };

  const handleSelectAllChange = () => {
    const next = !selectAll;
    setSelectAll(next);
    setFeatures((prev) => prev.map((f) => ({ ...f, checked: next })));
  };

  // Plan info
  const planName =
    subscription?.plan?.name ||
    subscription?.planName ||
    subscription?.data?.plan?.name ||
    "—";

  // Usage stats
  const clientsUsed = usageStats?.tenantClientsCount ?? null;
  const clientLimit =
    subscription?.clientLimit ||
    subscription?.plan?.clientLimit ||
    subscription?.data?.clientLimit ||
    null;
  const sessionCount = usageStats?.tenantSessionCount ?? 0;

  const usagePercent =
    clientsUsed != null && clientLimit
      ? Math.min(Math.round((clientsUsed / clientLimit) * 100), 100)
      : null;

  // Session graph chart — built inside useMemo to prevent stale/undefined renders
  const sessionGraph = usageStats?.tenantSessionGraph || [];

  const { chartOptions, chartSeries } = useMemo(() => {
    const periods = sessionGraph.map((g) => g.period);
    const counts = sessionGraph.map((g) => Number(g.session_count) || 0);
    return {
      chartOptions: {
        chart: { type: "bar", toolbar: { show: false }, animations: { enabled: false } },
        xaxis: { categories: periods },
        yaxis: { min: 0, tickAmount: 4 },
        colors: ["#1D4ED8"],
        dataLabels: { enabled: false },
        plotOptions: { bar: { borderRadius: 4 } },
        grid: { strokeDashArray: 4 },
      },
      chartSeries: [{ name: "Sessions", data: counts }],
    };
  }, [sessionGraph.length]);

  if (loading) {
    return (
      <div className="tenant-list-container">
        <SectionSpinner />
      </div>
    );
  }

  return (
    <div className="tenant-list-container">
      {/* Plan Info Section */}
      <h3 className="tenant-header-gen">Plan Info</h3>
      <div className="plan-info">
        <div className="plan-details">
          <div className="plan-item">
            <p>
              <span className="plan-badge">
                {planName !== "—" ? planName : "Enterprise"}
              </span>{" "}
              Plan
            </p>
            <Button
              label="Change plan"
              iconPosition="right"
              icon={<FiArrowUpRight size={20} />}
              width="200px"
            />
          </div>

          <div className="plan-item">
            <label>Usage</label>
            <p>Client seats</p>
            {usagePercent != null ? (
              <>
                <div className="usage-bar">
                  <div
                    className="usage-filled"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <p>
                  {clientsUsed} out of {clientLimit} used
                </p>
              </>
            ) : (
              <p style={{ color: "#9ca3af", fontSize: 13 }}>
                Usage data unavailable
              </p>
            )}
          </div>

          <div className="plan-item">
            <label>Sessions</label>
            <p style={{ fontWeight: 600 }}>{sessionCount.toLocaleString()} total</p>
          </div>
        </div>
      </div>

      {/* Session Graph */}
      {sessionGraph.length > 0 && (
        <>
          <h3 className="tenant-header-gen">Session Activity</h3>
          <div style={{ background: "#fff", borderRadius: 8, padding: 16, border: "1px solid #e5e7eb", marginBottom: 24 }}>
            <Chart
              key={`session-chart-${sessionGraph.length}`}
              options={chartOptions}
              series={chartSeries}
              type="bar"
              height={200}
            />
          </div>
        </>
      )}

      {/* Features Table Section */}
      <h3 className="tenant-header-gen">Features</h3>
      {features.length === 0 ? (
        <div className="settings-placeholder">No features found for this tenant.</div>
      ) : (
        <div className="features-table-container">
          <table className="features-table">
            <thead>
              <tr>
                <th>
                  <CheckboxInput
                    checked={selectAll}
                    onChange={handleSelectAllChange}
                  />
                </th>
                <th>Feature</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr key={feature.id || index}>
                  <td>
                    <CheckboxInput
                      checked={feature.checked}
                      onChange={() => handleCheckboxChange(index)}
                    />
                  </td>
                  <td>{feature.name}</td>
                  <td>
                    <div className="active-cell">
                      <SwitchInput
                        checked={feature.active}
                        onChange={() => handleToggleActive(index)}
                      />
                      <span className="active-label">
                        {feature.active ? "Yes" : "No"}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TenantSingleFeature;

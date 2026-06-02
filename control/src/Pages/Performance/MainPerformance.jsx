import React, { useState, useEffect } from "react";
import "./Performance.css";
import Gauge from "../../Components/Guages/Gauge";
import SystemSpeedChart from "../../Components/SpeedChart/SpeedChart";
import StackedBarChart from "../../Components/BarChart/StackedBarChart";
import ResourceUtilizationChart from "../../Components/ResourceUtilizationUsage/ResourceUtilizationUsage";
import { Skeleton } from "../../Components/LoadingSpinner";
import useAuth from "../../hooks/useAuth";
import performanceApi from "../../api/performanceApi";

// Fallback shapes so components never receive undefined
const EMPTY_PERIOD_MAP = { year: [], month: [], week: [], day: [] };
const EMPTY_TIMESERIES = {
  systemSpeed:     EMPTY_PERIOD_MAP,
  latency:         EMPTY_PERIOD_MAP,
  uptime:          EMPTY_PERIOD_MAP,
  apiResponseTime: EMPTY_PERIOD_MAP,
};
const EMPTY_RESOURCE_TIMESERIES = {
  cpu:     EMPTY_PERIOD_MAP,
  memory:  EMPTY_PERIOD_MAP,
  storage: EMPTY_PERIOD_MAP,
};

const MainPerformance = () => {
  const { accessToken, refreshToken } = useAuth();
  const [loading, setLoading] = useState(true);

  const [generalMetrics, setGeneralMetrics] = useState({
    systemSpeed:     { value: 0, maxValue: 1000 },
    latency:         { value: 0, maxValue: 1000 },
    uptime:          { value: 0, maxValue: 100  },
    apiResponseTime: { value: 0, maxValue: 1000 },
  });
  const [resourceMetrics, setResourceMetrics] = useState({
    cpu:     { value: 0, maxValue: 100 },
    memory:  { value: 0, maxValue: 100 },
    storage: { value: 0, maxValue: 100 },
  });
  const [generalTimeseries, setGeneralTimeseries]   = useState(EMPTY_TIMESERIES);
  const [errorRate, setErrorRate]                   = useState({ categories: [], series: [] });
  const [resourceTimeseries, setResourceTimeseries] = useState(EMPTY_RESOURCE_TIMESERIES);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [gMetrics, gTimeseries, errRate, rMetrics, rTimeseries] =
          await Promise.allSettled([
            performanceApi.GetGeneralMetrics({ accessToken, refreshToken }),
            performanceApi.GetGeneralTimeseries({ accessToken, refreshToken }),
            performanceApi.GetApiErrorRate({ accessToken, refreshToken }),
            performanceApi.GetResourceMetrics({ accessToken, refreshToken }),
            performanceApi.GetResourceTimeseries({ accessToken, refreshToken }),
          ]);

        if (gMetrics.status   === "fulfilled" && gMetrics.value?.data)   setGeneralMetrics(gMetrics.value.data);
        if (gTimeseries.status === "fulfilled" && gTimeseries.value?.data) setGeneralTimeseries(gTimeseries.value.data);
        if (errRate.status    === "fulfilled" && errRate.value?.data)    setErrorRate(errRate.value.data);
        if (rMetrics.status   === "fulfilled" && rMetrics.value?.data)   setResourceMetrics(rMetrics.value.data);
        if (rTimeseries.status === "fulfilled" && rTimeseries.value?.data) setResourceTimeseries(rTimeseries.value.data);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [accessToken, refreshToken]);

  return (
    <>
      <div className="billing-board-header">
        <div className="billing-board-title">
          <h1>General Performance</h1>
          <p>Monitor system-wide performance</p>
        </div>
      </div>

      <div>
        <h2 className="performance-section-label">General Performance</h2>
      </div>

      <div className="general-performance-wrapper">
        <div className="general-performance-container">
          <div className="gauge-grid">
            {loading ? (
              <>
                <Skeleton width="100%" height="160px" borderRadius="8px" />
                <Skeleton width="100%" height="160px" borderRadius="8px" />
                <Skeleton width="100%" height="160px" borderRadius="8px" />
                <Skeleton width="100%" height="160px" borderRadius="8px" />
              </>
            ) : (
              <>
                <Gauge value={generalMetrics.systemSpeed.value} maxValue={generalMetrics.systemSpeed.maxValue} label="System Speed" color="#F79009" isPercentage={false} />
                <Gauge value={generalMetrics.latency.value} maxValue={generalMetrics.latency.maxValue} label="Latency" color="#12B76A" isPercentage={false} />
                <Gauge value={generalMetrics.uptime.value} maxValue={generalMetrics.uptime.maxValue} label="Uptime" color="#12B76A" isPercentage={true} />
                <Gauge value={generalMetrics.apiResponseTime.value} maxValue={generalMetrics.apiResponseTime.maxValue} label="API Response Time" color="#004ABA" isPercentage={false} />
              </>
            )}
          </div>

          <div className="system-charts-one">
            {loading ? (
              <>
                <Skeleton width="100%" height="250px" borderRadius="8px" />
                <Skeleton width="100%" height="250px" borderRadius="8px" />
              </>
            ) : (
              <>
                <SystemSpeedChart periodDataMap={generalTimeseries.uptime} title="Uptime" />
                <SystemSpeedChart periodDataMap={generalTimeseries.latency} title="Latency" />
              </>
            )}
          </div>
        </div>

        <div className="system-charts">
          {loading ? (
            <>
              <Skeleton width="100%" height="250px" borderRadius="8px" />
              <Skeleton width="100%" height="250px" borderRadius="8px" />
            </>
          ) : (
            <>
              <SystemSpeedChart periodDataMap={generalTimeseries.systemSpeed} title="System Speed" />
              <SystemSpeedChart periodDataMap={generalTimeseries.apiResponseTime} title="API Response Time" />
            </>
          )}
        </div>

        <div className="stacked-bar-chart">
          {loading ? (
            <Skeleton width="100%" height="300px" borderRadius="8px" />
          ) : (
            <StackedBarChart
              series={errorRate.series?.length ? errorRate.series : undefined}
              categories={errorRate.categories?.length ? errorRate.categories : undefined}
            />
          )}
        </div>
      </div>

      <div>
        <h2 className="performance-section-label">Resource Utilization</h2>
      </div>

      <div className="gauge-grid-two">
        {loading ? (
          <>
            <Skeleton width="100%" height="160px" borderRadius="8px" />
            <Skeleton width="100%" height="160px" borderRadius="8px" />
            <Skeleton width="100%" height="160px" borderRadius="8px" />
          </>
        ) : (
          <>
            <Gauge value={resourceMetrics.cpu.value} maxValue={resourceMetrics.cpu.maxValue} label="CPU Usage" color="#DC6803" isPercentage={true} />
            <Gauge value={resourceMetrics.memory.value} maxValue={resourceMetrics.memory.maxValue} label="Memory Usage" color="#F79009" isPercentage={true} />
            <Gauge value={resourceMetrics.storage.value} maxValue={resourceMetrics.storage.maxValue} label="Storage Usage" color="#D92D20" isPercentage={true} />
          </>
        )}
      </div>

      <div className="resource-utilization-chart-wrapper">
        {loading ? (
          <Skeleton width="100%" height="300px" borderRadius="8px" />
        ) : (
          <ResourceUtilizationChart periodDataMap={resourceTimeseries} />
        )}
      </div>
    </>
  );
};

export default MainPerformance;

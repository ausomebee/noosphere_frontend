import React, { useState } from "react";
import ReactApexChart from "react-apexcharts";
import "./ResourceUtilizationChart.css";
import { chartPeriodOptions as PERIODS } from "../../Data/selectOptions";

// Accepts: periodDataMap = { cpu: {year,month,week,day}, memory: {...}, storage: {...} }
// Each period array: [{ x: unixMs, y: number }, ...]

const ResourceUtilizationChart = ({ periodDataMap }) => {
  const [activePeriod, setActivePeriod] = useState("year");

  const series = [
    { name: "CPU",     data: periodDataMap?.cpu?.[activePeriod]     || [] },
    { name: "Memory",  data: periodDataMap?.memory?.[activePeriod]  || [] },
    { name: "Storage", data: periodDataMap?.storage?.[activePeriod] || [] },
  ];

  const hasData = series.some((s) => s.data.length > 0);

  const chartOptions = {
    chart: {
      id: "resource-utilization",
      animations: { enabled: true, easing: "linear", dynamicAnimation: { speed: 500 } },
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    xaxis: {
      type: "datetime",
      labels: {
        style: { fontSize: "12px", fontFamily: "Arial", colors: "#666" },
        datetimeUTC: false,
      },
    },
    colors: ["#1E90FF", "#12B76A", "#F79009"],
    yaxis: [
      { show: false, seriesName: "CPU"     },
      { show: false, seriesName: "Memory"  },
      { show: false, seriesName: "Storage" },
    ],
    stroke: {
      curve: "smooth",
      width: [2, 2, 2],
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "light",
        type: "vertical",
        opacityFrom: 0.15,
        opacityTo: 0,
      },
    },
    grid: { show: false },
    dataLabels: { enabled: false },
    tooltip: {
      enabled: true,
      shared: true,
      intersect: false,
      x: { format: "dd MMM yyyy HH:mm" },
      y: { formatter: (val) => `${val != null ? val.toFixed(2) : "N/A"}%` },
    },
    legend: {
      show: true,
      position: "right",
      verticalAlign: "middle",
      fontSize: "14px",
      fontFamily: "Arial",
      markers: { width: 12, height: 12, radius: 12 },
      itemMargin: { vertical: 5 },
    },
  };

  return (
    <div className="resource-utilization-chart-container">
      <div className="resource-utilization-chart-header">
        <h3 className="resource-utilization-chart-title">Resource Utilization</h3>
        <div className="resource-utilization-period-tabs">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              className={`period-tab ${activePeriod === key ? "active" : ""}`}
              onClick={() => setActivePeriod(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {hasData && (
        <ReactApexChart
          options={chartOptions}
          series={series}
          type="area"
          height={200}
          width="100%"
        />
      )}
    </div>
  );
};

export default ResourceUtilizationChart;

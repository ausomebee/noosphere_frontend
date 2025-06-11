import React, { useState, useEffect } from "react";
import ReactApexChart from "react-apexcharts";
import { SelectInput } from "../Input/Inputs";
import "./ResourceUtilizationChart.css";

const periodConfigs = {
  Year: {
    min: new Date("2025-01-01").getTime(),
    max: new Date("2025-12-31 18:00:00").getTime(),
    tickAmount: 11,
    formatter: { month: "MMM" },
  },
  Month: {
    min: new Date("2025-03-01").getTime(),
    max: new Date("2025-03-31 18:00:00").getTime(),
    tickAmount: 3,
    formatter: { day: "dd" },
  },
  Week: {
    min: new Date("2025-03-24").getTime(),
    max: new Date("2025-03-31 18:00:00").getTime(),
    tickAmount: 6,
    formatter: { day: "ddd" },
  },
  Day: {
    min: new Date("2025-03-31").getTime(),
    max: new Date("2025-03-31 18:00:00").getTime(),
    tickAmount: 3,
    formatter: { hour: "HH:mm" },
  },
};

const ResourceUtilizationChart = ({ data, defaultPeriod = "Year" }) => {
  const [period, setPeriod] = useState(defaultPeriod);
  const [chartOptions, setChartOptions] = useState({});
  const [chartSeries, setChartSeries] = useState([]);

  useEffect(() => {
    if (!data) return;

    const { cpu = [], memory = [], storage = [] } = data;
    const config = periodConfigs[period];

    setChartSeries([
      { name: "CPU Usage", data: cpu },
      { name: "Memory", data: memory },
      { name: "Storage", data: storage },
    ]);

    setChartOptions({
      chart: {
        id: "resource-utilization",
        animations: {
          enabled: true,
          easing: "linear",
          dynamicAnimation: { speed: 500 },
        },
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      xaxis: {
        type: "datetime",
        min: config.min,
        max: config.max,
        tickAmount: config.tickAmount,
        labels: {
          style: { fontSize: "12px", fontFamily: "Arial", colors: "#666" },
          datetimeFormatter: config.formatter,
        },
      },
      yaxis: { labels: { show: false } },
      stroke: {
        curve: "straight",
        width: [1, 1, 1],
        colors: ["#1E90FF", "#87CEFA", "#000000"],
      },
      fill: {
        type: "gradient",
        gradient: {
          shade: "light",
          type: "vertical",
          shadeIntensity: 0.5,
          opacityFrom: 0.3,
          opacityTo: 0,
          stops: [0, 100],
          colorStops: [
            [
              { offset: 0, color: "#1E90FF", opacity: 0.3 },
              { offset: 100, color: "#1E90FF", opacity: 0 },
            ],
            [
              { offset: 0, color: "#87CEFA", opacity: 0.3 },
              { offset: 100, color: "#87CEFA", opacity: 0 },
            ],
            [
              { offset: 0, color: "#000000", opacity: 0.2 },
              { offset: 100, color: "#000000", opacity: 0 },
            ],
          ],
        },
      },
      grid: { show: false },
      dataLabels: { enabled: false },
      tooltip: { enabled: true },
      legend: {
        show: true,
        position: "right", // Move legend to the right for vertical layout
        verticalAlign: "middle", // Center vertically
        fontSize: "14px",
        fontFamily: "Arial",
        markers: { width: 12, height: 12, radius: 12 },
        itemMargin: { vertical: 5 }, // Add vertical spacing between legend items
      },
    });
  }, [data, period]);

  return (
    <div className="resource-utilization-chart-container">
      <div className="resource-utilization-chart-header">
        <h3 className="resource-utilization-chart-title">Resource Utilization</h3>
        <SelectInput
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          options={["Year", "Month", "Week", "Day"].map((p) => ({
            value: p,
            label: p,
          }))}
          className="system-speed-chart-select"
        />
      </div>

      {chartSeries.length > 0 && (
        <ReactApexChart
          options={chartOptions}
          series={chartSeries}
          type="area"
          height={200}
          width="100%"
        />
      )}
    </div>
  );
};

export default ResourceUtilizationChart;
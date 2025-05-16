import React, { useState } from "react";
import ReactApexChart from "react-apexcharts";
import { SelectInput } from "../Input/Inputs";
import "./SpeedChart.css";

const SystemSpeedChart = ({ periodDataMap }) => {
  const [period, setPeriod] = useState("Year");

  // Function to filter the data based on period settings
  const filterDataByPeriod = (data, periodSettings) => {
    return data.filter(item => {
      return item.x >= periodSettings.min && item.x <= periodSettings.max;
    });
  };

  const getAxisSettings = (selectedPeriod) => {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate();

    // Calculate first day of year, month, week, and day
    const firstDayOfYear = new Date(year, 0, 1);
    const firstDayOfMonth = new Date(year, month, 1);

    const firstDayOfWeek = new Date(currentDate);
    firstDayOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Sunday (or first day of the week)

    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6); // 6 days from the start of the week

    const settings = {
      Year: {
        min: firstDayOfYear.getTime(),
        max: new Date(year, 11, 31, 23, 59, 59).getTime(),
        tickAmount: 12,
        datetimeFormatter: { month: "MMM" },
      },
      Month: {
        min: firstDayOfMonth.getTime(),
        max: new Date(year, month, day, 23, 59, 59).getTime(),
        tickAmount: 4, // Adjust this for better distribution (week-based ticks)
        datetimeFormatter: { day: "dd" },
      },
      Week: {
        min: firstDayOfWeek.getTime(),
        max: lastDayOfWeek.getTime(),
        tickAmount: 7, // One tick per day in the week
        datetimeFormatter: { day: "ddd" },
      },
      Day: {
        min: new Date(year, month, day, 0, 0, 0).getTime(),
        max: new Date(year, month, day, 23, 59, 59).getTime(),
        tickAmount: 6, // Hourly ticks for the day
        datetimeFormatter: { hour: "HH:mm" },
      },
    };
    return settings[selectedPeriod] || settings.Year;
  };

  const axisSettings = getAxisSettings(period);
  const rawData = periodDataMap[period.toLowerCase()] || [];

  // Filter data based on the period's axis settings
  const filteredData = filterDataByPeriod(rawData, axisSettings);

  const chartOptions = {
    chart: {
      id: "system-speed",
      animations: {
        enabled: true,
        easing: "linear",
        dynamicAnimation: { speed: 500 },
      },
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      type: "datetime",
      min: axisSettings.min,
      max: axisSettings.max,
      tickAmount: axisSettings.tickAmount,
      labels: { show: true },
    },
    yaxis: {
      labels: { show: false },
    },
    stroke: { curve: "straight", width: 1, colors: ["#000000"] },
    fill: {
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "vertical",
        opacityFrom: 0.15,
        opacityTo: 0,
        stops: [0, 100],
        colorStops: [
          { offset: 0, color: "#000", opacity: 0.15 },
          { offset: 100, color: "#000", opacity: 0 },
        ],
      },
    },
    grid: { show: false },
    tooltip: { enabled: true },
  };

  const handlePeriodChange = (e) => setPeriod(e.target.value);

  return (
    <div className="system-speed-chart-container">
      <div className="system-speed-chart-header">
        <h3 className="system-speed-chart-title">System Speed</h3>
        <SelectInput
          value={period}
          onChange={handlePeriodChange}
          options={["Year", "Month", "Week", "Day"].map((opt) => ({
            value: opt,
            label: opt,
          }))}
        />
      </div>
      <ReactApexChart
        options={chartOptions}
        series={[{ name: "Speed", data: filteredData }]}
        type="area"
        height={200}
        width="100%"
      />
    </div>
  );
};

export default SystemSpeedChart;

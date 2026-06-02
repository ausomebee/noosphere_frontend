import React, { useState } from "react";
import ReactApexChart from "react-apexcharts";
import "./ErrorTypeChart.css";
import { SelectInput } from "../Input/Inputs";
import { errorChartCategories } from "../../Data/selectOptions";

const ErrorTypesChart = () => {
  // State for chart series data (proportions of error types)
  const [chartSeries, setChartSeries] = useState([30, 25, 20, 15, 10]); // Placeholder proportions

  // State for chart options
  const [chartOptions, setChartOptions] = useState({
    chart: {
      type: "pie",
      toolbar: {
        show: false,
      },
    },
    labels: [
      "Syntax Error",
      "Runtime Error",
      "Logic Error",
      "Network Error",
      "Other",
    ], // Placeholder labels
    colors: ["#E6F0FA", "#B3D4FF", "#80BFFF", "#4D8CFF", "#1A56DB"], // Gradient of blue shades
    legend: {
      show: false, // Hide the legend as in the image
    },
    dataLabels: {
      enabled: false, // Hide data labels on the chart
    },
    tooltip: {
      enabled: true,
      y: {
        formatter: (val) => `${val}%`, // Show percentage in tooltip
      },
    },
    stroke: {
      show: false, // Remove borders between pie slices
    },
  });

  // State for dropdown selection (not functional in this case, just for display)
  const [category, setCategory] = useState("by category");

  // Handle dropdown change (placeholder functionality)
  const handleCategoryChange = (event) => {
    setCategory(event.target.value);
    // In a real application, this could fetch new data or update the chart
  };

  return (
    <div className="error-types-chart-container">
      <div className="error-types-chart-header">
        <h3 className="error-types-chart-title">Error Types</h3>
        <SelectInput
          value={category}
          onChange={handleCategoryChange}
          options={errorChartCategories}
        />
      </div>
      <ReactApexChart
        options={chartOptions}
        series={chartSeries}
        type="pie"
        height={200}
        width="100%"
      />
    </div>
  );
};

export default ErrorTypesChart;

import React, { useEffect } from "react";
import Chart from "react-apexcharts";
import "./StackedBarChart.css";
import { SelectInput } from "../Input/Inputs";

const StackedBarChart = ({
  title = "API Error Rate",
  series = [
    { name: "Error", data: [35, 40, 53, 48, 55, 42, 54, 43, 52, 46, 52, 44] },
    { name: "Success", data: [95, 90, 97, 92, 85, 98, 96, 97, 98, 94, 88, 96] },
  ],
  categories = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  dropdownOptions = ["Period", "Monthly", "Yearly"],
  height = 200,
}) => {
  const options = {
    chart: {
      type: "bar",
      stacked: true,
      toolbar: {
        show: false,
      },
      animations: {
        enabled: true,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "30%",
        borderRadius: 0,
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: categories,
      labels: {
        style: {
          fontSize: "12px",
          fontWeight: 400,
          colors: "#666",
        },
      },
    },
    yaxis: {
      show: false,
    },
    grid: {
      show: true, // No grid lines in Image 1
    },
    legend: {
      show: false,
    },
    colors: ["#333", "#D3D3D3"],
    tooltip: {
      enabled: true,
      y: {
        formatter: (val) => `${val}%`,
      },
    },
  };

  useEffect(() => {
    // Insert a style tag to apply border radius to both bars
    const styleTag = document.createElement("style");
    styleTag.innerHTML = `
    
      .apexcharts-series[seriesName="Error"] path {
        clip-path: inset(0 0 0 0 round 4px 4px 0 0) !important;
        z-index: 0; 
        position: relative;
        top: -20px;
        left: 0;
        
      }
      
     
      .apexcharts-series[seriesName="Success"] path {
        clip-path: inset(0 0 0 0 round 8px 8px 0 0) !important;
        z-index: 2;
        position: absolute;
        top: -20px; 
        
        
      }
    `;
    document.head.appendChild(styleTag);

    return () => {
      // Clean up
      document.head.removeChild(styleTag);
    };
  }, []);

  return (
    <div className="stacked-bar-container">
      <div className="stacked-bar-chart-header">
        <span className="stacked-bar-chart-title">{title}</span>
        <SelectInput
          options={dropdownOptions.map((option) => ({
            value: option,
            label: option,
          }))}
          defaultValue={dropdownOptions[0]}
          className="system-speed-chart-select"
        />
      </div>
      <Chart options={options} series={series} type="bar" height={height} />
    </div>
  );
};

export default StackedBarChart;

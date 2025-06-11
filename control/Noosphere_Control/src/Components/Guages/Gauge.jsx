import React from "react";
import Chart from "react-apexcharts";
import "./Gauge.css"; // Import the CSS for styling

const Gauge = ({ value, maxValue, label, color, isPercentage = false }) => {
  return (
    <div className="gauge-container">
      <Chart
        options={{
          chart: { 
            type: "radialBar",
            offsetY: -10, // Ensures chart stays centered vertically
          },
          plotOptions: {
            radialBar: {
              startAngle: -90,
              endAngle: 90,
              hollow: { size: "60%" },
              track: {
                background: "#F1F1F1",
                strokeWidth: "100%",
                margin: 5,
              },
              dataLabels: {
                name: { show: false },
                value: {
                  fontSize: "30px",
                  fontWeight: 600,
                  color: "#333",
                  offsetY: -10, // Keeps value position stable
                  formatter: (val) =>
                    isPercentage ? `${Math.round(val)}%` : `${Math.round((val / 100) * maxValue)}ms`,
                },
              },
            },
          },
          stroke: { lineCap: "round" },
          colors: [color],
        }}
        series={[((value / maxValue) * 100).toFixed(2)]}
        type="radialBar"
        height={800}
        width={250}
      />
      <div className="gauge-label">{label}</div>
    </div>
  );
};

export default Gauge;
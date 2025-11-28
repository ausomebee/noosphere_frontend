import React from "react";
// import Button from "../../../Button/Button";
import Chart from "react-apexcharts";
import { HiOutlineCog6Tooth } from "react-icons/hi2";

const ProductivityInformation = ({ hasData }) => {
  // Separated chart data within the component
  const productivityChartData = {
    series: [73.5],
    options: {
      chart: { id: "prod-chart", toolbar: { show: false } },
      plotOptions: {
        radialBar: {
          hollow: { size: "65%" },
          dataLabels: {
            name: {
              show: true,
              fontSize: "14px",
              fontWeight: 400,
              color: "#4B4E54",
              offsetY: -10, // Position above the value
              formatter: function () {
                return "Therapist Productivity"; // Static text as per your description
              },
            },
            value: {
              show: true,
              fontSize: "36px",
              fontWeight: 600,
              color: "#4B4E54",
              offsetY: 15, // Position below the name
              formatter: function (val) {
                return `${val}%`; // Display the percentage
              },
            },
          },
        },
      },
      colors: ["#004ABA"],
    },
  };

  return (
    <>
      {hasData ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-4">
            <div className="dashboard-card rounded-lg px-24 py-10">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">Therapist Availability</p>
                <HiOutlineCog6Tooth size={20} />
              </div>
              <div className="flex justify-between items-center mb-4 mt-20">
                <p className="text-4xl font-semibold text-blue-600">75/100</p>
                <p className="text-sm text-blue-600 font-semibold">See breakdown</p>
              </div>
            </div>
            <div className="dashboard-card rounded-lg px-24 py-10">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-sm text-gray-600">Client Caseload Overview</p>
                  <p className="text-sm text-gray-600">Average client per therapist</p>
                </div>
                <HiOutlineCog6Tooth size={20} />
              </div>
              <div className="flex justify-between items-center mb-4 mt-20">
                <p className="text-4xl font-semibold text-blue-600">4.123</p>
                <p className="text-sm text-blue-600 font-semibold">See breakdown</p>
              </div>
            </div>
            <div className="dashboard-card rounded-lg px-24 py-10">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">Average Session Satisfaction Scores</p>
                <HiOutlineCog6Tooth size={20} />
              </div>
              <div className="flex justify-between items-center mb-4 mt-20">
                <p className="text-4xl font-semibold text-blue-600">4.4/5</p>
                <p className="text-sm text-blue-600 font-semibold">See breakdown</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col h-full">
            <p className="text-sm text-gray-333 font-bold">Average Productivity Rate</p>
            <p className="text-lg text-gray-600">Percentage of scheduled sessions vs that are completed</p>
            <div className="relative flex items-center justify-center mt-4">
              <Chart
                options={productivityChartData.options}
                series={productivityChartData.series}
                type="radialBar"
                width={350}
              />
             
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="text-muted text-lg mb-4 text-left">No data to show</p>
          <p className="text-muted text-left mb-16">
            You have not scheduled any sessions. Data from all your sessions will be shown here
          </p>
        </>
      )}
    </>
  );
};

export default ProductivityInformation;
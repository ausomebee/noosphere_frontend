import React, { useState } from "react";
import Chart from "react-apexcharts";
import Button from "../../../Components/Button/Button";
import "../Dashboard.css";
import { Link } from "react-router-dom";

const Authorizations = ({ hasData }) => {
  // Initial series data as JSON-like array of objects
  const [authorizationData, setAuthorizationData] = useState([
    { label: "Expired", value: 10, color: "#3B82F6" },
    { label: "Expiring", value: 5, color: "#60A5FA" },
    { label: "Active", value: 4, color: "#93C5FD" },
  ]);

  // Authorization details as JSON-like array of objects
  const [authDetails, setAuthDetails] = useState([
    { name: "Jose Bethran", details: "Jobel - 12 days", date: "12/10/2023" },
    { name: "Nathan Dimm", details: "Nath 03.56.680", date: "12/10/2023" },
    { name: "Maverick City", details: "Mav-Man xyz...", date: "12/10/2023" },
  ]);

  // Static chart options with legend positioned at bottom
  const chartOptions = {
    chart: { id: "auth-chart", toolbar: { show: false } },
    labels: authorizationData.map((item) => item.label),
    plotOptions: { pie: { donut: { size: "50%" } } },
    colors: authorizationData.map((item) => item.color),
    legend: {
      show: true,
      position: "bottom",
      horizontalAlign: "left",
      fontSize: "12px",
      itemMargin: { horizontal: 15, vertical: 5 },
      height: "auto",
      offsetY: 0,
    },
  };

  return (
    <>
      {hasData ? (
        <div className="">
          <div className="flex items-center gap-4 mx-auto w-100p">
            <div className="chart-container">
              <Chart
                options={chartOptions}
                series={authorizationData.map((item) => item.value)}
                type="donut"
                width={300}
              />
            </div>
            <div className="auth-details">
              <p className="text-4xl font-semibold text-primary mb-2">19</p>
              {authDetails.map((item, index) => (
                <p key={index} className="text-sm text-gray-700">
                  {item.name}{" "}
                  <span className="text-gray-500">{item.details}</span>{" "}
                  <span className="text-gray-700">{item.date}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="#003A9B"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    style={{ marginLeft: "8px" }}
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </p>
              ))}
              <Link to="#" className="text-blue-600 text-sm mt-2">
                +16 more
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div>
         <p className="text-muted text-lg mb-4 text-left">No data to show</p>
          <p className="text-muted text-left mb-16">
            You have not scheduled any sessions. Data from all your sessions
            will be shown here
          </p>
          <Button
            label="Set up authorization"
            variant="primary"
            className="mx-auto block px-6 py-2"
          />
        </div>
      )}
    </>
  );
};

export default Authorizations;

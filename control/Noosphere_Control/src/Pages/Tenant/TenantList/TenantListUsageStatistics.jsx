import React, { useState } from "react";
import Chart from "react-apexcharts";
import "./TenantList.css";
import { SelectInput } from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import { IoIosArrowForward } from "react-icons/io";
import CustomTable from "../../../Components/Table/CustomTable";
import { FaArrowLeft } from "react-icons/fa";
const TenantListUsageStatistics = ({ onBack }) => {
  const breadcrumb = "Tenants/ACME Corp/Usage Statistics";

  // State to toggle graph visibility for Total Active Sessions and Number of Server Requests
  const [showActiveSessionsGraph, setShowActiveSessionsGraph] = useState(false);
  const [showServerRequestsGraph, setShowServerRequestsGraph] = useState(false);

  // Data for the Sessions over time graph (default view)
  const sessionsOverTimeData = {
    series: [
      {
        name: "Sessions",
        data: [25, 28, 30, 32, 35, 38, 40, 42, 45, 48, 50, 45], // Example data for each month
      },
    ],
    options: {
      chart: {
        type: "area",
        height: 200,
        toolbar: {
          show: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: "smooth",
        width: 2,
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3,
        },
      },
      xaxis: {
        categories: [
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
        labels: {
          style: {
            colors: "#6B7280", // Gray color for labels
          },
        },
      },
      yaxis: {
        labels: false,
      },
      colors: ["#3B82F6"], // Blue color for the chart
      tooltip: {
        x: {
          format: "MMM",
        },
      },
    },
  };

  // Data for Total Active Sessions graph (when toggled)
  const activeSessionsData = {
    series: [
      {
        name: "Active Sessions",
        data: [8.5, 8.7, 9.0, 9.2, 9.5, 9.7, 9.8, 9.9, 10.0, 10.2, 9.2, 9.0],
      },
    ],
    options: {
      ...sessionsOverTimeData.options,
      chart: {
        ...sessionsOverTimeData.options.chart,
        id: "active-sessions-chart",
      },
    },
  };

  // Data for Number of Server Requests graph (when toggled)
  const serverRequestsData = {
    series: [
      {
        name: "Server Requests",
        data: [38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 40],
      },
    ],
    options: {
      ...sessionsOverTimeData.options,
      chart: {
        ...sessionsOverTimeData.options.chart,
        id: "server-requests-chart",
      },
    },
  };

  
  
    const [filters, setFilters] = useState([
       {
         key: "filter_type",
         value: "",
         options: [
           { value: "", label: "Select Filter" },
           { value: "date_created", label: "Date Created" },
           { value: "due_date", label: "Due Date" },
         ],
       },
     ]);

  // Define the column headers based on the image
  const columns = [
    { key: "request_id", header: "REQUEST ID" },
    { key: "timestamp", header: "TIMESTAMP" },
    { key: "log_id", header: "LOG ID" },
    { key: "client_ip", header: "CLIENT IP" },
    { key: "user_id", header: "USER ID" },
  ];

  const handleFilterChange = (key, value) => {
    console.log(`Filter changed: ${key} = ${value}`);
    setFilters((prevFilters) =>
      prevFilters.map((filter) =>
        filter.key === key ? { ...filter, value } : filter
      )
    );
  };
  // Sample data for the table
  const tableData = [
    {
      request_id: "ACME Corp",
      timestamp: "12/10/2024",
      log_id: "SD83B02A849",
      client_ip: "12:24:54:679:0",
      user_id: "BCD94545ddc",
      hasCheckbox: true,
      hasActions: true,
    },
    {
      request_id: "Thomas Inc",
      timestamp: "12/13/2024",
      log_id: "SD83B02A849",
      client_ip: "12:24:54:679:0",
      user_id: "BCD94545ddc",
      hasCheckbox: true,
      hasActions: true,
    },
    {
      request_id: "West ABA",
      timestamp: "1/10/2024",
      log_id: "SD83B02A849",
      client_ip: "12:24:54:679:0",
      user_id: "BCD94545ddc",
      hasCheckbox: true,
      hasActions: true,
    },
    {
      request_id: "Jefferson Co",
      timestamp: "2/1/2024",
      log_id: "SD83B02A849",
      client_ip: "12:24:54:679:0",
      user_id: "BCD94545ddc",
      hasCheckbox: true,
      hasActions: true,
    },
    {
      request_id: "Lanrey LLC",
      timestamp: "2/1/2024",
      log_id: "SD83B02A849",
      client_ip: "12:24:54:679:0",
      user_id: "BCD94545ddc",
      hasCheckbox: true,
      hasActions: true,
    },
    {
      request_id: "You Min",
      timestamp: "2/1/2024",
      log_id: "SD83B02A849",
      client_ip: "12:24:54:679:0",
      user_id: "BCD94545ddc",
      hasCheckbox: true,
      hasActions: true,
    },
    {
      request_id: "Midrand Ltd",
      timestamp: "2/1/2024",
      log_id: "SD83B02A849",
      client_ip: "12:24:54:679:0",
      user_id: "BCD94545ddc",
      hasCheckbox: true,
      hasActions: true,
    },
    {
      request_id: "Lanrey LLC",
      timestamp: "2/1/2024",
      log_id: "SD83B02A849",
      client_ip: "12:24:54:679:0",
      user_id: "BCD94545ddc",
      hasCheckbox: true,
      hasActions: true,
    },
    {
      request_id: "Thomas Inc",
      timestamp: "12/13/2024",
      log_id: "SD83B02A849",
      client_ip: "12:24:54:679:0",
      user_id: "BCD94545ddc",
      hasCheckbox: true,
      hasActions: true,
    },
    {
      request_id: "West ABA",
      timestamp: "1/10/2024",
      log_id: "SD83B02A849",
      client_ip: "12:24:54:679:0",
      user_id: "BCD94545ddc",
      hasCheckbox: true,
      hasActions: true,
    },
  ];

  // Define actions for the table
  const actions = [
    {
      label: "View Details",
      onClick: (row) => {
        console.log(`Viewing details for request: ${row.request_id}`);
      },
    },
    {
      label: "Delete Request",
      className: "remove",
      onClick: (row) => {
        console.log(`Deleting request: ${row.request_id}`);
      },
    },
  ];

  // Split the breadcrumb into parts
  const breadcrumbParts = breadcrumb.split(" / ");

  return (
    <div className="tenant-payment-page">
      <div className="tenant-header">
        <button className="back-button" onClick={onBack}>
        <FaArrowLeft/> Back
        </button>
        <div className="header-info">
          <h1>Tenants</h1>
          <p className="breadcrumb">
            {breadcrumbParts.map((part, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <span
                    className={
                      index === breadcrumbParts.length - 1
                        ? "breadcrumb-separator breadcrumb-separator-bold"
                        : "breadcrumb-separator"
                    }
                  >
                    {" / "}
                  </span>
                )}
                <span
                  className={
                    index === breadcrumbParts.length - 1
                      ? "breadcrumb-active"
                      : ""
                  }
                >
                  {part}
                </span>
              </React.Fragment>
            ))}
          </p>
        </div>
      </div>

      {/* Cards Section */}
      <div className="usage-statistics-cards">
        <div className="usage-card">
          <h3>Total Clients</h3>
          <p className="usage-value">320.4K</p>
        </div>
        <div className="usage-card">
          <h3>Total Active Sessions</h3>
          <p className="usage-value">9.2K</p>
          <button
            className="view-graph-button"
            onClick={() => {
              setShowActiveSessionsGraph(!showActiveSessionsGraph);
              setShowServerRequestsGraph(false); // Close other graph
            }}
          >
            View graph
          </button>
        </div>
        <div className="usage-card">
          <h3>Number of Server Requests</h3>
          <p className="usage-value">40.2K</p>
          <button
            className="view-graph-button"
            onClick={() => {
              setShowServerRequestsGraph(!showServerRequestsGraph);
              setShowActiveSessionsGraph(false); // Close other graph
            }}
          >
            View graph
          </button>
        </div>
      </div>

      {/* Graph Section */}
      <div className="usage-graph-section">
        <div className="graph-header">
          <div className="graph-title-headers">
            <h3>
              {showActiveSessionsGraph
                ? "Sessions over time"
                : showServerRequestsGraph
                ? "Server Requests over time"
                : "Sessions over time"}
            </h3>
            <SelectInput
              options={[
                { value: "per Client", label: "Per Client" },
                { value: "per Session", label: "Per Session" },
              ]}
            />

            <SelectInput
              options={[
                { value: "Per Period", label: "Per Period" },
                { value: "Daily", label: "Daily" },
                { value: "Weekly", label: "Weekly" },
                { value: "Monthly", label: "Monthly" },
              ]}
            />
          </div>

          <div className="graph-controls">
            <Button
              label="View data Table"
              variant="action"
              icon={<IoIosArrowForward size={20} />}
              iconPosition="right"
              width="150px"
            />
          </div>
        </div>
        <div className="graph-container">
          {showActiveSessionsGraph ? (
            <Chart
              options={activeSessionsData.options}
              series={activeSessionsData.series}
              type="area"
              height={200}
            />
          ) : showServerRequestsGraph ? (
            <Chart
              options={serverRequestsData.options}
              series={serverRequestsData.series}
              type="area"
              height={200}
            />
          ) : (
            <div className="sessions-over-time">
              <p className="sessions-change">
                <span className="change-value">45 Sessions</span>
                <span className="change-percentage">+25% from last period</span>
              </p>
              <Chart
                options={sessionsOverTimeData.options}
                series={sessionsOverTimeData.series}
                type="area"
                height={200}
              />
            </div>
          )}
        </div>

        
      </div>

      <h3 className="tenant-header-gen">SERVER REQUESTS</h3>
        <CustomTable
          data={tableData}
          columns={columns}
          actions={actions}
          filters={filters}
          onFilterChange={handleFilterChange}
          showActions={true}
          itemsPerPage={10}
          tableName="Server Requests"
        />
    </div>
  );
};

export default TenantListUsageStatistics;
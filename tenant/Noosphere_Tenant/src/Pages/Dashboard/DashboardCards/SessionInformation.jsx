import React from "react";
import Chart from "react-apexcharts";
import Button from "../../../Components/Button/Button";
import "../Dashboard.css";

const SessionInformation = ({ hasData }) => {
  const sessionsOverTimeData = {
    series: [
      {
        name: "Sessions",
        data: [25, 28, 30, 32, 35, 38, 40, 42, 45, 48, 50, 45],
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
            colors: "#6B7280",
          },
        },
      },
      yaxis: {
        labels: {
          show: false,
        },
      },
      colors: ["#3B82F6"],
      tooltip: {
        x: {
          format: "MMM",
        },
      },
    },
  };

  return (
    <>
      {hasData ? (
        <>
          <p className="text-lg font-semibold mb-4 text-gray-4B4E54">
            45 Sessions per period
          </p>
          <div className="flex gap-2">
            <p className="text-red-500 bg-white-2 rounded-12px px-4">-25% </p>
            <p className="text-gray-4B4E54 text-sm font-500">from last month</p>
          </div>

          <Chart
            options={sessionsOverTimeData.options}
            series={sessionsOverTimeData.series}
            type="area"
            height={200}
          />
        </>
      ) : (
        <>
          <p className="text-muted text-lg mb-4 text-left">No data to show</p>
          <p className="text-muted text-left mb-16">
            You have not scheduled any sessions. Data from all your sessions
            will be shown here
          </p>
          <Button
            label="Schedule a session"
            variant="primary"
            className="mx-auto block"
          />
        </>
      )}
    </>
  );
};

export default SessionInformation;

import React, { useState } from "react";
import "./App.css";
import ResourceUtilizationChart from "./Components/ResourceUtilizationUsage/ResourceUtilizationUsage";
import StackedBarChart from "./Components/BarChart/StackedBarChart";
import data from "./Data/resourceData";
import SystemSpeedChart from "./Components/SpeedChart/SpeedChart";
import speedChartData from "./Data/speedChartData";
import Gauge from "./Components/Guages/Gauge";
import { FaArrowRight, FaPlus, FaUpload } from "react-icons/fa";
import { format } from "date-fns";
import AllRoutes from "./Components/Allroutes";

const App = () => {
  // Function to format the time from a Date object (e.g., "1:30pm")
  const formatTime = (date) => {
    return format(date, "h:mma").toLowerCase(); // e.g., "1:30pm"
  };

  const [filterValues, setFilterValues] = useState({
    dateAdded: "Date Added",
  });

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    // Add filtering logic here if needed
  };

  // const data = [
  //   40, 50, 35, 60, 55, 70, 65, 80, 75, 85, 90, 95, 100, 85, 70, 60, 50, 45, 40,
  //   35, 30, 25, 20,
  // ];
  // const categories = [
  //   "Jan",
  //   "Feb",
  //   "Mar",
  //   "Apr",
  //   "May",
  //   "Jun",
  //   "Jul",
  //   "Aug",
  //   "Sep",
  //   "Oct",
  //   "Nov",
  //   "Dec",
  // ];

  return (
    <div>
      {/* <ResourceUtilizationChart data={data} />
      <StackedBarChart />
      <SystemSpeedChart periodDataMap={speedChartData} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "20px",
          padding: "30px",
        }}
      >
        <Gauge
          value={390}
          maxValue={1000}
          label="System Speed"
          color="#FFA500"
          isPercentage={false}
        />
        <Gauge
          value={390}
          maxValue={1000}
          label="Latency"
          color="#28A745"
          isPercentage={false}
        />
        <Gauge
          value={75}
          maxValue={100}
          label="Uptime"
          color="#28A745"
          isPercentage={true}
        />
        <Gauge
          value={390}
          maxValue={1000}
          label="API Response Time"
          color="#007BFF"
          isPercentage={false}
        />
      </div>

      
      

   


      <ErrorTypeChart />

      */}

      <AllRoutes />
    </div>
  );
};

export default App;

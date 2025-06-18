import React from "react";
import Layout from "../Layout/ControlLayout";
import "./Performance.css";
import Gauge from "../../Components/Guages/Gauge";
import SystemSpeedChart from "../../Components/SpeedChart/SpeedChart";
import speedChartData from "../../Data/speedChartData";
import StackedBarChart from "../../Components/BarChart/StackedBarChart";
import ErrorTypeChart from "../../Components/ErrorTypeChart/ErrorTypeChart";
import data from "../../Data/resourceData";
import ResourceUtilizationChart from "../../Components/ResourceUtilizationUsage/ResourceUtilizationUsage";
const MainPerformance = () => {
  return (
    <Layout>
      <div className="billing-board-header">
        <div className="billing-board-title">
          <h1>General Performance</h1>
          <p>Monitor system-wide performance</p>
        </div>
      </div>
      <div>
        <h2 className="performance-section-label">General Performance</h2>
      </div>
      <div className="general-performance-wrapper">
        <div className="general-performance-container">
          <div className="gauge-grid">
            <Gauge
              value={390}
              maxValue={1000}
              label="System Speed"
              color="#F79009"
              isPercentage={false}
            />
            <Gauge
              value={390}
              maxValue={1000}
              label="Latency"
              color="#12B76A"
              isPercentage={false}
            />
            <Gauge
              value={75}
              maxValue={100}
              label="Uptime"
              color="#12B76A"
              isPercentage={true}
            />
            <Gauge
              value={390}
              maxValue={1000}
              label="API Response Time"
              color="#004ABA"
              isPercentage={false}
            />
          </div>
          <div className="system-charts-one">
            <SystemSpeedChart periodDataMap={speedChartData} title="Uptime" />
            <SystemSpeedChart periodDataMap={speedChartData} title="Latency" />
          </div>
        </div>
        <div className="system-charts">
          <SystemSpeedChart
            periodDataMap={speedChartData}
            title="System Speed"
          />
          <SystemSpeedChart
            periodDataMap={speedChartData}
            title="API Response Time"
          />
        </div>
        <div className="stacked-bar-chart">
          <StackedBarChart />
        </div>
      </div>
      <div>
        <h2 className="performance-section-label">Resource Utilization</h2>
      </div>
      <div className="gauge-grid-two">
        <Gauge
          value={78}
          maxValue={100}
          label="CPU Usage"
          color="#DC6803"
          isPercentage={true}
        />
        <Gauge
          value={65}
          maxValue={100}
          label="Memory Usage"
          color="#F79009"
          isPercentage={true}
        />
        <Gauge
          value={95}
          maxValue={100}
          label="Storage Usage"
          color="#D92D20"
          isPercentage={true}
        />
      </div>
      <div className="resource-utilization-chart-wrapper">
        <ResourceUtilizationChart data={data} />
      </div>
      {/* <div>
        <h2 className="performance-section-label">Data Management</h2>
      </div>
      <div>
        <div class="metrics-container">
          <div class="metric-card">
            <h1 class="metric-label">Data Retrieval Speed</h1>
            <h2 class="metric-value">20 ms</h2>
          </div>
          <div class="metric-card">
            <h1 class="metric-label">Data Storage Utilization</h1>
            <h2 class="metric-value">
              12/15 <span className="metric-value-span">TB</span>
            </h2>
          </div>
        </div>
      </div>
      <div>
        <h2 className="performance-section-label">Issues & Errors</h2>
      </div>
      <div>
        <div className="system-charts-one">
          <SystemSpeedChart
            periodDataMap={speedChartData}
            title="Error Resolution time"
          />

          <ErrorTypeChart />

          <SystemSpeedChart
            periodDataMap={speedChartData}
            title="Error Frequency"
          />
      
          <StackedBarChart />
       
        </div>
      </div> */}
    </Layout>
  );
};

export default MainPerformance;

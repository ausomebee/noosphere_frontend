import { useState } from "react";
import "./OverviewCard.css";

const OverviewCard = ({ data, onPeriodChange, selectedPeriod }) => {
  const isEmpty = !data || !data.chartData || data.chartData.length === 0;
  const [hoveredBar, setHoveredBar] = useState(null);

  const handlePeriodChange = (e) => {
    if (onPeriodChange) {
      onPeriodChange(e.target.value);
    }
  };

  return (
    <div className="overview-card">
      <div className="overview-header">
        <h2 className="overview-title">Overview</h2>
        <p className="overview-subtitle">Your sessions at a glance</p>
      </div>

      {/* Stats Row */}
      <div className={`overview-stats ${isEmpty ? "empty" : ""}`}>
        {isEmpty ? (
          <div className="stats-empty">No data</div>
        ) : (
          <>
            <div className="stat-item">
              <span className="stat-value">
                {data.completedSessions?.toLocaleString() || 0}
              </span>
              <span className="stat-label">Completed sessions</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value">{data.avgSessionDuration || "00:00hrs"}</span>
              <span className="stat-label">Avg Session Duration</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value">{data.upcomingSessions || 0}</span>
              <span className="stat-label">Upcoming Session</span>
            </div>
          </>
        )}
      </div>

      {/* Period Selector */}
      <div className="overview-period">
        <span className="period-label">Sessions per:</span>
        <select 
          className="period-select"
          value={selectedPeriod || "month"}
          onChange={handlePeriodChange}
        >
          <option value="month">Month</option>
          <option value="week">Week</option>
        </select>
      </div>

      {/* Chart */}
      <div className="overview-chart">
        <div className="chart-y-axis">
          <span>24</span>
          <span>12</span>
          <span>0</span>
        </div>
        <div className="chart-container">
          <div className="chart-grid-lines">
            <div className="grid-line" />
            <div className="grid-line" />
          </div>
          <div className="chart-bars">
            {isEmpty
              ? ["Jan", "Feb", "Mar", "Apr", "May"].map((month) => (
                  <div key={month} className="bar-group">
                    <div className="bar-wrapper">
                      <div className="bar empty" style={{ height: "0%" }} />
                    </div>
                    <span className="bar-label">{month}</span>
                  </div>
                ))
              : data.chartData.map((item, index) => (
                  <div
                    key={index}
                    className="bar-group"
                    onMouseEnter={() => setHoveredBar(index)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    <div className="bar-wrapper">
                      {hoveredBar === index && (
                        <div className="bar-tooltip">
                          <span className="bar-tooltip-value">{item.value}</span>
                          <span className="bar-tooltip-label">sessions</span>
                        </div>
                      )}
                      <div
                        className="bar"
                        style={{ height: `${(item.value / 24) * 100}%` }}
                      />
                    </div>
                    <span className="bar-label">{item.month}</span>
                  </div>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewCard;
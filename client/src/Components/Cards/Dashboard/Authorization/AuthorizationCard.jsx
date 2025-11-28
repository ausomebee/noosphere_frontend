import React from "react";
import { IoChevronDown, IoTimeOutline } from "react-icons/io5";
import "./AuthorizationCard.css";
import { SelectInput } from "../../../Input/Inputs";

const AuthorizationCard = ({ data }) => {
  const isEmpty = !data;

  const totalAuthorized = isEmpty ? 0 : data.totalAuthorized;
  const totalCompleted = isEmpty ? 0 : data.totalCompleted;
  const totalRemaining = isEmpty ? 0 : data.totalRemaining;

  // Calculate percentage for the arc (completed / authorized)
  const percentage = isEmpty ? 0 : (totalCompleted / totalAuthorized) * 100;

  // SVG arc calculation
  const radius = 80;
  const strokeWidth = 12;
  const circumference = Math.PI * radius; // Half circle
  const filledLength = (percentage / 100) * circumference;

  return (
    <div className="authorization-card">
      <div className="authorization-header">
        <h2 className="authorization-title">Authorization</h2>
        <p className="authorization-subtitle">Overview of authorization usage</p>
      </div>

      {/* Service Type Dropdown */}
  
       <SelectInput
                options={[
                  { value: "month", label: "Month" },
                  { value: "week", label: "Week" },
                ]}
                placeholder="Select Service Type"
                className="period-select"
              
              />

      {/* Gauge Chart */}
      <div className="gauge-container">
        <svg viewBox="0 0 200 120" className="gauge-svg">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Filled arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#1a56db"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${filledLength} ${circumference}`}
            className="gauge-fill"
          />
        </svg>

        {/* Center Content */}
        <div className="gauge-center">
          <IoTimeOutline size={28} className="gauge-icon" />
          <span className={`gauge-value ${isEmpty ? "empty" : ""}`}>
            {isEmpty ? "No data" : totalAuthorized}
          </span>
          <span className="gauge-label">
            {isEmpty ? "Total Authorized Sessions" : "Total Authorized Units"}
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="authorization-stats">
        <div className="auth-stat">
          <div className="stat-dot blue" />
          <div className="stat-content">
            <span className="stat-number">{totalCompleted}</span>
            <span className="stat-text">Total Completed</span>
          </div>
        </div>
        <div className="auth-stat-divider" />
        <div className="auth-stat">
          <div className="stat-dot light-blue" />
          <div className="stat-content">
            <span className="stat-number">{totalRemaining}</span>
            <span className="stat-text">{isEmpty ? "Total Authorized" : "Total Remaining"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthorizationCard;
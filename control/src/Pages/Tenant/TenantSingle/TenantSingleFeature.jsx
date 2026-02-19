import React, { useState } from 'react';

import "./TenantSingle.css";
import Button from "../../../Components/Button/Button";
import { FiArrowUpRight } from "react-icons/fi";
import { CheckboxInput, SwitchInput } from "../../../Components/Input/Inputs";
import TenantListUsageStatistics from '../TenantList/TenantListUsageStatistics';

const TenantSingleFeature = () => {
  // State for table data (features, active state, and checkbox selection)
  const [features, setFeatures] = useState([
    { name: "Appointment & Scheduling", active: false, checked: false },
    { name: "Client Management", active: true, checked: false },
    { name: "Staff Management", active: true, checked: false },
    { name: "Basic Reporting", active: true, checked: false },
    { name: "Billing & Invoicing", active: true, checked: false },
  ]);

  // State for select all checkbox
  const [selectAll, setSelectAll] = useState(false);

  // State for viewing usage statistics
  const [viewUsageStatisticsId, setViewUsageStatisticsId] = useState(null);

  // Handle toggle for individual feature's active state
  const handleToggleActive = (index) => {
    setFeatures((prevFeatures) =>
      prevFeatures.map((feature, i) =>
        i === index ? { ...feature, active: !feature.active } : feature
      )
    );
  };

  // Handle individual checkbox change
  const handleCheckboxChange = (index) => {
    setFeatures((prevFeatures) =>
      prevFeatures.map((feature, i) =>
        i === index ? { ...feature, checked: !feature.checked } : feature
      )
    );
  };

  // Handle select all checkbox change
  const handleSelectAllChange = () => {
    setSelectAll(!selectAll);
    setFeatures((prevFeatures) =>
      prevFeatures.map((feature) => ({ ...feature, checked: !selectAll }))
    );
  };

  return (
    <div className="tenant-list-container">
        {viewUsageStatisticsId ? (
          <TenantListUsageStatistics
            paymentId={viewUsageStatisticsId}
            onBack={() => setViewUsageStatisticsId(null)}
          />
        ) : (
          <>
            {/* Plan Info Section */}
            <h3 className="tenant-header-gen">Plan Info</h3>
            <div className="plan-info">
              <div className="plan-details">
                {/* Left: Plan type */}
                <div className="plan-item">
                  <p>
                    <span className="plan-badge">Enterprise</span>
                    Plan
                  </p>
                  <Button
                    label="Change plan"
                    iconPosition="right"
                    icon={<FiArrowUpRight size={20} />}
                    width="200px"
                  />
                </div>

                {/* Middle: Usage */}
                <div className="plan-item">
                  <label>Usage</label>
                  <p>Client seats</p>
                  <div className="usage-bar">
                    <div className="usage-filled" style={{ width: "60%" }}></div>
                  </div>
                  <p>12 out of 20 used</p>
                </div>
              </div>
            </div>

            {/* Features Table Section */}
            <h3 className="tenant-header-gen">Features</h3>
            <div className="features-table-container">
              <table className="features-table">
                <thead>
                  <tr>
                    <th>
                      <CheckboxInput
                        checked={selectAll}
                        onChange={handleSelectAllChange}
                      />
                    </th>
                    <th>Feature</th>
                    <th>Active</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature, index) => (
                    <tr key={index}>
                      <td>
                        <CheckboxInput
                          checked={feature.checked}
                          onChange={() => handleCheckboxChange(index)}
                        />
                      </td>
                      <td>{feature.name}</td>
                      <td>
                        <div className="active-cell">
                          <SwitchInput
                            checked={feature.active}
                            onChange={() => handleToggleActive(index)}
                          />
                          <span className="active-label">
                            {feature.active ? "Yes" : "No"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <Button
                          label="View usage statistics"
                          variant="outline"
                          width="200px"
                          onClick={() => setViewUsageStatisticsId(feature.name)} // Use feature name as ID
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
  );
};

export default TenantSingleFeature;
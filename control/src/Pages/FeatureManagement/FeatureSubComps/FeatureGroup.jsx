import React from "react";
import FeatureRow from "./FeatureRow";
import "../FeatureManagement.css";

const FeatureGroup = ({ title, features, onViewStatistics }) => {
  return (
    <div className="feature-group">
      <h2 className="feature-group-title">{title}</h2>
      <div className="feature-table-wrapper">
        <table className="feature-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Date Added</th>
              <th>Managed By</th>
              <th>Active</th>
              <th>Plans Active</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => (
              <FeatureRow
                key={feature.id}
                feature={feature}
                groupTitle={title}
                onViewStatistics={onViewStatistics}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FeatureGroup;
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import FeatureRow from "./FeatureRow";
import { CheckboxInput } from "../../../Components/Input/Inputs";
import { toggleSelectAllFeatures } from "../../../ReduxStore/features/featureManagementSlice";
import "../FeatureManagement.css";

const FeatureGroup = ({ title, features, onViewStatistics }) => {
  const dispatch = useDispatch();
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = () => {
    dispatch(toggleSelectAllFeatures({ groupTitle: title, select: !selectAll }));
    setSelectAll(!selectAll);
  };

  return (
    <div className="feature-group">
      <h2 className="feature-group-title">{title}</h2>
      <div className="feature-table-wrapper">
        <table className="feature-table">
          <thead>
            <tr>
              <th>
                <CheckboxInput
                  checked={selectAll}
                  onChange={handleSelectAll}
                />
              </th>
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
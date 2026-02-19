import React, { useEffect, useRef, useState } from "react";
import { SwitchInput } from "../../Components/Input/Inputs";
import { FiMoreVertical } from "react-icons/fi";

const Table = ({ plans, onDuplicate, onStatusChange, onEdit, onDelete, onViewProfile }) => {
  const [openDropdowns, setOpenDropdowns] = useState({});
  const dropdownRefs = useRef([]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      dropdownRefs.current.forEach((ref, index) => {
        if (ref && !ref.contains(event.target) && openDropdowns[index]) {
          setOpenDropdowns((prev) => ({ ...prev, [index]: false }));
        }
      });
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdowns]);

  const toggleDropdown = (index) => {
    setOpenDropdowns((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleViewPlanDetails = (plan) => {
    // You can implement this functionality later
  };

  const handleViewOrganizationProfile = (plan) => {
    // Close the dropdown first
    setOpenDropdowns({});
    // Call the navigation function
    onViewProfile(plan);
  };

  const handleEditPlan = (plan) => {
    setOpenDropdowns({});
    onEdit(plan, "enterprise");
  };

  const handleDeletePlan = (plan) => {
    setOpenDropdowns({});
    onDelete(plan, "enterprise");
  };

  return (
    <div className="billing-table-container">
      <table className="billing-table">
        <thead>
          <tr>
            <th>Organization</th>
            <th>Date Added</th>
            <th>Account Manager</th>
            <th>Active</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan, index) => (
            <tr key={plan.id}>
              <td>{plan.tenantName}</td>
              <td>{plan.dateAdded}</td>
              <td>{plan.accountManagerName}</td>
              <td>
                <SwitchInput
                  checked={plan.status === "active"}
                  onChange={() => onStatusChange(plan, plan.status === "active" ? "deactivate" : "activate", "enterprise")}
                  aria-label={`Toggle active status for ${plan.organization}`}
                  label={plan.status === "active" ? "Yes" : "No"}
                />
              </td>
              <td className="action-cell">
                <div className="dropdown-container" ref={(el) => (dropdownRefs.current[index] = el)}>
                  <button className="feature-action-icon" onClick={() => toggleDropdown(index)}>
                    <FiMoreVertical />
                  </button>
                  {openDropdowns[index] && (
                    <div className="dropdown-menu dropdown-menu-row">
                      <div className="dropdown-items">
                        
                        <button className="dropdown-item" onClick={() => handleViewOrganizationProfile(plan)}>
                          View Organization Profile
                        </button>
                        <button className="dropdown-item" onClick={() => handleEditPlan(plan)}>
                          Edit Plan
                        </button>
                        <button className="dropdown-item dropdown-item-danger" onClick={() => handleDeletePlan(plan)}>
                          Remove plan
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
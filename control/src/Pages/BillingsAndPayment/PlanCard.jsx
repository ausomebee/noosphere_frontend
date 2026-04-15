import React, { useState, useRef, useEffect } from "react";
import { HiOutlineCog6Tooth } from "react-icons/hi2";
import { RxDragHandleDots2 } from "react-icons/rx";
import "./BillingAndPayments.css";
import { useNavigate } from "react-router-dom";

const PlanCard = ({ plan, onDuplicate, onStatusChange, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const cogButtonRef = useRef(null);


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        cogButtonRef.current &&
        !cogButtonRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

const getHeaderClass = () => "plan-header";

  const getTitleClass = () => {
    return plan.status === "inactive" ? "plan-title inactive" : "plan-title";
  };

  const getStatusBadge = () => {
    if (plan.status === "active") {
      return <span className="status-badge active"> Active</span>;
    } else if (plan.status === "inactive") {
      return <span className="inactiveHeader"> Inactive</span>;
    }
    return null;
  };

  const getTextColor = (bgColor) => {
  // Simple luminance calculation for contrast
  const hex = bgColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000" : "#fff"; // Dark text for light backgrounds, white for dark
};

  const handleDropdownToggle = (e) => {
    e.stopPropagation();
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleMenuClick = (action, e) => {
    e.stopPropagation();
    setIsDropdownOpen(false);
    switch (action) {
      case "duplicate":
        onDuplicate();
        break;
      case "activate":
      case "deactivate":
        onStatusChange(action);
        break;
      case "edit":
        onEdit();
        break;
      case "delete":
        onDelete();
        break;
      case "view":
        navigate(`/plans/subscribers/${plan.id}`);
        break;
      default:
        break;
    }
  };

  // Apply colourCode as inline style for the header
  const headerStyle = {
    backgroundColor: plan.colourCode || "#ffffff", // Fallback to white if colourCode is missing
    color: plan.status === "inactive" ? "#999" : getTextColor(plan.colourCode || "#ffffff"), // Ensure readable text
  };

  return (
    <div
      className={`plan-card ${plan.status === "inactive" ? "inactive" : ""}`}
    >
      <div className={getHeaderClass()} style={headerStyle}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div className="plan-header-left">
            <h3 className={getTitleClass()}>{plan.name}</h3>
          </div>
          {getStatusBadge()}
          <div className="subscriber-count">
            {plan.subscriberCount || 0} Subscribers
          </div>
        </div>
        <div className="plan-header-right">
          <button
            ref={cogButtonRef}
            className="cog-button"
            onClick={handleDropdownToggle}
            aria-label="Plan options"
            aria-expanded={isDropdownOpen}
          >
            <HiOutlineCog6Tooth className="gear-icon" size={30} />
          </button>
        </div>
      </div>
      {isDropdownOpen && (
        <div className="dropdown-menu" ref={dropdownRef}>
          <div className="dropdown-items">
            {plan.status === "inactive" ? (
              <button
                className="dropdown-item"
                onClick={(e) => handleMenuClick("activate", e)}
              >
                Activate Plan
              </button>
            ) : (
              <>
                <button
                  className="dropdown-item"
                  onClick={(e) => handleMenuClick("view", e)}
                >
                  View subscriber list
                </button>
                <button
                  className="dropdown-item"
                  onClick={(e) => handleMenuClick("deactivate", e)}
                >
                  Deactivate Plan
                </button>
              </>
            )}
            <button
              className="dropdown-item"
              onClick={(e) => handleMenuClick("duplicate", e)}
            >
              Duplicate Plan
            </button>
            <button
              className="dropdown-item"
              onClick={(e) => handleMenuClick("edit", e)}
            >
              Edit Plan
            </button>
            <button
              className="dropdown-item dropdown-item-danger"
              onClick={(e) => handleMenuClick("delete", e)}
            >
              Delete Plan
            </button>
          </div>
        </div>
      )}

      <div className="pricing-container">
        <div className="pricing">
          <h3>Pricing</h3>
          <p>{plan.pricing.cost}</p>
          <p>{plan.pricing.storage}</p>
          <p>{plan.pricing.extra}</p>
        </div>
      </div>
      <div className="plan-features">
        <h4>PLAN FEATURES</h4>
        <ul>
          {Array.isArray(plan.features) && plan.features.length > 0 ? (
            plan.features.map((feature, index) => (
              <li key={index}>
                <RxDragHandleDots2 className="feature-icon" />
                <span className="feature-text">{feature}</span>
              </li>
            ))
          ) : (
            <li>No features available</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default PlanCard;
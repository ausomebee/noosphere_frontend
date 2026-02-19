import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowUpRight, FiEdit3 } from "react-icons/fi";


import "./TenantSingle.css";
import Button from "../../../Components/Button/Button";
import { FaArrowLeft } from "react-icons/fa";

const TenantSingleAccOverview = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate(); 
  return (
    <div className="tenant-list-container">
        <div className="tenant-header">
          <div onClick={() => navigate(-1)} className="back-link">
            <FaArrowLeft /> Back
          </div>
          <div className="tenant-title-container">
            <h1 className="tenant-title">Tenant</h1>
            <h2 className="tenant-title-breadcrumbs">
              Tenants /{" "}
              <span className="tenant-title-breadcrumbs-org">ACME Corp</span>
            </h2>
          </div>
        </div>
        <div className="account-officer">
          <div className="officer-avatar">OR</div>
          <div className="officer-info">
            <span className="officer-name">Olivia Rhye</span>
            <span className="officer-role">Account Officer</span>
          </div>
          <button className="change-button">Change</button>
        </div>

        <h3 className="tenant-header-gen">General Information</h3>
        <div className="tenant-info">
          <div className="tenant-org-header">
            <h4 className="tenant-org-name">ACME Org</h4>
            <button className="edit-button">
              <FiEdit3 size={14} style={{ marginRight: "5px" }} />
              Edit
            </button>
          </div>
          <div className="info-grid">
            <div className="info-item">
              <label>Contact Person</label>
              <p>Phillip Moore</p>
            </div>
            <div className="info-item">
              <label>Email</label>
              <p>email@gmail.com</p>
            </div>
            <div className="info-item">
              <label>Phone</label>
              <p>+44 20 7946 0958</p>
            </div>
            <div className="info-item">
              <label>Org Type</label>
              <p>Hospital & Health Services</p>
            </div>
            <div className="info-item">
              <label>Company Size</label>
              <p>21 - 50 employees</p>
            </div>
            <div className="info-item">
              <label>Street Address</label>
              <p>24, Allison Street</p>
            </div>
            <div className="info-item">
              <label>City</label>
              <p>Dallas</p>
            </div>
            <div className="info-item">
              <label>State/Province</label>
              <p>Texas</p>
            </div>
            <div className="info-item">
              <label>Zip</label>
              <p>655849</p>
            </div>
            <div className="info-item">
              <label>Country</label>
              <p>US</p>
            </div>
          </div>
        </div>

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
                width="auto"
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

            {/* Right: Next Payment */}
            <div className="plan-item next-payment-box">
              <label>Next Payment</label>
              <p style={{ fontWeight: 600, color: "#004aba" }}>Nov 20, 2025</p>
              <Button
                label="View invoice"
                icon={<FiArrowUpRight size={20} />}
                iconPosition="right"
                variant="outline"
                width="auto"
              />
            </div>
          </div>
        </div>
      </div>
  );
};

export default TenantSingleAccOverview;

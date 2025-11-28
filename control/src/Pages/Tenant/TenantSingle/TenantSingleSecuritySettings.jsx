import React, { useState } from "react";
import Layout from "../../Layout/ControlLayout";
import "./TenantSingle.css";
import { Link } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { IoIosArrowForward } from "react-icons/io";
import {
  PasswordInput,
  RadioInput,
  TextInput,
} from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import { FiArrowUpRight } from "react-icons/fi";
import { FiCopy } from "react-icons/fi"; // For the copy icon

const TenantSingleSecuritySettings = () => {
  const [formData, setFormData] = useState({
    adminEmail: "admin@tenant.noosphereclient-org.com",
    tenantAdminMobile: "(214) 774-3749",
    tenantPortalUrl: "https://tenant.noosphereclient-org.com",
    defaultPassword: "********",
    billingFrequency: "Yearly",
  });

  // State to manage editability of each input
  const [isEditable, setIsEditable] = useState({
    adminEmail: false,
    tenantAdminMobile: false,
    defaultPassword: false,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRadioChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      billingFrequency: e.target.value,
    }));
  };

  const toggleEditability = (field) => {
    setIsEditable((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleChangeAdminEmail = () => {
    toggleEditability("adminEmail");
    console.log("Change Admin Email:", formData.adminEmail);
  };

  const handleChangeTenantAdminMobile = () => {
    toggleEditability("tenantAdminMobile");
    console.log("Change Tenant Admin Mobile:", formData.tenantAdminMobile);
  };

  const handleChangeDefaultPassword = () => {
    toggleEditability("defaultPassword");
    console.log("Change Default Password:", formData.defaultPassword);
  };

  const handleCopyTenantPortalUrl = () => {
    navigator.clipboard.writeText(formData.tenantPortalUrl);
    alert("URL copied to clipboard!");
  };

  const handleResetPassword = () => {
    console.log("Reset Password clicked");
  };

  const handleManageSessions = () => {
    console.log("Manage Sessions clicked");
  };

  const handleDeactivateAccount = () => {
    console.log("Deactivate Account clicked");
  };

  return (
    <Layout>
      <div className="tenant-header">
        <Link to="/tenants/tenant-list" className="back-link">
          <FaArrowLeft /> Back
        </Link>
        <div className="tenant-title-container">
          <h1 className="tenant-title">Tenants</h1>
          <h2 className="tenant-title-breadcrumbs">
            Tenants /{" "}
            <span className="tenant-title-breadcrumbs-org">ACME Corp</span>
          </h2>
        </div>
      </div>

      <div className="tenant-settings-container">
        {/* General Settings Section */}
        <div className="tenant-settings-section">
          <h2 className="tenant-settings-section-title">General Settings</h2>

          <div className="tenant-settings-row">
            <div>
              <label className="tenant-settings-label">
                Tenant Admin Email
              </label>
              <div className="tenant-settings-input-group">
                <TextInput
                  type="email"
                  name="adminEmail"
                  value={formData.adminEmail}
                  onChange={handleInputChange}
                  className="settings-input"
                  readOnly={!isEditable.adminEmail}
                />
              </div>
            </div>
            <Button
              onClick={handleChangeAdminEmail}
              variant="action"
              label={isEditable.adminEmail ? "Save" : "Change"}
              width="100px"
            />
          </div>

          <div className="tenant-settings-row">
            <div>
              <label className="tenant-settings-label">
                Tenant Admin Mobile
              </label>
              <div className="tenant-settings-input-group">
                <TextInput
                  type="text"
                  name="tenantAdminMobile"
                  value={formData.tenantAdminMobile}
                  onChange={handleInputChange}
                  className="settings-input"
                  readOnly={!isEditable.tenantAdminMobile}
                />
              </div>
            </div>
            <Button
              onClick={handleChangeTenantAdminMobile}
              className="settings-change-button"
              label={isEditable.tenantAdminMobile ? "Save" : "Change"}
              variant="action"
              width="100px"
            />
          </div>

          <div className="tenant-settings-row">
            <div>
              <label className="tenant-settings-label">Tenant Portal URL</label>
              <div className="tenant-settings-input-group tenant-portal-url-group">
                <span className="tenant-portal-url-text">
                  {formData.tenantPortalUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyTenantPortalUrl}
                  className="tenant-copy-button"
                  title="Copy URL"
                >
                  <FiCopy />
                </button>
              </div>
            </div>
          </div>

          <div className="tenant-settings-row">
            <div>
              <label className="tenant-settings-label">Default Password</label>
              <div className="tenant-settings-input-group">
                <PasswordInput
                  type="password"
                  name="defaultPassword"
                  value={formData.defaultPassword}
                  onChange={handleInputChange}
                  className="settings-input"
                  readOnly={!isEditable.defaultPassword}
                />
              </div>
            </div>
            <Button
              onClick={handleChangeDefaultPassword}
              className="settings-change-button"
              label={isEditable.defaultPassword ? "Save" : "Change"}
              variant="action"
              width="100px"
            />
          </div>

          <div className="tenant-settings-row">
            <div>
              <label className="tenant-settings-label">Billing Frequency</label>
              <div className="tenant-settings-radio-group">
                <label className="tenant-settings-radio-label">
                  <RadioInput
                    name="billingFrequency"
                    value="Yearly"
                    checked={formData.billingFrequency === "Yearly"}
                    onChange={handleRadioChange}
                  />
                  Yearly
                </label>
                <label className="tenant-settings-radio-label">
                  <RadioInput
                    name="billingFrequency"
                    value="Monthly"
                    checked={formData.billingFrequency === "Monthly"}
                    onChange={handleRadioChange}
                  />
                  Monthly
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Security Settings Section */}
        <div className="tenant-settings-section">
          <h2 className="tenant-settings-section-title">
            Admin Security Settings
          </h2>

          <div className="tenant-settings-row">
            <div className="tenant-settings-action-group">
              <Button
                onClick={handleResetPassword}
                label="Reset Password"
                variant="important"
                width="100%"
              />
            </div>
          </div>

          <div className="tenant-settings-row">
            <div className="tenant-settings-action-group">
              <Button
                onClick={handleManageSessions}
                label="Manage Sessions"
                variant="important"
                width="100%"
              />
            </div>
          </div>

          <div className="tenant-settings-row">
            <div className="tenant-settings-action-group">
              <Button
                onClick={handleDeactivateAccount}
                label="Restrict Account"
                variant="important"
                width="100%"
              />
            </div>
          </div>
        </div>

        <Button
          label="Deactivate Account"
          onClick={handleDeactivateAccount}
          variant="danger"
          width="auto"
        />
      </div>
    </Layout>
  );
};

export default TenantSingleSecuritySettings;

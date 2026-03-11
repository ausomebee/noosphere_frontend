import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { FiCopy } from "react-icons/fi";
import "./TenantSingle.css";
import {
  PasswordInput,
  RadioInput,
  TextInput,
  SelectInput,
  TextareaInput,
} from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";
import useAuth from "../../../hooks/useAuth";
import tenantApi from "../../../api/TenantApis";
import { showToast } from "../../../Helper/ShowToast";
import { SectionSpinner } from "../../../Components/LoadingSpinner";

const deactivationReasons = [
  { value: "", label: "Select an option" },
  { value: "Violation of Terms of Service", label: "Violation of Terms of Service" },
  { value: "Security Risks", label: "Security Risks" },
  { value: "Fraudulent Activity", label: "Fraudulent Activity" },
  { value: "Non-Payment or Billing Failure", label: "Non-Payment or Billing Failure" },
  { value: "Regulatory or Legal Requirement", label: "Regulatory or Legal Requirement" },
  { value: "User-Initiated Request", label: "User-Initiated Request" },
  { value: "Inappropriate or Abusive Behavior", label: "Inappropriate or Abusive Behavior" },
  { value: "Platform Misuse or Abuse", label: "Platform Misuse or Abuse" },
  { value: "Data Privacy Violations", label: "Data Privacy Violations" },
  { value: "Repeated Policy Violations Despite Warnings", label: "Repeated Policy Violations Despite Warnings" },
];

const TenantSingleSecuritySettings = () => {
  const { tenantId } = useParams();
  const { userId, accessToken, refreshToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);

  // Editable fields
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [billingFrequency, setBillingFrequency] = useState("Yearly");

  // Edit mode toggles
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);

  // Saving states
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Deactivation modal state
  const [deactivateModal, setDeactivateModal] = useState(false);
  const [deactivateStep, setDeactivateStep] = useState(1);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [deactivateDetails, setDeactivateDetails] = useState("");
  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [isDeactivating, setIsDeactivating] = useState(false);

  const fetchTenant = useCallback(async () => {
    try {
      setLoading(true);
      const res = await tenantApi.GetSingleTenant({ tenantId, accessToken, refreshToken });
      const data = res.data || res;
      setTenant(data);
      setEmail(data.email || "");
      setPhoneNumber(data.phoneNumber || "");
    } catch (err) {
      showToast(err.message || "Failed to load tenant", "error");
    } finally {
      setLoading(false);
    }
  }, [tenantId, accessToken, refreshToken]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  const tenantName = tenant?.companyName || tenant?.contactPerson || "Tenant";
  const portalUrl = tenant?.subdomain ? `${tenant.subdomain}.noospherehub.net` : "—";

  // --- Change Email ---
  const handleEmailToggle = async () => {
    if (!editingEmail) {
      setEditingEmail(true);
      return;
    }
    if (!email) {
      showToast("Email is required", "error");
      return;
    }
    try {
      setSavingEmail(true);
      await tenantApi.ChangeTenantEmail({ tenantId, email, accessToken, refreshToken });
      showToast("Email updated successfully", "success");
      setEditingEmail(false);
      fetchTenant();
    } catch (err) {
      showToast(err.message || "Failed to update email", "error");
    } finally {
      setSavingEmail(false);
    }
  };

  // --- Change Phone ---
  const handlePhoneToggle = async () => {
    if (!editingPhone) {
      setEditingPhone(true);
      return;
    }
    if (!phoneNumber) {
      showToast("Phone number is required", "error");
      return;
    }
    try {
      setSavingPhone(true);
      await tenantApi.ChangeTenantPhoneNumber({ tenantId, phoneNumber, accessToken, refreshToken });
      showToast("Phone number updated successfully", "success");
      setEditingPhone(false);
      fetchTenant();
    } catch (err) {
      showToast(err.message || "Failed to update phone number", "error");
    } finally {
      setSavingPhone(false);
    }
  };

  // --- Reset Password ---
  const handleResetPassword = async () => {
    try {
      setSavingPassword(true);
      await tenantApi.ChangeAdminPassword({ tenantId, accessToken, refreshToken });
      showToast("Password reset successfully", "success");
    } catch (err) {
      showToast(err.message || "Failed to reset password", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  // --- Copy URL ---
  const handleCopyUrl = () => {
    if (portalUrl !== "—") {
      navigator.clipboard.writeText(`https://${portalUrl}`);
      showToast("URL copied to clipboard", "success");
    }
  };

  // --- Deactivation Modal ---
  const handleCloseDeactivate = () => {
    setDeactivateModal(false);
    setDeactivateStep(1);
    setDeactivateReason("");
    setDeactivateDetails("");
    setDeactivatePassword("");
  };

  const handleDeactivateNext = async () => {
    if (deactivateStep === 1) {
      if (!deactivateReason) {
        showToast("Please select a deactivation reason", "error");
        return;
      }
      setDeactivateStep(2);
    } else if (deactivateStep === 2) {
      setDeactivateStep(3);
    } else if (deactivateStep === 3) {
      if (!deactivatePassword) {
        showToast("Please enter your password", "error");
        return;
      }
      try {
        setIsDeactivating(true);
        await tenantApi.DeactivateTenant({
          id: tenantId,
          active: false,
          deactivatedById: userId,
          password: deactivatePassword,
          reason: deactivateReason,
          details: deactivateDetails,
          accessToken,
          refreshToken,
        });
        showToast("Tenant deactivated successfully", "success");
        handleCloseDeactivate();
        fetchTenant();
      } catch (err) {
        showToast(err.message || "Failed to deactivate tenant", "error");
      } finally {
        setIsDeactivating(false);
      }
    }
  };

  const getModalTitle = () => {
    if (deactivateStep === 1) return "Deactivate tenant account";
    if (deactivateStep === 2) return "Are you sure?";
    return "Enter password";
  };

  const getPrimaryButtonText = () => {
    if (deactivateStep === 1) return "Deactivate account";
    if (deactivateStep === 2) return "I am sure";
    return "Deactivate account";
  };

  const renderDeactivateBody = () => {
    if (deactivateStep === 1) {
      return (
        <div>
          <SelectInput
            label="Deactivation reason"
            options={deactivationReasons}
            value={deactivateReason}
            onChange={(e) => setDeactivateReason(e.target.value)}
          />
          <TextareaInput
            label="Provide details"
            placeholder="Type something..."
            value={deactivateDetails}
            onChange={(e) => setDeactivateDetails(e.target.value)}
          />
        </div>
      );
    }
    if (deactivateStep === 2) {
      return (
        <div className="deactivate-confirmation">
          <p>
            Deactivating this tenant will <strong>permanently revoke</strong> their
            access to the NooSphere platform. To regain access in the future, the
            tenant will need to create a new account.
          </p>
          <p className="deactivate-warning">This action cannot be undone.</p>
        </div>
      );
    }
    return (
      <div>
        <p className="deactivate-password-prompt">
          Please provide your account password to continue
        </p>
        <PasswordInput
          label=""
          placeholder="Enter password"
          value={deactivatePassword}
          onChange={(e) => setDeactivatePassword(e.target.value)}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="tenant-list-container">
        <SectionSpinner />
      </div>
    );
  }

  return (
    <>
      <div className="tenant-header">
        <Link to="/tenants/tenant-list" className="back-link">
          <FaArrowLeft /> Back
        </Link>
        <div className="tenant-title-container">
          <h1 className="tenant-title">Tenants</h1>
          <h2 className="tenant-title-breadcrumbs">
            Tenants /{" "}
            <span className="tenant-title-breadcrumbs-org">{tenantName}</span>
          </h2>
        </div>
      </div>

      <div className="tenant-settings-container">
        {/* General Settings */}
        <div className="tenant-settings-section">
          <h2 className="tenant-settings-section-title">General Settings</h2>

          {/* Tenant Admin Email */}
          <div className="tenant-settings-row">
            <div>
              <label className="tenant-settings-label">Tenant Admin Email</label>
              <div className="tenant-settings-input-group">
                <TextInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="settings-input"
                  readOnly={!editingEmail}
                />
              </div>
            </div>
            <Button
              onClick={handleEmailToggle}
              variant="action"
              label={savingEmail ? "Saving..." : editingEmail ? "Save" : "Change"}
              width="100px"
              disabled={savingEmail}
            />
          </div>

          {/* Tenant Admin Mobile */}
          <div className="tenant-settings-row">
            <div>
              <label className="tenant-settings-label">Tenant Admin Mobile</label>
              <div className="tenant-settings-input-group">
                <TextInput
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="settings-input"
                  readOnly={!editingPhone}
                />
              </div>
            </div>
            <Button
              onClick={handlePhoneToggle}
              variant="action"
              label={savingPhone ? "Saving..." : editingPhone ? "Save" : "Change"}
              width="100px"
              disabled={savingPhone}
            />
          </div>

          {/* Tenant Portal URL */}
          <div className="tenant-settings-row">
            <div>
              <label className="tenant-settings-label">Tenant Portal URL</label>
              <div className="tenant-settings-input-group tenant-portal-url-group">
                <span className="tenant-portal-url-text">
                  https://{portalUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="tenant-copy-button"
                  title="Copy URL"
                >
                  <FiCopy />
                </button>
              </div>
            </div>
          </div>

          {/* Billing Frequency (dummy) */}
          <div className="tenant-settings-row">
            <div>
              <label className="tenant-settings-label">Billing Frequency</label>
              <div className="tenant-settings-radio-group">
                <label className="tenant-settings-radio-label">
                  <RadioInput
                    name="billingFrequency"
                    value="Yearly"
                    checked={billingFrequency === "Yearly"}
                    onChange={(e) => setBillingFrequency(e.target.value)}
                  />
                  Yearly
                </label>
                <label className="tenant-settings-radio-label">
                  <RadioInput
                    name="billingFrequency"
                    value="Monthly"
                    checked={billingFrequency === "Monthly"}
                    onChange={(e) => setBillingFrequency(e.target.value)}
                  />
                  Monthly
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Security Settings */}
        <div className="tenant-settings-section">
          <h2 className="tenant-settings-section-title">Admin Security Settings</h2>

          <div className="tenant-settings-row">
            <div className="tenant-settings-action-group">
              <Button
                onClick={handleResetPassword}
                label={savingPassword ? "Resetting..." : "Reset Password"}
                variant="important"
                width="100%"
                disabled={savingPassword}
              />
            </div>
          </div>
        </div>

        <Button
          label="Deactivate Account"
          onClick={() => {
            setDeactivateStep(1);
            setDeactivateReason("");
            setDeactivateDetails("");
            setDeactivatePassword("");
            setDeactivateModal(true);
          }}
          variant="danger"
          width="auto"
        />
      </div>

      {/* Deactivation Modal — multi-step */}
      <ReusableModal
        isOpen={deactivateModal}
        onClose={handleCloseDeactivate}
        title={getModalTitle()}
        primaryButtonText={getPrimaryButtonText()}
        secondaryButtonText="Cancel"
        primaryButtonColor="#dc2626"
        onPrimaryButtonClick={handleDeactivateNext}
        onSecondaryButtonClick={handleCloseDeactivate}
        primaryButtonLoading={isDeactivating}
      >
        {renderDeactivateBody()}
      </ReusableModal>
    </>
  );
};

export default TenantSingleSecuritySettings;

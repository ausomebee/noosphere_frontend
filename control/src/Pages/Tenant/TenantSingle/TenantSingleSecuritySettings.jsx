import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { FiCopy } from "react-icons/fi";
import "./TenantSingle.css";
import {
  PasswordInput,
  TextInput,
  SelectInput,
  TextareaInput,
} from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";
import useAuth from "../../../hooks/useAuth";
import usePermission from "../../../hooks/usePermission";
import tenantApi from "../../../api/TenantApis";
import { showToast, showApiError } from "../../../Helper/ShowToast";
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

// Base domain for tenant portal URLs, derived from the host the control app is
// actually running on so the URL always matches the current environment
// (prod/staging). Falls back to the production root on localhost, raw IPs and
// EC2 hosts where there is no real apex to read.
const getTenantBaseDomain = () => {
  const host = (window.location.hostname || "").toLowerCase();
  const isLocalOrRaw =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".amazonaws.com") ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  if (isLocalOrRaw) return "nooshere.org";
  const parts = host.split(".");
  // apex = last two labels, e.g. admin.nooshere.org -> nooshere.org
  return parts.length >= 2 ? parts.slice(-2).join(".") : host;
};

const TenantSingleSecuritySettings = () => {
  const { tenantId } = useParams();
  const { userId, accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermission();

  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);

  // Editable fields
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
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
      showApiError(err, "LOAD_TENANT");
    } finally {
      setLoading(false);
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  const tenantName = tenant?.companyName || tenant?.contactPerson || "Tenant";
  const portalUrl = tenant?.subdomain
    ? `${tenant.subdomain}.${getTenantBaseDomain()}/tenant/`
    : "—";

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
      showApiError(err, "UPDATE_TENANT_EMAIL");
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
      showApiError(err, "UPDATE_TENANT_PHONE");
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
      showApiError(err, "RESET_TENANT_PASSWORD");
    } finally {
      setSavingPassword(false);
    }
  };

  // --- Copy URL ---
  const handleCopyUrl = () => {
    if (portalUrl !== "—") {
      const url = `https://${portalUrl}`;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(url);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = url;
          textarea.style.position = "fixed";
          textarea.style.left = "-9999px";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
        }
        showToast("URL copied to clipboard", "success");
      } catch {
        showToast("Failed to copy URL", "error");
      }
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
        showApiError(err, "DEACTIVATE_TENANT");
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
            {hasPermission("manage_tenant_security") && (
              <Button
                onClick={handleEmailToggle}
                variant="action"
                label={editingEmail ? "Save" : "Change"}
                width="100px"
                loading={savingEmail}
              />
            )}
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
            {hasPermission("manage_tenant_security") && (
              <Button
                onClick={handlePhoneToggle}
                variant="action"
                label={editingPhone ? "Save" : "Change"}
                width="100px"
                loading={savingPhone}
              />
            )}
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

        </div>

        {/* Admin Security Settings */}
        {hasPermission("manage_tenant_security") && (
          <div className="tenant-settings-section">
            <h2 className="tenant-settings-section-title">Admin Security Settings</h2>

            <div className="tenant-settings-row">
              <div className="tenant-settings-action-group">
                <Button
                  onClick={handleResetPassword}
                  label="Reset Password"
                  variant="important"
                  width="100%"
                  loading={savingPassword}
                />
              </div>
            </div>
          </div>
        )}

        {hasPermission("deactivate_tenant") && (
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
        )}
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

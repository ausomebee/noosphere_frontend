import React, { useState, useEffect, useCallback } from "react";
import useAuth from "../../hooks/useAuth";
import ReusableModal from "../../Components/ReusableModal/ReusableModal";
import {
  TextInput,
  CheckboxInput,
  SwitchInput,
  PasswordInput,
} from "../../Components/Input/Inputs";
import Button from "../../Components/Button/Button";
import authApis from "../../api/authApis";
import { showToast, showApiError } from "../../Helper/ShowToast";
import { firstUnmetPasswordRule } from "../../Helper/passwordValidation";
import { FiSettings } from "react-icons/fi";
import "./SecuritySettings.css";

const SecuritySettings = () => {
  const { user, userId, accessToken, refreshToken } = useAuth();

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [authMethods, setAuthMethods] = useState([
    { id: 1, name: "Security Question", isDefault: true },
    { id: 2, name: "Authenticator App", isDefault: false },
  ]);

  // Authenticator modal
  const [isAuthenticatorModalOpen, setIsAuthenticatorModalOpen] = useState(false);
  const [authenticatorEnableAll, setAuthenticatorEnableAll] = useState(false);
  const [authenticatorDefault, setAuthenticatorDefault] = useState(false);
  const [tfaSaveLoading, setTfaSaveLoading] = useState(false);

  // Security Question Settings modal
  const [isSecurityQuestionModalOpen, setIsSecurityQuestionModalOpen] = useState(false);
  const [sqEnableAll, setSqEnableAll] = useState(false);
  const [sqDefault, setSqDefault] = useState(true);
  const [sqSaveLoading, setSqSaveLoading] = useState(false);

  // Password modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaveLoading, setPasswordSaveLoading] = useState(false);

  // Admin password modal state
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);
  const [adminCurrentPassword, setAdminCurrentPassword] = useState("");
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [adminPasswordSaveLoading, setAdminPasswordSaveLoading] = useState(false);

  // Fetch 2FA choices
  const fetchAdminChoices = useCallback(async () => {
    try {
      const response = await authApis.GetSuperAdminChoices();
      const data = response?.data?.data;
      if (data) {
        // The master 2FA switch is driven by isEnabled.
        setTwoFactorEnabled(!!data.isEnabled);
        setAuthMethods([
          {
            id: 1,
            name: "Security Question",
            isDefault: !!data.securityQuestion,
          },
          {
            id: 2,
            name: "Authenticator App",
            isDefault: !!data.Authenticator2FA,
          },
        ]);
        // Reflect the fetched "set for all" flag on the toggles.
        setSqEnableAll(!!data.setForAll);
        setAuthenticatorEnableAll(!!data.setForAll);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Failed to fetch admin choices:", error);
    }
  }, []);

  // Toggle the master 2FA switch and persist it.
  const handleToggle2FA = async (checked) => {
    setTwoFactorEnabled(checked); // optimistic
    try {
      await authApis.SetSuperAdminEnabled({
        isEnabled: checked,
        accessToken,
        refreshToken,
      });
      showToast(
        `Two-factor authentication ${checked ? "enabled" : "disabled"}`,
        "success",
      );
    } catch (error) {
      setTwoFactorEnabled(!checked); // revert on failure
      showApiError(error, "TOGGLE_2FA");
    }
  };

  useEffect(() => {
    fetchAdminChoices();
  }, [fetchAdminChoices]);

  // Change password
  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim()) {
      showToast("Please fill in all fields", "error");
      return;
    }
    // Enforce the same rules the strength checklist displays, otherwise it can
    // mark a rule unmet on a password this handler still accepts.
    const unmetRule = firstUnmetPasswordRule(newPassword);
    if (unmetRule) {
      showToast(`Password must have: ${unmetRule.toLowerCase()}`, "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New password and confirm password do not match", "error");
      return;
    }
    setPasswordSaveLoading(true);
    try {
      await authApis.AdminSetPassword({
        id: userId || user?.id,
        password: newPassword,
      });
      showToast("Password changed successfully", "success");
      setIsPasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      showApiError(error, "CHANGE_PASSWORD");
    } finally {
      setPasswordSaveLoading(false);
    }
  };

  // Change admin password
  const handleChangeAdminPassword = async () => {
    if (!adminCurrentPassword.trim() || !adminNewPassword.trim()) {
      showToast("Please fill in all fields", "error");
      return;
    }
    const unmetAdminRule = firstUnmetPasswordRule(adminNewPassword);
    if (unmetAdminRule) {
      showToast(`Password must have: ${unmetAdminRule.toLowerCase()}`, "error");
      return;
    }
    if (adminNewPassword !== adminConfirmPassword) {
      showToast("New password and confirm password do not match", "error");
      return;
    }
    setAdminPasswordSaveLoading(true);
    try {
      await authApis.SuperAdministrativePassword({
        id: userId || user?.id,
        oldAdministratorPassword: adminCurrentPassword,
        newAdministratorPassword: adminNewPassword,
      });
      showToast("Administrative password changed successfully", "success");
      setIsAdminPasswordModalOpen(false);
      setAdminCurrentPassword("");
      setAdminNewPassword("");
      setAdminConfirmPassword("");
    } catch (error) {
      showApiError(error, "CHANGE_ADMIN_PASSWORD");
    } finally {
      setAdminPasswordSaveLoading(false);
    }
  };

  // Save Security Question settings
  const handleSaveSecurityQuestion = async () => {
    setSqSaveLoading(true);
    try {
      await authApis.SuperAdminChoices({
        Authenticator2FA: false,
        securityQuestion: true,
        setForAll: sqEnableAll,
      });
      if (sqDefault) {
        setAuthMethods((prev) =>
          prev.map((m) => ({
            ...m,
            isDefault: m.name === "Security Question",
          }))
        );
      }
      setIsSecurityQuestionModalOpen(false);
      showToast("Security question settings saved", "success");
      fetchAdminChoices(); // re-sync the toggles with the saved server state
    } catch (error) {
      if (import.meta.env.DEV) console.error("Failed to save security question settings:", error);
      showToast("Failed to save settings", "error");
    } finally {
      setSqSaveLoading(false);
    }
  };

  // Save Authenticator settings
  const handleSaveAuthenticator = async () => {
    setTfaSaveLoading(true);
    try {
      await authApis.SuperAdminChoices({
        Authenticator2FA: true,
        securityQuestion: false,
        setForAll: authenticatorEnableAll,
      });
      if (authenticatorDefault) {
        setAuthMethods((prev) =>
          prev.map((m) => ({
            ...m,
            isDefault: m.name === "Authenticator App",
          }))
        );
      }
      setIsAuthenticatorModalOpen(false);
      showToast("Authenticator settings saved", "success");
      fetchAdminChoices(); // re-sync the toggles with the saved server state
    } catch (error) {
      if (import.meta.env.DEV) console.error("Failed to set 2FA default:", error);
      showToast("Failed to save authenticator settings", "error");
    } finally {
      setTfaSaveLoading(false);
    }
  };

  const openAuthMethodSettings = (method) => {
    if (method.name === "Authenticator App") {
      setAuthenticatorDefault(method.isDefault);
      setIsAuthenticatorModalOpen(true);
    } else if (method.name === "Security Question") {
      setSqDefault(method.isDefault);
      setIsSecurityQuestionModalOpen(true);
    }
  };

  return (
    <div className="security-settings-container">
      <div className="settings-header">
        <h1>Security Settings</h1>
        <p>Manage your security preferences</p>
      </div>

      {/* General Settings Section */}
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>General Settings</h3>
          <p>Manage your account credentials</p>
        </div>

        <div className="settings-rows">
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Admin Email</span>
              <span className="settings-row-value">
                {user?.email || "Not set"}
              </span>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Password</span>
              <span className="settings-row-value">••••••••••</span>
            </div>
            <Button
              label="Change"
              variant="ghost"
              size="small"
              width="auto"
              className="settings-change-link"
              onClick={() => {
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setIsPasswordModalOpen(true);
              }}
            />
          </div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Administrative Password</span>
              <span className="settings-row-value">••••••••••</span>
            </div>
            <Button
              label="Change"
              variant="ghost"
              size="small"
              width="auto"
              className="settings-change-link"
              onClick={() => {
                setAdminCurrentPassword("");
                setAdminNewPassword("");
                setAdminConfirmPassword("");
                setIsAdminPasswordModalOpen(true);
              }}
            />
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication Section */}
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>Two-Factor Authentication</h3>
          <p>Add an additional layer of security to your account during login</p>
        </div>

        <div className="settings-rows">
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">
                Enable Two-Factor Authentication (2FA)
              </span>
              <span className="settings-row-value settings-row-description">
                Require a second verification step when signing in
              </span>
            </div>
            <SwitchInput
              checked={twoFactorEnabled}
              onChange={(e) => handleToggle2FA(e.target.checked)}
            />
          </div>
        </div>

        {/* 2FA Methods */}
        {twoFactorEnabled && (
          <div className="settings-2fa-methods">
            <h4 className="settings-2fa-title">
              Authentication methods
            </h4>
            {authMethods.map((method) => (
              <div key={method.id} className="settings-2fa-method-row">
                <div className="settings-2fa-method-info">
                  <span className="settings-2fa-method-name">
                    {method.name}
                  </span>
                  {method.isDefault && (
                    <span className="settings-2fa-default-badge">Default</span>
                  )}
                </div>
                <button
                  className="settings-2fa-gear-btn"
                  onClick={() => openAuthMethodSettings(method)}
                  title="Settings"
                >
                  <FiSettings size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Question Settings Modal */}
      <ReusableModal
        isOpen={isSecurityQuestionModalOpen}
        onClose={() => setIsSecurityQuestionModalOpen(false)}
        title="Security Question Settings"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleSaveSecurityQuestion}
        onSecondaryButtonClick={() => setIsSecurityQuestionModalOpen(false)}
        primaryButtonLoading={sqSaveLoading}
        size="md"
      >
        <div className="settings-modal-content">
          <CheckboxInput
            label="Enable this method for all users"
            checked={sqEnableAll}
            onChange={(e) => setSqEnableAll(e.target.checked)}
          />
          <CheckboxInput
            label="Set as primary authentication method"
            checked={sqDefault}
            onChange={(e) => setSqDefault(e.target.checked)}
          />
        </div>
      </ReusableModal>

      {/* Authenticator App Modal */}
      <ReusableModal
        isOpen={isAuthenticatorModalOpen}
        onClose={() => setIsAuthenticatorModalOpen(false)}
        title="Authenticator App"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleSaveAuthenticator}
        onSecondaryButtonClick={() => setIsAuthenticatorModalOpen(false)}
        primaryButtonLoading={tfaSaveLoading}
        size="sm"
      >
        <div className="settings-modal-content">
          <CheckboxInput
            label="Enable this method for all users"
            checked={authenticatorEnableAll}
            onChange={(e) => setAuthenticatorEnableAll(e.target.checked)}
          />
          <CheckboxInput
            label="Set as default authentication method"
            checked={authenticatorDefault}
            onChange={(e) => setAuthenticatorDefault(e.target.checked)}
          />
        </div>
      </ReusableModal>

      {/* Change Password Modal */}
      <ReusableModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Change Password"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleChangePassword}
        onSecondaryButtonClick={() => setIsPasswordModalOpen(false)}
        primaryButtonLoading={passwordSaveLoading}
        size="sm"
      >
        <div className="settings-modal-content">
          <TextInput
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
          />
          <PasswordInput
            label="New Password"
            showStrength
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
          />
          <PasswordInput
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            matchValue={newPassword}
          />
        </div>
      </ReusableModal>

      {/* Change Administrative Password Modal */}
      <ReusableModal
        isOpen={isAdminPasswordModalOpen}
        onClose={() => setIsAdminPasswordModalOpen(false)}
        title="Change Administrative Password"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleChangeAdminPassword}
        onSecondaryButtonClick={() => setIsAdminPasswordModalOpen(false)}
        primaryButtonLoading={adminPasswordSaveLoading}
        size="sm"
      >
        <div className="settings-modal-content">
          <TextInput
            label="Current Password"
            type="password"
            value={adminCurrentPassword}
            onChange={(e) => setAdminCurrentPassword(e.target.value)}
            placeholder="Enter current administrative password"
          />
          <PasswordInput
            label="New Password"
            showStrength
            value={adminNewPassword}
            onChange={(e) => setAdminNewPassword(e.target.value)}
            placeholder="Enter new administrative password"
          />
          <PasswordInput
            label="Confirm New Password"
            value={adminConfirmPassword}
            onChange={(e) => setAdminConfirmPassword(e.target.value)}
            placeholder="Confirm new administrative password"
            matchValue={adminNewPassword}
          />
        </div>
      </ReusableModal>
    </div>
  );
};

export default SecuritySettings;

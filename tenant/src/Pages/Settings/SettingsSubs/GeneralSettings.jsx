import React, { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import useAuth from "../../../hooks/useAuth";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";
import {
  TextInput,
  SelectInput,
  CheckboxInput,
  SwitchInput,
} from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import api from "../../../api/generalSettingsApi";
import { showToast } from "../../../Helper/ShowToast";
import { FiSettings, FiEdit2, FiTrash2, FiPlus } from "react-icons/fi";
import usePermissions from "../../../hooks/usePermissions";
import { setSettings } from "../../../ReduxStore/features/generalSettingsSlice";
import {
  DATE_FORMAT_OPTIONS,
  TIME_FORMAT_OPTIONS,
  CURRENCY_OPTIONS,
  SECURITY_QUESTION_OPTIONS,
} from "../../../Data/selectOptions";
import "./GeneralSettings.css";

const GeneralSettings = () => {
  const dispatch = useDispatch();
  const { user, tenantId, accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();

  // General settings state
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [timeFormat, setTimeFormat] = useState("12-hour");
  const [currency, setCurrency] = useState("USD");
  const [settingsExist, setSettingsExist] = useState(false);

  // Security settings state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Auth methods
  const [authMethods, setAuthMethods] = useState([
    { id: 1, name: "Security Question", isDefault: true },
    { id: 2, name: "Authenticator App", isDefault: false },
  ]);

  // Security questions — each record has its own { id, question } from the API
  const [securityQuestions, setSecurityQuestions] = useState([]);

  // Loading states
  const [saveLoading, setSaveLoading] = useState(false);
  const [sqSaveLoading, setSqSaveLoading] = useState(false);
  const [tfaSaveLoading, setTfaSaveLoading] = useState(false);

  // Modals
  const [isAuthenticatorModalOpen, setIsAuthenticatorModalOpen] = useState(false);
  const [isSecurityQuestionModalOpen, setIsSecurityQuestionModalOpen] = useState(false);
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);

  // Authenticator modal state
  const [authenticatorDefault, setAuthenticatorDefault] = useState(false);

  // Security question modal state
  const [securityQuestionDefault, setSecurityQuestionDefault] = useState(true);

  // Add question modal state
  const [newQuestion, setNewQuestion] = useState("");

  // Edit question state
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Change password modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaveLoading, setPasswordSaveLoading] = useState(false);

  // Change modals for general settings
  const [isDateFormatModalOpen, setIsDateFormatModalOpen] = useState(false);
  const [isTimeFormatModalOpen, setIsTimeFormatModalOpen] = useState(false);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [tempDateFormat, setTempDateFormat] = useState(dateFormat);
  const [tempTimeFormat, setTempTimeFormat] = useState(timeFormat);
  const [tempCurrency, setTempCurrency] = useState(currency);

  // Tenant email state (fetched from /tenant/{tenantId})
  const [tenantEmail, setTenantEmail] = useState("");

  // Fetch general settings
  const fetchGeneralSettings = useCallback(async () => {
    if (!tenantId) return;
    try {
      const response = await api.GetGeneralSettingsByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const data = response?.data;
      if (data) {
        setSettingsExist(true);
        if (data.dateFormat) setDateFormat(data.dateFormat);
        if (data.timeFormat) setTimeFormat(data.timeFormat);
        if (data.currency) setCurrency(data.currency);
        dispatch(setSettings({
          dateFormat: data.dateFormat,
          timeFormat: data.timeFormat,
          currency: data.currency,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch general settings:", error);
      showToast("Failed to load general settings", "error");
    }
  }, [tenantId, accessToken, refreshToken]);

  // Fetch security questions — API returns an array of { id, question } records
  const fetchSecurityQuestions = useCallback(async () => {
    if (!tenantId) return;
    try {
      const response = await api.GetTenantSecurityQuestionsByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const data = response?.data;
      if (Array.isArray(data)) {
        setSecurityQuestions(
          data.map((q) => ({ id: q.id, question: q.question }))
        );
      } else if (data) {
        setSecurityQuestions([{ id: data.id, question: data.question }]);
      }
    } catch (error) {
      console.error("Failed to fetch security questions:", error);
      showToast("Failed to load security questions", "error");
    }
  }, [tenantId, accessToken, refreshToken]);

  // Fetch 2FA choices from /tenant/tenantadminchoices/{tenantId}
  const fetchTenantAdminChoices = useCallback(async () => {
    if (!tenantId) return;
    try {
      const response = await api.GetTenantAdminChoices({
        tenantId,
        accessToken,
        refreshToken,
      });
      const data = response?.data;
      if (data) {
        const has2FA = data.Authenticator2FA || data.securityQuestion;
        setTwoFactorEnabled(has2FA);
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
      }
    } catch (error) {
      console.error("Failed to fetch tenant admin choices:", error);
      showToast("Failed to load admin choices", "error");
    }
  }, [tenantId, accessToken, refreshToken]);

  // Fetch tenant email from /tenant/{tenantId}
  const fetchTenantInfo = useCallback(async () => {
    if (!tenantId) return;
    try {
      const response = await api.GetTenantById({
        tenantId,
        accessToken,
        refreshToken,
      });
      const data = response?.data;
      if (data?.email) {
        setTenantEmail(data.email);
      }
    } catch (error) {
      console.error("Failed to fetch tenant info:", error);
      showToast("Failed to load tenant information", "error");
    }
  }, [tenantId, accessToken, refreshToken]);

  useEffect(() => {
    fetchGeneralSettings();
    fetchSecurityQuestions();
    fetchTenantAdminChoices();
    fetchTenantInfo();
  }, [fetchGeneralSettings, fetchSecurityQuestions, fetchTenantAdminChoices, fetchTenantInfo]);

  // Save general settings (create or update)
  const saveGeneralSettings = async (newDateFormat, newTimeFormat, newCurrency) => {
    setSaveLoading(true);
    try {
      const payload = {
        tenantId,
        dateFormat: newDateFormat,
        timeFormat: newTimeFormat,
        currency: newCurrency,
        accessToken,
        refreshToken,
      };

      if (settingsExist) {
        await api.UpdateGeneralSettings(payload);
      } else {
        await api.CreateGeneralSettings(payload);
        setSettingsExist(true);
      }
      dispatch(setSettings({
        dateFormat: newDateFormat,
        timeFormat: newTimeFormat,
        currency: newCurrency,
      }));
      showToast("Settings updated successfully", "success");
    } catch (error) {
      console.error("Failed to save general settings:", error);
      showToast("Failed to save settings", "error");
    } finally {
      setSaveLoading(false);
    }
  };

  // Handlers
  const handleSaveDateFormat = async () => {
    setDateFormat(tempDateFormat);
    setIsDateFormatModalOpen(false);
    await saveGeneralSettings(tempDateFormat, timeFormat, currency);
  };

  const handleSaveTimeFormat = async () => {
    setTimeFormat(tempTimeFormat);
    setIsTimeFormatModalOpen(false);
    await saveGeneralSettings(dateFormat, tempTimeFormat, currency);
  };

  const handleSaveCurrency = async () => {
    setCurrency(tempCurrency);
    setIsCurrencyModalOpen(false);
    await saveGeneralSettings(dateFormat, timeFormat, tempCurrency);
  };

  // Change password
  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim()) {
      showToast("Please fill in all fields", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New password and confirm password do not match", "error");
      return;
    }
    setPasswordSaveLoading(true);
    try {
      await api.ChangePassword({
        currentPassword,
        newPassword,
        staffId: user?.userId || user?.id,
        accessToken,
        refreshToken,
      });
      showToast("Password changed successfully", "success");
      setIsPasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      showToast(error.message || "Failed to change password", "error");
    } finally {
      setPasswordSaveLoading(false);
    }
  };

  // Save 2FA default
  const handleSaveAuthenticator = async () => {
    setTfaSaveLoading(true);
    try {
      await api.Set2FASetDefault({
        tenantId,
        Authenticator2FA: true,
        securityQuestion: false,
        setForAll: authenticatorDefault,
        accessToken,
        refreshToken,
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
    } catch (error) {
      console.error("Failed to set 2FA default:", error);
      showToast("Failed to save authenticator settings", "error");
    } finally {
      setTfaSaveLoading(false);
    }
  };

  const handleSaveSecurityQuestion = async () => {
    setTfaSaveLoading(true);
    try {
      await api.Set2FASetDefault({
        tenantId,
        Authenticator2FA: false,
        securityQuestion: true,
        setForAll: securityQuestionDefault,
        accessToken,
        refreshToken,
      });
      if (securityQuestionDefault) {
        setAuthMethods((prev) =>
          prev.map((m) => ({
            ...m,
            isDefault: m.name === "Security Question",
          }))
        );
      }
      setIsSecurityQuestionModalOpen(false);
      showToast("Security question settings saved", "success");
    } catch (error) {
      console.error("Failed to save security question settings:", error);
      showToast("Failed to save settings", "error");
    } finally {
      setTfaSaveLoading(false);
    }
  };

  // Add or edit a single security question
  const handleAddQuestion = async () => {
    if (!newQuestion.trim()) return;
    setSqSaveLoading(true);
    try {
      if (editingQuestion) {
        // Update existing question record
        await api.UpdateTenantSecurityQuestions({
          id: editingQuestion.id,
          question: newQuestion,
          accessToken,
          refreshToken,
        });
        setSecurityQuestions((prev) =>
          prev.map((q) =>
            q.id === editingQuestion.id ? { ...q, question: newQuestion } : q
          )
        );
        setEditingQuestion(null);
        showToast("Security question updated", "success");
      } else {
        // Create new question record
        const response = await api.TenantSecurityQuestions({
          tenantId,
          question: newQuestion,
          accessToken,
          refreshToken,
        });
        const created = response?.data;
        if (created?.id) {
          setSecurityQuestions((prev) => [
            ...prev,
            { id: created.id, question: created.question || newQuestion },
          ]);
        }
        showToast("Security question added", "success");
      }
      setNewQuestion("");
      setIsAddQuestionModalOpen(false);
    } catch (error) {
      console.error("Failed to save security question:", error);
      showToast("Failed to save security question", "error");
    } finally {
      setSqSaveLoading(false);
    }
  };

  const handleDeleteQuestion = (id) => {
    setSecurityQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setNewQuestion(question.question);
    setIsAddQuestionModalOpen(true);
  };

  const openAuthMethodSettings = (method) => {
    if (method.name === "Authenticator App") {
      setAuthenticatorDefault(method.isDefault);
      setIsAuthenticatorModalOpen(true);
    } else if (method.name === "Security Question") {
      setSecurityQuestionDefault(method.isDefault);
      setIsSecurityQuestionModalOpen(true);
    }
  };

  return (
    <div className="general-settings-container">
      {/* General Settings Section */}
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>General Settings</h3>
          <p>Manage your general account settings</p>
        </div>

        <div className="settings-rows">
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Date Format</span>
              <span className="settings-row-value">{dateFormat}</span>
            </div>
            {hasPermission("edit_general_settings") && (
              <Button
                label="Change"
                variant="ghost"
                size="small"
                width="auto"
                className="settings-change-link"
                onClick={() => {
                  setTempDateFormat(dateFormat);
                  setIsDateFormatModalOpen(true);
                }}
              />
            )}
          </div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Time Format</span>
              <span className="settings-row-value">
                {TIME_FORMAT_OPTIONS.find((o) => o.value === timeFormat)?.label ||
                  timeFormat}
              </span>
            </div>
            {hasPermission("edit_general_settings") && (
              <Button
                label="Change"
                variant="ghost"
                size="small"
                width="auto"
                className="settings-change-link"
                onClick={() => {
                  setTempTimeFormat(timeFormat);
                  setIsTimeFormatModalOpen(true);
                }}
              />
            )}
          </div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Currency</span>
              <span className="settings-row-value">
                {CURRENCY_OPTIONS.find((o) => o.value === currency)?.label ||
                  currency}
              </span>
            </div>
            {hasPermission("edit_general_settings") && (
              <Button
                label="Change"
                variant="ghost"
                size="small"
                width="auto"
                className="settings-change-link"
                onClick={() => {
                  setTempCurrency(currency);
                  setIsCurrencyModalOpen(true);
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Security Settings Section */}
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>Security Settings</h3>
          <p>Manage your security preferences</p>
        </div>

        <div className="settings-rows">
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Email</span>
              <span className="settings-row-value">
                {tenantEmail || user?.email || "Not set"}
              </span>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Password</span>
              <span className="settings-row-value">••••••••••</span>
            </div>
            {hasPermission("edit_security_settings") && (
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
            )}
          </div>

          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">
                Two-Factor Authentication (2FA)
              </span>
              <span className="settings-row-value settings-row-description">
                Add an additional layer of security to your account during login
              </span>
            </div>
            {hasPermission("edit_security_settings") ? (
              <SwitchInput
                checked={twoFactorEnabled}
                onChange={(e) => setTwoFactorEnabled(e.target.checked)}
              />
            ) : (
              <SwitchInput
                checked={twoFactorEnabled}
                disabled
              />
            )}
          </div>
        </div>

        {/* 2FA Methods */}
        {twoFactorEnabled && (
          <div className="settings-2fa-methods">
            <h4 className="settings-2fa-title">
              2-factor authentication methods
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

      {/* Date Format Modal */}
      <ReusableModal
        isOpen={isDateFormatModalOpen}
        onClose={() => setIsDateFormatModalOpen(false)}
        title="Change Date Format"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleSaveDateFormat}
        onSecondaryButtonClick={() => setIsDateFormatModalOpen(false)}
        primaryButtonLoading={saveLoading}
        size="sm"
      >
        <SelectInput
          label="Date Format"
          value={tempDateFormat}
          onChange={(e) => setTempDateFormat(e.target.value)}
          options={DATE_FORMAT_OPTIONS}
          placeholder="Select date format"
        />
      </ReusableModal>

      {/* Time Format Modal */}
      <ReusableModal
        isOpen={isTimeFormatModalOpen}
        onClose={() => setIsTimeFormatModalOpen(false)}
        title="Change Time Format"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleSaveTimeFormat}
        onSecondaryButtonClick={() => setIsTimeFormatModalOpen(false)}
        primaryButtonLoading={saveLoading}
        size="sm"
      >
        <SelectInput
          label="Time Format"
          value={tempTimeFormat}
          onChange={(e) => setTempTimeFormat(e.target.value)}
          options={TIME_FORMAT_OPTIONS}
          placeholder="Select time format"
        />
      </ReusableModal>

      {/* Currency Modal */}
      <ReusableModal
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
        title="Change Currency"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleSaveCurrency}
        onSecondaryButtonClick={() => setIsCurrencyModalOpen(false)}
        primaryButtonLoading={saveLoading}
        size="sm"
      >
        <SelectInput
          label="Currency"
          value={tempCurrency}
          onChange={(e) => setTempCurrency(e.target.value)}
          options={CURRENCY_OPTIONS}
          placeholder="Select currency"
        />
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
            label="Set as default authentication method"
            checked={authenticatorDefault}
            onChange={(e) => setAuthenticatorDefault(e.target.checked)}
          />
        </div>
      </ReusableModal>

      {/* Security Question Settings Modal */}
      <ReusableModal
        isOpen={isSecurityQuestionModalOpen}
        onClose={() => setIsSecurityQuestionModalOpen(false)}
        title="Security Question Settings"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleSaveSecurityQuestion}
        onSecondaryButtonClick={() => setIsSecurityQuestionModalOpen(false)}
        primaryButtonLoading={tfaSaveLoading}
        size="md"
      >
        <div className="settings-modal-content">
          <CheckboxInput
            label="Set as primary authentication method"
            checked={securityQuestionDefault}
            onChange={(e) => setSecurityQuestionDefault(e.target.checked)}
          />

          <div className="security-questions-list">
            {securityQuestions.map((q) => (
              <div key={q.id} className="security-question-item">
                <span className="security-question-text">{q.question}</span>
                <div className="security-question-actions">
                  <button
                    className="sq-action-btn edit"
                    onClick={() => handleEditQuestion(q)}
                    title="Edit"
                  >
                    <FiEdit2 size={18} />
                  </button>
                  <button
                    className="sq-action-btn delete"
                    onClick={() => handleDeleteQuestion(q.id)}
                    title="Delete"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Button
            label="Add a question"
            variant="secondary"
            size="small"
            width="auto"
            icon={<FiPlus />}
            iconSize={14}
            onClick={() => {
              setEditingQuestion(null);
              setNewQuestion("");
              setIsAddQuestionModalOpen(true);
            }}
          />
        </div>
      </ReusableModal>

      {/* Add / Edit Security Question Modal */}
      <ReusableModal
        isOpen={isAddQuestionModalOpen}
        onClose={() => {
          setIsAddQuestionModalOpen(false);
          setEditingQuestion(null);
          setNewQuestion("");
        }}
        title={editingQuestion ? "Edit Security Question" : "Add a Security Question"}
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleAddQuestion}
        onSecondaryButtonClick={() => {
          setIsAddQuestionModalOpen(false);
          setEditingQuestion(null);
          setNewQuestion("");
        }}
        primaryButtonLoading={sqSaveLoading}
        size="sm"
      >
        <SelectInput
          label="Question"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="Select a security question"
          options={SECURITY_QUESTION_OPTIONS}
        />
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
          <TextInput
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
          />
          <TextInput
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
          />
        </div>
      </ReusableModal>
    </div>
  );
};

export default GeneralSettings;

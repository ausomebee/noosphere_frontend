import React, { useState, useEffect, useCallback } from "react";
import useAuth from "../../hooks/useAuth";
import ReusableModal from "../../Components/ReusableModal/ReusableModal";
import {
  TextInput,
  SelectInput,
  CheckboxInput,
  SwitchInput,
} from "../../Components/Input/Inputs";
import Button from "../../Components/Button/Button";
import authApis from "../../api/authApis";
import { showToast } from "../../Helper/ShowToast";
import { FiSettings, FiEdit2, FiTrash2 } from "react-icons/fi";
import "./SecuritySettings.css";

const SECURITY_QUESTION_OPTIONS = [
  { value: "", label: "Select a security question" },
  { value: "What is the name of your first pet?", label: "What is the name of your first pet?" },
  { value: "What was the make of your first car?", label: "What was the make of your first car?" },
  { value: "What is your mother's maiden name?", label: "What is your mother's maiden name?" },
  { value: "What was the name of your elementary school?", label: "What was the name of your elementary school?" },
  { value: "What is your favorite book?", label: "What is your favorite book?" },
  { value: "In what city were you born?", label: "In what city were you born?" },
  { value: "What was your childhood nickname?", label: "What was your childhood nickname?" },
  { value: "What is the name of your favorite teacher?", label: "What is the name of your favorite teacher?" },
  { value: "What was the first concert you attended?", label: "What was the first concert you attended?" },
  { value: "What is your favorite vacation destination?", label: "What is your favorite vacation destination?" },
  { value: "What was the name of your first best friend?", label: "What was the name of your first best friend?" },
  { value: "What is the name of the street you grew up on?", label: "What is the name of the street you grew up on?" },
  { value: "What was your favorite childhood game?", label: "What was your favorite childhood game?" },
  { value: "What is the name of your favorite movie?", label: "What is the name of your favorite movie?" },
  { value: "What was the first job you ever had?", label: "What was the first job you ever had?" },
  { value: "What is your favorite hobby?", label: "What is your favorite hobby?" },
  { value: "What was the model of your first phone?", label: "What was the model of your first phone?" },
  { value: "What is the name of your favorite restaurant?", label: "What is the name of your favorite restaurant?" },
  { value: "What was the name of your high school mascot?", label: "What was the name of your high school mascot?" },
  { value: "What is your favorite historical figure?", label: "What is your favorite historical figure?" },
];

const SecuritySettings = () => {
  const { user, userId } = useAuth();

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [authMethods, setAuthMethods] = useState([
    { id: 1, name: "Security Question", isDefault: true },
    { id: 2, name: "Authenticator App", isDefault: false },
  ]);

  // Security questions
  const [securityQuestions, setSecurityQuestions] = useState([]);

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

  // Add/Edit Question modal
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [editingQuestion, setEditingQuestion] = useState(null);

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
        const has2FA = data.Authenticator2FA || data.securityQuestion;
        setTwoFactorEnabled(!!has2FA);
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
      console.error("Failed to fetch admin choices:", error);
    }
  }, []);

  useEffect(() => {
    fetchAdminChoices();
  }, [fetchAdminChoices]);

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
      showToast(error.message || "Failed to change password", "error");
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
      showToast(error.message || "Failed to change administrative password", "error");
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
    } catch (error) {
      console.error("Failed to save security question settings:", error);
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
    } catch (error) {
      console.error("Failed to set 2FA default:", error);
      showToast("Failed to save authenticator settings", "error");
    } finally {
      setTfaSaveLoading(false);
    }
  };

  // Add or edit a security question
  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    if (editingQuestion) {
      setSecurityQuestions((prev) =>
        prev.map((q) =>
          q.id === editingQuestion.id ? { ...q, question: newQuestion } : q
        )
      );
      setEditingQuestion(null);
      showToast("Security question updated", "success");
    } else {
      setSecurityQuestions((prev) => [
        ...prev,
        { id: String(Date.now()), question: newQuestion },
      ]);
      showToast("Security question added", "success");
    }
    setNewQuestion("");
    setIsAddQuestionModalOpen(false);
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
              onChange={(e) => setTwoFactorEnabled(e.target.checked)}
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

          <div className="sq-section">
            <span className="sq-section-title">SECURITY QUESTIONS</span>
            <div className="sq-list">
              {securityQuestions.map((q) => (
                <div key={q.id} className="sq-item">
                  <span className="sq-text">{q.question}</span>
                  <div className="sq-actions">
                    <button
                      className="sq-action-btn edit"
                      onClick={() => handleEditQuestion(q)}
                      title="Edit"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button
                      className="sq-action-btn delete"
                      onClick={() => handleDeleteQuestion(q.id)}
                      title="Delete"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="sq-add-btn"
              onClick={() => {
                setEditingQuestion(null);
                setNewQuestion("");
                setIsAddQuestionModalOpen(true);
              }}
            >
              Add a question
            </button>
          </div>
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
        title={editingQuestion ? "Edit security question" : "Add a security question"}
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleAddQuestion}
        onSecondaryButtonClick={() => {
          setIsAddQuestionModalOpen(false);
          setEditingQuestion(null);
          setNewQuestion("");
        }}
        size="sm"
      >
        <SelectInput
          label="Question"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          options={SECURITY_QUESTION_OPTIONS}
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
          <TextInput
            label="New Password"
            type="password"
            value={adminNewPassword}
            onChange={(e) => setAdminNewPassword(e.target.value)}
            placeholder="Enter new administrative password"
          />
          <TextInput
            label="Confirm New Password"
            type="password"
            value={adminConfirmPassword}
            onChange={(e) => setAdminConfirmPassword(e.target.value)}
            placeholder="Confirm new administrative password"
          />
        </div>
      </ReusableModal>
    </div>
  );
};

export default SecuritySettings;

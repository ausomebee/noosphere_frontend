import React, { useState, useEffect, useCallback } from "react";
import { debounce } from "lodash";
import {
  SwitchInput,
  TextInput,
  TextareaInput,
  SelectInput,
} from "../../../../Components/Input/Inputs";
import Button from "../../../../Components/Button/Button";
import api from "../../../../api/AutoBillingPandAApis"; // Adjust path to your API file
import { showToast } from "../../../../Helper/ShowToast";

const PaymentManagement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState({
    id: "",
    chargeOnDueDate: false,
    chargeLastUsedFirst: false,
    chargeAlternative: false,
    retryBefore: "0",
    retryAfter: "0",
    notifyTenant: false,
    notificationEmailHeader: "Payment Failed Notification",
    notificationEmailBody: "Enter message",
    cancelAfter: "5",
    manualCancel: false,
    suspensionAction: "SUSPEND_SERVICE",
    errorMessage: "Enter message",
    emailAfterAttempts: "3",
    sendWarningEmail: false,
    warningMailHeader: "Warning: Payment Issue Detected",
    warningMailBody: "Enter message",
    sendOnSubscriptionCancel: false,
    cancelMailHeader: "Subscription Cancelled",
    cancelMailBody: "Enter message",
  });
  const [originalSettings, setOriginalSettings] = useState(null);
  const [editMode, setEditMode] = useState({
    notificationEmail: false,
    suspensionAction: false,
    warningEmail: false,
    cancelEmail: false,
  });

  const accessToken = "your-access-token";
  const refreshToken = "your-refresh-token";

  const fetchPaymentSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.GetPaymentAccessManagementAllField({
        accessToken,
        refreshToken,
      });
      const data = response.data;
      const settings = {
        id: data.id,
        chargeOnDueDate: data.chargeOnDueDate,
        chargeLastUsedFirst: data.chargeLastUsedFirst,
        chargeAlternative: data.chargeAlternative,
        retryBefore: data.retryBefore.toString(),
        retryAfter: data.retryAfter.toString(),
        notifyTenant: data.notifyTenant,
        notificationEmailHeader: data.notificationEmailHeader,
        notificationEmailBody: data.notificationEmailBody,
        cancelAfter: data.cancelAfter.toString(),
        manualCancel: data.manualCancel,
        suspensionAction: data.suspensionAction,
        errorMessage: data.errorMessage,
        emailAfterAttempts: data.emailAfterAttempts.toString(),
        sendWarningEmail: data.emailAfterAttempts > 0,
        warningMailHeader: data.warningMailHeader,
        warningMailBody: data.warningMailBody,
        sendOnSubscriptionCancel: data.sendOnSubscriptionCancel,
        cancelMailHeader: data.cancelMailHeader,
        cancelMailBody: data.cancelMailBody,
      };
      setPaymentSettings(settings);
      setOriginalSettings(settings);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentSettings();
  }, [fetchPaymentSettings]);

  const toggleEditMode = (form) => {
    setEditMode((prev) => ({
      ...prev,
      [form]: !prev[form],
    }));
    if (editMode[form]) {
      // Revert to original settings on cancel
      setPaymentSettings(originalSettings);
    }
  };

  const debouncedSave = useCallback(
    debounce(async (settings, fieldOrForm, isForm = false) => {
      setIsLoading(true);
      try {
        const { id } = settings;
        if (!isForm) {
          // Auto-save for non-form fields
          if (fieldOrForm === "chargeOnDueDate") {
            await api.UpdateChargeOnDueDateToggle({
              accessToken,
              refreshToken,
              id,
              chargeOnDueDate: settings.chargeOnDueDate,
            });
          } else if (fieldOrForm === "chargeLastUsedFirst") {
            await api.UpdateChargeLastUsedFirstToggle({
              accessToken,
              refreshToken,
              id,
              chargeLastUsedFirst: settings.chargeLastUsedFirst,
            });
          } else if (fieldOrForm === "chargeAlternative") {
            await api.UpdateChargeAlternativeToggle({
              accessToken,
              refreshToken,
              id,
              chargeAlternative: settings.chargeAlternative,
            });
          } else if (fieldOrForm === "retryBefore") {
            await api.UpdateRetryBeforeCount({
              accessToken,
              refreshToken,
              id,
              retryBefore: parseInt(settings.retryBefore, 10),
            });
          } else if (fieldOrForm === "retryAfter") {
            await api.UpdateRetryAfterCount({
              accessToken,
              refreshToken,
              id,
              retryAfter: parseInt(settings.retryAfter, 10),
            });
          } else if (fieldOrForm === "notifyTenant") {
            await api.UpdateNotifyTenantToggle({
              accessToken,
              refreshToken,
              id,
              notifyTenant: settings.notifyTenant,
            });
          } else if (fieldOrForm === "cancelAfter") {
            await api.UpdateCancelAfter({
              accessToken,
              refreshToken,
              id,
              cancelAfter: parseInt(settings.cancelAfter, 10),
            });
          } else if (fieldOrForm === "manualCancel") {
            await api.UpdateManualCancel({
              accessToken,
              refreshToken,
              id,
              manualCancel: settings.manualCancel,
            });
          } else if (fieldOrForm === "emailAfterAttempts") {
            await api.UpdateEmailAfterAttempts({
              accessToken,
              refreshToken,
              id,
              emailAfterAttempts: parseInt(settings.emailAfterAttempts, 10),
            });
            setPaymentSettings((prev) => ({
              ...prev,
              sendWarningEmail: parseInt(settings.emailAfterAttempts, 10) > 0,
            }));
          } else if (fieldOrForm === "sendWarningEmail") {
            await api.UpdateEmailAfterAttempts({
              accessToken,
              refreshToken,
              id,
              emailAfterAttempts: settings.sendWarningEmail
                ? parseInt(settings.emailAfterAttempts, 10)
                : 0,
            });
          } else if (fieldOrForm === "sendOnSubscriptionCancel") {
            await api.SendOnSubCancel({
              accessToken,
              refreshToken,
              id,
              sendOnSubscriptionCancel: settings.sendOnSubscriptionCancel,
            });
          }
          showToast(`${fieldOrForm} updated successfully`, "success");
        } else {
          // Save for form fields
          if (fieldOrForm === "notificationEmail") {
            await api.NotificationEmail({
              accessToken,
              refreshToken,
              id,
              notificationEmailHeader: settings.notificationEmailHeader,
              notificationEmailBody: settings.notificationEmailBody,
            });
          } else if (fieldOrForm === "suspensionAction") {
            await api.UpdateSuspensionAction({
              accessToken,
              refreshToken,
              id,
              suspensionAction: settings.suspensionAction,
              errorMessage: settings.errorMessage,
            });
          } else if (fieldOrForm === "warningEmail") {
            await api.WarningEmail({
              accessToken,
              refreshToken,
              id,
              warningMailHeader: settings.warningMailHeader,
              warningMailBody: settings.warningMailBody,
            });
          } else if (fieldOrForm === "cancelEmail") {
            await api.CancelEmail({
              accessToken,
              refreshToken,
              id,
              cancelMailHeader: settings.cancelMailHeader,
              cancelMailBody: settings.cancelMailBody,
            });
          }
          showToast(`${fieldOrForm} form updated successfully`, "success");
        }
        await fetchPaymentSettings();
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        setIsLoading(false);
      }
    }, 500),
    [fetchPaymentSettings]
  );

  const handleInputChange = (key, value, isFormField = false) => {
    setPaymentSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (!isFormField) {
      debouncedSave({ ...paymentSettings, [key]: value }, key);
    }
  };

  const handleSaveForm = (form) => {
    debouncedSave(paymentSettings, form, true);
    toggleEditMode(form);
  };

  return (
    <div className="invoice-management-container">
  

      {/* General Section */}
      <h3 className="tenant-section-label">GENERAL</h3>
      <div className="form-section">
        <div className="form-row">
          <div className="form-header">
            <label>Charge tenant payment method on invoice due date</label>
            <SwitchInput
              checked={paymentSettings.chargeOnDueDate}
              onChange={(e) =>
                handleInputChange("chargeOnDueDate", e.target.checked)
              }
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-header">
            <label>
              If tenant has multiple payment methods, charge last used method first
            </label>
            <SwitchInput
              checked={paymentSettings.chargeLastUsedFirst}
              onChange={(e) =>
                handleInputChange("chargeLastUsedFirst", e.target.checked)
              }
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-header">
            <label>
              Charge alternative payment methods if the last used method fails
            </label>
            <SwitchInput
              checked={paymentSettings.chargeAlternative}
              onChange={(e) =>
                handleInputChange("chargeAlternative", e.target.checked)
              }
            />
          </div>
        </div>
      </div>

      {/* Failed Payments & Auto-Retry Section */}
      <h3 className="tenant-section-label">FAILED PAYMENTS & AUTO-RETRY</h3>
      <div className="form-section">
        <div className="form-row">
          <div className="upcoming-invoice-controls">
            <label>Auto-retry failed payments</label>
            <div style={{ width: "80px", marginBottom: "-10px" }}>
              <SelectInput
                value={paymentSettings.retryBefore}
                onChange={(e) =>
                  handleInputChange("retryBefore", e.target.value)
                }
                options={[{ value: "0", label: "0" }].concat(
                  Array.from({ length: 30 }, (_, i) => ({
                    value: (i + 1).toString(),
                    label: (i + 1).toString(),
                  }))
                )}
                className="invoice-select"
              />
            </div>
            <label>times before invoice becomes overdue</label>
          </div>
        </div>
        <div className="form-row">
          <div className="upcoming-invoice-controls">
            <label>Auto-retry failed payments</label>
            <div style={{ width: "80px", marginBottom: "-10px" }}>
              <SelectInput
                value={paymentSettings.retryAfter}
                onChange={(e) =>
                  handleInputChange("retryAfter", e.target.value)
                }
                options={[{ value: "0", label: "0" }].concat(
                  Array.from({ length: 30 }, (_, i) => ({
                    value: (i + 1).toString(),
                    label: (i + 1).toString(),
                  }))
                )}
                className="invoice-select"
              />
            </div>
            <label>times after invoice becomes overdue</label>
          </div>
        </div>
        <div className="form-row">
          <div className="form-header">
            <label>Notify tenant of every charge attempt</label>
            <SwitchInput
              checked={paymentSettings.notifyTenant}
              onChange={(e) =>
                handleInputChange("notifyTenant", e.target.checked)
              }
            />
          </div>
        </div>
        {paymentSettings.notifyTenant && (
          <>
            <div className="form-header-two">
              <label>Payment Failure Notification</label>
            </div>
            <div className="form-row">
              <div className="form-inputs">
                <TextInput
                  label="Email Header"
                  value={paymentSettings.notificationEmailHeader}
                  onChange={(e) =>
                    handleInputChange("notificationEmailHeader", e.target.value, true)
                  }
                  placeholder="Payment Failed Notification"
                  disabled={!editMode.notificationEmail}
                />
                <TextareaInput
                  label="Email Body"
                  value={paymentSettings.notificationEmailBody}
                  onChange={(e) =>
                    handleInputChange("notificationEmailBody", e.target.value, true)
                  }
                  placeholder="Enter message"
                  rows={4}
                  disabled={!editMode.notificationEmail}
                />
              </div>
            </div>
            {!editMode.notificationEmail ? (
              <div className="form-row">
                <Button
                  label="Edit"
                  variant="outline"
                  onClick={() => toggleEditMode("notificationEmail")}
                  width="100px"
                />
              </div>
            ) : (
              <div className="form-row">
                <div className="edit-actions">
                  <Button
                    label="Cancel"
                    variant="outline"
                    onClick={() => toggleEditMode("notificationEmail")}
                    width="100px"
                  />
                  <Button
                    label="Save"
                    variant="primary"
                    onClick={() => handleSaveForm("notificationEmail")}
                    width="100px"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Subscription Cancellation Section */}
      <h3 className="tenant-section-label">SUBSCRIPTION CANCELLATION</h3>
      <div className="form-section">
        <div className="form-row">
          <div className="form-header">
            <div className="upcoming-invoice-controls">
              <label>Cancel tenant subscription after</label>
              <div style={{ width: "80px", marginBottom: "-10px" }}>
                <SelectInput
                  value={paymentSettings.cancelAfter}
                  onChange={(e) =>
                    handleInputChange("cancelAfter", e.target.value)
                  }
                  options={Array.from({ length: 30 }, (_, i) => ({
                    value: (i + 1).toString(),
                    label: (i + 1).toString(),
                  }))}
                  className="invoice-select"
                />
              </div>
              <label>days of overdue invoice</label>
            </div>
          </div>
        </div>
        <div className="form-row">
          <div className="form-header">
            <label>Allow admin to manually cancel subscriptions</label>
            <SwitchInput
              checked={paymentSettings.manualCancel}
              onChange={(e) =>
                handleInputChange("manualCancel", e.target.checked)
              }
            />
          </div>
        </div>
        <div className="form-header-two">
          <label>Cancellation Action</label>
        </div>
        <div className="csub-form-row">
          <div className="form-inputs">
            <div
              style={{
                display: "flex",
                width: "100%",
                gap: "10px",
                alignItems: "center",
              }}
            >
              <label style={{ flexWrap: "nowrap" }}>
                Select suspension action
              </label>
              <div style={{ width: "400px", marginBottom: "-10px" }}>
                <SelectInput
                  value={paymentSettings.suspensionAction}
                  onChange={(e) =>
                    handleInputChange("suspensionAction", e.target.value, true)
                  }
                  options={[
                    { value: "SUSPEND_SERVICE", label: "Suspend Service" },
                    { value: "PREVENT_LOGIN", label: "Prevent Account Login" },
                    { value: "DISABLE_FEATURES", label: "Disable All Features" },
                  ]}
                  className="csub-select"
                  disabled={!editMode.suspensionAction}
                />
              </div>
            </div>
            <TextareaInput
              label="Error Message"
              value={paymentSettings.errorMessage}
              onChange={(e) =>
                handleInputChange("errorMessage", e.target.value, true)
              }
              placeholder="Enter message"
              rows={4}
              disabled={!editMode.suspensionAction}
            />
          </div>
        </div>
        {!editMode.suspensionAction ? (
          <div className="form-row">
            <Button
              label="Edit"
              variant="outline"
              onClick={() => toggleEditMode("suspensionAction")}
              width="100px"
            />
          </div>
        ) : (
          <div className="form-row">
            <div className="edit-actions">
              <Button
                label="Cancel"
                variant="outline"
                onClick={() => toggleEditMode("suspensionAction")}
                width="100px"
              />
              <Button
                label="Save"
                variant="primary"
                onClick={() => handleSaveForm("suspensionAction")}
                width="100px"
              />
            </div>
          </div>
        )}
      </div>

      {/* Cancellation Notification Section */}
      <h3 className="tenant-section-label">CANCELLATION NOTIFICATION</h3>
      <div className="form-section">
        <div className="form-row">
          <div className="form-header">
            <div className="upcoming-invoice-controls">
              <label>Send warning email after</label>
              <div style={{ width: "80px", marginBottom: "-10px" }}>
                <SelectInput
                  value={paymentSettings.emailAfterAttempts}
                  onChange={(e) =>
                    handleInputChange("emailAfterAttempts", e.target.value)
                  }
                  options={Array.from({ length: 10 }, (_, i) => ({
                    value: (i + 1).toString(),
                    label: (i + 1).toString(),
                  }))}
                  className="invoice-select"
                />
              </div>
              <label>failed payment attempts</label>
            </div>
            <SwitchInput
              checked={paymentSettings.sendWarningEmail}
              onChange={(e) =>
                handleInputChange("sendWarningEmail", e.target.checked)
              }
            />
          </div>
        </div>
        {paymentSettings.sendWarningEmail && (
          <>
            <div className="form-header-two">
              <label>Warning Email Notification</label>
            </div>
            <div className="form-row">
              <div className="form-inputs">
                <TextInput
                  label="Email Header"
                  value={paymentSettings.warningMailHeader}
                  onChange={(e) =>
                    handleInputChange("warningMailHeader", e.target.value, true)
                  }
                  placeholder="Warning: Payment Issue Detected"
                  disabled={!editMode.warningEmail}
                />
                <TextareaInput
                  label="Email Body"
                  value={paymentSettings.warningMailBody}
                  onChange={(e) =>
                    handleInputChange("warningMailBody", e.target.value, true)
                  }
                  placeholder="Enter message"
                  rows={4}
                  disabled={!editMode.warningEmail}
                />
              </div>
            </div>
            {!editMode.warningEmail ? (
              <div className="form-row">
                <Button
                  label="Edit"
                  variant="outline"
                  onClick={() => toggleEditMode("warningEmail")}
                  width="100px"
                />
              </div>
            ) : (
              <div className="form-row">
                <div className="edit-actions">
                  <Button
                    label="Cancel"
                    variant="outline"
                    onClick={() => toggleEditMode("warningEmail")}
                    width="100px"
                  />
                  <Button
                    label="Save"
                    variant="primary"
                    onClick={() => handleSaveForm("warningEmail")}
                    width="100px"
                  />
                </div>
              </div>
            )}
          </>
        )}
        <div className="form-row">
          <div className="form-header">
            <label>Send an email when subscription is cancelled</label>
            <SwitchInput
              checked={paymentSettings.sendOnSubscriptionCancel}
              onChange={(e) =>
                handleInputChange("sendOnSubscriptionCancel", e.target.checked)
              }
            />
          </div>
        </div>
        {paymentSettings.sendOnSubscriptionCancel && (
          <>
            <div className="form-header-two">
              <label>Cancellation Email Notification</label>
            </div>
            <div className="form-row">
              <div className="form-inputs">
                <TextInput
                  label="Email Header"
                  value={paymentSettings.cancelMailHeader}
                  onChange={(e) =>
                    handleInputChange("cancelMailHeader", e.target.value, true)
                  }
                  placeholder="Subscription Cancelled"
                  disabled={!editMode.cancelEmail}
                />
                <TextareaInput
                  label="Email Body"
                  value={paymentSettings.cancelMailBody}
                  onChange={(e) =>
                    handleInputChange("cancelMailBody", e.target.value, true)
                  }
                  placeholder="Enter message"
                  rows={4}
                  disabled={!editMode.cancelEmail}
                />
              </div>
            </div>
            {!editMode.cancelEmail ? (
              <div className="form-row">
                <Button
                  label="Edit"
                  variant="outline"
                  onClick={() => toggleEditMode("cancelEmail")}
                  width="100px"
                />
              </div>
            ) : (
              <div className="form-row">
                <div className="edit-actions">
                  <Button
                    label="Cancel"
                    variant="outline"
                    onClick={() => toggleEditMode("cancelEmail")}
                    width="100px"
                  />
                  <Button
                    label="Save"
                    variant="primary"
                    onClick={() => handleSaveForm("cancelEmail")}
                    width="100px"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentManagement;
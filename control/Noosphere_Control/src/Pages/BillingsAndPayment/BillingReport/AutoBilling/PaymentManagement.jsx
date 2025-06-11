import React, { useState, useEffect } from "react";
import {
  SwitchInput,
  TextInput,
  TextareaInput,
  SelectInput,
} from "../../../../Components/Input/Inputs"; // Adjust paths
import Button from "../../../../Components/Button/Button"; // Adjust path

const PaymentManagement = () => {
  // State for form values
  const [paymentSettings, setPaymentSettings] = useState({
    // General
    chargeOnDueDate: false,
    chargeLastUsedMethod: false,
    chargeAlternativeMethods: false,
    // Failed Payments & Auto-Retry
    autoRetryBeforeOverdue: false,
    autoRetryTimesBefore: "10",
    autoRetryAfterOverdue: false,
    autoRetryTimesAfter: "10",
    notifyChargeAttempts: false,
    chargeAttemptEmailHeader: "Charge Attempt Notification",
    chargeAttemptEmailBody: "Enter message",
    // Subscription Cancellation
    cancelSubscription: false,
    cancelDaysAfter: "10",
    allowManualCancel: false,
    suspensionAction: "Select",
    errorMessage: "Enter message",
    // Cancellation Notification
    sendWarningEmail: false,
    warningAfterAttempts: "5",
    sendCancellationEmail: false,
    cancellationEmailHeader: "Your account is suspended",
    cancellationEmailBody: "Enter message",
  });

  // State for dynamic email notifications
  const [emailNotifications, setEmailNotifications] = useState(
    Array.from({ length: 5 }, (_, i) => ({
      emailHeader: `Warning Email ${i + 1}`,
      emailBody: "Enter message",
    }))
  );

  // State to manage edit mode for sections
  const [editMode, setEditMode] = useState({
    general: false,
    failedPayments: false,
    subscriptionCancellation: false,
    cancellationNotification: false,
  });

  // Effect to update email notifications based on warningAfterAttempts
  useEffect(() => {
    const newCount = parseInt(paymentSettings.warningAfterAttempts, 10);
    setEmailNotifications((prev) => {
      const currentCount = prev.length;
      if (newCount > currentCount) {
        // Add new email notifications
        const newNotifications = Array.from(
          { length: newCount - currentCount },
          (_, i) => ({
            emailHeader: `Warning Email ${currentCount + i + 1}`,
            emailBody: "Enter message",
          })
        );
        return [...prev, ...newNotifications];
      } else if (newCount < currentCount) {
        // Remove excess email notifications
        return prev.slice(0, newCount);
      }
      return prev;
    });
  }, [paymentSettings.warningAfterAttempts]);

  // Toggle edit mode for sections
  const toggleEditMode = (section) => {
    setEditMode((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Handle form changes
  const handleInputChange = (key, value, index = null) => {
    if (index !== null) {
      // Handle email notification changes
      setEmailNotifications((prev) =>
        prev.map((notification, i) =>
          i === index ? { ...notification, [key]: value } : notification
        )
      );
    } else {
      // Handle other settings
      setPaymentSettings((prev) => ({
        ...prev,
        [key]: value,
      }));
    }
  };

  // Handle Save for sections
  const handleSave = (section) => {
    console.log(`Saving ${section} settings:`, {
      ...paymentSettings,
      emailNotifications, // Include email notifications in the save
    });
    // TODO: Send data to an endpoint
    toggleEditMode(section);
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
              If user has multiple payment methods, charge last used payment
              method first
            </label>
            <SwitchInput
              checked={paymentSettings.chargeLastUsedMethod}
              onChange={(e) =>
                handleInputChange("chargeLastUsedMethod", e.target.checked)
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
              checked={paymentSettings.chargeAlternativeMethods}
              onChange={(e) =>
                handleInputChange("chargeAlternativeMethods", e.target.checked)
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
                value={paymentSettings.autoRetryTimesBefore}
                onChange={(e) =>
                  handleInputChange("autoRetryTimesBefore", e.target.value)
                }
                options={Array.from({ length: 30 }, (_, i) => ({
                  value: (i + 1).toString(),
                  label: (i + 1).toString(),
                }))}
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
                value={paymentSettings.autoRetryTimesAfter}
                onChange={(e) =>
                  handleInputChange("autoRetryTimesAfter", e.target.value)
                }
                options={Array.from({ length: 30 }, (_, i) => ({
                  value: (i + 1).toString(),
                  label: (i + 1).toString(),
                }))}
                className="invoice-select"
              />
            </div>
            <label>times after invoice becomes overdue</label>
          </div>
        </div>
        <div className="form-row">
          <div className="form-header">
            <label>
              Notify tenant and system admin of every charge attempt
            </label>
            <SwitchInput
              checked={paymentSettings.notifyChargeAttempts}
              onChange={(e) =>
                handleInputChange("notifyChargeAttempts", e.target.checked)
              }
            />
          </div>
        </div>
        <div className="form-header-two">
          <label>Email Notification</label>
        </div>
        <div className="form-row">
          <div className="form-inputs">
            <TextInput
              label="Email Header"
              value={paymentSettings.chargeAttemptEmailHeader}
              onChange={(e) =>
                handleInputChange("chargeAttemptEmailHeader", e.target.value)
              }
              placeholder="Charge Attempt Notification"
              disabled={!editMode.failedPayments}
            />
            <TextareaInput
              label="Email Body"
              value={paymentSettings.chargeAttemptEmailBody}
              onChange={(e) =>
                handleInputChange("chargeAttemptEmailBody", e.target.value)
              }
              placeholder="Enter message"
              rows={4}
              disabled={!editMode.failedPayments}
            />
            {!editMode.failedPayments ? (
              <Button
                label="Edit"
                variant="outline"
                onClick={() => toggleEditMode("failedPayments")}
                width="100px"
              />
            ) : (
              <div className="edit-actions">
                <Button
                  label="Cancel"
                  variant="outline"
                  onClick={() => toggleEditMode("failedPayments")}
                  width="100px"
                />
                <Button
                  label="Save"
                  variant="primary"
                  onClick={() => handleSave("failedPayments")}
                  width="100px"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Cancellation Section */}
      <h3 className="tenant-section-label">SUBSCRIPTION CANCELLATION</h3>
      <div className="form-section">
        <div className="form-header">
          <div className="form-row">
            <div className="upcoming-invoice-controls">
              <label>Cancel tenant subscription after</label>
              <div style={{ width: "80px", marginBottom: "-10px" }}>
                <SelectInput
                  value={paymentSettings.cancelDaysAfter}
                  onChange={(e) =>
                    handleInputChange("cancelDaysAfter", e.target.value)
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
          <SwitchInput
            checked={paymentSettings.cancelSubscription}
            onChange={(e) =>
              handleInputChange("cancelSubscription", e.target.checked)
            }
          />
        </div>
        <div className="form-row">
          <div className="form-header">
            <label>Allow admin to manually cancel subscriptions</label>
            <SwitchInput
              checked={paymentSettings.allowManualCancel}
              onChange={(e) =>
                handleInputChange("allowManualCancel", e.target.checked)
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
                    handleInputChange("suspensionAction", e.target.value)
                  }
                  options={[
                    { value: "Select", label: "Select" },
                    {
                      value: "Prevent Account Login",
                      label: "Prevent Account Login",
                    },
                    {
                      value: "Disable all features",
                      label: "Disable all features",
                    },
                  ]}
                  disabled={!editMode.subscriptionCancellation}
                  className="csub-select"
                />
              </div>
            </div>
            <TextareaInput
              label="Error Message"
              value={paymentSettings.errorMessage}
              onChange={(e) =>
                handleInputChange("errorMessage", e.target.value)
              }
              placeholder="Enter message"
              disabled={!editMode.subscriptionCancellation}
            />
            {!editMode.subscriptionCancellation ? (
              <Button
                label="Edit"
                variant="outline"
                onClick={() => toggleEditMode("subscriptionCancellation")}
                width="100px"
              />
            ) : (
              <div className="edit-actions">
                <Button
                  label="Cancel"
                  variant="outline"
                  onClick={() => toggleEditMode("subscriptionCancellation")}
                  width="100px"
                />
                <Button
                  label="Save"
                  variant="primary"
                  onClick={() => handleSave("subscriptionCancellation")}
                  width="100px"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancellation Notification Section */}
      <h3 className="tenant-section-label">CANCELLATION NOTIFICATION</h3>
      <div className="form-section">
        <div className="form-header">
          <div className="form-row">
            <div className="upcoming-invoice-controls">
              <label>Send cancellation warning email after</label>
              <div style={{ width: "80px", marginBottom: "-10px" }}>
                <SelectInput
                  value={paymentSettings.warningAfterAttempts}
                  onChange={(e) =>
                    handleInputChange("warningAfterAttempts", e.target.value)
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
          
          </div>
            <SwitchInput
              checked={paymentSettings.sendWarningEmail}
              onChange={(e) =>
                handleInputChange("sendWarningEmail", e.target.checked)
              }
            />
        </div>

        {emailNotifications.map((notification, index) => (
          <React.Fragment key={index}>
            <div className="form-header-two">
              <label>Email Notification {index + 1}</label>
            </div>
            <div className="form-row">
              <div className="form-inputs">
                <TextInput
                  label="Email Header"
                  value={notification.emailHeader}
                  onChange={(e) =>
                    handleInputChange("emailHeader", e.target.value, index)
                  }
                  placeholder={`Warning Email ${index + 1}`}
                  disabled={!editMode.cancellationNotification}
                />
                <TextareaInput
                  label="Email Body"
                  value={notification.emailBody}
                  onChange={(e) =>
                    handleInputChange("emailBody", e.target.value, index)
                  }
                  placeholder="Enter message"
                  rows={4}
                  disabled={!editMode.cancellationNotification}
                />
                {index === emailNotifications.length - 1 && (
                  <>
                    {!editMode.cancellationNotification ? (
                      <Button
                        label="Edit"
                        variant="outline"
                        onClick={() =>
                          toggleEditMode("cancellationNotification")
                        }
                        width="100px"
                      />
                    ) : (
                      <div className="edit-actions">
                        <Button
                          label="Cancel"
                          variant="outline"
                          onClick={() =>
                            toggleEditMode("cancellationNotification")
                          }
                          width="100px"
                        />
                        <Button
                          label="Save"
                          variant="primary"
                          onClick={() => handleSave("cancellationNotification")}
                          width="100px"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </React.Fragment>
        ))}

        <div className="form-row">
          <div className="form-header">
            <label>Send an email when subscription is cancelled</label>
            <SwitchInput
              checked={paymentSettings.sendCancellationEmail}
              onChange={(e) =>
                handleInputChange("sendCancellationEmail", e.target.checked)
              }
            />
          </div>
        </div>
        <div className="form-header-two">
          <label>Cancellation Email Notification</label>
        </div>
        <div className="form-row">
          <div className="form-inputs">
            <TextInput
              label="Email Header"
              value={paymentSettings.cancellationEmailHeader}
              onChange={(e) =>
                handleInputChange("cancellationEmailHeader", e.target.value)
              }
              placeholder="Your account is suspended"
              disabled={!editMode.cancellationNotification}
            />
            <TextareaInput
              label="Email Body"
              value={paymentSettings.cancellationEmailBody}
              onChange={(e) =>
                handleInputChange("cancellationEmailBody", e.target.value)
              }
              placeholder="Enter message"
              rows={4}
              disabled={!editMode.cancellationNotification}
            />
            {!editMode.cancellationNotification ? (
              <Button
                label="Edit"
                variant="outline"
                onClick={() => toggleEditMode("cancellationNotification")}
                width="100px"
              />
            ) : (
              <div className="edit-actions">
                <Button
                  label="Cancel"
                  variant="outline"
                  onClick={() => toggleEditMode("cancellationNotification")}
                  width="100px"
                />
                <Button
                  label="Save"
                  variant="primary"
                  onClick={() => handleSave("cancellationNotification")}
                  width="100px"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentManagement;

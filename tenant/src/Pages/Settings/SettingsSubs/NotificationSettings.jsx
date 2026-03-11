import { useState, useEffect, useCallback } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import useAuth from "../../../hooks/useAuth";
import { CheckboxInput } from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import { showToast } from "../../../Helper/ShowToast";
import api from "../../../api/notificationApi";
import "./NotificationSettings.css";

const NOTIFICATION_CONFIG = [
  {
    key: "CALENDAR_APPOINTMENTS",
    label: "CALENDAR & APPOINTMENTS",
    items: [
      { key: "upcoming_appointments", label: "Upcoming appointments" },
      { key: "canceled_appointments", label: "Canceled appointments" },
      { key: "appointment_reschedule_requests", label: "Appointment reschedule requests" },
      { key: "completed_appointments", label: "Completed appointments" },
      { key: "approved_reschedule_requests", label: "Approved reschedule requests" },
      { key: "appointment_start_alerts", label: "Appointment start alerts" },
    ],
  },
  {
    key: "CLIENT_MANAGEMENT",
    label: "CLIENT MANAGEMENT",
    items: [
      { key: "document_request_completion_alerts", label: "Document request completion alerts" },
      { key: "clinical_report_approval_requests", label: "Clinical report approval requests" },
      { key: "form_completion_alerts", label: "Form completion alerts" },
      { key: "clinical_report_approval_alerts_supervisor", label: "Clinical report approval alerts (supervisor)" },
      { key: "authorization_creation_alerts", label: "Authorization creation alerts" },
      { key: "clinical_report_approval_alerts_client", label: "Clinical report approval alerts (client)" },
      { key: "authorization_expiry_alerts", label: "Authorization expiry alerts" },
      { key: "clinical_report_change_request_alerts_supervisor", label: "Clinical report change request alerts (supervisor)" },
      { key: "authorization_utilization_alerts", label: "Authorization utilization alerts" },
      { key: "clinical_report_change_request_alerts_clients", label: "Clinical report change request alerts (clients)" },
    ],
  },
  {
    key: "ORGANIZATION_MANAGEMENT",
    label: "ORGANIZATION MANAGEMENT",
    items: [
      { key: "organization_license_expiry_alerts", label: "Organization license expiry alerts" },
    ],
  },
  {
    key: "BILLING_PAYMENTS",
    label: "BILLING & PAYMENTS",
    items: [
      { key: "timesheet_creation_alerts", label: "Timesheet creation alerts" },
      { key: "timesheet_change_request_alerts", label: "Timesheet change request alerts" },
      { key: "timesheet_approval_alerts", label: "Timesheet approval alerts" },
      { key: "timesheet_rejection_alerts", label: "Timesheet rejection alerts" },
      { key: "payer_authorization_expiry_alerts", label: "Payer authorization expiry alerts" },
    ],
  },
  {
    key: "PAYROLL_MANAGEMENT",
    label: "PAYROLL MANAGEMENT",
    items: [
      { key: "upcoming_payroll_alerts", label: "Upcoming payroll alerts" },
      { key: "payroll_review_alerts", label: "Payroll review alerts" },
    ],
  },
  {
    key: "HELP_SUPPORT",
    label: "HELP & SUPPORT",
    items: [
      { key: "ticket_submission_alert", label: "Ticket submission alert" },
      { key: "ticket_status_change_alerts", label: "Ticket status change alerts" },
      { key: "ticket_withdrawal_alerts", label: "Ticket withdrawal alerts" },
    ],
  },
];

const buildDefaultState = () => {
  const state = {};
  for (const cat of NOTIFICATION_CONFIG) {
    state[cat.key] = { enabled: false };
    for (const item of cat.items) {
      state[cat.key][item.key] = false;
    }
  }
  return state;
};

const NotificationSettings = () => {
  const { userId, accessToken, refreshToken } = useAuth();
  const [settings, setSettings] = useState(buildDefaultState);
  const [expandedSections, setExpandedSections] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await api.getNotificationSettings({ userId, accessToken, refreshToken });
      if (data) setSettings(data);
    } catch {
      // silently fall back to defaults
    }
  }, [userId, accessToken, refreshToken]);

  useEffect(() => {
    if (userId && accessToken) fetchSettings();
  }, [fetchSettings]);

  const toggleSection = (key) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleEnableAll = (catKey, items) => {
    setSettings((prev) => {
      const newVal = !prev[catKey].enabled;
      const updated = { enabled: newVal };
      for (const item of items) updated[item.key] = newVal;
      return { ...prev, [catKey]: updated };
    });
  };

  const toggleItem = (catKey, itemKey, items) => {
    setSettings((prev) => {
      const updated = { ...prev[catKey], [itemKey]: !prev[catKey][itemKey] };
      updated.enabled = items.every((item) => updated[item.key]);
      return { ...prev, [catKey]: updated };
    });
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      await api.saveNotificationSettings({ userId, settings, accessToken, refreshToken });
      showToast("Notification settings saved", "success");
    } catch (err) {
      showToast(err.message || "Failed to save settings", "error");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleReset = () => setSettings(buildDefaultState());

  return (
    <div className="notif-settings-container">
      <p className="notif-settings-description">
        Choose the notifications you wish to receive.
      </p>

      {NOTIFICATION_CONFIG.map((cat) => {
        const isExpanded = !!expandedSections[cat.key];
        const catSettings = settings[cat.key];

        return (
          <div key={cat.key} className="notif-settings-section">
            <button
              className="notif-settings-section-header"
              onClick={() => toggleSection(cat.key)}
            >
              <span>{cat.label}</span>
              {isExpanded ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
            </button>

            {isExpanded && (
              <div className="notif-settings-section-body">
                <div className="notif-settings-enable-all">
                  <CheckboxInput
                    checked={catSettings.enabled}
                    onChange={() => toggleEnableAll(cat.key, cat.items)}
                    label="Enable all notifications"
                  />
                </div>
                <div className="notif-settings-grid">
                  {cat.items.map((item) => (
                    <div key={item.key} className="notif-settings-item">
                      <CheckboxInput
                        checked={catSettings[item.key]}
                        onChange={() => toggleItem(cat.key, item.key, cat.items)}
                        label={item.label}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="notif-settings-footer">
        <Button label="Reset to Default" variant="secondary" onClick={handleReset} width="auto" />
        <Button label="Save Changes" variant="primary" onClick={handleSave} loading={saveLoading} width="auto" />
      </div>
    </div>
  );
};

export default NotificationSettings;

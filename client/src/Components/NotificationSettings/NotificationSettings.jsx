// components/NotificationSettings.js
import React from "react";
import { SwitchInput } from "../Input/Inputs";

const NotificationItem = ({ label, checked, onChange, disabled }) => {
  return (
    <div className="notification-item">
      <span className="notification-label">{label}</span>
      <SwitchInput checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
};

const NotificationSettings = ({ notifications, isLoading, loadingKeys = new Set(), onToggle }) => {
  const notificationItems = [
    {
      key: "appointmentScheduled",
      label: "Notify me when a new appointment has been scheduled",
    },
    {
      key: "appointmentRescheduled",
      label: "Notify me when an appointment has been rescheduled",
    },
    {
      key: "appointmentAboutToStart",
      label: "Notify me when an appointment is about to start",
    },
    {
      key: "appointmentStarted",
      label: "Notify me when an appointment starts",
    },
    {
      key: "appointmentCancelled",
      label: "Notify me when an appointment has been cancelled",
    },
    {
      key: "appointmentCompletedAwaitingFeedback",
      label: "Notify me when an appointment is completed and awaiting my feedback",
    },
    {
      key: "documentRequested",
      label: "Notify me when a document has been requested from me",
    },
    {
      key: "formShared",
      label: "Notify me when a form has been shared with me",
    },
    {
      key: "authorizationAboutToExpire",
      label: "Notify me when one or more authorization are about to expire",
    },
    {
      key: "authorizationExpired",
      label: "Notify me when one or more authorizations expire",
    },
    {
      key: "authorizationUnitsAlmostExhausted",
      label: "Notify me when one or more authorization units are almost exhausted",
    },
    {
      key: "authorizationUnitsExhausted",
      label: "Notify me when one or more authorization units have been exhausted",
    },
    {
      key: "signatureRequested",
      label: "Notify me when my signature is requested for a clinical report",
    },
  ];

  if (isLoading) {
    return (
      <section className="section">
        <h2 className="profile-section-title">Notifications</h2>
        <p className="section-description">
          Manage how and when you'd like to receive updates.
        </p>
        <div className="loading-notifications">
          Loading notification settings...
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <h2 className="profile-section-title">Notifications</h2>
      <p className="section-description">
        Manage how and when you'd like to receive updates.
      </p>

      <div className="profile-notifications-list">
        {notificationItems.map((item) => (
          <NotificationItem
            key={item.key}
            label={item.label}
            checked={notifications[item.key]}
            onChange={() => onToggle(item.key)}
            disabled={loadingKeys.has(item.key)}
          />
        ))}
      </div>
    </section>
  );
};

export default NotificationSettings;
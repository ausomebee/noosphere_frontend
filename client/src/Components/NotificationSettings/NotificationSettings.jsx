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

const NotificationSettings = ({ notifications, isLoading, onToggle }) => {
  const notificationItems = [
    {
      key: "reschedule",
      label: "Notify me when a session has been rescheduled",
    },
    {
      key: "starts",
      label: "Notify me when a session starts",
    },
    {
      key: "completed",
      label: "Notify me when a session is marked as completed",
    },
    {
      key: "awaitingReview",
      label: "Notify me when a session is awaiting review",
    },
    {
      key: "approvedReschedule",
      label: "Notify me when a reschedule has been approved",
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
            disabled={isLoading}
          />
        ))}
      </div>
    </section>
  );
};

export default NotificationSettings;
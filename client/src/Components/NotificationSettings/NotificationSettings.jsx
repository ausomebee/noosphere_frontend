// components/NotificationSettings.js
import React from "react";
import { SwitchInput } from "../Input/Inputs";
import { notificationItems } from "../../Data/notificationConfig";
import SectionLoader from "../SectionLoader";
const NotificationItem = ({ label, checked, onChange, disabled }) => {
  return (
    <div className="notification-item">
      <span className="notification-label">{label}</span>
      <SwitchInput checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
};

const NotificationSettings = ({ notifications, isLoading, loadingKeys = new Set(), onToggle }) => {
  if (isLoading) {
    return (
      <section className="section">
        <h2 className="profile-section-title">Notifications</h2>
        <p className="section-description">
          Manage how and when you'd like to receive updates.
        </p>
        <SectionLoader />
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
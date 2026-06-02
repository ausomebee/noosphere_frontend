import React from "react";
import {
  IoInformationCircle,
  IoWarning,
  IoAlertCircle,
  IoClose,
} from "react-icons/io5";
import "./NotificationAlert.css";

const VARIANT_CONFIG = {
  secondary: {
    icon: IoInformationCircle,
  },
  primary: {
    icon: IoInformationCircle,
  },
  critical: {
    icon: IoWarning,
  },
  danger: {
    icon: IoAlertCircle,
  },
};

const NotificationAlert = ({
  variant = "secondary",
  message,
  primaryAction,
  secondaryAction,
  onClose,
}) => {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.secondary;
  const Icon = config.icon;

  if (!message) return null;

  return (
    <div className={`notif-alert notif-alert-${variant}`}>
      <div className="notif-alert-left">
        <Icon className="notif-alert-icon" />
        <span className="notif-alert-message">{message}</span>
      </div>
      <div className="notif-alert-actions">
        {primaryAction && (
          <button
            className={`notif-alert-btn notif-alert-btn-${variant}`}
            onClick={primaryAction.onClick}
          >
            {primaryAction.label}
          </button>
        )}
        {secondaryAction && (
          <button
            className="notif-alert-link"
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </button>
        )}
        {onClose && (
          <button className="notif-alert-close" onClick={onClose} aria-label="Close notification">
            <IoClose size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationAlert;

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
  onClick,
}) => {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.secondary;
  const Icon = config.icon;

  if (!message) return null;

  // When onClick is supplied the whole banner is a button that opens the
  // notifications page; the action buttons below stop propagation so they
  // keep their own behaviour.
  const clickable = typeof onClick === "function";
  const stop = (handler) => (e) => {
    e.stopPropagation();
    handler?.(e);
  };

  return (
    <div
      className={`notif-alert notif-alert-${variant}${clickable ? " notif-alert-clickable" : ""}`}
      onClick={clickable ? onClick : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
    >
      <div className="notif-alert-left">
        <Icon className="notif-alert-icon" />
        <span className="notif-alert-message">{message}</span>
      </div>
      <div className="notif-alert-actions">
        {primaryAction && (
          <button
            className={`notif-alert-btn notif-alert-btn-${variant}`}
            onClick={stop(primaryAction.onClick)}
          >
            {primaryAction.label}
          </button>
        )}
        {secondaryAction && (
          <button
            className="notif-alert-link"
            onClick={stop(secondaryAction.onClick)}
          >
            {secondaryAction.label}
          </button>
        )}
        {onClose && (
          <button className="notif-alert-close" onClick={stop(onClose)} aria-label="Close notification">
            <IoClose size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationAlert;

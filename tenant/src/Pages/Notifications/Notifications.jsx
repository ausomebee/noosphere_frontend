import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoClose,
  IoCalendarOutline,
  IoDocumentTextOutline,
  IoPersonOutline,
  IoNotificationsOutline,
  IoCheckmarkCircleOutline,
  IoAlertCircleOutline,
} from "react-icons/io5";
import "./Notifications.css";

const ICON_MAP = {
  appointment: IoCalendarOutline,
  document: IoDocumentTextOutline,
  client: IoPersonOutline,
  system: IoNotificationsOutline,
  success: IoCheckmarkCircleOutline,
  alert: IoAlertCircleOutline,
};

// Placeholder notifications – replace with API data
const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: "appointment",
    title: "New Appointment Scheduled",
    description: "Orlando Diggs has been scheduled for a session on Friday 3:00 PM.",
    time: "2 hours ago",
    date: "Today",
    read: false,
  },
  {
    id: 2,
    type: "document",
    title: "Document Uploaded",
    description: "A new document has been uploaded to the client file for Jane Smith.",
    time: "4 hours ago",
    date: "Today",
    read: false,
  },
  {
    id: 3,
    type: "success",
    title: "Report Approved",
    description: "The clinical report for Michael Brown has been approved by supervisor.",
    time: "5 hours ago",
    date: "Today",
    read: true,
  },
  {
    id: 4,
    type: "alert",
    title: "Authorization Expiring",
    description: "Authorization for Orlando Diggs expires in 5 days. Please renew.",
    time: "Yesterday, 3:45 PM",
    date: "Yesterday",
    read: true,
  },
  {
    id: 5,
    type: "client",
    title: "New Client Added",
    description: "A new client Sarah Johnson has been added to the pipeline.",
    time: "Yesterday, 11:20 AM",
    date: "Yesterday",
    read: true,
  },
  {
    id: 6,
    type: "system",
    title: "System Maintenance",
    description: "Scheduled maintenance will occur this Saturday from 2:00 AM to 4:00 AM.",
    time: "Yesterday, 9:00 AM",
    date: "Yesterday",
    read: true,
  },
];

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const groupedNotifications = notifications.reduce((groups, notif) => {
    if (!groups[notif.date]) {
      groups[notif.date] = [];
    }
    groups[notif.date].push(notif);
    return groups;
  }, {});

  const handleViewDetails = (notif) => {
    // Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    // TODO: Navigate to the relevant detail page based on notification type
  };

  const handleClose = () => {
    navigate(-1);
  };

  return (
    <div className="notifications-page">
      {/* Header */}
      <div className="notifications-header">
        <div className="notifications-header-left">
          <h1 className="notifications-title">Notifications</h1>
          {unreadCount > 0 && (
            <span className="notifications-count">{unreadCount}</span>
          )}
        </div>
        <button className="notifications-close" onClick={handleClose}>
          <IoClose size={18} />
          <span>Close</span>
        </button>
      </div>

      {/* Notification groups */}
      <div className="notifications-body">
        {Object.entries(groupedNotifications).map(([date, items]) => (
          <div key={date} className="notifications-group">
            <h3 className="notifications-group-date">{date}</h3>
            <div className="notifications-list">
              {items.map((notif) => {
                const Icon = ICON_MAP[notif.type] || IoNotificationsOutline;
                return (
                  <div
                    key={notif.id}
                    className={`notification-card ${!notif.read ? "notification-card-unread" : ""}`}
                  >
                    <div className={`notification-card-icon notification-icon-${notif.type}`}>
                      <Icon size={20} />
                    </div>
                    <div className="notification-card-content">
                      <h4 className="notification-card-title">{notif.title}</h4>
                      <p className="notification-card-desc">{notif.description}</p>
                      <div className="notification-card-footer">
                        <span className="notification-card-time">{notif.time}</span>
                        <button
                          className="notification-card-link"
                          onClick={() => handleViewDetails(notif)}
                        >
                          View details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="notifications-empty">
            <IoNotificationsOutline size={48} />
            <p>No notifications</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;

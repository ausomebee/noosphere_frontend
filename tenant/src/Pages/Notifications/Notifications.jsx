import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import notificationApi from "../../api/notificationApi";
import { emitNotificationRead } from "../../api/socketService";
import useAuth from "../../hooks/useAuth";
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

// Map a notification type/category from the API to an icon key
const resolveType = (notif) => {
  const t = (notif.type || notif.category || "").toLowerCase();
  if (t.includes("appointment")) return "appointment";
  if (t.includes("document") || t.includes("file")) return "document";
  if (t.includes("client")) return "client";
  if (t.includes("success") || t.includes("approved")) return "success";
  if (t.includes("alert") || t.includes("warn") || t.includes("expir")) return "alert";
  return "system";
};

const resolveDate = (notif) => {
  if (!notif.createdAt) return "Other";
  const d = new Date(notif.createdAt);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
};

const resolveTime = (notif) => {
  if (!notif.createdAt) return "";
  return new Date(notif.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const Notifications = () => {
  const navigate = useNavigate();
  const { userId, accessToken, refreshToken } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !accessToken) return;
    setLoading(true);
    notificationApi
      .getNotifications({ userId, userType: "TENANT_STAFF", accessToken, refreshToken })
      .then((res) => {
        const raw = res?.data?.data ?? res?.data ?? res ?? [];
        const list = Array.isArray(raw) ? raw : [];
        console.log("[Notifications] raw:", list);
        setNotifications(list);
      })
      .catch((err) => console.error("[Notifications] Failed to load:", err))
      .finally(() => setLoading(false));
  }, [userId, accessToken]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const groupedNotifications = notifications.reduce((groups, notif) => {
    const date = resolveDate(notif);
    if (!groups[date]) groups[date] = [];
    groups[date].push(notif);
    return groups;
  }, {});

  const handleViewDetails = (notif) => {
    // Mark as read locally
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
    );
    // Mark as read on server + via socket for real-time sync
    notificationApi
      .markNotificationRead({ id: notif.id, accessToken, refreshToken })
      .catch(() => {});
    emitNotificationRead(notif.id);
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
        {loading ? (
          <div className="notifications-empty">
            <IoNotificationsOutline size={48} />
            <p>Loading notifications…</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notifications-empty">
            <IoNotificationsOutline size={48} />
            <p>No notifications</p>
          </div>
        ) : (
          Object.entries(groupedNotifications).map(([date, items]) => (
            <div key={date} className="notifications-group">
              <h3 className="notifications-group-date">{date}</h3>
              <div className="notifications-list">
                {items.map((notif) => {
                  const type = resolveType(notif);
                  const Icon = ICON_MAP[type] || IoNotificationsOutline;
                  return (
                    <div
                      key={notif.id}
                      className={`notification-card ${!notif.isRead ? "notification-card-unread" : ""}`}
                    >
                      <div className={`notification-card-icon notification-icon-${type}`}>
                        <Icon size={20} />
                      </div>
                      <div className="notification-card-content">
                        <h4 className="notification-card-title">
                          {notif.title || notif.message || "Notification"}
                        </h4>
                        <p className="notification-card-desc">
                          {notif.content || notif.description || notif.body || ""}
                        </p>
                        <div className="notification-card-footer">
                          <span className="notification-card-time">{resolveTime(notif)}</span>
                          {!notif.isRead && (
                            <button
                              className="notification-card-link"
                              onClick={() => handleViewDetails(notif)}
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;

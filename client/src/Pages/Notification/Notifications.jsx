import { useState, useEffect } from "react";
import "./Notifications.css";
import DashboardLayout from "../../layouts/ClientLayout";
import messageApi from "../../api/messageApi";
import { emitNotificationRead } from "../../api/socketService";
import useAuth from "../../hooks/useAuth";

const CalendarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="6" width="18" height="15" rx="2" stroke="#4d7cfe" strokeWidth="2" fill="none" />
    <line x1="3" y1="10" x2="21" y2="10" stroke="#4d7cfe" strokeWidth="2" />
    <line x1="7" y1="3" x2="7" y2="7" stroke="#4d7cfe" strokeWidth="2" strokeLinecap="round" />
    <line x1="17" y1="3" x2="17" y2="7" stroke="#4d7cfe" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const resolveTime = (notif) => {
  if (!notif.createdAt) return "";
  return new Date(notif.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const resolveGroup = (notif) => {
  if (!notif.createdAt) return "Other";
  const d = new Date(notif.createdAt);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "yesterday";
  return "earlier";
};

const Notifications = () => {
  const { userId, accessToken, refreshToken } = useAuth();
  const [allNotifications, setAllNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !accessToken) return;
    setLoading(true);
    messageApi
      .GetNotifications({ userId, userType: "CLIENT", accessToken, refreshToken })
      .then((res) => {
        const raw = res?.data?.data ?? res?.data ?? res ?? [];
        setAllNotifications(Array.isArray(raw) ? raw : []);
      })
      .catch((err) => console.error("[Notifications] Failed to load:", err))
      .finally(() => setLoading(false));
  }, [userId, accessToken]);

  const handleMarkRead = (notif) => {
    setAllNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
    );
    messageApi.MarkNotificationRead({ id: notif.id, accessToken, refreshToken }).catch(() => {});
    emitNotificationRead(notif.id);
  };

  const grouped = allNotifications.reduce((acc, n) => {
    const g = resolveGroup(n);
    (acc[g] = acc[g] || []).push(n);
    return acc;
  }, {});

  const renderNotification = (notification) => (
    <div key={notification.id} className={`notification-card${!notification.isRead ? " notification-card--unread" : ""}`}>
      <div className="notification-icon">
        <CalendarIcon />
      </div>
      <div className="notification-body">
        <h3 className="notification-title">{notification.title || "Notification"}</h3>
        <p className="notification-message">
          {notification.content || notification.description || notification.body || ""}
        </p>
        <div className="notification-footer">
          <span className="notification-time">{resolveTime(notification)}</span>
          {!notification.isRead && (
            <button
              className="notification-action"
              onClick={() => handleMarkRead(notification)}
            >
              Mark as read
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="notifications-container">
        <div className="notifications-page">
          <header className="notifications-header">
            <h1 className="page-title">Notifications</h1>
          </header>

          {loading ? (
            <p style={{ color: "#5f6368", fontSize: "14px" }}>Loading notifications…</p>
          ) : allNotifications.length === 0 ? (
            <p style={{ color: "#5f6368", fontSize: "14px" }}>No notifications</p>
          ) : (
            <div className="notifications-content">
              {grouped.today?.length > 0 && (
                <section className="notifications-section">
                  <h2 className="section-title">Today</h2>
                  <div className="notifications-list">
                    {grouped.today.map(renderNotification)}
                  </div>
                </section>
              )}
              {grouped.yesterday?.length > 0 && (
                <section className="notifications-section">
                  <h2 className="section-title">Yesterday</h2>
                  <div className="notifications-list">
                    {grouped.yesterday.map(renderNotification)}
                  </div>
                </section>
              )}
              {grouped.earlier?.length > 0 && (
                <section className="notifications-section">
                  <h2 className="section-title">Earlier</h2>
                  <div className="notifications-list">
                    {grouped.earlier.map(renderNotification)}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Notifications;

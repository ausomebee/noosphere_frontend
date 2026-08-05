import usePageTitle from "../../hooks/usePageTitle";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Notifications.css";
import DashboardLayout from "../../layouts/ClientLayout";
import LoadingSpinner from "../../Components/LoadingSpinner";
import messageApi from "../../api/messageApi";
import { emitNotificationRead, onNotification } from "../../api/socketService";
import useAuth from "../../hooks/useAuth";
import { getNotificationAction } from "../../Data/notificationConfig";
import { formatDateHeader } from "../../Helper/Formatters";

const CalendarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="6" width="18" height="15" rx="2" stroke="#4d7cfe" strokeWidth="2" fill="none" />
    <line x1="3" y1="10" x2="21" y2="10" stroke="#4d7cfe" strokeWidth="2" />
    <line x1="7" y1="3" x2="7" y2="7" stroke="#4d7cfe" strokeWidth="2" strokeLinecap="round" />
    <line x1="17" y1="3" x2="17" y2="7" stroke="#4d7cfe" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const resolveRelativeTime = (createdAt) => {
  if (!createdAt) return "";
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

const Notifications = () => {
  const navigate = useNavigate();
  const { userId, accessToken, refreshToken } = useAuth();
  usePageTitle("Notifications");
  const [allNotifications, setAllNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !accessToken) return;
    setLoading(true);
    messageApi
      .GetNotifications({ userId, userType: "CLIENT", accessToken, refreshToken })
      .then((res) => {
        const raw = res?.data?.data ?? res?.data ?? res ?? [];
        // Each item may arrive flat or wrapped as { notification: {...} }.
        const list = (Array.isArray(raw) ? raw : []).map((n) => n?.notification ?? n);
        setAllNotifications(list);
      })
      .catch((err) => console.error("[Notifications] Failed to load:", err))
      .finally(() => setLoading(false));
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live updates: the socket pushes a "newNotification" whose payload uses the
  // same keys as the fetched list, so prepend it directly — no refresh needed.
  useEffect(() => {
    const unsub = onNotification((incoming) => {
      const notif = incoming?.notification ?? incoming;
      if (!notif) return;
      setAllNotifications((prev) => {
        if (notif.id && prev.some((n) => n.id === notif.id)) {
          return prev.map((n) => (n.id === notif.id ? { ...n, ...notif } : n));
        }
        return [notif, ...prev];
      });
    });
    return unsub;
  }, []);

  const unreadCount = allNotifications.filter((n) => !n.isRead).length;

  const markRead = (notification) => {
    if (notification.isRead) return;
    setAllNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
    );
    messageApi.MarkNotificationRead({ id: notification.id, accessToken, refreshToken }).catch(() => {
      // Silent — marking as read is non-critical, UI already updated optimistically
    });
    emitNotificationRead(notification.id);
  };

  // Primary action: mark read, then navigate to the mapped destination.
  const handleAction = (notification) => {
    markRead(notification);
    const action = getNotificationAction(notification);
    if (action?.path) {
      navigate(action.path, action.state ? { state: action.state } : undefined);
    }
  };

  const handleMarkAllRead = () => {
    const unread = allNotifications.filter((n) => !n.isRead);
    if (!unread.length) return;
    setAllNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    unread.forEach((n) => {
      messageApi.MarkNotificationRead({ id: n.id, accessToken, refreshToken }).catch(() => {});
      emitNotificationRead(n.id);
    });
  };

  // Group by date header (Today, Yesterday, ...), most recent first.
  const sorted = [...allNotifications].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
  const byDate = sorted.reduce((acc, n) => {
    const key = n.createdAt ? formatDateHeader(n.createdAt) : "Earlier";
    (acc[key] = acc[key] || []).push(n);
    return acc;
  }, {});
  const dateGroups = Object.keys(byDate);

  const renderCard = (notification) => {
    const action = getNotificationAction(notification);
    return (
      <div
        key={notification.id}
        className={`notification-card${!notification.isRead ? " notification-card--unread" : ""}`}
      >
        <div className="notification-icon">
          <CalendarIcon />
        </div>
        <div className="notification-body">
          <div className="notification-top-row">
            <h3 className="notification-title">{notification.title || "Notification"}</h3>
            <button className="notification-action" onClick={() => handleAction(notification)}>
              {action?.label || "View details"}
            </button>
          </div>
          <p className="notification-message">
            {notification.content || notification.description || notification.body || ""}
          </p>
          <span className="notification-time">{resolveRelativeTime(notification.createdAt)}</span>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="notifications-container">
        <div className="notifications-page">
          <header className="notifications-header">
            <h1 className="page-title">Notifications</h1>
            {unreadCount > 0 && (
              <button className="notifications-mark-all" onClick={handleMarkAllRead}>
                Mark all as read
              </button>
            )}
          </header>

          {loading ? (
            <LoadingSpinner />
          ) : allNotifications.length === 0 ? (
            <p style={{ color: "#5f6368", fontSize: "14px" }}>No notifications</p>
          ) : (
            <div className="notifications-content">
              {dateGroups.map((date) => (
                <section key={date} className="notifications-section">
                  <h2 className="notification-type-label">{date}</h2>
                  <div className="notifications-list">
                    {byDate[date].map(renderCard)}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Notifications;

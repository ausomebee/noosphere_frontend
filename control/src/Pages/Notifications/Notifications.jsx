import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoNotificationsOutline,
  IoCardOutline,
  IoBusinessOutline,
  IoPricetagsOutline,
  IoRefreshOutline,
  IoAlertCircleOutline,
  IoCheckmarkCircleOutline,
} from "react-icons/io5";
import LoadingSpinner from "../../Components/LoadingSpinner";
import usePageTitle from "../../hooks/usePageTitle";
import useAuth from "../../hooks/useAuth";
import notificationApi from "../../api/notificationApi";
import { onNotification } from "../../api/socketService";
import { getNotificationAction } from "../../Data/notificationConfig";
import "./Notifications.css";

// Icon key per notification type (grouped by domain).
const ICON_MAP = {
  payment: IoCardOutline,
  tenant: IoBusinessOutline,
  plan: IoPricetagsOutline,
  subscription: IoRefreshOutline,
  issue: IoAlertCircleOutline,
  success: IoCheckmarkCircleOutline,
  system: IoNotificationsOutline,
};

// Map a notification type to an icon key.
const resolveIconKey = (notif) => {
  const t = (notif?.type || "").toUpperCase();
  if (t.includes("PAYMENT") || t.includes("PRODUCT_ACCESS")) return "payment";
  if (t.includes("TENANT")) return "tenant";
  if (t.includes("PLAN")) return "plan";
  if (t.includes("SUBSCRIPTION")) return "subscription";
  if (t.includes("RESOLVED") || t.includes("AUTO_RENEWED")) return "success";
  if (t.includes("ISSUE")) return "issue";
  return "system";
};

// Human-friendly relative time (control has no shared relative formatter).
const relativeTime = (dateStr) => {
  if (!dateStr) return "";
  const then = new Date(dateStr);
  if (isNaN(then.getTime())) return "";
  const diff = Date.now() - then.getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

// Section header for a date group: "Today", "Yesterday", or "Weekday, Mon D".
const dateHeader = (dateStr) => {
  if (!dateStr) return "Earlier";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Earlier";
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
};

const Notifications = () => {
  const navigate = useNavigate();
  const { userId, accessToken, refreshToken } = useAuth();
  usePageTitle("Notifications");

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(() => {
    if (!userId || !accessToken) return;
    setLoading(true);
    notificationApi
      .getNotifications({ userId, userType: "ADMIN", accessToken, refreshToken })
      .then((res) => {
        const raw = res?.data?.data ?? res?.data ?? res ?? [];
        // Each item may arrive flat or wrapped as { notification: {...} }.
        const list = (Array.isArray(raw) ? raw : []).map((n) => n?.notification ?? n);
        setNotifications(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, accessToken, refreshToken]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Live updates: the socket pushes a "newNotification" whose payload uses the
  // same keys as the fetched list, so prepend it directly — no refresh needed.
  useEffect(() => {
    const unsub = onNotification((incoming) => {
      const notif = incoming?.notification ?? incoming;
      if (!notif) return;
      setNotifications((prev) => {
        if (notif.id && prev.some((n) => n.id === notif.id)) {
          return prev.map((n) => (n.id === notif.id ? { ...n, ...notif } : n));
        }
        return [notif, ...prev];
      });
    });
    return unsub;
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Group by date header (Today, Yesterday, ...), most recent first.
  const sorted = [...notifications].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
  const byDate = sorted.reduce((acc, n) => {
    const key = dateHeader(n.createdAt);
    (acc[key] = acc[key] || []).push(n);
    return acc;
  }, {});
  const dateGroups = Object.keys(byDate);

  // Mark a single notification read (optimistic + server).
  const markRead = (notif) => {
    if (notif.isRead) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
    );
    notificationApi
      .markNotificationRead({ id: notif.id, accessToken, refreshToken })
      .catch(() => {
        // Non-critical — UI already updated optimistically.
      });
  };

  // Primary action: mark read, then navigate to the mapped destination.
  const handleAction = (notif) => {
    markRead(notif);
    const action = getNotificationAction(notif);
    if (action?.path) {
      navigate(action.path, action.state ? { state: action.state } : undefined);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (!unread.length) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await Promise.all(
      unread.map((n) =>
        notificationApi
          .markNotificationRead({ id: n.id, accessToken, refreshToken })
          .catch(() => {})
      )
    );
    // Refresh from the server so the list reflects the persisted read state.
    loadNotifications();
  };

  return (
    <div className="ctrl-notifications-page">
      {/* Header */}
      <div className="ctrl-notifications-header">
        <div className="ctrl-notifications-header-left">
          <h1 className="ctrl-notifications-title">Notifications</h1>
          {unreadCount > 0 && (
            <span className="ctrl-notifications-count">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button className="ctrl-notifications-mark-all" onClick={handleMarkAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      {/* Body */}
      <div className="ctrl-notifications-body">
        {loading ? (
          <LoadingSpinner />
        ) : notifications.length === 0 ? (
          <div className="ctrl-notifications-empty">
            <IoNotificationsOutline size={48} />
            <p>No notifications</p>
          </div>
        ) : (
          dateGroups.map((date) => {
            const items = byDate[date];
            if (!items.length) return null;
            return (
              <div key={date} className="ctrl-notifications-group">
                <h3 className="ctrl-notifications-group-label">{date}</h3>
                <div className="ctrl-notifications-list">
                  {items.map((notif) => {
                    const iconKey = resolveIconKey(notif);
                    const Icon = ICON_MAP[iconKey] || IoNotificationsOutline;
                    const action = getNotificationAction(notif);
                    return (
                      <div
                        key={notif.id}
                        className={`ctrl-notification-card ${
                          !notif.isRead ? "ctrl-notification-card-unread" : ""
                        }`}
                      >
                        <div className={`ctrl-notification-icon ctrl-notification-icon-${iconKey}`}>
                          <Icon size={20} />
                        </div>
                        <div className="ctrl-notification-content">
                          <h4 className="ctrl-notification-card-title">
                            {notif.title || "Notification"}
                          </h4>
                          <p className="ctrl-notification-card-desc">
                            {notif.content || notif.description || notif.body || ""}
                          </p>
                          <div className="ctrl-notification-card-footer">
                            <span className="ctrl-notification-card-time">
                              {relativeTime(notif.createdAt)}
                            </span>
                            <button
                              className="ctrl-notification-card-link"
                              onClick={() => handleAction(notif)}
                            >
                              {action?.label || "View details"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Notifications;

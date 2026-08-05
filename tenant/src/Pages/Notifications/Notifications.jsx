import usePageTitle from "../../hooks/usePageTitle";
import LoadingSpinner from "../../Components/LoadingSpinner";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import notificationApi from "../../api/notificationApi";
import { emitNotificationRead, onNotification } from "../../api/socketService";
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
import { formatDateHeader, formatMsgTime } from "../../Helper/Formatters";
import useFormatSettings from "../../hooks/useFormatSettings";
import { getNotificationAction } from "../../Data/notificationConfig";
import "./Notifications.css";

const ICON_MAP = {
  appointment: IoCalendarOutline,
  document: IoDocumentTextOutline,
  client: IoPersonOutline,
  system: IoNotificationsOutline,
  success: IoCheckmarkCircleOutline,
  alert: IoAlertCircleOutline,
};

// Map a notification type to an icon key
const resolveType = (notif) => {
  const t = (notif.type || notif.category || "").toLowerCase();
  if (t.includes("appointment") || t.includes("reschedule")) return "appointment";
  if (t.includes("document") || t.includes("form") || t.includes("report") || t.includes("timesheet")) return "document";
  if (t.includes("client")) return "client";
  if (t.includes("approved") || t.includes("completed") || t.includes("signed") || t.includes("resolved")) return "success";
  if (t.includes("expir") || t.includes("cancel") || t.includes("reject") || t.includes("exhaust")) return "alert";
  return "system";
};

const resolveDate = (notif) => {
  if (!notif.createdAt) return "Other";
  return formatDateHeader(notif.createdAt);
};

const resolveTime = (notif, timeFormat) => {
  if (!notif.createdAt) return "";
  return formatMsgTime(notif.createdAt, timeFormat);
};

const Notifications = () => {
  const navigate = useNavigate();
  const { userId, accessToken, refreshToken } = useAuth();
  const { timeFormat } = useFormatSettings();
  usePageTitle("Notifications");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !accessToken) return;
    setLoading(true);
    notificationApi
      .getNotifications({ userId, userType: "TENANT_STAFF", accessToken, refreshToken })
      .then((res) => {
        const raw = res?.data?.data ?? res?.data ?? res ?? [];
        // Each item may arrive flat or wrapped as { notification: {...} }.
        const list = (Array.isArray(raw) ? raw : []).map((n) => n?.notification ?? n);
        setNotifications(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const groupedNotifications = notifications.reduce((groups, notif) => {
    const date = resolveDate(notif);
    if (!groups[date]) groups[date] = [];
    groups[date].push(notif);
    return groups;
  }, {});

  // Mark a single notification read (optimistic + server + socket).
  const markRead = (notif) => {
    if (notif.isRead) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
    );
    notificationApi
      .markNotificationRead({ id: notif.id, accessToken, refreshToken })
      .catch(() => {
        // Non-critical — UI already updated optimistically
      });
    emitNotificationRead(notif.id);
  };

  // Primary action: mark read, then navigate to the mapped destination.
  const handleAction = (notif) => {
    markRead(notif);
    const action = getNotificationAction(notif);
    if (action?.path) {
      navigate(action.path, action.state ? { state: action.state } : undefined);
    }
  };

  const handleMarkAllRead = () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (!unread.length) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    unread.forEach((n) => {
      notificationApi
        .markNotificationRead({ id: n.id, accessToken, refreshToken })
        .catch(() => {});
      emitNotificationRead(n.id);
    });
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
        <div className="notifications-header-actions">
          {unreadCount > 0 && (
            <button className="notifications-mark-all" onClick={handleMarkAllRead}>
              Mark all as read
            </button>
          )}
          <button className="notifications-close" onClick={handleClose}>
            <IoClose size={18} />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Notification groups */}
      <div className="notifications-body">
        {loading ? (
          <LoadingSpinner />
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
                  const action = getNotificationAction(notif);
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
                          <span className="notification-card-time">{resolveTime(notif, timeFormat)}</span>
                          <button
                            className="notification-card-link"
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
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;

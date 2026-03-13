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

// Notification type → section header label
const TYPE_LABEL = {
  APPOINTMENT_SCHEDULED:                   "NEW APPOINTMENT",
  APPOINTMENT_ABOUT_TO_START:              "UPCOMING APPOINTMENT",
  APPOINTMENT_RESCHEDULED:                 "RESCHEDULED APPOINTMENT",
  APPOINTMENT_STARTED:                     "APPOINTMENT START",
  APPOINTMENT_CANCELLED:                   "CANCELLED APPOINTMENTS",
  APPOINTMENT_COMPLETED_AWAITING_FEEDBACK: "COMPLETED APPOINTMENT AWAITING FEEDBACK",
  DOCUMENT_REQUESTED:                      "DOCUMENT REQUEST",
  DOCUMENT_REQUEST_NUDGE:                  "DOCUMENT REQUEST NUDGE",
  FORM_SHARED:                             "FORM REQUEST",
  AUTHORIZATION_EXPIRY_30_DAYS:            "AUTHORIZATION EXPIRY - 30 DAYS",
  AUTHORIZATION_EXPIRY_7_DAYS:             "AUTHORIZATION EXPIRY - 7 DAYS",
  AUTHORIZATION_EXPIRED:                   "AUTHORIZATION EXPIRED",
  AUTHORIZATION_UNITS_ALMOST_EXHAUSTED:    "AUTHORIZATION UTILIZATION",
  AUTHORIZATION_UNITS_EXHAUSTED:           "AUTHORIZATION UTILIZATION",
  SIGNATURE_REQUESTED:                     "CLIENT REPORT SIGNATURE REQUEST",
};

const TYPE_ORDER = [
  "APPOINTMENT_SCHEDULED",
  "APPOINTMENT_ABOUT_TO_START",
  "APPOINTMENT_RESCHEDULED",
  "APPOINTMENT_STARTED",
  "APPOINTMENT_CANCELLED",
  "APPOINTMENT_COMPLETED_AWAITING_FEEDBACK",
  "DOCUMENT_REQUESTED",
  "DOCUMENT_REQUEST_NUDGE",
  "FORM_SHARED",
  "AUTHORIZATION_EXPIRY_30_DAYS",
  "AUTHORIZATION_EXPIRY_7_DAYS",
  "AUTHORIZATION_EXPIRED",
  "AUTHORIZATION_UNITS_ALMOST_EXHAUSTED",
  "AUTHORIZATION_UNITS_EXHAUSTED",
  "SIGNATURE_REQUESTED",
];

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
  }, [userId, accessToken, refreshToken]);

  const handleAction = (notification) => {
    if (!notification.isRead) {
      setAllNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      messageApi.MarkNotificationRead({ id: notification.id, accessToken, refreshToken }).catch(() => {});
      emitNotificationRead(notification.id);
    }
  };

  // Group by type, preserve TYPE_ORDER, unknown types appended at end
  const byType = allNotifications.reduce((acc, n) => {
    const key = n.type || "UNKNOWN";
    (acc[key] = acc[key] || []).push(n);
    return acc;
  }, {});

  const unknownTypes = Object.keys(byType).filter((t) => !TYPE_ORDER.includes(t));
  const orderedTypes = [...TYPE_ORDER, ...unknownTypes].filter((t) => byType[t]?.length > 0);

  const renderCard = (notification) => (
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
            {notification.type === "APPOINTMENT_COMPLETED_AWAITING_FEEDBACK" ? "Review" : "View details"}
          </button>
        </div>
        <p className="notification-message">
          {notification.content || notification.description || notification.body || ""}
        </p>
        <span className="notification-time">{resolveRelativeTime(notification.createdAt)}</span>
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
              {orderedTypes.map((type) => (
                <section key={type} className="notifications-section">
                  <h2 className="notification-type-label">
                    {TYPE_LABEL[type] ?? type.replace(/_/g, " ")}
                  </h2>
                  <div className="notifications-list">
                    {byType[type].map(renderCard)}
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

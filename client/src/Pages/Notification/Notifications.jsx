import React, { useState } from "react";
import "./Notifications.css";
import DashboardLayout from "../../layouts/ClientLayout";

// Calendar Icon Component
const CalendarIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="3"
      y="6"
      width="18"
      height="15"
      rx="2"
      stroke="#4d7cfe"
      strokeWidth="2"
      fill="none"
    />
    <line x1="3" y1="10" x2="21" y2="10" stroke="#4d7cfe" strokeWidth="2" />
    <line
      x1="7"
      y1="3"
      x2="7"
      y2="7"
      stroke="#4d7cfe"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line
      x1="17"
      y1="3"
      x2="17"
      y2="7"
      stroke="#4d7cfe"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const Notifications = () => {
  const [notifications] = useState({
    today: [
      {
        id: 1,
        type: "new",
        title: "New Appointment",
        message:
          "You have received a new appointment schedule from Dr Francesca",
        action: "View details",
        time: "2 minutes ago",
      },
      {
        id: 2,
        type: "due",
        title: "Your appointment is due today",
        message:
          "You have an appointment with Dr Patrick that is due in 3 hours",
        action: "View details",
        time: "2 hours ago",
      },
      {
        id: 3,
        type: "action",
        title: "Action Required! - Please review your session with Dr Amelia",
        message:
          "Your session with Dr Amelia was marked as complete. Please review and confirm.",
        action: "Review",
        time: "2 hours ago",
      },
      {
        id: 4,
        type: "action",
        title: "Action Required! - Please review your session with Dr Akash",
        message:
          "Your session with Dr Akash was marked as complete. Please review and confirm.",
        action: "Review",
        time: "2 hours ago",
      },
    ],
    yesterday: [
      {
        id: 5,
        type: "action",
        title: "Action Required! - Please review your session with Dr Amelia",
        message:
          "Your session with Dr Amelia was marked as complete. Please review and confirm.",
        action: "Review",
        time: "2 hours ago",
      },
    ],
  });

  const renderNotification = (notification) => {
    return (
      <div key={notification.id} className="notification-card">
        <div className="notification-icon">
          <CalendarIcon />
        </div>
        <div className="notification-body">
          <h3 className="notification-title">{notification.title}</h3>
          <p className="notification-message">{notification.message}</p>
          <div className="notification-footer">
            <span className="notification-time">{notification.time}</span>
          </div>
        </div>
        <button className="notification-action">{notification.action}</button>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="notifications-container">
        <div className="notifications-page">
          <header className="notifications-header">
            <h1 className="page-title">Notifications</h1>
          </header>

          <div className="notifications-content">
            <section className="notifications-section">
              <h2 className="section-title">Today</h2>
              <div className="notifications-list">
                {notifications.today.map((notification) =>
                  renderNotification(notification)
                )}
              </div>
            </section>

            <section className="notifications-section">
              <h2 className="section-title">Yesterday</h2>
              <div className="notifications-list">
                {notifications.yesterday.map((notification) =>
                  renderNotification(notification)
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Notifications;

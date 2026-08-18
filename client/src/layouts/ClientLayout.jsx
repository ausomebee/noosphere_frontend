import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { GoHome } from "react-icons/go";
import { HiOutlineMenuAlt2 } from "react-icons/hi";
import { IoDocumentTextOutline, IoChatbubblesOutline } from "react-icons/io5";
import { LuUser } from "react-icons/lu";
import { MdOutlineNotificationsNone } from "react-icons/md";
import { TbLogout2 } from "react-icons/tb";
import { VscClose } from "react-icons/vsc";
import { useDispatch } from "react-redux";
import { logout } from "../ReduxStore/features/authentication";
import useAuth from "../hooks/useAuth";
import useSocket from "../hooks/useSocket";
import { disconnectSocket } from "../api/socketService";
import messageApi from "../api/messageApi";
import { persistor } from "../ReduxStore/store";
import useIdleTimeout from "../hooks/useIdleTimeout";
import MessageModal from "../Components/Modal/MessageModal";
import "./DashboardLayout.css";
import Logo from "../assets/Logo.svg";
import { navConfig } from "../Data/selectOptions";

import ConnectionStatus from "../Components/ConnectionStatus/ConnectionStatus";
const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineBanner, setShowOnlineBanner] = useState(false);

  useEffect(() => {
    let timer;
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineBanner(true);
      timer = setTimeout(() => setShowOnlineBanner(false), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowOnlineBanner(false);
      clearTimeout(timer);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearTimeout(timer);
    };
  }, []);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { firstName, lastName, avatarUrl, userId, accessToken, refreshToken } = useAuth();
  const { isConnected } = useSocket({
    onMessage: () => setMessageCount((c) => c + 1),
    // Live-count incoming notifications even while the user is elsewhere in the
    // app, so the sidebar badge tells them something is waiting.
    onNotification: () => setNotifCount((c) => c + 1),
  });

  // Seed the badge with the unread count already on the server, so it survives
  // refreshes/logins (not just sockets fired during this session).
  useEffect(() => {
    if (!userId || !accessToken) return;
    messageApi
      .GetNotifications({ userId, userType: "CLIENT", accessToken, refreshToken })
      .then((res) => {
        const raw = res?.data?.data ?? res?.data ?? res ?? [];
        const list = (Array.isArray(raw) ? raw : []).map((n) => n?.notification ?? n);
        setNotifCount(list.filter((n) => !n.isRead).length);
      })
      .catch(() => {});
  }, [userId, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useIdleTimeout();
  const displayName = `${firstName} ${lastName}`.trim() || "User";

  const iconMap = {
    "/dashboard": <GoHome size={20} />,
    "/programs": <HiOutlineMenuAlt2 size={20} />,
    "/notifications": <MdOutlineNotificationsNone size={20} />,
    "/documents": <IoDocumentTextOutline size={20} />,
    "/profile": <LuUser size={20} />,
  };

  const navItems = navConfig.map((item) => ({
    ...item,
    icon: iconMap[item.path],
  }));

  const handleLogout = () => {
    disconnectSocket();
    dispatch(logout());
    persistor.purge();
    navigate("/");
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="dashboard-layout">
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      {(!isOnline || showOnlineBanner) && (
        <div className={`network-status-banner ${isOnline ? "online" : "offline"}`}>
          <span className="network-status-dot" />
          {isOnline ? "Back online" : "You are offline — check your connection"}
        </div>
      )}
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-logo">
          <img src={Logo} alt="Logo" />
        </div>

        <div className="header-actions">
          <button
            className="header-msg-btn"
            onClick={() => {
              setMessageCount(0);
              setMessageModalOpen(true);
            }}
            aria-label="Messages"
            title="Message your clinician"
          >
            <IoChatbubblesOutline size={20} />
            {messageCount > 0 && (
              <span className="header-msg-badge">
                {messageCount > 99 ? "99+" : messageCount}
              </span>
            )}
          </button>

          <button
            className="header-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <VscClose size={24} /> : <HiOutlineMenuAlt2 size={24} />}
          </button>
        </div>
      </header>

      <MessageModal
        isOpen={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
      />

      {/* Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "active" : ""}`}
        onClick={closeSidebar}
      />

      {/* Main Container */}
      <div className="dashboard-container">
        <aside className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-profile">
            <div className="profile-avatar conn-status-anchor">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    background: "#3b82f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: "18px",
                    fontWeight: "600",
                  }}
                >
                  {firstName?.charAt(0)?.toUpperCase() || "U"}
                  {lastName?.charAt(0)?.toUpperCase() || ""}
                </div>
              )}
              <ConnectionStatus isConnected={isConnected} />
            </div>
            <div className="profile-info">
              <h3>Welcome</h3>
              <p>{displayName}</p>
            </div>
          </div>

          <ul className="sidebar-nav">
            {navItems.map((item, index) => {
              const isNotifItem = item.path === "/notifications";
              return (
                <li key={index} className="nav-item">
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `nav-link ${isActive ? "active" : ""}`
                    }
                    onClick={() => {
                      closeSidebar();
                      if (isNotifItem) setNotifCount(0);
                    }}
                  >
                    {item.icon}
                    {item.label}
                    {isNotifItem && notifCount > 0 && (
                      <span className="nav-badge">
                        {notifCount > 99 ? "99+" : notifCount}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>

          <button className="logout-link" onClick={handleLogout}>
            <TbLogout2 size={20} />
            Logout
          </button>
        </aside>

        <main id="main-content" className="dashboard-main">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;

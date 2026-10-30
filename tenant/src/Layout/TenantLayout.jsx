import React, { useState, useEffect, useRef } from "react";
import {
  FaTachometerAlt,
  FaCalendarAlt,
  FaUsers,
  FaBuilding,
  FaMoneyBillWave,
  FaBook,
  FaChartBar,
  FaFileAlt,
  FaQuestionCircle,
  FaCog,
  FaBars,
  FaChevronDown,
  FaChevronUp,
  FaReceipt,
} from "react-icons/fa";
import { MdMessage } from "react-icons/md";
import { IoNotifications, IoNotificationsOutline, IoLogOutOutline } from "react-icons/io5";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import TenantLogo from "../assets/Logo.svg";
import "./DashboardLayout.css";
import { FiChevronDown } from "react-icons/fi";
import { useDispatch } from "react-redux";
import useAuth from "../hooks/useAuth";
import usePermissions from "../hooks/usePermissions";
import { logout } from "../ReduxStore/features/authentication";
import { disconnectSocket } from "../api/socketService";
import { persistor } from "../ReduxStore/store";
import useIdleTimeout from "../hooks/useIdleTimeout";
import MessageModal from "../Components/MessageModal/MessageModal";
import useSocket from "../hooks/useSocket";
import notificationApi from "../api/notificationApi";

import ConnectionStatus from "../Components/ConnectionStatus/ConnectionStatus";
const Sidebar = ({ isOpen, toggleSidebar, isMobile }) => {
  const location = useLocation();
  const { hasModule, hasPermission } = usePermissions();
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    if (!isOpen) {
      setExpandedItems({});
    }
  }, [isOpen]);

  const allNavItems = [
    { name: "Dashboard", icon: FaTachometerAlt, path: "/dashboard", moduleKey: "DASHBOARD" },
    {
      name: "Scheduler",
      icon: FaCalendarAlt,
      path: "/scheduler",
      moduleKey: "SCHEDULER",
      children: [
        { name: "Calendar", path: "/scheduler/calendar", permissionKeys: ["calendar", "view_calendar"] },
        { name: "Appointments", path: "/scheduler/appointments", permissionKeys: ["appointments", "view_upcoming_appointments"] },
      ],
    },
    {
      name: "Clients",
      icon: FaUsers,
      path: "/clients",
      moduleKey: "CLIENTS",
      children: [
        { name: "Pipeline", path: "/clients/pipeline", permissionKeys: ["client_pipeline", "view_onboarding_pipeline"] },
        { name: "Client List", path: "/clients/client-list", permissionKeys: ["client_list", "view_client_list"] },
      ],
    },
    {
      name: "My Organization",
      icon: FaBuilding,
      path: "/organization",
      moduleKey: "MY_ORGANIZATION",
      children: [
        { name: "General", path: "/organization/general", permissionKeys: ["general", "view_organization_information"] },
        { name: "Staff & Teams", path: "/organization/staff-and-teams", permissionKeys: ["staff_teams", "view_staff_list"] },
        { name: "Practice Settings", path: "/organization/practice-settings", permissionKeys: ["practice_settings", "view_diagnosis_codes", "view_session_types", "view_service_codes_list", "view_rounding_rules_list", "view_payers_list"] },
        { name: "Role & Permissions", path: "/organization/role-and-permissions", permissionKeys: ["roles_permissions", "view_roles_list"] },
      ],
    },
    {
      name: "Billing & Payments",
      icon: FaMoneyBillWave,
      path: "/billing",
      moduleKey: "BILLINGS_PAYMENTS",
      children: [
        { name: "Timesheets", path: "/billing/timesheets", permissionKeys: ["timesheets", "view_timesheets_list"] },
        { name: "Claims", path: "/billing/claims", permissionKeys: ["claims", "can_view_claims"] },
        // Service Codes / Rounding Rules / Payers moved to My Organization → Practice Settings.
      ],
    },
    {
      name: "Payroll",
      icon: FaReceipt,
      path: "/payroll",
      moduleKey: "PAYROLL",
      children: [
        { name: "Payroll", path: "/payroll/payroll-setup", permissionKeys: ["payroll", "view_payroll_list"] },
        { name: "Payroll Settings", path: "/payroll/payroll-settings", permissionKeys: ["payroll_settings", "view_income_items_list"] },
      ],
    },
    { name: "Program Library", icon: FaBook, path: "/program-library", moduleKey: "PROGRAM_LIBRARY" },
    { name: "Reports", icon: FaChartBar, path: "/reports", moduleKey: "REPORTS" },
    {
      name: "Custom Forms",
      icon: FaFileAlt,
      path: "/custom-forms",
      moduleKey: "CUSTOM_FORMS",
      children: [
        { name: "Forms", path: "/custom-forms/forms", permissionKeys: ["forms", "view_form_list"] },
        { name: "Templates Library", path: "/custom-forms/templates-library", permissionKeys: ["template_library", "view_template_list"] },
      ],
    },
    {
      name: "Help & Support",
      icon: FaQuestionCircle,
      path: "/help",
      moduleKey: "HELP_SUPPORT",
      children: [
        { name: "Support Requests", path: "/help/support-requests", permissionKeys: ["support_requests", "view_support_request_list"] },
        // { name: "Knowledge Base", path: "/help/knowledge-base", permissionKey: "view_knowledge_base" },
      ],
    },
    { name: "Settings", icon: FaCog, path: "/settings", moduleKey: "SETTINGS" },
  ];

  // Filter nav items based on module access, then filter children by permission
  const navItems = allNavItems
    .filter((item) => !item.moduleKey || hasModule(item.moduleKey))
    .map((item) => {
      if (!item.children) return item;
      const filteredChildren = item.children.filter((child) => {
        // Support an any-of `permissionKeys` array (e.g. a page that merges
        // several permission-gated tabs) alongside the single `permissionKey`.
        if (child.permissionKeys) {
          return child.permissionKeys.some((key) => hasPermission(key));
        }
        return !child.permissionKey || hasPermission(child.permissionKey);
      });
      return filteredChildren.length > 0 ? { ...item, children: filteredChildren } : null;
    })
    .filter(Boolean);

  const toggleExpand = (name) => {
    setExpandedItems((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  return (
    <>
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <div
        className={`sidebar ${isOpen ? "open" : "closed"} ${
          isMobile ? "mobile" : ""
        }`}
        onClick={(e) => isMobile && e.stopPropagation()}
      >
        <div className="sidebar-content">
          <div className="logo-container">
            {isMobile && isOpen && (
              <button
                className="close-sidebar-button"
                onClick={toggleSidebar}
                aria-label="Close menu"
              >
                &times;
              </button>
            )}
            <img src={TenantLogo} alt="Logo" className="layout-logo" />
          </div>
          <nav>
            <ul className="nav-list">
              {navItems.map((item) => (
                <li key={item.name} className="nav-item">
                  {item.children ? (
                    <div className="expandable">
                      <button
                        className={`nav-link ${
                          location.pathname.startsWith(item.path)
                            ? "active"
                            : ""
                        }`}
                        onClick={() => toggleExpand(item.name)}
                        aria-expanded={!!expandedItems[item.name]}
                      >
                        <item.icon className="nav-icon" size={24} aria-hidden="true" />
                        {isOpen && item.name}
                        {isOpen &&
                          (expandedItems[item.name] ? (
                            <FaChevronUp className="expand-icon" aria-hidden="true" />
                          ) : (
                            <FaChevronDown className="expand-icon" aria-hidden="true" />
                          ))}
                      </button>
                      {isOpen && expandedItems[item.name] && (
                        <ul className="sub-nav-list">
                          {item.children.map((child) => (
                            <li key={child.name}>
                              <Link
                                to={child.path}
                                className={`nav-link sub-nav-link ${
                                  location.pathname === child.path
                                    ? "active"
                                    : ""
                                }`}
                                onClick={() => isMobile && toggleSidebar()}
                              >
                                {child.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <Link
                      to={item.path}
                      className={`nav-link ${
                        location.pathname === item.path ? "active" : ""
                      }`}
                      onClick={() => isMobile && toggleSidebar()}
                    >
                      <item.icon className="nav-icon" />
                      {isOpen && item.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

    </>
  );
};

const DashboardLayout = ({ children }) => {
  const { user, userId, accessToken, refreshToken } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [messageCount, setMessageCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 992);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineBanner, setShowOnlineBanner] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  // Unread notification count shown on the bell — driven by the socket, so no
  // banner is needed.
  const [notifCount, setNotifCount] = useState(0);
  const profileDropdownRef = useRef(null);

  useIdleTimeout();

  // Seed the bell with the unread count already on the server, so it survives
  // refreshes/logins (not just sockets fired during this session).
  useEffect(() => {
    if (!userId || !accessToken) return;
    notificationApi
      .getNotifications({ userId, userType: "TENANT_STAFF", accessToken, refreshToken })
      .then((res) => {
        const raw = res?.data?.data ?? res?.data ?? res ?? [];
        const list = (Array.isArray(raw) ? raw : []).map((n) => n?.notification ?? n);
        setNotifCount(list.filter((n) => !n.isRead).length);
      })
      .catch(() => {});
  }, [userId, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wire socket: register + listen for notifications and new messages
  const { isConnected } = useSocket({
    onMessage: () => setMessageCount((c) => c + 1),
    onNotification: () => setNotifCount((c) => c + 1),
  });

  // Derive display name & initials from auth
  const fullName = user?.fullName || user?.firstName || user?.email || "User";
  const displayName = typeof fullName === "string" ? fullName : "User";
  const roleName = typeof user?.role === "object" ? user.role?.name : user?.role;
  const userInitials = typeof displayName === "string" && displayName.includes(" ")
    ? displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : typeof displayName === "string"
    ? displayName[0].toUpperCase()
    : "U";

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

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="dashboard-layout">
      {(!isOnline || showOnlineBanner) && (
        <div className={`network-status-banner ${isOnline ? "online" : "offline"}`}>
          <span className="network-status-dot" />
          {isOnline ? "Back online" : "You are offline — check your connection"}
        </div>
      )}
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        isMobile={isMobile}
      />

      <div
        className={`main-wrapper ${
          isSidebarOpen ? "sidebar-open" : "sidebar-closed"
        }`}
      >
        <header className="header">
          <div className="header-actions">
            {isMobile && (
              <button className="menu-button" onClick={toggleSidebar} aria-label="Toggle sidebar menu">
                <FaBars aria-hidden="true" />
              </button>
            )}
            <div className="flex gap-4 items-center justify-end">
              {/* Notification bell — its own circle, separate from messaging */}
              <div className="header-left">
                <button
                  className="message-icon"
                  onClick={() => {
                    setNotifCount(0);
                    navigate("/notifications");
                  }}
                  aria-label="Notifications"
                >
                  <IoNotifications size={26} color="#fff" />
                  {notifCount > 0 && (
                    <span className="notification-badge">
                      {notifCount > 99 ? "99+" : notifCount}
                    </span>
                  )}
                </button>
              </div>
              {/* Message icon — its own circle */}
              <div className="header-left">
                <button
                  className="message-icon"
                  onClick={() => {
                    setMessageCount(0);
                    setIsMessageModalOpen(true);
                  }}
                  aria-label="Messages"
                >
                  <MdMessage size={26} color="#fff" />
                  {messageCount > 0 && (
                    <span className="notification-badge">
                      {messageCount > 99 ? "99+" : messageCount}
                    </span>
                  )}
                </button>
              </div>
              <div className="header-right" ref={profileDropdownRef}>
                <div
                  className="user-profile"
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={showProfileDropdown}
                >
                  <div className="user-avatar conn-status-anchor">
                    {userInitials}
                    <ConnectionStatus isConnected={isConnected} />
                  </div>
                  {!isMobile && (
                    <div className="user-info">
                      <span className="user-name">{displayName}</span>
                      <span className="user-role">{roleName || "Staff"}</span>
                    </div>
                  )}
                  {!isMobile && (
                    <FiChevronDown size={16} className="dropdown-arrow" />
                  )}
                </div>
                {showProfileDropdown && (
                  <div className="profile-dropdown">
                    <button
                      className="profile-dropdown-item"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        navigate("/notifications");
                      }}
                    >
                      <IoNotificationsOutline size={18} />
                      <span>Notifications</span>
                    </button>
                    <button
                      className="profile-dropdown-item"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        navigate("/settings");
                      }}
                    >
                      <FaCog size={16} />
                      <span>Settings</span>
                    </button>
                    <button
                      className="profile-dropdown-item profile-dropdown-danger"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        disconnectSocket();
                        dispatch(logout());
                        persistor.purge();
                        navigate("/");
                      }}
                    >
                      <IoLogOutOutline size={18} />
                      <span>Log out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main id="main-content" className="main-content">
          {children}
        </main>
      </div>

      {isMobile && isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={toggleSidebar}
          role="button"
          tabIndex={0}
          aria-label="Close menu"
          onKeyDown={(e) => e.key === "Enter" && toggleSidebar()}
        />
      )}

      {/* Message Modal */}
      <MessageModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
      />
    </div>
  );
};

/** Wrap all protected routes with this so the layout persists across navigations */
export const LayoutRoute = () => (
  <DashboardLayout>
    <Outlet />
  </DashboardLayout>
);

export default DashboardLayout;

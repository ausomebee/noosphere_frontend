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
import { IoNotificationsOutline, IoLogOutOutline } from "react-icons/io5";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import TenantLogo from "../assets/Logo.svg";
import "./DashboardLayout.css";
import { FiChevronDown } from "react-icons/fi";
import useAuth from "../hooks/useAuth";
import MessageModal from "../Components/MessageModal/MessageModal";
import NotificationAlert from "../Components/NotificationAlert/NotificationAlert";

const Sidebar = ({ isOpen, toggleSidebar, isMobile }) => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    if (!isOpen) {
      setExpandedItems({});
    }
  }, [isOpen]);

  const navItems = [
    { name: "Dashboard", icon: FaTachometerAlt, path: "/dashboard" },
    {
      name: "Scheduler",
      icon: FaCalendarAlt,
      path: "/scheduler",
      children: [
        { name: "Calendar", path: "/scheduler/calendar" },
        { name: "Appointments", path: "/scheduler/appointments" },
      ],
    },
    {
      name: "Clients",
      icon: FaUsers,
      path: "/clients",
      children: [
        { name: "Pipeline", path: "/clients/pipeline" },
        { name: "Client List", path: "/clients/client-list" },
      ],
    },
    {
      name: "My Organization",
      icon: FaBuilding,
      path: "/organization",
      children: [
        { name: "General", path: "/organization/general" },
        { name: "Staff & Teams", path: "/organization/staff-and-teams" },
        { name: "Practice Settings", path: "/organization/practice-settings" },
        {
          name: "Role & Permissions",
          path: "/organization/role-and-permissions",
        },
      ],
    },
    {
      name: "Billing & Payments",
      icon: FaMoneyBillWave,
      path: "/billing",
      children: [
        { name: "Timesheets", path: "/billing/timesheets" },
        { name: "Claims", path: "/billing/claims" },
        { name: "Settings", path: "/billing/settings" },
      ],
    },
    {
      name: "Payroll",
      icon: FaReceipt,
      path: "/payroll",
      children: [
        { name: "Payroll", path: "/payroll/payroll-setup" },
        { name: "Payroll Settings", path: "/payroll/payroll-settings" },
        
      ],
    },
    { name: "Program Library", icon: FaBook, path: "/program-library" },
    { name: "Reports", icon: FaChartBar, path: "/reports" },
    {
      name: "Custom Forms",
      icon: FaFileAlt,
      path: "/custom-forms",
      children: [
        { name: "Forms", path: "/custom-forms/forms" },
        { name: "Templates Library", path: "/custom-forms/templates-library" },
      ],
    },
    {
      name: "Help & Support",
      icon: FaQuestionCircle,
      path: "/help",
      children: [
        { name: "Support Requests", path: "/help/support-requests" },
        { name: "Knowledge Base", path: "/help/knowledge-base" },
      ],
    },
    { name: "Settings", icon: FaCog, path: "/settings" },
  ];

  const toggleExpand = (name) => {
    setExpandedItems((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  return (
    <>
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
                      >
                        <item.icon className="nav-icon" size={24} />
                        {isOpen && item.name}
                        {isOpen &&
                          (expandedItems[item.name] ? (
                            <FaChevronUp className="expand-icon" />
                          ) : (
                            <FaChevronDown className="expand-icon" />
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messageCount] = useState(5);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 992);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const profileDropdownRef = useRef(null);

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

  const handleDismissAlert = (id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="dashboard-layout">
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
              <button className="menu-button" onClick={toggleSidebar}>
                <FaBars />
              </button>
            )}
            <div className="flex gap-4 items-center justify-end">
              <div className="header-left">
                <button
                  className="message-icon"
                  onClick={() => setIsMessageModalOpen(true)}
                >
                  <MdMessage size={28} color="#fff" />
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
                >
                  <div className="user-avatar">{userInitials}</div>
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
                        // TODO: dispatch logout
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

        <main className="main-content">
          {/* Notification alert banners */}
          {alerts.length > 0 && (
            <div className="layout-alerts">
              {alerts.map((alert) => (
                <NotificationAlert
                  key={alert.id}
                  variant={alert.variant}
                  message={alert.message}
                  primaryAction={alert.primaryAction}
                  secondaryAction={alert.secondaryAction}
                  onClose={() => handleDismissAlert(alert.id)}
                />
              ))}
            </div>
          )}
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

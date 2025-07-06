import React, { useState, useEffect } from "react";
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
} from "react-icons/fa";
import { MdMessage } from "react-icons/md";
import { Link, useLocation } from "react-router-dom";
import TenantLogo from "../assets/Logo.svg";
import "./DashboardLayout.css";
import { FiChevronDown } from "react-icons/fi";

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
        { name: "Payrolls", path: "/billing/payrolls" },
        { name: "Settings", path: "/billing/settings" },
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
    { name: "Help & Support", icon: FaQuestionCircle, path: "/help" },
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
            <img src={TenantLogo} alt="Logo" className="logo" />
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

      {isMobile && (
        <button
          className={`hamburger-menu ${isOpen ? "open" : ""}`}
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <FaBars />
        </button>
      )}
    </>
  );
};

const DashboardLayout = ({ children }) => {
  const [messageCount] = useState(1225);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      // Auto-close sidebar when switching to mobile view
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
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
                <button className="message-icon">
                  <MdMessage size={28} color="#fff" />
                  {messageCount > 0 && (
                    <span className="notification-badge">{messageCount}</span>
                  )}
                </button>
              </div>
              <div className="header-right">
                <div className="user-profile">
                  <div className="user-avatar">OR</div>
                  {!isMobile && (
                    <div className="user-info">
                      <span className="user-name">Company Name</span>
                      <span className="user-role">Location</span>
                    </div>
                  )}
                  {!isMobile && (
                    <FiChevronDown size={16} className="dropdown-arrow" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>

      {isMobile && isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={toggleSidebar}
          role="button"
          tabIndex={0}
          aria-label="Close menu"
          onKeyDown={(e) => e.key === "Enter" && toggleSidebar()}
        ></div>
      )}
    </div>
  );
};

export default DashboardLayout;

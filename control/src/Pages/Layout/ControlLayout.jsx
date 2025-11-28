import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  FiMenu,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiAlertCircle,
  FiSettings,
} from "react-icons/fi";
import { GrDocumentPerformance } from "react-icons/gr";
import { PiUserList } from "react-icons/pi";
import "./ControlLayout.css";
import NoosphereLogo from "../../assets/NoosphereLogo.png";

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [openNavs, setOpenNavs] = useState({});
  const location = useLocation();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleNav = (navItem) => {
    setOpenNavs((prev) => ({
      ...prev,
      [navItem]: !prev[navItem],
    }));
  };

  const handleNavClickMobile = () => {
    if (window.innerWidth <= 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleNavClickDesktop = () => {
    if (window.innerWidth > 1024 && isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
    }
  };

  const navItems = [
    {
      name: "Performance",
      path: "/performance",
      icon: <GrDocumentPerformance size={20} />,
      children: null,
    },
    {
      name: "Tenants",
      path: "/tenants/pipeline",
      icon: <PiUserList size={28} />,
      children: [
        { name: "Pipeline", path: "/tenants/pipeline" },
        { name: "Tenant List", path: "/tenants/tenant-list" },
        {
          name: "",
          path: "/tenants/candidate-single/:pipelineStageId/:pipelineItemId/edit",
        },
        {
          name: "",
          path: "/tenants/candidate-single/:pipelineStageId/:pipelineItemId",
        },
        { name: "", path: "/tenants/column-single/:id" },
      ],
    },
    {
      name: "Billing & Payments",
      path: "/billing-payments/plans-pricing",
      icon: <FiCreditCard size={20} />,
      children: [
        { name: "Plans & Pricing", path: "/billing-payments/plans-pricing" },
        {
          name: "Invoice & Payments",
          path: "/billing-payments/invoice-payments",
        },
        {
          name: "Subscription Manager",
          path: "/billing-payments/subscription-manager",
        },
        {
          name: "Auto-billing Settings",
          path: "/billing-payments/auto-billing-settings",
        },
        { name: "Reports", path: "/billing-payments/Reports" },
      ],
    },
    {
      name: "Issues",
      path: "/issues",
      icon: <FiAlertCircle size={20} />,
      children: null,
    },
    {
      name: "Features",
      path: "/features",
      icon: <PiUserList size={28} />,
      children: null,
    },
    {
      name: "Settings",
      path: "/settings/roles-permissions",
      icon: <FiSettings size={20} />,
      children: [
        { name: "Roles & Permissions", path: "/settings/roles-permissions" },
        {
          name: "Notification & Alerts",
          path: "/settings/notification-alerts",
        },
        { name: "Security Settings", path: "/settings/securitySettings" },
      ],
    },
  ];

  const secondaryNavItems = [
    { name: "Account Overview", path: "/tenants/tenant-lists/overview" },
    { name: "Feature Management", path: "/tenants/tenant-lists/features" },
    { name: "Billing & Payments", path: "/tenants/tenant-lists/billing" },
    { name: "Issues & Support", path: "/tenants/tenant-lists/issues" },
    { name: "User Activity & Logs", path: "/tenants/tenant-lists/logs" },
    { name: "Security Settings", path: "/tenants/tenant-lists/security" },
  ];

  const showSecondarySidebar = secondaryNavItems.some((item) =>
    location.pathname.startsWith(item.path)
  );

  const isPathActive = (path) => {
    const pathRegex = new RegExp(`^${path.replace(/:[^\s/]+/g, "[^/]+")}$`);
    return pathRegex.test(location.pathname);
  };

  const pipelineChildRoutes = [
    "/tenants/candidate-single/:pipelineStageId/:pipelineItemId",
    "/tenants/candidate-single/:pipelineStageId/:pipelineItemId/edit",
    "/tenants/column-single/:id",
  ];

  const isNavActive = (item) => {
    if (isPathActive(item.path)) return true;

    if (item.children) {
      return item.children.some((child) => isPathActive(child.path));
    }

    if (item.path === "/tenants/pipeline" && showSecondarySidebar) {
      return true;
    }

    return false;
  };

  const isChildActive = (childPath) => {
    if (isPathActive(childPath)) return true;

    if (childPath === "/tenants/tenant-list" && showSecondarySidebar) {
      return true;
    }

    if (childPath === "/tenants/pipeline") {
      return pipelineChildRoutes.some((route) => isPathActive(route));
    }

    return false;
  };

  const isSecondaryNavActive = (itemPath) => {
    const matchingPaths = secondaryNavItems
      .filter(
        (item) =>
          isPathActive(item.path) || location.pathname.startsWith(item.path)
      )
      .map((item) => item.path);

    if (matchingPaths.length > 0) {
      const longestMatchingPath = matchingPaths.reduce((a, b) =>
        a.length > b.length ? a : b
      );
      return itemPath === longestMatchingPath;
    }

    return false;
  };

  useEffect(() => {
    navItems.forEach((item) => {
      if (isNavActive(item) && item.children) {
        setOpenNavs((prev) => ({
          ...prev,
          [item.name]: true,
        }));
      }
    });
  }, [location.pathname]);

  return (
    <div className="layout-container">
      <aside
        className={`sidebar no-scrollbar::-webkit-scrollbar no-scrollbar ${
          isSidebarOpen ? "open" : ""
        } ${isSidebarCollapsed ? "collapsed" : ""}`}
      >
        <div className="logo">
          <img
            src={NoosphereLogo}
            alt="Noosphere Logo"
            className="logo-image"
          />
        </div>
        <nav className="sidebar-nav">
          <ul>
            {navItems.map((item, index) => (
              <li key={index}>
                <div
                  className={`nav-item ${isNavActive(item) ? "active" : ""}`}
                  onClick={() => {
                    if (item.children && !isSidebarCollapsed)
                      toggleNav(item.name);
                    handleNavClickDesktop();
                  }}
                >
                  <div className="nav-icon-wrapper" data-tooltip={item.name}>
                    {item.icon}
                  </div>
                  <NavLink
                    to={item.path}
                    className="nav-link"
                    onClick={() => {
                      handleNavClickMobile();
                      handleNavClickDesktop();
                    }}
                  >
                    {item.name}
                  </NavLink>
                  {item.children && !isSidebarCollapsed && (
                    <FiChevronDown
                      size={16}
                      className={`nav-arrow ${
                        openNavs[item.name] ? "open" : ""
                      }`}
                    />
                  )}
                </div>
                {item.children && !isSidebarCollapsed && (
                  <ul
                    className={`sub-nav ${openNavs[item.name] ? "open" : ""}`}
                  >
                    {item.children
                      .filter((child) => child.name)
                      .map((child, childIndex) => (
                        <li
                          key={childIndex}
                          className={`sub-nav-item ${
                            isChildActive(child.path) ? "active" : ""
                          }`}
                        >
                          <NavLink
                            to={child.path}
                            className="nav-link"
                            onClick={() => {
                              handleNavClickMobile();
                              handleNavClickDesktop();
                            }}
                          >
                            {child.name}
                          </NavLink>
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <button
        type="button"
        className={`collapse-button ${isSidebarCollapsed ? "collapsed" : ""}`}
        onClick={toggleSidebarCollapse}
      >
        {isSidebarCollapsed ? (
          <FiChevronRight size={24} />
        ) : (
          <FiChevronLeft size={24} />
        )}
      </button>

      {showSecondarySidebar && (
        <aside className="secondary-sidebar no-scrollbar::-webkit-scrollbar no-scrollbar">
          <div className="secondary-sidebar-header">
            <h1>ACME org</h1>
          </div>
          <nav className="sidebar-nav">
            <ul>
              {secondaryNavItems.map((item, index) => (
                <li key={index}>
                  <NavLink
                    to={item.path}
                    className={`nav-item ${
                      isSecondaryNavActive(item.path) ? "active" : ""
                    }`}
                  >
                    {item.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      )}

      <div
        className="sidebar-overlay"
        onClick={() => {
          if (window.innerWidth <= 1024) {
            setIsSidebarOpen(false);
          }
        }}
      ></div>

      <div
        className={`main-wrapper ${
          showSecondarySidebar ? "with-secondary-sidebar" : ""
        }`}
      >
        <header className="header">
          <div className="header-left">
            <button className="menu-button" onClick={toggleSidebar}>
              <FiMenu size={24} />
            </button>
          </div>
          <div className="header-right">
            <div className="user-profile">
              <div className="user-avatar">OR</div>
              <div className="user-info">
                <span className="user-name">Olivia Rhye</span>
                <span className="user-role">Administrator</span>
              </div>
              <FiChevronDown size={16} className="dropdown-arrow" />
            </div>
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
};

export default Layout;

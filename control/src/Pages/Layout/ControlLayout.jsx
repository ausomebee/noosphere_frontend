import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import tenantApi from "../../api/TenantApis";
import useAuth from "../../hooks/useAuth";
import usePermission from "../../hooks/usePermission";
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
import useIdleTimeout from "../../hooks/useIdleTimeout";

const Layout = ({ children }) => {
  useIdleTimeout();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [openNavs, setOpenNavs] = useState({});
  const [tenantName, setTenantName] = useState("");
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
  const location = useLocation();
  const { accessToken, refreshToken, user } = useAuth();
  const { hasModuleAccess, hasPermission } = usePermission();

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
    if (window.innerWidth <= 992) {
      setIsSidebarOpen(false);
    }
  };

  const handleNavClickDesktop = () => {
    if (window.innerWidth > 992 && isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
    }
  };

  const allNavItems = [
    {
      name: "Performance",
      path: "/performance",
      icon: <GrDocumentPerformance size={20} />,
      moduleKey: "performanceMonitoring",
      children: null,
    },
    {
      name: "Tenants",
      path: "/tenants/pipeline",
      icon: <PiUserList size={28} />,
      moduleKey: "tenant",
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
      moduleKey: "billing",
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
      moduleKey: "issueManagement",
      children: null,
    },
    {
      name: "Features",
      path: "/features",
      icon: <PiUserList size={28} />,
      moduleKey: "featureManagement",
      children: null,
    },
    {
      name: "Settings",
      path: "/settings/roles-permissions",
      icon: <FiSettings size={20} />,
      moduleKey: "settings",
      children: [
        { name: "Roles & Permissions", path: "/settings/roles-permissions" },
        { name: "Security Settings", path: "/settings/securitySettings" },
        { name: "", path: "/settings/roles-permissions/configure" },
        { name: "", path: "/settings/roles-permissions/configure/:roleId" },
      ],
    },
  ];

  const navItems = allNavItems.filter(
    (item) => !item.moduleKey || hasModuleAccess(item.moduleKey)
  );

  // Extract tenantId from current path for secondary nav links
  const tenantIdMatch = location.pathname.match(/\/tenants\/tenant-lists\/[\w-]+\/([^/]+)/);
  const currentTenantId = tenantIdMatch ? tenantIdMatch[1] : "";

  useEffect(() => {
    if (!currentTenantId) {
      setTenantName("");
      return;
    }
    tenantApi
      .GetSingleTenant({ tenantId: currentTenantId, accessToken, refreshToken })
      .then((res) => {
        const d = res.data || res;
        setTenantName(d.companyName || d.contactPerson || "Tenant");
      })
      .catch(() => setTenantName("Tenant"));
  }, [currentTenantId, accessToken, refreshToken]);

  const secondaryNavItems = [
    { name: "Account Overview", path: `/tenants/tenant-lists/overview/${currentTenantId}`, permissionKey: "view_tenant_details" },
    { name: "Feature Management", path: `/tenants/tenant-lists/features/${currentTenantId}`, permissionKey: "view_tenant_features" },
    { name: "Billing & Payments", path: `/tenants/tenant-lists/billing/${currentTenantId}`, permissionKey: "view_tenant_billing" },
    { name: "Issues & Support", path: `/tenants/tenant-lists/issues/${currentTenantId}`, permissionKey: "view_tenant_issues" },
    { name: "User Activity & Logs", path: `/tenants/tenant-lists/logs/${currentTenantId}`, permissionKey: "view_tenant_logs" },
    { name: "Security Settings", path: `/tenants/tenant-lists/security/${currentTenantId}`, permissionKey: "view_tenant_security" },
  ].filter((item) => !item.permissionKey || hasPermission(item.permissionKey));

  const showSecondarySidebar = location.pathname.startsWith("/tenants/tenant-lists/");

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
    // Usage statistics is a child of Feature Management
    if (
      currentTenantId &&
      location.pathname === `/tenants/tenant-lists/usage-statistics/${currentTenantId}`
    ) {
      return itemPath === `/tenants/tenant-lists/features/${currentTenantId}`;
    }

    return isPathActive(itemPath);
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
      {(!isOnline || showOnlineBanner) && (
        <div className={`network-status-banner ${isOnline ? "online" : "offline"}`}>
          <span className="network-status-dot" />
          {isOnline ? "Back online" : "You are offline — check your connection"}
        </div>
      )}
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
            <h1>{tenantName || "..."}</h1>
          </div>
          <nav className="sidebar-nav">
            <ul>
              {secondaryNavItems.map((item, index) => (
                <li key={index}>
                  <NavLink
                    to={item.path}
                    end
                    className={() =>
                      `secondary-nav-item${isSecondaryNavActive(item.path) ? " active" : ""}`
                    }
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
          if (window.innerWidth <= 992) {
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
              <div className="user-avatar">
                {((user?.firstName?.[0] || "") + (user?.lastName?.[0] || "")).toUpperCase() || "?"}
              </div>
              <div className="user-info">
                <span className="user-name">
                  {`${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "User"}
                </span>
                <span className="user-role">{user?.roles?.name || "Administrator"}</span>
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

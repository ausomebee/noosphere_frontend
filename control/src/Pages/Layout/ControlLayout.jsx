import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout } from "../../ReduxStore/features/authentication";
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
import { IoNotifications } from "react-icons/io5";
import notificationApi from "../../api/notificationApi";
import useSocket from "../../hooks/useSocket";
import { disconnectSocket } from "../../api/socketService";
import "./ControlLayout.css";
import NoosphereLogo from "../../assets/NoosphereLogo.png";
import useIdleTimeout from "../../hooks/useIdleTimeout";

import ConnectionStatus from "../../Components/ConnectionStatus/ConnectionStatus";
const Layout = ({ children }) => {
  useIdleTimeout();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [openNavs, setOpenNavs] = useState({});
  const [tenantName, setTenantName] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineBanner, setShowOnlineBanner] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const profileDropdownRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

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

  // Live-count incoming notifications even while the admin is elsewhere in the
  // app, so the header bell badge tells them something is waiting.
  const { isConnected } = useSocket({
    onNotification: () => setUnreadNotifications((c) => c + 1),
  });

  const handleLogout = () => {
    disconnectSocket();
    dispatch(logout());
    navigate("/auth/login");
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch the unread notification count once on mount for the header badge.
  useEffect(() => {
    const userId = user?.id;
    if (!userId || !accessToken) return;
    notificationApi
      .getNotifications({ userId, userType: "ADMIN", accessToken, refreshToken })
      .then((res) => {
        const raw = res?.data?.data ?? res?.data ?? res ?? [];
        const list = (Array.isArray(raw) ? raw : []).map((n) => n?.notification ?? n);
        setUnreadNotifications(list.filter((n) => !n.isRead).length);
      })
      .catch(() => {});
  }, [user?.id, accessToken]);

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
        { name: "Pipeline", path: "/tenants/pipeline", permissionKey: "view_pipeline" },
        { name: "Tenant List", path: "/tenants/tenant-list", permissionKeys: ["tenant_list", "view_tenant_list"] },
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
        { name: "Plans & Pricing", path: "/billing-payments/plans-pricing", permissionKeys: ["plans_pricing", "view_plans"] },
        {
          name: "Invoice & Payments",
          path: "/billing-payments/invoice-payments",
          permissionKeys: ["invoices_payments", "view_invoices"],
        },
        {
          name: "Subscription Manager",
          path: "/billing-payments/subscription-manager",
          permissionKeys: ["subscription_management", "view_subscriptions"],
        },
        {
          name: "Auto-billing Settings",
          path: "/billing-payments/auto-billing-settings",
          permissionKeys: ["auto_billing", "view_auto_billing"],
        },
        { name: "Reports", path: "/billing-payments/Reports", permissionKeys: ["billing_reports", "view_billing_reports"] },
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
        { name: "Roles & Permissions", path: "/settings/roles-permissions", permissionKeys: ["roles_permissions", "view_roles"] },
        { name: "Security Settings", path: "/settings/securitySettings", permissionKeys: ["security_settings", "view_security_settings"] },
        { name: "", path: "/settings/roles-permissions/configure" },
        { name: "", path: "/settings/roles-permissions/configure/:roleId" },
      ],
    },
  ];

  const navItems = allNavItems
    .filter((item) => !item.moduleKey || hasModuleAccess(item.moduleKey))
    .map((item) => {
      if (!item.children) return item;
      // Hide named sub-nav items the role can't view. Route-only children
      // (no name) are kept so active-path matching still works. A child may
      // gate on a single `permissionKey` or an any-of `permissionKeys` array
      // (its config "section" key OR its granular view key).
      const children = item.children.filter((child) => {
        if (!child.name) return true;
        if (child.permissionKeys) return child.permissionKeys.some(hasPermission);
        if (child.permissionKey) return hasPermission(child.permissionKey);
        return true;
      });
      return { ...item, children };
    });

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
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      {(!isOnline || showOnlineBanner) && (
        <div className={`network-status-banner ${isOnline ? "online" : "offline"}`}>
          <span className="network-status-dot" />
          {isOnline ? "Back online" : "You are offline — check your connection"}
        </div>
      )}
      <aside
        className={`sidebar ${isSidebarOpen ? "open" : ""} ${
          isSidebarCollapsed ? "collapsed" : ""
        }`}
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
        <aside className="secondary-sidebar">
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
            <button
              className="notification-bell"
              onClick={() => {
                setUnreadNotifications(0);
                navigate("/notifications");
              }}
              aria-label="Notifications"
            >
              <IoNotifications size={20} />
              {unreadNotifications > 0 && (
                <span className="notification-bell-badge">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              )}
            </button>
            <div
              className="user-profile"
              ref={profileDropdownRef}
              onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
              style={{ position: "relative" }}
            >
              <div className="user-avatar conn-status-anchor">
                {((user?.firstName?.[0] || "") + (user?.lastName?.[0] || "")).toUpperCase() || "?"}
                <ConnectionStatus isConnected={isConnected} />
              </div>
              <div className="user-info">
                <span className="user-name">
                  {`${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email || "User"}
                </span>
                <span className="user-role">{user?.roles?.name || "Administrator"}</span>
              </div>
              <FiChevronDown
                size={16}
                className="dropdown-arrow"
                style={{ transform: isProfileDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
              />
              {isProfileDropdownOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0,
                  background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)", minWidth: "160px", zIndex: 1000,
                }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      width: "100%", padding: "10px 16px", background: "none",
                      border: "none", color: "#D92D20", fontWeight: 500,
                      fontSize: "14px", textAlign: "left",
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main id="main-content" className="main-content">{children}</main>
      </div>
    </div>
  );
};

export default Layout;

import { useState } from "react";
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
import MessageModal from "../Components/Modal/MessageModal";
import "./DashboardLayout.css";
import Logo from "../assets/Logo.svg";

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { firstName, lastName, avatarUrl } = useAuth();
  useSocket({
    onMessage: () => setMessageCount((c) => c + 1),
  });
  const displayName = `${firstName} ${lastName}`.trim() || "User";

  const navItems = [
    { icon: <GoHome size={20} />, label: "Home", path: "/dashboard" },
    { icon: <HiOutlineMenuAlt2 size={20} />, label: "My programs", path: "/programs" },
    { icon: <MdOutlineNotificationsNone size={20} />, label: "Notifications", path: "/notifications" },
    { icon: <IoDocumentTextOutline size={20} />, label: "Documents & Forms", path: "/documents" },
    { icon: <LuUser size={20} />, label: "My Profile", path: "/profile" },
  ];

  const handleLogout = () => {
    disconnectSocket();
    dispatch(logout());
    navigate("/");
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="dashboard-layout">
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
            aria-label="Send message"
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
            <div className="profile-avatar">
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
            </div>
            <div className="profile-info">
              <h3>Welcome</h3>
              <p>{displayName}</p>
            </div>
          </div>

          <ul className="sidebar-nav">
            {navItems.map((item, index) => (
              <li key={index} className="nav-item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? "active" : ""}`
                  }
                  onClick={closeSidebar}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <button className="logout-link" onClick={handleLogout}>
            <TbLogout2 size={20} />
            Logout
          </button>
        </aside>

        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;

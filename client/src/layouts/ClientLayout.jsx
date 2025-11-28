import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { GoHome } from "react-icons/go";
import { HiOutlineMenuAlt2 } from "react-icons/hi";
import { IoDocumentTextOutline } from "react-icons/io5";
import { LuUser } from "react-icons/lu";
import { MdOutlineNotificationsNone } from "react-icons/md";
import { TbLogout2 } from "react-icons/tb";
import { VscClose } from "react-icons/vsc";
import "./DashboardLayout.css";
import Logo from "../assets/Logo.svg";

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { icon: <GoHome size={20} />, label: "Home", path: "/dashboard" },
    { icon: <HiOutlineMenuAlt2 size={20} />, label: "My programs", path: "/programs" },
    { icon: <MdOutlineNotificationsNone size={20} />, label: "Notifications", path: "/notifications" },
    { icon: <IoDocumentTextOutline size={20} />, label: "Documents & Forms", path: "/documents" },
    { icon: <LuUser size={20} />, label: "My Profile", path: "/profile" },
  ];

  const handleLogout = () => {
    // Add your logout logic here (clear tokens, etc.)
    navigate("/login");
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

        <button
          className="header-menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <VscClose size={24} /> : <HiOutlineMenuAlt2 size={24} />}
        </button>
      </header>

      {/* Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "active" : ""}`}
        onClick={closeSidebar}
      />

      {/* Main Container */}
      <div className="dashboard-container">
        {/* Sidebar Card */}
        <aside className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-profile">
            <div className="profile-avatar">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
                alt="Profile"
              />
            </div>
            <div className="profile-info">
              <h3>Welcome</h3>
              <p>Oluwaseyitantan</p>
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

        {/* Main Content */}
        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
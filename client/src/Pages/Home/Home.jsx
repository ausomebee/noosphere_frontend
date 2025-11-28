import React, { useState } from "react";
import DashboardLayout from "../../layouts/ClientLayout";

import "./Home.css";
import { LuCalendarClock, LuEye } from "react-icons/lu";
import ReusableTable from "../../Components/Table/ReuseableTable";
import EmptyAppointmentsSvg from "../../Components/Svgs/EmptyAppointmentSvg";
import OverviewCard from "../../Components/Cards/Dashboard/Overview/OverviewCard";
import AuthorizationCard from "../../Components/Cards/Dashboard/Authorization/AuthorizationCard";

const Home = () => {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [currentPage, setCurrentPage] = useState(1);

  // Sample data - replace with actual API data
  const overviewData = {
    completedSessions: 1244,
    avgSessionDuration: "02:04hrs",
    upcomingSessions: 4,
    chartData: [
      { month: "Jan", value: 14 },
      { month: "Feb", value: 22 },
      { month: "Mar", value: 16 },
      { month: "Apr", value: 18 },
      { month: "May", value: 14 },
    ],
  };

  const authorizationData = {
    totalAuthorized: 128,
    totalCompleted: 100,
    totalRemaining: 28,
  };

  // Appointments data per tab
  const appointmentsData = {
    upcoming: [
      { id: 1, sessionType: "Telehealth", serviceType: "97151 - Special tr...", dateTime: "Jan 4, 2024\n12:03pm", clinician: "Olivia Rhye, Mark S...", isNew: true },
      { id: 2, sessionType: "1:1 coaching", serviceType: "97193 - Lorem Is...", dateTime: "Jan 4, 2024\n01:00am", clinician: "Phoenix Baker" },
      { id: 3, sessionType: "Group Coaching", serviceType: "97193 - Lorem Is...", dateTime: "Jan 2, 2024\n12:59pm", clinician: "Lana Steiner" },
    ],
    awaiting: [
      { id: 1, sessionType: "Telehealth", serviceType: "97151 - Special tr...", dateTime: "Jan 4, 2024\n12:03pm", clinician: "Olivia Rhye" },
      { id: 2, sessionType: "1:1 coaching", serviceType: "97151 - Special tr...", dateTime: "Jan 4, 2024\n01:00am", clinician: "Phoenix Baker" },
      { id: 3, sessionType: "Group Coaching", serviceType: "97151 - Special tr...", dateTime: "Jan 2, 2024\n12:59pm", clinician: "Lana Steiner" },
    ],
    reschedule: [
      { id: 1, sessionType: "Telehealth", serviceType: "97151 - Special tr...", dateTime: "Jan 4, 2024\n12:03pm", clinician: "Olivia Rhye" },
      { id: 2, sessionType: "1:1 coaching", serviceType: "97151 - Special tr...", dateTime: "Jan 4, 2024\n01:00am", clinician: "Phoenix Baker" },
      { id: 3, sessionType: "Group Coaching", serviceType: "97151 - Special tr...", dateTime: "Jan 2, 2024\n12:59pm", clinician: "Lana Steiner" },
    ],
    completed: [
      { id: 1, sessionType: "Telehealth", serviceType: "97151 - Special tr...", dateTime: "Jan 4, 2024\n12:03pm", clinician: "Olivia Rhye, Mark Spenc..." },
      { id: 2, sessionType: "1:1 coaching", serviceType: "97193 - Lorem Is...", dateTime: "Jan 4, 2024\n01:00am", clinician: "Phoenix Baker" },
      { id: 3, sessionType: "Group Coaching", serviceType: "97193 - Lorem Is...", dateTime: "Jan 2, 2024\n12:59pm", clinician: "Lana Steiner" },
    ],
    cancelled: [
      { id: 1, sessionType: "Telehealth", serviceType: "97151 - Special tr...", dateTime: "Jan 4, 2024\n12:03pm", clinician: "Olivia Rhye" },
      { id: 2, sessionType: "1:1 coaching", serviceType: "97151 - Special tr...", dateTime: "Jan 4, 2024\n01:00am", clinician: "Phoenix Baker" },
      { id: 3, sessionType: "Group Coaching", serviceType: "97151 - Special tr...", dateTime: "Jan 2, 2024\n12:59pm", clinician: "Lana Steiner" },
    ],
  };

  const tabs = [
    { key: "upcoming", label: "Upcoming" },
    { key: "awaiting", label: "Awaiting feedback", count: 4 },
    { key: "reschedule", label: "Reschedule Requests" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ];

  const columns = [
    { key: "sessionType", title: "Session Type" },
    { key: "serviceType", title: "Service Type(s)" },
    { 
      key: "dateTime", 
      title: "Date & Time",
      render: (value) => (
        <span style={{ whiteSpace: "pre-line" }}>{value}</span>
      )
    },
    { key: "clinician", title: "Clinician(s)" },
  ];

  // Actions based on tab
  const getActions = () => {
    switch (activeTab) {
      case "upcoming":
        return [
          {
            render: (row) => row.isNew && <span className="status-badge new">New</span>
          },
          {
            menu: true,
            label: "Request Reschedule",
            icon: <LuCalendarClock size={16} />,
            onClick: (row) => console.log("Reschedule", row),
          },
          {
            menu: true,
            label: "View appointment details",
            icon: <LuEye size={16} />,
            onClick: (row) => console.log("View", row),
          },
        ];
      case "awaiting":
        return [
          {
            render: (row) => (
              <button className="action-link" onClick={() => console.log("Review", row)}>
                Review Session
              </button>
            ),
          },
        ];
      case "completed":
        return [
         
          {
            menu: true,
            label: "View session",
            icon: <LuEye size={16} />,
            onClick: (row) => console.log("View", row),
          },
        ];
      case "cancelled":
        return [
          {
            render: (row) => (
              <button className="action-link" onClick={() => console.log("View", row)}>
                View
              </button>
            ),
          },
        ];
      default:
        return [];
    }
  };

  // Set to true for empty state
  const isEmpty = false;
  const isTableEmpty = false;

  return (
    <DashboardLayout>
      <div className="home-content">
        <div className="home-grid">
          <OverviewCard data={isEmpty ? null : overviewData} />
          <AuthorizationCard data={isEmpty ? null : authorizationData} />
        </div>

        <div className="home-table-section">
          <ReusableTable
            title="My Appointments"
            subtitle="See and manage all your appointments here"
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            columns={columns}
            data={isTableEmpty ? [] : appointmentsData[activeTab]}
            searchPlaceholder="Search Appointments"
            showFilters={true}
            showViewToggle={true}
            emptyState={{
              icon: <EmptyAppointmentsSvg />,
              title: "No appointments",
              subtitle: "You don't have any appointments yet. New appointments will appear here",
            }}
            actions={getActions()}
            pagination={{
              currentPage,
              totalPages: 10,
            }}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Home;
import React, { useState } from "react";
import DashboardLayout from "../../layouts/ClientLayout";

import "./Home.css";
import { LuCalendarClock, LuEye } from "react-icons/lu";
import ReusableTable from "../../Components/Table/ReuseableTable";
import EmptyAppointmentsSvg from "../../Components/Svgs/EmptyAppointmentSvg";
import OverviewCard from "../../Components/Cards/Dashboard/Overview/OverviewCard";
import AuthorizationCard from "../../Components/Cards/Dashboard/Authorization/AuthorizationCard";

// === ALL MODALS IMPORTED ===
import RescheduleModal from "../../Components/Modal/UpcomingDashboardModal/RescheduleModal";
import AppointmentDetailsModal from "../../Components/Modal/UpcomingDashboardModal/AppointmentDetailsModal";
import SessionFeedbackModal from "../../Components/Modal/UpcomingDashboardModal/ReviewSessionModal";
import SuccessModal from "../../Components/Modal/SuccessModal";

const Home = () => {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal States
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Sample Data
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

  const appointmentsData = {
    upcoming: [
      {
        id: 1,
        sessionType: "Telehealth",
        serviceType: "97151 - Special tr...",
        dateTime: "Jan 4, 2024\n12:03pm",
        clinician: "Olivia Rhye, Mark S...",
        isNew: true,
      },
      {
        id: 2,
        sessionType: "1:1 coaching",
        serviceType: "97193 - Lorem Is...",
        dateTime: "Jan 4, 2024\n01:00am",
        clinician: "Phoenix Baker",
      },
      {
        id: 3,
        sessionType: "Group Coaching",
        serviceType: "97193 - Lorem Is...",
        dateTime: "Jan 2, 2024\n12:59pm",
        clinician: "Lana Steiner",
      },
    ],
    awaiting: [
      {
        id: 4,
        sessionType: "Telehealth",
        serviceType: "97151 - Special tr...",
        dateTime: "Dec 28, 2023\n10:30am",
        clinician: "Dr. Sarah Chen",
      },
      {
        id: 5,
        sessionType: "In-Home Therapy",
        serviceType: "97125 - ABA Therapy",
        dateTime: "Dec 27, 2023\n02:00pm",
        clinician: "Michael Torres",
      },
    ],
    completed: [
      {
        id: 6,
        sessionType: "Telehealth",
        serviceType: "97151 - Special tr...",
        dateTime: "Dec 20, 2023\n11:00am",
        clinician: "Olivia Rhye",
      },
    ],
    reschedule: [],
    cancelled: [],
  };

  const tabs = [
    { key: "upcoming", label: "Upcoming" },
    { key: "awaiting", label: "Awaiting feedback", count: 2 },
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
      ),
    },
    { key: "clinician", title: "Clinician(s)" },
  ];

  // Actions per tab
  const getActions = () => {
    switch (activeTab) {
      case "upcoming":
        return [
          {
            render: (row) =>
              row.isNew && <span className="status-badge new">New</span>,
          },
          {
            menu: true,
            label: "Request Reschedule",
            icon: <LuCalendarClock size={16} />,
            onClick: (row) => {
              setSelectedAppointment(row);
              setRescheduleModalOpen(true);
            },
          },
          {
            menu: true,
            label: "View appointment details",
            icon: <LuEye size={16} />,
            onClick: (row) => {
              setSelectedAppointment(row);
              setDetailsModalOpen(true);
            },
          },
        ];

      case "awaiting":
        return [
          {
            render: (row) => (
              <button
                className="action-link"
                style={{
                  fontWeight: "600",
                  color: "#3b82f6",
                  textDecoration: "underline",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setSelectedAppointment(row);
                  setFeedbackModalOpen(true);
                }}
              >
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
            onClick: (row) => {
              setSelectedAppointment(row);
              setDetailsModalOpen(true);
            },
          },
        ];

      default:
        return [];
    }
  };

  // Success Handlers
  const showSuccess = () => {
    setSuccessModalOpen(true);
    setTimeout(() => setSuccessModalOpen(false), 3500);
  };

  const handleRescheduleSuccess = () => {
    setRescheduleModalOpen(false);
    setSelectedAppointment(null);
    showSuccess();
  };

  const handleFeedbackSuccess = () => {
    setFeedbackModalOpen(false);
    setSelectedAppointment(null);
    showSuccess();
  };

  return (
    <DashboardLayout>
      <div className="home-content">
        <div className="home-grid">
          <OverviewCard data={overviewData} />
          <AuthorizationCard data={authorizationData} />
        </div>

        <div className="home-table-section">
          <ReusableTable
            title="My Appointments"
            subtitle="See and manage all your appointments here"
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            columns={columns}
            data={appointmentsData[activeTab] || []}
            searchPlaceholder="Search Appointments"
            showFilters={true}
            showViewToggle={true}
            emptyState={{
              icon: <EmptyAppointmentsSvg />,
              title: "No appointments",
              subtitle:
                "You don't have any appointments yet. New appointments will appear here",
            }}
            actions={getActions()}
            pagination={{ currentPage, totalPages: 10 }}
            onPageChange={setCurrentPage}
          />
        </div>

        {/* === ALL MODALS === */}

        {/* 1. View Appointment Details */}
        {detailsModalOpen && (
          <AppointmentDetailsModal
            isOpen={detailsModalOpen}
            onClose={() => {
              setDetailsModalOpen(false);
              setSelectedAppointment(null);
            }}
            appointment={selectedAppointment}
            onReschedule={(apt) => {
              setSelectedAppointment(apt);
              setRescheduleModalOpen(true);
              setDetailsModalOpen(false);
            }}
          />
        )}

        {/* 2. Reschedule Modal */}
        <RescheduleModal
          isOpen={rescheduleModalOpen}
          onClose={() => {
            setRescheduleModalOpen(false);
            setSelectedAppointment(null);
          }}
          onSubmit={() => {
            console.log("Reschedule request sent:", selectedAppointment);
            // Your API call here
            handleRescheduleSuccess();
          }}
        />

        {/* 3. Session Feedback Modal (Awaiting tab) */}
        <SessionFeedbackModal
          isOpen={feedbackModalOpen}
          onClose={() => {
            setFeedbackModalOpen(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          onSave={(data) => {
            console.log("Feedback & signature submitted:", data);
            // Your API call here
            handleFeedbackSuccess();
          }}
        />

        {/* 4. Success Modal - After Reschedule or Feedback */}
        <SuccessModal
          isOpen={successModalOpen}
          onClose={() => setSuccessModalOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
};

export default Home;

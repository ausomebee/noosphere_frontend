import usePageTitle from "../../hooks/usePageTitle";
import React, { useState } from "react";
import Button from "../../Components/Button/Button";
import IntakePipeline from "../Dashboard/DashboardCards/IntakePipeline";
import SessionInformation from "../Dashboard/DashboardCards/SessionInformation";
import Authorizations from "../Dashboard/DashboardCards/Authorizations";
import ProductivityInformation from "../Dashboard/DashboardCards/ProductivityInformation";
import UpcomingAppointments from "../Dashboard/DashboardCards/UpcomingAppointments";
import { SelectInput } from "../../Components/Input/Inputs";
import { useNavigate } from "react-router-dom";
import usePermissions from "../../hooks/usePermissions";
import AccessDenied from "../../Components/AccessDenied/AccessDenied";

const DashboardCard = ({
  title,
  children,
  onRearrange,
  index,
  hasData,
  count,
  selectInputs = [],
  viewMoreRoute,
  onViewMore,
}) => {
  usePageTitle("Dashboard");
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.setData("text/plain", index);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleViewMoreClick = () => {
    if (onViewMore) {
      onViewMore();
    } else if (viewMoreRoute) {
      navigate(viewMoreRoute);
    }
  };

  return (
    <div
      className={`dashboard-card bg-white p-20 rounded-lg shadow-md ${
        isDragging ? "dragging" : ""
      }`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const fromIndex = e.dataTransfer.getData("text/plain");
        onRearrange(fromIndex, index);
      }}
    >
      <div className="dashboard-card-inner">
        <div className="dashboard-card-header">
          <div className="dashboard-card-header-left">
            <h3 className="text-base font-semibold text-color-sec">
              <span>{title}</span>
              {count !== undefined && count !== null && count > 0 && (
                <span className="ml-2 bg-blue-600 text-white px-2 py-2 rounded-full text-base font-bold">
                  {count}
                </span>
              )}
            </h3>

            {selectInputs.length > 0 && (
              <div className="dashboard-card-selects">
                {selectInputs.map((input, idx) => (
                  <SelectInput
                    key={idx}
                    options={input.options}
                    value={input.value}
                    onChange={input.onChange}
                    disabled={!hasData}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="dashboard-card-header-right">
            {hasData &&
              (viewMoreRoute || onViewMore) &&
              title !== "Productivity Information" && (
                <Button
                  label="View more"
                  variant="important"
                  onClick={handleViewMoreClick}
                  className="text-sm"
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="#003A9B"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      style={{ marginLeft: "8px" }}
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  }
                  iconPosition="right"
                />
              )}
          </div>
        </div>

        <div className="content-area">{children}</div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { hasPermission, hasAnyPermission } = usePermissions();
  // State for all controlled inputs
  const [upcomingAppointmentsCount, setUpcomingAppointmentsCount] = useState(0);
  const [authorizationStatus, setAuthorizationStatus] = useState("expired");
  const [authorizationModalOpen, setAuthorizationModalOpen] = useState(false);
  const [sessionType, setSessionType] = useState("completedSessions");
  const [sessionPeriod, setSessionPeriod] = useState("period");

  const allCards = [
    {
      title: "Intake Pipeline",
      hasData: true,
      viewMoreRoute: "/clients/pipeline",
      permissionKey: "view_intake_pipeline_info",
    },
    {
      title: "Session Information",
      hasData: true,
      viewMoreRoute: "/billing/timesheets",
      permissionKey: "view_session_information",
    },
    {
      title: "Authorizations",
      hasData: true,
      permissionKey: "view_authorization_information",
    },
    {
      title: "Productivity Information",
      hasData: true,
      permissionKey: "view_productivity_information",
    },
    {
      title: "Upcoming Appointments",
      hasData: true,
      viewMoreRoute: "/scheduler/appointments",
      permissionKey: "view_upcoming_appointments",
    },
  ];

  const [cards, setCards] = useState(
    allCards.filter((c) => !c.permissionKey || hasPermission(c.permissionKey))
  );

  const [hiddenCards, setHiddenCards] = useState([]);

  // Get dynamic select inputs based on card title
  const getSelectInputs = (title) => {
    switch (title) {
      case "Session Information":
        return [
          {
            options: [
              { value: "completedSessions", label: "Completed Sessions" },
              { value: "canceledSessions", label: "Canceled Sessions" },
              { value: "rescheduledSessions", label: "Rescheduled Sessions" },
            ],
            value: sessionType,
            onChange: (e) => setSessionType(e.target.value),
          },
          {
            options: [
              { value: "day", label: "Last 30 Days" },
              { value: "month", label: "This Month" },
              { value: "year", label: "This Year" },
            ],
            value: sessionPeriod,
            onChange: (e) => setSessionPeriod(e.target.value),
          },
        ];
      case "Authorizations":
        return [
          {
            options: [
              { value: "expired", label: "Expired Authorizations" },
              { value: "expiring", label: "Expiring Authorizations" },
              { value: "active", label: "Active Authorizations" },
            ],
            value: authorizationStatus,
            onChange: (e) => setAuthorizationStatus(e.target.value),
          },
        ];
      default:
        return [];
    }
  };

  const handleRearrange = (fromIndex, toIndex) => {
    const updatedCards = [...cards];
    const [movedCard] = updatedCards.splice(fromIndex, 1);
    updatedCards.splice(toIndex, 0, movedCard);
    setCards(updatedCards);
  };

  const handleHide = (index) => {
    const cardToHide = cards[index];
    setCards(cards.filter((_, i) => i !== index));
    setHiddenCards([...hiddenCards, cardToHide]);
  };

  const handleMove = (fromIndex, toIndex) => {
    const targetIndex = parseInt(toIndex);
    if (targetIndex >= 0 && targetIndex < cards.length) {
      const updatedCards = [...cards];
      const [movedCard] = updatedCards.splice(fromIndex, 1);
      updatedCards.splice(targetIndex, 0, movedCard);
      setCards(updatedCards);
    }
  };

  const handleAuthorizationViewMore = () => {
    setAuthorizationModalOpen(true);
  };

  const getCardViewMoreHandler = (title) => {
    if (title === "Authorizations") {
      return handleAuthorizationViewMore;
    }
    return undefined;
  };

  const renderCardContent = (title, hasData) => {
    switch (title) {
      case "Upcoming Appointments":
        return (
          <UpcomingAppointments
            hasData={hasData}
            setCount={setUpcomingAppointmentsCount}
          />
        );
      case "Authorizations":
        return (
          <Authorizations
            hasData={hasData}
            selectedStatus={authorizationStatus}
            isModalOpen={authorizationModalOpen}
            setIsModalOpen={setAuthorizationModalOpen}
          />
        );
      case "Intake Pipeline":
        return <IntakePipeline hasData={hasData} />;
      case "Session Information":
        return (
          <SessionInformation
            hasData={hasData}
            sessionType={sessionType}
            sessionPeriod={sessionPeriod}
          />
        );
      case "Productivity Information":
        return <ProductivityInformation hasData={hasData} />;
      default:
        return null;
    }
  };

  if (
    !hasAnyPermission(
      "dashboard",
      "view_upcoming_appointments",
      "view_session_information",
      "view_intake_pipeline_info",
      "view_authorization_information",
      "view_productivity_information"
    )
  )
    return <AccessDenied />;

  return (
    <>
      <div className="p-6">
        <div className="dashboard-grid">
          {cards.map((card, index) => (
            <DashboardCard
              key={card.title}
              title={card.title}
              index={index}
              onRearrange={handleRearrange}
              onHide={handleHide}
              onMove={handleMove}
              hasData={card.hasData}
              count={
                card.title === "Upcoming Appointments"
                  ? upcomingAppointmentsCount
                  : card.count
              }
              selectInputs={getSelectInputs(card.title)}
              viewMoreRoute={card.viewMoreRoute}
              onViewMore={getCardViewMoreHandler(card.title)}
            >
              {renderCardContent(card.title, card.hasData)}
            </DashboardCard>
          ))}
        </div>
      </div>
    </>
  );
};

export default Dashboard;

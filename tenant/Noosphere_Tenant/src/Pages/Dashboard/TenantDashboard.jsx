import React, { useState } from "react";
import { Menu } from "@headlessui/react";
import Button from "../../Components/Button/Button";
import DashboardLayout from "../../Layout/TenantLayout";
import { HiOutlineCog6Tooth } from "react-icons/hi2";
import IntakePipeline from "../Dashboard/DashboardCards/IntakePipeline";
import SessionInformation from "../Dashboard/DashboardCards/SessionInformation";
import Authorizations from "../Dashboard/DashboardCards/Authorizations";
import ProductivityInformation from "../Dashboard/DashboardCards/ProductivityInformation";
import UpcomingAppointments from "../Dashboard/DashboardCards/UpcomingAppointments";
import { SelectInput } from "../../Components/Input/Inputs";

const DashboardCard = ({
  title,
  children,
  onRearrange,
  onHide,
  index,
  hasData,
  onMove,
  count,
  selectInputs = [],
}) => {

  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.setData("text/plain", index);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
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
      <div className="flex flex-col gap-4">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-base font-semibold text-color-sec ">
             <span>{title}</span> 
              {count !== undefined && count !== null && (
                <span className="ml-2 bg-blue-600 text-white px-2  rounded-lg inline-block">
                  {count}
                </span>
              )}
            </h3>
            {selectInputs.length > 0 && (
              <div className="flex items-center gap-4 mt-4">
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
          <div className="flex items-center gap-4">
            <Menu as="div" className="relative">
              <Menu.Button
                className={`
                  button-base
                  ${!hasData ? "button-disabled" : "button-hover:hover"}
                `}
                disabled={!hasData}
              >
                <HiOutlineCog6Tooth size={24} />
              </Menu.Button>
              {hasData && (
                <Menu.Items className="absolute right-0 mt-2 w-150 bg-white border border-gray-200 p-6 rounded-md shadow-lg">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={`${
                          active ? "bg-gray-100" : ""
                        } w-full text-left px-4 py-2 text-sm text-gray-700`}
                        onClick={() => onHide(index)}
                      >
                        Hide this Card
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={`${
                          active ? "bg-gray-100" : ""
                        } w-full text-left px-4 py-2 text-sm text-gray-700`}
                        onClick={() =>
                          onMove(index, prompt("Move to position (0-4):") || 0)
                        }
                      >
                        Move Card
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              )}
            </Menu>
            {hasData && title !== "Productivity Information" && (
              <Button
                label="View more"
                variant="important"
                onClick={() => (window.location.href = "/view-more")}
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
        {/* Content Section */}
        <div className="content-area">{children}</div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [cards, setCards] = useState([
    { title: "Intake Pipeline", hasData: true },
    {
      title: "Session Information",
      hasData: true,
      selectInputs: [
        {
          options: [
            { value: "completedSessions", label: "Completed Sessions" },
            { value: "scheduledSessions", label: "Scheduled Sessions" },
          ],
          value: "completedSessions",
          onChange: () => {},
        },
        {
          options: [
            { value: "period", label: "Period" },
            { value: "month", label: "Month" },
          ],
          value: "period",
          onChange: () => {},
        },
      ],
    },
    {
      title: "Authorizations",
      hasData: true,
      selectInputs: [
        {
          options: [
            { value: "expiredAuthorizations", label: "Expired Authorizations" },
            { value: "activeAuthorizations", label: "Active Authorizations" },
          ],
          value: "expiredAuthorizations",
          onChange: () => {},
        },
      ],
    },
    { title: "Productivity Information", hasData: true },
    { title: "Upcoming Appointments", hasData: true, count: 19 },
  ]);
  const [hiddenCards, setHiddenCards] = useState([]);

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
    if (targetIndex >= 0 && targetIndex <= 4) {
      const updatedCards = [...cards];
      const [movedCard] = updatedCards.splice(fromIndex, 1);
      updatedCards.splice(targetIndex, 0, movedCard);
      setCards(updatedCards);
    }
  };

  const renderCardContent = (title, hasData) => {
    switch (title) {
      case "Intake Pipeline":
        return <IntakePipeline hasData={hasData} />;
      case "Session Information":
        return <SessionInformation hasData={hasData} />;
      case "Authorizations":
        return <Authorizations hasData={hasData} />;
      case "Productivity Information":
        return <ProductivityInformation hasData={hasData} />;
      case "Upcoming Appointments":
        return <UpcomingAppointments hasData={hasData} />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card, index) => (
            <DashboardCard
              key={card.title}
              title={card.title}
              index={index}
              onRearrange={handleRearrange}
              onHide={handleHide}
              onMove={handleMove}
              hasData={card.hasData}
              count={card.count} // Removed optional chaining since count is defined
              selectInputs={card.selectInputs}
            >
              {renderCardContent(card.title, card.hasData)}
            </DashboardCard>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
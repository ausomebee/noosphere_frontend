import React from "react";
import './Scheduler.css'; // Import the CSS
import { CheckboxInput, SearchInput } from "../Input/Inputs";

const StaffClientFilter = ({
  staff,
  clients,
  selectedStaff,
  selectedClients,
  onStaffChange,
  onClientChange,
  onHideSidebar,
  activeTab,
}) => {
  return (
    <div className="staff-client-container">
      {/* Header with Close Button */}
      <div className="staff-client-header">
        <h2 className="staff-client-title">
          View by {activeTab === "staff" ? "staff" : "client"}
        </h2>
        <button onClick={onHideSidebar} className="staff-client-close-button">
          <svg
            className="staff-client-close-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Search Bar */}
      <div className="staff-client-search">
        <SearchInput 
        placeholder={`Search ${activeTab === "staff" ? "staff" : "clients"}`}
        />
      </div>

      {/* Scrollable List */}
      <div className="staff-client-list">
        {/* Staff List */}
        {activeTab === "staff" && (
          <div>
            {staff.map((member) => (
              <div key={member.id} className="staff-client-item">
                <div className="staff-client-item-content">
                  <span className="staff-client-name">{member.name}</span>
                  <span className="staff-client-count">
                    {member.appointmentCount || 14}
                  </span>
                </div>
               <CheckboxInput 
                checked={selectedStaff.includes(member.id)}
                  onChange={() => onStaffChange(member.id)}
               />
              </div>
            ))}
          </div>
        )}

        {/* Client List */}
        {activeTab === "client" && (
          <div>
            {clients.map((client) => (
              <div key={client.id} className="staff-client-item">
                <div className="staff-client-item-content">
                  <span className="staff-client-name">{client.name}</span>
                  <span className="staff-client-count">
                    {client.appointmentCount || 0}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={selectedClients.includes(client.id)}
                  onChange={() => onClientChange(client.id)}
                  className="staff-client-checkbox"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffClientFilter;
import React, { useState } from "react";
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
  onFetchClientAppointments,
}) => {

  const [searchTerm, setSearchTerm] = useState("");

  const filteredStaff = staff?.filter((member) =>
    member?.fullName?.toLowerCase?.()?.includes(searchTerm.toLowerCase())
  ) || [];

  const filteredClients = clients?.filter((client) =>
    client?.client?.fullName?.toLowerCase?.()?.includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="staff-client-container">
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

      <div className="staff-client-search">
        <SearchInput
          placeholder={`Search ${activeTab === "staff" ? "staff" : "clients"}`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="staff-client-list">
        {activeTab === "staff" && (
          <div>
            {filteredStaff.length > 0 ? (
              filteredStaff.map((member) => (
                <div key={member.id} className="staff-client-item">
                  <div className="staff-client-item-content">
                    <span className="staff-client-name">{member.fullName || "Unknown Staff"}</span>
                    <span className="staff-client-count">
                      {member.appointmentCount || 0}
                    </span>
                  </div>
                  <CheckboxInput
                    checked={selectedStaff.includes(member.id)}
                    onChange={() => onStaffChange(member.id)}
                  />
                </div>
              ))
            ) : (
              <div>No staff available</div>
            )}
          </div>
        )}

        {activeTab === "client" && (
          <div>
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <div key={client.client.id} className="staff-client-item">
                  <div className="staff-client-item-content">
                    <span className="staff-client-name">{client.client.fullName || "Unknown Client"}</span>
                    <span className="staff-client-count">
                      {client.appointmentCount || 0}
                    </span>
                  </div>
                  <CheckboxInput
                    checked={selectedClients.includes(client.client.id)}
                    onChange={() => onClientChange(client.client.id)}
                  />
                </div>
              ))
            ) : (
              <div>No clients available</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffClientFilter;
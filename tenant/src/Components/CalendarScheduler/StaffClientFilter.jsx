// StaffClientFilter.jsx — FINAL VERSION: CHECKBOX TRIGGERS APPOINTMENTS INSTANTLY
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
  fetchAppointmentsByFilter, // THIS IS CRITICAL
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  console.log(clients)

  // Helper function to get client full name from first and last name
  const getClientFullName = (client) => {
    return `${client?.firstName || ''} ${client?.lastName || ''}`.trim() || "Unknown Client";
  };

  const filteredStaff = staff?.filter((s) =>
    s?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredClients = clients?.filter((c) =>
    getClientFullName(c.client).toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // HELPER: Build correct IDs after toggle
  const getUpdatedStaffIds = (id) => {
    return selectedStaff.includes(id)
      ? selectedStaff.filter((x) => x !== id)
      : [...selectedStaff, id];
  };

  const getUpdatedClientIds = (id) => {
    return selectedClients.includes(id)
      ? selectedClients.filter((x) => x !== id)
      : [...selectedClients, id];
  };

  return (
    <div className="staff-client-container">
      <div className="staff-client-header">
        <h2 className="staff-client-title">
          View by {activeTab === "staff" ? "Staff" : "Clients"}
        </h2>
        <button onClick={onHideSidebar} className="staff-client-close-button">
          <svg className="staff-client-close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
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
        {activeTab === "staff" ? (
          filteredStaff.length > 0 ? (
            filteredStaff.map((member) => (
              <div key={member.id} className="staff-client-item">
                <div className="staff-client-item-content">
                  <span className="staff-client-name">{member.fullName}</span>
                  <span className="staff-client-count">
                    {member.appointmentCount ?? 0}
                  </span>
                </div>
                <CheckboxInput
                  checked={selectedStaff.includes(member.id)}
                  onChange={() => {
                    const newStaffIds = getUpdatedStaffIds(member.id);
                    onStaffChange(member.id); // Update parent state
                    fetchAppointmentsByFilter({
                      clientIds: [],
                      staffIds: newStaffIds,
                    });
                  }}
                />
              </div>
            ))
          ) : (
            <p className="staff-client-empty">No staff found</p>
          )
        ) : (
          filteredClients.length > 0 ? (
            filteredClients.map((client) => (
              <div key={client.clientId} className="staff-client-item">
                <div className="staff-client-item-content">
                  <span className="staff-client-name">
                    {getClientFullName(client.client)}
                  </span>
                  <span className="staff-client-count">
                    {client.appointmentCount ?? 0}
                  </span>
                </div>
                <CheckboxInput
                  checked={selectedClients.includes(client.clientId)}
                  onChange={() => {
                    const newClientIds = getUpdatedClientIds(client.clientId);
                    onClientChange(client.clientId); // Update parent state
                    fetchAppointmentsByFilter({
                      clientIds: newClientIds,
                      staffIds: [],
                    });
                  }}
                />
              </div>
            ))
          ) : (
            <p className="staff-client-empty">No clients found</p>
          )
        )}
      </div>
    </div>
  );
};

export default StaffClientFilter;
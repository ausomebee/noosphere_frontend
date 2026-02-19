import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Pagination from "../../Components/Table/Pagination";
import { exportTableData, exportTableToPDF } from "../../utils/TableUtils";
import {
  SearchInput,
  SelectInput,
  TextInput,
  CheckboxInput,
} from "../../Components/Input/Inputs";
import DateFilterDropdown from "../../Components/Table/DateFilterModal";
import { parse, format, isWithinInterval, isSameDay } from "date-fns";

import { FaArrowLeft } from "react-icons/fa";
import "./BillingAndPayments.css";
import { FiMoreVertical } from "react-icons/fi";
import ChangePlanModal from "../../Components/ReusableModal/ChangePlanModal";
import { showToast } from "../../Helper/ShowToast";

const SubscriberList = () => {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [filterValues, setFilterValues] = useState({});
  const [isDateFilterDropdownOpen, setIsDateFilterDropdownOpen] = useState(false);
  const [currentDateFilterKey, setCurrentDateFilterKey] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedSubscriberId, setSelectedSubscriberId] = useState(null);
  const [isChangePlanModalOpen, setIsChangePlanModalOpen] = useState(false);
  const itemsPerPage = 5;
  const dateFilterStartInputRef = useRef(null);
  const dateFilterEndInputRef = useRef(null);
  const dateFilterDropdownRef = useRef(null);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const dropdownRefs = useRef({});

  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.entries(dropdownRefs.current).forEach(([id, ref]) => {
        if (ref && !ref.contains(event.target)) {
          setOpenDropdowns((prev) => ({ ...prev, [id]: false }));
        }
      });
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (id) => {
    setOpenDropdowns((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const [subscribers, setSubscribers] = useState([
    {
      id: 1,
      planId: 2,
      organization: "ACME Corp",
      dateAdded: "12/10/2024",
      status: "active",
      tenantId: "tenant-001",
    },
    {
      id: 2,
      planId: 2,
      organization: "Thomas Marco Therapies",
      dateAdded: "12/10/2024",
      status: "inactive",
      tenantId: "tenant-002",
    },
    {
      id: 3,
      planId: 3,
      organization: "West ABA",
      dateAdded: "1/10/2024",
      status: "suspended",
      tenantId: "tenant-003",
    },
    {
      id: 4,
      planId: 4,
      organization: "Jefferson Mental Health Services",
      dateAdded: "2/1/2024",
      status: "blocked",
      tenantId: "tenant-004",
    },
    {
      id: 5,
      planId: 3,
      organization: "Lanprey Health",
      dateAdded: "2/1/2024",
      status: "inactive",
      tenantId: "tenant-005",
    },
    {
      id: 6,
      planId: 4,
      organization: "You Mind Centre",
      dateAdded: "2/1/2024",
      status: "inactive",
      tenantId: "tenant-006",
    },
    {
      id: 7,
      planId: 3,
      organization: "Midrand General Hospital",
      dateAdded: "2/1/2024",
      status: "active",
      tenantId: "tenant-007",
    },
    {
      id: 8,
      planId: 3,
      organization: "Lanprey Health",
      dateAdded: "2/1/2024",
      status: "suspended",
      tenantId: "tenant-008",
    },
  ]);

  const plans = [
    { id: 1, name: "Basic Plan" },
    { id: 2, name: "Standard Plan" },
    { id: 3, name: "Pro Plan" },
    { id: 4, name: "Premium Plan" },
  ];

  // Get current plan label
  const currentPlanLabel =
    plans.find((plan) => plan.id === parseInt(planId))?.name || "Unknown Plan";

  const filteredSubscribers = subscribers.filter((subscriber) => {
    const matchesPlan = subscriber.planId === parseInt(planId);
    const matchesSearch = subscriber.organization
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    let matchesFilter = true;

    if (filter === "date_added" && filterValues.date_added) {
      const subDate = parse(subscriber.dateAdded, "MM/dd/yyyy", new Date());
      const { start, end } = filterValues.date_added;
      matchesFilter =
        start &&
        (end
          ? isWithinInterval(subDate, { start, end })
          : isSameDay(subDate, start));
    } else if (filter === "account_status" && filterValues.account_status) {
      matchesFilter = subscriber.status === filterValues.account_status;
    }

    return matchesPlan && matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredSubscribers.length / itemsPerPage);
  const currentData = filteredSubscribers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSelectAll = (e) =>
    setSelectedItems(
      e.target.checked ? currentData.map((item) => item.id) : []
    );

  const handleSingleSelect = (id) =>
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );

  const handleDateRangeSelect = (range) => {
    setFilterValues((prev) => ({ ...prev, date_added: range }));
    setIsDateFilterDropdownOpen(false);
  };

  const handleStatusSelect = (status) =>
    setFilterValues((prev) => ({ ...prev, account_status: status }));

  const clearFilters = () => {
    setFilter("");
    setFilterValues({});
    setIsDateFilterDropdownOpen(false);
  };

  const handleExportCSV = () =>
    exportTableData(
      filteredSubscribers,
      [
        { key: "organization", header: "Organization" },
        { key: "dateAdded", header: "Date Added" },
        { key: "status", header: "Active" },
      ],
      `subscribers-plan-${currentPlanLabel}.csv`,
      `Subscribers for ${currentPlanLabel}`
    );

  const handleExportPDF = () =>
    exportTableToPDF(
      filteredSubscribers,
      [
        { key: "organization", header: "Organization" },
        { key: "dateAdded", header: "Date Added" },
        { key: "status", header: "Active" },
      ],
      `subscribers-plan-${currentPlanLabel}.pdf`,
      `Subscribers for ${currentPlanLabel}`
    );

  const handleChangePlan = (subscriberId) => {
    setSelectedSubscriberId(subscriberId);
    setIsChangePlanModalOpen(true);
  };

  const handleSavePlanChange = async ({ fromPlanId, toPlanId }) => {
    setSubscribers((prev) =>
      prev.map((subscriber) =>
        subscriber.id === selectedSubscriberId
          ? { ...subscriber, planId: parseInt(toPlanId) }
          : subscriber
      )
    );
    setIsChangePlanModalOpen(false);
    setSelectedSubscriberId(null);
    setSelectedItems([]);
  };

  const handleViewOrganizationProfile = (plan) => {
    if (plan.tenantId) {
      navigate(`/tenants/tenant-lists/overview/${plan.tenantId}`);
    } else {
      showToast("Tenant ID not found for this organization");
    }
  };

  const filterOptions = [
    { value: "", label: "Filters" },
    { value: "date_added", label: "Date Added" },
    { value: "account_status", label: "Account Status" },
    { value: "clear_filters", label: "Clear Filters" },
  ];

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "suspended", label: "Suspended" },
    { value: "blocked", label: "Blocked" },
    { value: "deactivated", label: "Deactivated" },
  ];

  const getStatusBadge = (status) => (
    <span
      style={{
        backgroundColor:
          {
            active: "#4CAF50",
            inactive: "#B0BEC5",
            suspended: "#FFB300",
            blocked: "#F44336",
            deactivated: "#B0BEC5",
          }[status] || "#B0BEC5",
        color: "white",
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "12px",
      }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );

  return (
    <div className="subscriber-list-container">
        <div className="nav-header">
          <button
            onClick={() => navigate("/billing-payments/plans-pricing")}
            className="back-button"
          >
            <FaArrowLeft />
            Back
          </button>
          <div className="subscriber-list-header">
            <h1>Subscriber List</h1>
            <p>
              Plans & Pricing{" "}
              <span className="breadCrumb-active">/ {currentPlanLabel}</span>
            </p>
          </div>
          <button
            onClick={() => navigate("/billing-payments/plans-pricing")}
            className="back-button"
            style={{ opacity: 0, pointerEvents: "none" }}
          >
            <FaArrowLeft />
            Back
          </button>
        </div>

        <div className="filters-container">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              margin: "20px 0",
              width: "100%",
              gap: "20px",
            }}
          >
            <div style={{ display: "flex", gap: "20px", width: "60%" }}>
              <div style={{ flex: 1 }}>
                <SearchInput
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                />
              </div>
              <div className="filter-group" style={{ flex: 1 }}>
              <h2 className="filter-text">Filters:</h2>
                <SelectInput
                  value={filter}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "clear_filters") {
                      clearFilters();
                    } else {
                      setFilter(value);
                    }
                  }}
                  options={filterOptions}
                />
              </div>
              {filter === "date_added" && (
                <div className="date-filter-input-container">
                  <TextInput
                    type="text"
                    value={
                      filterValues.date_added?.start
                        ? format(filterValues.date_added.start, "MMM d, yyyy")
                        : "Select start date"
                    }
                    readOnly
                    onClick={() => {
                      setCurrentDateFilterKey("date_added");
                      setIsDateFilterDropdownOpen(true);
                    }}
                    className="date-filter-input date-filter-input-start"
                    ref={dateFilterStartInputRef}
                  />
                  <span className="date-filter-demarcator"> - </span>
                  <TextInput
                    type="text"
                    value={
                      filterValues.date_added?.end
                        ? format(filterValues.date_added.end, "MMM d, yyyy")
                        : "Select end date"
                    }
                    readOnly
                    onClick={() => {
                      setCurrentDateFilterKey("date_added");
                      setIsDateFilterDropdownOpen(true);
                    }}
                    className="date-filter-input date-filter-input-end"
                    ref={dateFilterEndInputRef}
                  />
                  {isDateFilterDropdownOpen &&
                    currentDateFilterKey === "date_added" && (
                      <div
                        className="date-filter-dropdown-wrapper no-scrollbar::-webkit-scrollbar no-scrollbar"
                        ref={dateFilterDropdownRef}
                      >
                        <DateFilterDropdown
                          isOpen={isDateFilterDropdownOpen}
                          onClose={() => setIsDateFilterDropdownOpen(false)}
                          onDateRangeSelect={handleDateRangeSelect}
                        />
                      </div>
                    )}
                </div>
              )}
              {filter === "account_status" && (
                <div className="status-filter-input-container">
                  <SelectInput
                    value={filterValues.account_status || ""}
                    onChange={(e) => handleStatusSelect(e.target.value)}
                    options={[
                      { value: "", label: "Select status" },
                      ...statusOptions,
                    ]}
                  />
                </div>
              )}
            </div>
            <div className="export-buttons">
              <button onClick={handleExportCSV}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              <button onClick={handleExportPDF}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {currentData.length === 0 ? (
          <div className="empty-state">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <h3>Nothing to show</h3>
            <p>This plan has no subscribers yet</p>
          </div>
        ) : (
            <div className="subscriber-table">
            <table>
              <thead>
                <tr>
                  <th>
                    <CheckboxInput
                      checked={selectedItems.length === currentData.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Organization</th>
                  <th>Date Added</th>
                  <th>Active</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((subscriber) => (
                  <tr key={subscriber.id}>
                    <td>
                      <CheckboxInput
                        checked={selectedItems.includes(subscriber.id)}
                        onChange={() => handleSingleSelect(subscriber.id)}
                      />
                    </td>
                    <td>{subscriber.organization}</td>
                    <td>{subscriber.dateAdded}</td>
                    <td>{getStatusBadge(subscriber.status)}</td>
                    <td className="action-cell">
                      <div
                        className="dropdown-container"
                        ref={(el) => (dropdownRefs.current[subscriber.id] = el)}
                      >
                        <button
                          className="feature-action-icon"
                          onClick={() => toggleDropdown(subscriber.id)}
                        >
                          <FiMoreVertical />
                        </button>
                        {openDropdowns[subscriber.id] && (
                          <div className="dropdown-menu dropdown-menu-row">
                            <div className="dropdown-items">
                              <button
                                onClick={() => handleViewOrganizationProfile(subscriber)}
                                className="dropdown-item"
                              >
                                View organization profile
                              </button>
                              <button
                                onClick={() => handleChangePlan(subscriber.id)}
                                className="dropdown-item"
                              >
                                Change Plan
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
        <ChangePlanModal
          isOpen={isChangePlanModalOpen}
          onClose={() => {
            setIsChangePlanModalOpen(false);
            setSelectedSubscriberId(null);
          }}
          onSave={handleSavePlanChange}
          currentPlanId={
            selectedSubscriberId
              ? subscribers.find((s) => s.id === selectedSubscriberId)?.planId
              : null
          }
          plans={plans}
        />
      </div>
  );
};

export default SubscriberList;
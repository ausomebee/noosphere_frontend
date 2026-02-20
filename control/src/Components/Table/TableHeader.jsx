import React from "react";
import {
  SearchInput,
  SelectInput,
  TextInput,
} from "../Input/Inputs";
import Button from "../Button/Button";
import DateFilterDropdown from "./DateFilterModal";
import { format } from "date-fns";

const TableHeader = ({
  searchTerm,
  setSearchTerm,
  filters,
  filterValues,
  handleFilterValueChange,
  resetFilters,
  currentDateFilterKey,
  setCurrentDateFilterKey,
  isDateFilterDropdownOpen,
  setIsDateFilterDropdownOpen,
  handleDateRangeSelect,
  // Unique filter options
  uniqueCategories,
  uniquePriorities,
  uniqueAssignedTo,
  stageCompletionOptions,
  uniquePlans,
  uniqueAccountStatuses,
  uniqueAccountOfficers,
  uniqueStatuses,
  uniqueBillingCycles,
  uniquePaymentStatuses,
  // Export/Print
  toggleExportDropdown,
  exportDropdownOpen,
  handleExportCSV,
  handleExportPDF,
  handlePrint,
  exportButtonRef,
  exportDropdownRef,
  // Date filter refs
  dateFilterStartInputRef,
  dateFilterEndInputRef,
  dateFilterDropdownRef,
}) => {
  return (
    <div className="table-header">
      <div className="search-filters-container">
        <div className="search-container">
          <SearchInput
            type="text"
            placeholder="Select Filter"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filters-container">
          <h2 className="filter-text">Filters:</h2>
          {filters.map((filter, index) => (
            <div key={index} className="filter-wrapper">
              <div className="filter-select-container">
                <div className="filter-label">
                  <SelectInput
                    value={filterValues[filter.key] || ""}
                    onChange={(e) => {
                      const newFilterValue = e.target.value;
                      handleFilterValueChange(filter.key, newFilterValue);
                      if (newFilterValue === "") {
                        resetFilters();
                      } else if (
                        ["date_reported", "date_updated"].includes(
                          newFilterValue
                        )
                      ) {
                        setCurrentDateFilterKey(newFilterValue);
                      }
                    }}
                    options={filter.options}
                    className="table-filter-select"
                  />
                </div>
                {(filterValues[filter.key] === "date_reported" ||
                  filterValues[filter.key] === "date_updated" ||
                  filterValues[filter.key] === "date_created" ||
                  filterValues[filter.key] === "due_date" ||
                  filterValues[filter.key] === "nextBillingDate") && (
                  <div className="date-filter-input-container">
                    <TextInput
                      type="text"
                      value={
                        filterValues[filterValues[filter.key]]?.start
                          ? format(
                              filterValues[filterValues[filter.key]].start,
                              "MMM d, yyyy"
                            )
                          : "Select start date"
                      }
                      readOnly
                      onClick={() => {
                        setCurrentDateFilterKey(filterValues[filter.key]);
                        setIsDateFilterDropdownOpen(true);
                      }}
                      className="date-filter-input date-filter-input-start"
                      ref={dateFilterStartInputRef}
                    />
                    <span className="date-filter-demarcator"> - </span>
                    <TextInput
                      type="text"
                      value={
                        filterValues[filterValues[filter.key]]?.end
                          ? format(
                              filterValues[filterValues[filter.key]].end,
                              "MMM d, yyyy"
                            )
                          : "Select end date"
                      }
                      readOnly
                      onClick={() => {
                        setCurrentDateFilterKey(filterValues[filter.key]);
                        setIsDateFilterDropdownOpen(true);
                      }}
                      className="date-filter-input date-filter-input-end"
                      ref={dateFilterEndInputRef}
                    />
                    {isDateFilterDropdownOpen &&
                      currentDateFilterKey === filterValues[filter.key] && (
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
                {filterValues[filter.key] === "category" && (
                  <div className="filter-value-select-container">
                    <SelectInput
                      value={filterValues.category || ""}
                      onChange={(e) =>
                        handleFilterValueChange("category", e.target.value)
                      }
                      options={[
                        { value: "", label: "Select Category" },
                        ...uniqueCategories.map((category) => ({
                          value: category,
                          label: category,
                        })),
                      ]}
                      className="filter-value-select"
                    />
                  </div>
                )}
                {filterValues[filter.key] === "priority" && (
                  <div className="filter-value-select-container">
                    <SelectInput
                      value={filterValues.priority || ""}
                      onChange={(e) =>
                        handleFilterValueChange("priority", e.target.value)
                      }
                      options={[
                        { value: "", label: "Select Priority" },
                        {
                          value: "Enterprise Critical",
                          label: "Enterprise Critical",
                        },
                        { value: "Enterprise High", label: "Enterprise High" },
                        { value: "Critical", label: "Critical" },
                        { value: "High", label: "High" },
                        { value: "Medium", label: "Medium" },
                        { value: "Low", label: "Low" },
                      ]}
                      className="filter-value-select"
                    />
                  </div>
                )}
                {filterValues[filter.key] === "assigned_to" && (
                  <div className="filter-value-select-container">
                    <SelectInput
                      value={filterValues.assigned_to || ""}
                      onChange={(e) =>
                        handleFilterValueChange("assigned_to", e.target.value)
                      }
                      options={[
                        { value: "", label: "Select Assigned To" },
                        ...uniqueAssignedTo.map((name) => ({
                          value: name,
                          label: name,
                        })),
                      ]}
                      className="filter-value-select"
                    />
                  </div>
                )}
                {filterValues[filter.key] === "stage_completion" && (
                  <div className="filter-value-select-container">
                    <SelectInput
                      value={filterValues.stage_completion || ""}
                      onChange={(e) =>
                        handleFilterValueChange(
                          "stage_completion",
                          e.target.value
                        )
                      }
                      options={[
                        { value: "", label: "Select Stage Completion" },
                        ...stageCompletionOptions.map((percentage) => ({
                          value: percentage,
                          label: percentage,
                        })),
                      ]}
                      className="filter-value-select"
                    />
                  </div>
                )}
                {filterValues[filter.key] === "plan" && (
                  <div className="filter-value-select-container">
                    <SelectInput
                      value={filterValues.plan || ""}
                      onChange={(e) =>
                        handleFilterValueChange("plan", e.target.value)
                      }
                      options={[
                        { value: "", label: "Select Plan" },
                        ...uniquePlans.map((plan) => ({
                          value: plan,
                          label: plan,
                        })),
                      ]}
                      className="filter-value-select"
                    />
                  </div>
                )}
                {filterValues[filter.key] === "account_status" && (
                  <div className="filter-value-select-container">
                    <SelectInput
                      value={filterValues.account_status || ""}
                      onChange={(e) =>
                        handleFilterValueChange(
                          "account_status",
                          e.target.value
                        )
                      }
                      options={[
                        { value: "", label: "Select Account Status" },
                        ...uniqueAccountStatuses.map((status) => ({
                          value: status,
                          label: status,
                        })),
                      ]}
                      className="filter-value-select"
                    />
                  </div>
                )}
                {filterValues[filter.key] === "account_officer" && (
                  <div className="filter-value-select-container">
                    <SelectInput
                      value={filterValues.account_officer || ""}
                      onChange={(e) =>
                        handleFilterValueChange(
                          "account_officer",
                          e.target.value
                        )
                      }
                      options={[
                        { value: "", label: "Select Account Officer" },
                        ...uniqueAccountOfficers.map((officer) => ({
                          value: officer,
                          label: officer,
                        })),
                      ]}
                      className="filter-value-select"
                    />
                  </div>
                )}
                {filterValues[filter.key] === "status" && (
                  <div className="filter-value-select-container">
                    <SelectInput
                      value={filterValues.status || ""}
                      onChange={(e) =>
                        handleFilterValueChange("status", e.target.value)
                      }
                      options={[
                        { value: "", label: "Select Status" },
                        ...uniqueStatuses.map((status) => ({
                          value: status,
                          label: status,
                        })),
                      ]}
                      className="filter-value-select"
                    />
                  </div>
                )}
                {filterValues[filter.key] === "billingCycle" && (
                  <div className="filter-value-select-container">
                    <SelectInput
                      value={filterValues.billingCycle || ""}
                      onChange={(e) =>
                        handleFilterValueChange("billingCycle", e.target.value)
                      }
                      options={[
                        { value: "", label: "Select Billing Cycle" },
                        { value: "Monthly", label: "Monthly" },
                        { value: "Yearly", label: "Yearly" },
                        { value: "Custom", label: "Custom" },
                      ]}
                      className="filter-value-select"
                    />
                  </div>
                )}
                {filterValues[filter.key] === "lastPaymentStatus" && (
                  <div className="filter-value-select-container">
                    <SelectInput
                      value={filterValues.lastPaymentStatus || ""}
                      onChange={(e) =>
                        handleFilterValueChange(
                          "lastPaymentStatus",
                          e.target.value
                        )
                      }
                      options={[
                        { value: "", label: "Select Payment Status" },
                        ...uniquePaymentStatuses.map((status) => ({
                          value: status,
                          label: status,
                        })),
                      ]}
                      className="filter-value-select"
                    />
                  </div>
                )}
                {filterValues[filter.key] === "clear_filters" && (
                  <Button
                    label="Clear All Filters"
                    variant="outline"
                    onClick={resetFilters}
                    className="clear-filters-button"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="table-actions">
        <div className="action-menu">
          <button
            onClick={toggleExportDropdown}
            className="action-button"
            ref={exportButtonRef}
          >
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
          {exportDropdownOpen && (
            <div
              className="action-dropdown export-dropdown"
              ref={exportDropdownRef}
            >
              <button className="dropdown-item" onClick={handleExportCSV}>
                Export as CSV
              </button>
              <button className="dropdown-item" onClick={handleExportPDF}>
                Export as PDF
              </button>
            </div>
          )}
        </div>
        <button onClick={handlePrint} className="action-button">
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
  );
};

export default TableHeader;

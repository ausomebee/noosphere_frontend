import React, { useMemo } from "react";
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
  liveRange,
  onDatePreview,
  dateFilterKeys,
  uniqueFilterValues,
  onFilterTypeSelect,
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
  // Get the currently selected filter type
  const selectedFilterType = filterValues.filter_type || "";
  const isDateFilter = dateFilterKeys.includes(selectedFilterType);
  const isClearFilter = selectedFilterType === "clear_filters";
  const isValueFilter = selectedFilterType && !isDateFilter && !isClearFilter;

  // Build value options for the selected filter type
  const valueOptions = useMemo(() => {
    if (!isValueFilter) return [];
    const values = uniqueFilterValues[selectedFilterType] || [];
    // Capitalize label for display
    const label = selectedFilterType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return [
      { value: "", label: `Select ${label}` },
      ...values.map((v) => ({ value: v, label: v })),
    ];
  }, [isValueFilter, selectedFilterType, uniqueFilterValues]);

  return (
    <div className="table-header">
      <div className="search-filters-container">
        <div className="search-container">
          <SearchInput
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filters-container">
          <h2 className="filter-text">Filters:</h2>
          {filters.map((filter, index) => (
            <div key={index} className="filter-wrapper">
              <div className="filter-select-container">
                {/* First select: pick which column to filter */}
                <div className="filter-label">
                  <SelectInput
                    value={selectedFilterType}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      if (newValue === "" || newValue === "clear_filters") {
                        resetFilters();
                        return;
                      }
                      // If parent handles via modal, delegate and reset
                      if (onFilterTypeSelect && !dateFilterKeys.includes(newValue)) {
                        onFilterTypeSelect(newValue);
                        resetFilters();
                        return;
                      }
                      handleFilterValueChange(filter.key, newValue);
                      if (dateFilterKeys.includes(newValue)) {
                        setCurrentDateFilterKey(newValue);
                      }
                    }}
                    options={filter.options}
                    className="table-filter-select"
                  />
                </div>

                {/* Date filter inputs */}
                {isDateFilter && (
                  <div className="date-filter-input-container">
                    <TextInput
                      type="text"
                      value={
                        (liveRange?.[selectedFilterType]?.start || filterValues[selectedFilterType]?.start)
                          ? format(liveRange?.[selectedFilterType]?.start || filterValues[selectedFilterType].start, "MMM d, yyyy")
                          : "Select start date"
                      }
                      readOnly
                      onClick={() => {
                        setCurrentDateFilterKey(selectedFilterType);
                        setIsDateFilterDropdownOpen(true);
                      }}
                      className="date-filter-input date-filter-input-start"
                      ref={dateFilterStartInputRef}
                    />
                    <span className="date-filter-demarcator"> - </span>
                    <TextInput
                      type="text"
                      value={
                        (liveRange?.[selectedFilterType]?.end || filterValues[selectedFilterType]?.end)
                          ? format(liveRange?.[selectedFilterType]?.end || filterValues[selectedFilterType].end, "MMM d, yyyy")
                          : "Select end date"
                      }
                      readOnly
                      onClick={() => {
                        setCurrentDateFilterKey(selectedFilterType);
                        setIsDateFilterDropdownOpen(true);
                      }}
                      className="date-filter-input date-filter-input-end"
                      ref={dateFilterEndInputRef}
                    />
                    {isDateFilterDropdownOpen && currentDateFilterKey === selectedFilterType && (
                      <div
                        className="date-filter-dropdown-wrapper no-scrollbar::-webkit-scrollbar no-scrollbar"
                        ref={dateFilterDropdownRef}
                      >
                        <DateFilterDropdown
                          isOpen={isDateFilterDropdownOpen}
                          onClose={() => setIsDateFilterDropdownOpen(false)}
                          onDateRangeSelect={handleDateRangeSelect}
                          onDateChange={onDatePreview}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Second select: only shown when NOT using modal-based filters */}
                {isValueFilter && !onFilterTypeSelect && (
                  <div className="filter-value-select-container">
                    <SelectInput
                      value={filterValues[selectedFilterType] || ""}
                      onChange={(e) =>
                        handleFilterValueChange(selectedFilterType, e.target.value)
                      }
                      options={valueOptions}
                      className="filter-value-select"
                    />
                  </div>
                )}

                {/* Clear filters button */}
                {isClearFilter && (
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

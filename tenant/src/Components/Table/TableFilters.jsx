import React from "react";
import { SelectInput, TextInput } from "../Input/Inputs";
import DateFilterDropdown from "./DateFilterModal";
import Button from "../Button/Button";
import { format } from "date-fns";

const TableFilters = ({
  filters,
  filterValues,
  handleFilterValueChange,
  handleDateRangeSelect,
  resetFilters,
  isDateFilterDropdownOpen,
  setIsDateFilterDropdownOpen,
  dateFilterStartInputRef,
  dateFilterEndInputRef,
  dateFilterDropdownRef,
  secondFilterOptions,
}) => (
  <>
    {filters.map((filter, index) => (
      <div key={index} className="filter-wrapper">
        <div className="filter-select-container">
          <div className="filter-label">
            <SelectInput
              value={filterValues.filter_type || ""}
              onChange={(e) => handleFilterValueChange("filter_type", e.target.value)}
              options={filter.options}
              
            />
          </div>
          {filterValues.filter_type && filterValues.filter_type !== "clear_filters" && filterValues.filter_type !== "dateTime" && (
            <div className="filter-value-select-container">
              <SelectInput
                value={filterValues.value || ""}
                onChange={(e) => handleFilterValueChange("value", e.target.value)}
                options={secondFilterOptions}
                width={"200"}
              />
            </div>
          )}
          {filterValues.filter_type === "dateTime" && (
            <div className="date-filter-input-container">
              <TextInput
                type="text"
                value={
                  filterValues.dateAdded?.start
                    ? format(filterValues.dateAdded.start, "MMM d, yyyy")
                    : "Select start date"
                }
                readOnly
                onClick={() => setIsDateFilterDropdownOpen(true)}
                className="date-filter-input date-filter-input-start"
                ref={dateFilterStartInputRef}
                width={"150"}
              />
              <span className="date-filter-demarcator"> - </span>
              <TextInput
                type="text"
                value={
                  filterValues.dateAdded?.end
                    ? format(filterValues.dateAdded.end, "MMM d, yyyy")
                    : "Select end date"
                }
                readOnly
                onClick={() => setIsDateFilterDropdownOpen(true)}
                className="date-filter-input date-filter-input-end"
                ref={dateFilterEndInputRef}
                 width={"150"}
              />
              {isDateFilterDropdownOpen && (
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
          {filterValues.filter_type === "clear_filters" && (
            <Button
              label="Clear Filters"
              variant="outline"
              onClick={resetFilters}
              className="clear-filters-button"
            />
          )}
        </div>
      </div>
    ))}
  </>
);

export default TableFilters;
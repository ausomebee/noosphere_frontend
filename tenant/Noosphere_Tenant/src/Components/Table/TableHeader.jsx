import React from "react";
import TableFilters from "./TableFilters";
import { SearchInput } from "../Input/Inputs";

const TableHeader = ({
  searchTerm,
  setSearchTerm,
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
  <div className="table-header">
    <div className="search-filters-container">
      <div className="search-container">
        <div>
          <SearchInput
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            width={300}
          />
        </div>
      </div>
      <div className="filters-container">
        <h2 className="filter-text">Filters:</h2>
        <TableFilters
          filters={filters}
          filterValues={filterValues}
          handleFilterValueChange={handleFilterValueChange}
          handleDateRangeSelect={handleDateRangeSelect}
          resetFilters={resetFilters}
          isDateFilterDropdownOpen={isDateFilterDropdownOpen}
          setIsDateFilterDropdownOpen={setIsDateFilterDropdownOpen}
          dateFilterStartInputRef={dateFilterStartInputRef}
          dateFilterEndInputRef={dateFilterEndInputRef}
          dateFilterDropdownRef={dateFilterDropdownRef}
          secondFilterOptions={secondFilterOptions}
        />
      </div>
    </div>
  </div>
);

export default TableHeader;
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  exportTableData,
  printTableData,
  exportTableToPDF,
} from "../../utils/TableUtils";
import Pagination from "./Pagination";
import TableHeader from "./TableHeader";
import TableBody from "./TableBody";
import TableActions from "./TableActions";
import "./CustomTable.css";
import { parse, isSameDay, isWithinInterval, isValid, format } from "date-fns";

const CustomTable = ({
  data,
  columns,
  filters,
  onFilterChange,
  actions,
  showActions = true,
  showCheckbox = true,
  itemsPerPage = 10,
  tableName = "Table",
  onSelectionChange,
  hasStatusDot = false,
  actionLinkPrefix,
  actionText,
  onActionClick,
  loading,
  hideSearch = false,
  hideTableActions = false,
  onToggleActive, 
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [filterValues, setFilterValues] = useState({
    filter_type: "",
    value: "",
    dateAdded: null,
    stage_completion: "",
  });
  const [openDropdown, setOpenDropdown] = useState(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [isDateFilterDropdownOpen, setIsDateFilterDropdownOpen] = useState(false);
  const tableContainerRef = useRef(null);
  const menuRefs = useRef({});
  const exportButtonRef = useRef(null);
  const exportDropdownRef = useRef(null);
  const dateFilterStartInputRef = useRef(null);
  const dateFilterEndInputRef = useRef(null);
  const dateFilterDropdownRef = useRef(null);

  const getUniqueValues = useCallback(
    (key) => {
      if (!key) return [];
      const values = new Set(data.map((row) => row[key]).filter(Boolean));
      return Array.from(values).map((value) => ({ value, label: value }));
    },
    [data]
  );

  const filterOptions = useMemo(() => {
    if (!filters) return [];

    if (Array.isArray(filters) && filters.length > 0) {
      return [
        { value: "", label: "Select Filter" },
        ...filters,
        { value: "clear_filters", label: "Clear Filters" },
      ];
    }

    return [
      { value: "", label: "Select Filter" },
      ...columns
        .filter(
          (col) =>
            col.type === "text" ||
            col.key === "dateTime" ||
            col.key === "approval" ||
            col.key === "ToggleActive" ||
            col.key === "stage_completion"
        )
        .map((col) => ({ value: col.key, label: col.header })),
      { value: "clear_filters", label: "Clear Filters" },
    ];
  }, [columns, filters]);

  const secondFilterOptions = useMemo(() => {
    if (!filters) return [];
    const type = filterValues.filter_type;
    const selectedFilter = filters.find((f) => f.value === type);
    if (selectedFilter && selectedFilter.filterValues) {
      return [{ value: "", label: `Select ${selectedFilter.label}` }, ...selectedFilter.filterValues];
    }
    switch (type) {
      case "dateTime":
        return [];
      case "stage_completion":
        return [
          { value: "", label: "Select Stage Completion" },
          ...Array.from({ length: 11 }, (_, i) => ({
            value: i * 10,
            label: `${i * 10}%`,
          })),
        ];
      case "":
      case "clear_filters":
        return [];
      default:
        return getUniqueValues(type).length > 0
          ? [{ value: "", label: `Select ${type}` }, ...getUniqueValues(type)]
          : [];
    }
  }, [filterValues.filter_type, getUniqueValues, filters]);

  const filteredData = useMemo(() => {
    let filtered = [...data];

    if (searchTerm) {
      filtered = filtered.filter((row) =>
        columns.some((col) => {
          const value = row[col.key];
          return (
            value &&
            value.toString().toLowerCase().includes(searchTerm.toLowerCase())
          );
        })
      );
    }

    if (
      filters &&
      filterValues.filter_type &&
      filterValues.value !== "" &&
      filterValues.filter_type !== "dateTime" &&
      filterValues.filter_type !== "stage_completion" &&
      filterValues.filter_type !== "clear_filters"
    ) {
      const selectedFilter = filters.find(
        (f) => f.value === filterValues.filter_type
      );

      if (selectedFilter && selectedFilter.filterFunction) {
        filtered = filtered.filter((row) =>
          selectedFilter.filterFunction(row, filterValues.value)
        );
      } else {
        filtered = filtered.filter((row) => {
          const rowValue = row[filterValues.filter_type];
          const filterValue = filterValues.value;
          return (
            rowValue &&
            filterValue &&
            rowValue.toString().toLowerCase() ===
              filterValue.toString().toLowerCase()
          );
        });
      }
    }

   // === DATE RANGE FILTER (DD-MM-YYYY in table, but internal uses MM/dd/yyyy) ===
if (
  filters &&
  filterValues.filter_type === "dateTime" &&
  filterValues.dateAdded?.start &&
  filterValues.dateAdded?.end
) {
  filtered = filtered.filter((row) => {
    const dateStr = row.dateCreated || row.date || row.dateAdded || row.dateTime;
    if (!dateStr) return false;

    let rowDate;
    
    // Check if date is in yyyy-mm-dd format (has 4 digits at start)
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
      // Parse yyyy-mm-dd format
      const [year, month, day] = dateStr.split("-").map(Number);
      rowDate = new Date(year, month - 1, day);
    } 
    // Check if date is in dd-mm-yyyy format
    else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
      // Parse dd-mm-yyyy format
      const [day, month, year] = dateStr.split("-").map(Number);
      rowDate = new Date(year, month - 1, day);
    } 
    else {
      return false; // Unknown format
    }

    if (!isValid(rowDate)) return false;

    // Parse stored MM/dd/yyyy strings back to Date
    const startDate = parse(filterValues.dateAdded.start, "MM/dd/yyyy", new Date());
    const endDate = parse(filterValues.dateAdded.end, "MM/dd/yyyy", new Date());

    if (!isValid(startDate) || !isValid(endDate)) return false;

    return isWithinInterval(rowDate, { start: startDate, end: endDate });
  });
}

    if (
      filters &&
      filterValues.filter_type === "stage_completion" &&
      filterValues.value !== ""
    ) {
      const min = parseInt(filterValues.value, 10);
      const max = min + 9;
      filtered = filtered.filter((row) => {
        const completion =
          row.stage_completion != null ? parseInt(row.stage_completion, 10) : 0;
        return completion >= min && completion <= max;
      });
    }

    if (filters && filterValues.filter_type === "clear_filters") {
      filtered = [...data];
      setFilterValues({
        filter_type: "",
        value: "",
        dateAdded: null,
        stage_completion: "",
      });
      if (onFilterChange) {
        onFilterChange("filter_type", "");
        onFilterChange("value", "");
        onFilterChange("dateAdded", null);
        onFilterChange("stage_completion", "");
      }
    }

    return filtered;
  }, [data, searchTerm, filterValues, columns, filters, onFilterChange]);

  const pagination = useMemo(() => {
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = filteredData.slice(startIndex, endIndex);
    return { totalItems, totalPages, startIndex, endIndex, currentData };
  }, [filteredData, currentPage, itemsPerPage]);

  const { totalItems, totalPages, currentData } = pagination;

  const handlePageChange = useCallback(
    (page) => {
      console.log("Changing page to:", page);
      setCurrentPage(page);
      setSelectedRows([]);
      setSelectedItems([]);
      if (onSelectionChange) {
        onSelectionChange([], []);
      }
    },
    [onSelectionChange]
  );

  const handleCheckboxChange = useCallback(
    (rowIndex, row) => {
      console.log("Checkbox change for row:", rowIndex, row);
      const newSelectedRows = selectedRows.includes(rowIndex)
        ? selectedRows.filter((index) => index !== rowIndex)
        : [...selectedRows, rowIndex];
      const newSelectedItems = selectedItems.some((item) => item.id === row.id)
        ? selectedItems.filter((item) => item.id !== row.id)
        : [...selectedItems, row];
      setSelectedRows(newSelectedRows);
      setSelectedItems(newSelectedItems);
      console.log(
        "New selected rows:",
        newSelectedRows,
        "New selected items:",
        newSelectedItems
      );
      if (onSelectionChange) {
        onSelectionChange(newSelectedRows, newSelectedItems);
      }
    },
    [selectedRows, selectedItems, onSelectionChange]
  );

  const handleSelectAllChange = useCallback(() => {
    let newSelectedRows = [];
    let newSelectedItems = [];
    if (
      selectedRows.length > 0 &&
      selectedRows.length ===
        currentData.filter((row) => row.hasCheckbox).length
    ) {
      newSelectedRows = [];
      newSelectedItems = [];
    } else {
      newSelectedRows = currentData
        .map((row, index) => (row.hasCheckbox ? index : null))
        .filter((index) => index !== null);
      newSelectedItems = currentData.filter((row) => row.hasCheckbox);
    }
    setSelectedRows(newSelectedRows);
    setSelectedItems(newSelectedItems);

    if (onSelectionChange) {
      onSelectionChange(newSelectedRows, newSelectedItems);
    }
  }, [selectedRows, currentData, onSelectionChange]);

  const handleExportCSV = useCallback(() => {
    console.log("Exporting to CSV");
    exportTableData(
      data,
      columns,
      `${tableName.toLowerCase().replace(/\s+/g, "-")}.csv`,
      tableName
    );
    setExportDropdownOpen(false);
  }, [data, columns, tableName]);

  const handleExportPDF = useCallback(() => {
    console.log("Exporting to PDF");
    exportTableToPDF(
      data,
      columns,
      `${tableName.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      tableName
    );
    setExportDropdownOpen(false);
  }, [data, columns, tableName]);

  const handlePrint = useCallback(() => {
    console.log("Printing table");
    printTableData(data, columns, tableName);
  }, [data, columns, tableName]);

  const toggleDropdown = useCallback(
    (rowIndex, colIndex) => {
      const key = `${rowIndex}-${colIndex}`;
      setOpenDropdown((prev) => (prev === key ? null : key));
      if (openDropdown !== key) {
        setTimeout(() => positionDropdown(rowIndex, colIndex), 0);
      }
    },
    [openDropdown]
  );

  const toggleExportDropdown = useCallback(() => {
    console.log("Toggling export dropdown");
    setExportDropdownOpen((prev) => !prev);
    if (!exportDropdownOpen) {
      setTimeout(() => positionExportDropdown(), 0);
    }
  }, [exportDropdownOpen]);

  const positionDropdown = (rowIndex, colIndex) => {
    const key = `${rowIndex}-${colIndex}`;
    const button = menuRefs.current[key]?.button;
    const dropdown = menuRefs.current[key]?.dropdown;
    if (!button || !dropdown) return;
    const buttonRect = button.getBoundingClientRect();
    const dropdownHeight = dropdown.scrollHeight || 150;
    const dropdownWidth = dropdown.offsetWidth || 180;
    const spaceBelow = window.innerHeight - buttonRect.bottom - 10;
    const spaceAbove = buttonRect.top - 10;

    // Use fixed positioning so the dropdown escapes table overflow clipping
    dropdown.style.position = "fixed";
    dropdown.style.zIndex = "9999";
    dropdown.style.overflowY = "auto";

    // Position horizontally: align right edge to the left of the button
    const leftPos = buttonRect.left - dropdownWidth - 4;
    dropdown.style.left = `${Math.max(leftPos, 4)}px`;
    dropdown.style.right = "auto";

    // Position vertically: prefer below, flip above if not enough space
    if (spaceBelow >= dropdownHeight) {
      dropdown.style.top = `${buttonRect.bottom + 2}px`;
      dropdown.style.bottom = "auto";
      dropdown.style.maxHeight = `${spaceBelow}px`;
    } else if (spaceAbove >= dropdownHeight) {
      dropdown.style.top = `${buttonRect.top - dropdownHeight - 2}px`;
      dropdown.style.bottom = "auto";
      dropdown.style.maxHeight = `${spaceAbove}px`;
    } else {
      // Not enough room either way — use the larger side
      if (spaceBelow >= spaceAbove) {
        dropdown.style.top = `${buttonRect.bottom + 2}px`;
        dropdown.style.bottom = "auto";
        dropdown.style.maxHeight = `${spaceBelow}px`;
      } else {
        dropdown.style.top = `${buttonRect.top - Math.min(dropdownHeight, spaceAbove) - 2}px`;
        dropdown.style.bottom = "auto";
        dropdown.style.maxHeight = `${spaceAbove}px`;
      }
    }
  };

  const positionExportDropdown = () => {
    const button = exportButtonRef.current;
    const dropdown = exportDropdownRef.current;
    if (!button || !dropdown) return;
    const buttonRect = button.getBoundingClientRect();
    const dropdownRect = dropdown.getBoundingClientRect();
    const dropdownHeight = dropdownRect.height;
    const spaceAbove = buttonRect.top - 10;
    const top = -dropdownHeight - 4;
    dropdown.style.top = `${top}px`;
    dropdown.style.bottom = "auto";
    dropdown.style.maxHeight = `${spaceAbove}px`;
    dropdown.style.position = "absolute";
    dropdown.style.overflowY = "auto";
    dropdown.style.right = "0";
  };

  const handleFilterValueChange = useCallback(
    (filterKey, value) => {
      if (!filters) return;
      setFilterValues((prev) => {
        const newValues = { ...prev, [filterKey]: value };
        return newValues;
      });
      if (onFilterChange) onFilterChange(filterKey, value);
    },
    [filters, onFilterChange]
  );

  const handleDateRangeSelect = useCallback(
    (range) => {
      console.log("Date range selected:", range);
      if (!filters) return;
      const updatedValues = {
        ...filterValues,
        dateAdded: {
          start: range.start ? format(range.start, "MM/dd/yyyy") : null,
          end: range.end ? format(range.end, "MM/dd/yyyy") : null,
        },
      };
      setFilterValues(updatedValues);
      if (onFilterChange) onFilterChange("dateAdded", updatedValues.dateAdded);
      setIsDateFilterDropdownOpen(false);
    },
    [filters, filterValues, onFilterChange]
  );

  const handleResetFilters = useCallback(() => {
    console.log("Resetting filters");
    if (!filters) return;
    setFilterValues({
      filter_type: "",
      value: "",
      dateAdded: null,
      stage_completion: "",
    });
    if (onFilterChange) {
      onFilterChange("filter_type", "");
      onFilterChange("value", "");
      onFilterChange("dateAdded", null);
      onFilterChange("stage_completion", "");
      setSearchTerm("");
    }
  }, [filters, onFilterChange]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        Object.values(menuRefs.current).some(
          ({ button, dropdown }) =>
            (button && button.contains(event.target)) ||
            (dropdown && dropdown.contains(event.target))
        ) ||
        (exportButtonRef.current &&
          exportButtonRef.current.contains(event.target)) ||
        (exportDropdownRef.current &&
          exportDropdownRef.current.contains(event.target)) ||
        (filters &&
          dateFilterStartInputRef.current &&
          dateFilterStartInputRef.current.contains(event.target)) ||
        (filters &&
          dateFilterEndInputRef.current &&
          dateFilterEndInputRef.current.contains(event.target)) ||
        (filters &&
          dateFilterDropdownRef.current &&
          dateFilterDropdownRef.current.contains(event.target))
      ) {
        return;
      }

      setOpenDropdown(null);
      setExportDropdownOpen(false);
      setIsDateFilterDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);

    // Close fixed-position dropdowns on scroll so they don't float detached
    const handleScroll = () => {
      setOpenDropdown(null);
    };
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [filters]);

  return (
    <div
      className={`custom-table-container ${
        exportDropdownOpen ? "export-dropdown-open" : ""
      }`}
    >
      {!hideSearch && (
        <div className="table-header">
          <div className="search-filters-container">
            <TableHeader
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filters={filters ? [{ options: filterOptions }] : []}
              filterValues={filters ? filterValues : {}}
              handleFilterValueChange={
                filters ? handleFilterValueChange : () => {}
              }
              handleDateRangeSelect={filters ? handleDateRangeSelect : () => {}}
              resetFilters={filters ? handleResetFilters : () => {}}
              isDateFilterDropdownOpen={
                filters ? isDateFilterDropdownOpen : false
              }
              setIsDateFilterDropdownOpen={
                filters ? setIsDateFilterDropdownOpen : () => {}
              }
              dateFilterStartInputRef={filters ? dateFilterStartInputRef : null}
              dateFilterEndInputRef={filters ? dateFilterEndInputRef : null}
              dateFilterDropdownRef={filters ? dateFilterDropdownRef : null}
              secondFilterOptions={filters ? secondFilterOptions : []}
            />
          </div>
          { !hideTableActions && (
            <TableActions
              toggleExportDropdown={toggleExportDropdown}
              exportDropdownOpen={exportDropdownOpen}
              handleExportCSV={handleExportCSV}
              handleExportPDF={handleExportPDF}
              handlePrint={handlePrint}
              exportButtonRef={exportButtonRef}
              exportDropdownRef={exportDropdownRef}
            />
          )}
        </div>
      )}
      <div
        className="table-container no-scrollbar::-webkit-scrollbar no-scrollbar"
        ref={tableContainerRef}
      >
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : (
          <TableBody
            currentData={currentData}
            columns={columns}
            showCheckbox={showCheckbox}
            showActions={showActions}
            selectedRows={selectedRows}
            handleCheckboxChange={handleCheckboxChange}
            handleSelectAllChange={handleSelectAllChange}
            toggleDropdown={toggleDropdown}
            openDropdown={openDropdown}
            menuRefs={menuRefs}
            actions={actions}
            tableName={tableName}
            hasStatusDot={hasStatusDot}
            handleToggleActive={onToggleActive} // Pass the prop
            actionLinkPrefix={actionLinkPrefix}
            actionText={actionText}
            onActionClick={onActionClick}
          />
        )}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default CustomTable;
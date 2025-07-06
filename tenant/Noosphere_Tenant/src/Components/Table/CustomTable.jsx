import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { exportTableData, printTableData, exportTableToPDF } from "../../utils/TableUtils";
import Pagination from "./Pagination";
import TableHeader from "./TableHeader";
import TableBody from "./TableBody";
import TableActions from "./TableActions";
import "./CustomTable.css";
import { parse, isSameDay, isWithinInterval, isValid } from "date-fns";

const CustomTable = ({
  data,
  columns,
  filters,
  onFilterChange,
  actions,
  showActions = true,
  showCheckbox = true,
  itemsPerPage = 5,
  tableName = "Table",
  onSelectionChange,
  hasStatusDot = false,
  actionLinkPrefix,
  actionText
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [filterValues, setFilterValues] = useState({
    filter_type: "",
    value: "", // Second filter value
    dateAdded: null,
  });
  const [isDateFilterDropdownOpen, setIsDateFilterDropdownOpen] = useState(false);
  const tableContainerRef = useRef(null);
  const menuRefs = useRef({});
  const exportButtonRef = useRef(null);
  const exportDropdownRef = useRef(null);
  const dateFilterStartInputRef = useRef(null);
  const dateFilterEndInputRef = useRef(null);
  const dateFilterDropdownRef = useRef(null);

  // Extract unique values for filters
  const getUniqueValues = useCallback((key) => {
    if (!key) return [];
    const values = new Set(data.map((row) => row[key]).filter(Boolean));
    return Array.from(values).map((value) => ({ value, label: value }));
  }, [data]);

  const filterOptions = useMemo(() => [
    { value: "", label: "Select Filter" },
    ...columns
      .filter((col) => col.type === "text" || col.key === "dateTime" || col.key === "approval" || col.key === "ToggleActive")
      .map((col) => ({ value: col.key, label: col.header })),
    { value: "clear_filters", label: "Clear Filters" },
  ], [columns]);

  const secondFilterOptions = useMemo(() => {
    const type = filterValues.filter_type;
    switch (type) {
      case "client": return [{ value: "", label: "Select Client" }, ...getUniqueValues("client")];
      case "serviceType": return [{ value: "", label: "Select Service Type" }, ...getUniqueValues("serviceType")];
      case "programs": return [{ value: "", label: "Select Programs" }, ...getUniqueValues("programs")];
      case "sessions": return [{ value: "", label: "Select Sessions" }, ...getUniqueValues("sessions")];
      case "therapist": return [{ value: "", label: "Select Therapist" }, ...getUniqueValues("therapist")];
      case "uploadBy": return [{ value: "", label: "Select Upload By" }, ...getUniqueValues("uploadBy")];
      case "description": return [{ value: "", label: "Select Description" }, ...getUniqueValues("description")];
      case "code": return [{ value: "", label: "Select Code" }, ...getUniqueValues("code")];
      case "createdBy": return [{ value: "", label: "Select Created By" }, ...getUniqueValues("createdBy")];
      case "timeSheetNumber": return [{ value: "", label: "Select TimeSheet Number" }, ...getUniqueValues("timeSheetNumber")];
      case "approval": return [{ value: "", label: "Select Approval" }, ...getUniqueValues("approval")];
      case "dateTime": return [];
      case "ToggleActive": return [{ value: "", label: "Select ToggleActive" }, { value: "true", label: "True" }, { value: "false", label: "False" }];
      default: return [];
    }
  }, [filterValues.filter_type, getUniqueValues]);

  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Search across all column keys
    if (searchTerm) {
      filtered = filtered.filter((row) =>
        columns.some((col) => {
          const value = row[col.key];
          return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Filter logic based on filter_type and value
    const { filter_type, value, dateAdded } = filterValues;
    if (filter_type && value && filter_type !== "dateTime") {
      if (filter_type === "ToggleActive") {
        filtered = filtered.filter((row) => row[filter_type].toString() === value);
      } else {
        filtered = filtered.filter((row) => row[filter_type]?.toString().toLowerCase() === value.toLowerCase());
      }
    }

    // Date filter logic
    if (filter_type === "dateTime" && dateAdded && (dateAdded.start || dateAdded.end)) {
      filtered = filtered.filter((row) => {
        const rowDate = row.dateTime?.date ? parse(row.dateTime.date, "yyyy-MM-dd", new Date()) : null;
        if (!isValid(rowDate)) return false;
        const startDate = dateAdded.start ? new Date(dateAdded.start) : null;
        const endDate = dateAdded.end ? new Date(dateAdded.end) : null;
        if (startDate && endDate && !isSameDay(startDate, endDate)) {
          return isWithinInterval(rowDate, { start: startDate, end: endDate });
        } else if (startDate) {
          return isSameDay(rowDate, startDate);
        }
        return true;
      });
    }

    if (filter_type === "clear_filters") {
      filtered = [...data];
      setFilterValues({ filter_type: "", value: "", dateAdded: null });
      onFilterChange("filter_type", "");
      onFilterChange("value", "");
      onFilterChange("dateAdded", null);
    }

    return filtered;
  }, [data, searchTerm, filterValues, columns, onFilterChange]);

  const pagination = useMemo(() => {
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = filteredData.slice(startIndex, endIndex);
    return { totalItems, totalPages, startIndex, endIndex, currentData };
  }, [filteredData, currentPage, itemsPerPage]);

  const { totalItems, totalPages, currentData } = pagination;

  const handlePageChange = useCallback((page) => setCurrentPage(page), []);
  const handleCheckboxChange = useCallback(
    (rowIndex, row) => {
      const newSelectedRows = selectedRows.includes(rowIndex)
        ? selectedRows.filter((index) => index !== rowIndex)
        : [...selectedRows, rowIndex];
      const newSelectedItems = selectedItems.some((item) => item.id === row.id)
        ? selectedItems.filter((item) => item.id !== row.id)
        : [...selectedItems, row];
      setSelectedRows(newSelectedRows);
      setSelectedItems(newSelectedItems);
      if (onSelectionChange) onSelectionChange(newSelectedRows, newSelectedItems);
    },
    [selectedRows, selectedItems, onSelectionChange]
  );
  const handleSelectAllChange = useCallback(() => {
    let newSelectedRows = [];
    let newSelectedItems = [];
    if (
      selectedRows.length > 0 &&
      selectedRows.length === currentData.filter((row) => row.hasCheckbox).length
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
    if (onSelectionChange) onSelectionChange(newSelectedRows, newSelectedItems);
  }, [selectedRows, currentData, onSelectionChange]);
  const handleToggleActive = useCallback(
    (rowIndex) => {
      const updatedData = [...data];
      updatedData[pagination.startIndex + rowIndex].ToggleActive =
        !updatedData[pagination.startIndex + rowIndex].ToggleActive;
    },
    [data, pagination.startIndex]
  );
  const handleExportCSV = useCallback(() => {
    exportTableData(data, columns, `${tableName.toLowerCase().replace(/\s+/g, "-")}.csv`, tableName);
    setExportDropdownOpen(false);
  }, [data, columns, tableName]);
  const handleExportPDF = useCallback(() => {
    exportTableToPDF(data, columns, `${tableName.toLowerCase().replace(/\s+/g, "-")}.pdf`, tableName);
    setExportDropdownOpen(false);
  }, [data, columns, tableName]);
  const handlePrint = useCallback(() => printTableData(data, columns, tableName), [data, columns, tableName]);
  const toggleDropdown = useCallback(
    (rowIndex, colIndex) => {
      const key = `${rowIndex}-${colIndex}`;
      setOpenDropdown((prev) => (prev === key ? null : key));
      if (openDropdown !== key) setTimeout(() => positionDropdown(rowIndex, colIndex), 0);
    },
    [openDropdown]
  );
  const toggleExportDropdown = useCallback(() => {
    setExportDropdownOpen((prev) => !prev);
    if (!exportDropdownOpen) setTimeout(() => positionExportDropdown(), 0);
  }, [exportDropdownOpen]);
  const positionDropdown = (rowIndex, colIndex) => {
    const key = `${rowIndex}-${colIndex}`;
    const button = menuRefs.current[key]?.button;
    const dropdown = menuRefs.current[key]?.dropdown;
    if (!button || !dropdown) return;
    const buttonRect = button.getBoundingClientRect();
    const tableRect = tableContainerRef.current.getBoundingClientRect();
    const headerRect = tableContainerRef.current.querySelector("thead")?.getBoundingClientRect();
    if (!headerRect) return;
    const dropdownRect = dropdown.getBoundingClientRect();
    const dropdownHeight = dropdownRect.height || 150;
    const spaceBelow = window.innerHeight - buttonRect.bottom - 10;
    const spaceAbove = buttonRect.top - headerRect.bottom - 10;
    let top;
    if (spaceBelow >= dropdownHeight) {
      top = button.offsetHeight + 2;
      dropdown.style.top = `${top}px`;
      dropdown.style.bottom = "auto";
      dropdown.style.maxHeight = `${spaceBelow}px`;
    } else if (spaceAbove >= dropdownHeight) {
      top = -(dropdownHeight + 2);
      dropdown.style.top = `${top}px`;
      dropdown.style.bottom = "auto";
      dropdown.style.maxHeight = `${spaceAbove}px`;
    } else {
      top = -(Math.min(dropdownHeight, spaceAbove) + 2);
      dropdown.style.top = `${top}px`;
      dropdown.style.bottom = "auto";
      dropdown.style.maxHeight = `${spaceAbove}px`;
    }
    const additionalOffset = 4;
    const left = -dropdownRect.width - additionalOffset;
    dropdown.style.left = `${left}px`;
    dropdown.style.right = "auto";
    dropdown.style.position = "absolute";
    dropdown.style.zIndex = "1000";
    dropdown.style.overflowY = "auto";
    const viewportBottom = window.innerHeight;
    const dropdownBottom = buttonRect.top + top;
    if (dropdownBottom < 0) {
      dropdown.style.top = "0";
      dropdown.style.maxHeight = `${buttonRect.top - 10}px`;
    } else if (buttonRect.bottom + (dropdownHeight - top) > viewportBottom) {
      dropdown.style.maxHeight = `${viewportBottom - buttonRect.bottom - 10}px`;
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
  const handleFilterValueChange = (filterKey, value) => {
    setFilterValues((prev) => ({ ...prev, [filterKey]: value }));
    onFilterChange(filterKey, value);
  };
  const handleDateRangeSelect = (range) => {
    const updatedValues = {
      ...filterValues,
      dateAdded: {
        start: range.start ? new Date(range.start) : null,
        end: range.end ? new Date(range.end) : null,
      },
    };
    setFilterValues(updatedValues);
    onFilterChange("dateAdded", updatedValues.dateAdded);
    setIsDateFilterDropdownOpen(false);
  };
  const resetFilters = () => {
    setFilterValues({ filter_type: "", value: "", dateAdded: null });
    onFilterChange("filter_type", "");
    onFilterChange("value", "");
    onFilterChange("dateAdded", null);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        Object.values(menuRefs.current).some(
          ({ button, dropdown }) =>
            (button && button.contains(event.target)) ||
            (dropdown && dropdown.contains(event.target))
        ) ||
        (exportButtonRef.current && exportButtonRef.current.contains(event.target)) ||
        (exportDropdownRef.current && exportDropdownRef.current.contains(event.target)) ||
        (dateFilterStartInputRef.current && dateFilterStartInputRef.current.contains(event.target)) ||
        (dateFilterEndInputRef.current && dateFilterEndInputRef.current.contains(event.target)) ||
        (dateFilterDropdownRef.current && dateFilterDropdownRef.current.contains(event.target))
      ) {
        return;
      }
      setOpenDropdown(null);
      setExportDropdownOpen(false);
      setIsDateFilterDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`custom-table-container ${exportDropdownOpen ? "export-dropdown-open" : ""}`}>
      <div className="table-header">
        <div className="search-filters-container">
          <TableHeader
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filters={[{ options: filterOptions }]} // Pass filter options directly
            filterValues={filterValues}
            handleFilterValueChange={handleFilterValueChange}
            handleDateRangeSelect={handleDateRangeSelect}
            resetFilters={resetFilters}
            isDateFilterDropdownOpen={isDateFilterDropdownOpen}
            setIsDateFilterDropdownOpen={setIsDateFilterDropdownOpen}
            dateFilterStartInputRef={dateFilterStartInputRef}
            dateFilterEndInputRef={dateFilterEndInputRef}
            dateFilterDropdownRef={dateFilterDropdownRef}
            secondFilterOptions={secondFilterOptions} // Pass second filter options
          />
        </div>
        {showActions && (
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
      <div className="table-container no-scrollbar::-webkit-scrollbar no-scrollbar" ref={tableContainerRef}>
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
          handleToggleActive={handleToggleActive}
          actionText={actionText}
          actionLinkPrefix={actionLinkPrefix}
        />
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
    </div>
  );
};

export default CustomTable;
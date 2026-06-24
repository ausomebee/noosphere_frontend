import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  exportTableData,
  printTableData,
  exportTableToPDF,
} from "../../utils/TableUtils";
import Pagination from "./Pagination";
import TableHeader from "./TableHeader";
import TableBody from "./TableBody";
import "./CustomTable.css";
import { FaExchangeAlt } from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";
import { RxCross2 } from "react-icons/rx";
import Button from "../Button/Button";
import { parse, isSameDay, isWithinInterval, isValid } from "date-fns";

const CustomTable = ({
  data,
  columns,
  filters = [],
  onFilterChange = () => {},
  actions,
  showActions = true,
  showCheckbox = true,
  itemsPerPage = 5,
  tableName = "Table",
  onAssignToStaff,
  onMoveCandidates,
  onDelete,
  onSelectionChange,
  hasStatusDot = false,
  onFilterTypeSelect,
  onToggleActive,
  // When the data is paginated by the server, hide the table's own client-side
  // pagination and let the parent render <Pagination> driven by server pages.
  hidePagination = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [filterValues, setFilterValues] = useState({ filter_type: "" });
  const [liveRange, setLiveRange] = useState({});
  const [isDateFilterDropdownOpen, setIsDateFilterDropdownOpen] =
    useState(false);
  const [currentDateFilterKey, setCurrentDateFilterKey] = useState(null);
  const tableContainerRef = useRef(null);
  const menuRefs = useRef({});
  const exportButtonRef = useRef(null);
  const exportDropdownRef = useRef(null);
  const dateFilterStartInputRef = useRef(null);
  const dateFilterEndInputRef = useRef(null);
  const dateFilterDropdownRef = useRef(null);

  // Date filter keys that use date range picker instead of value select
  const dateFilterKeys = useMemo(
    () => ["date_reported", "date_updated", "date_created", "due_date", "nextBillingDate", "dateAdded"],
    []
  );

  // Build a map of unique values for each filterable column from the data
  const uniqueFilterValues = useMemo(() => {
    const valuesMap = {};
    // Get all filter option values (excluding empty, clear_filters, and date keys)
    const filterKeys = filters.flatMap((f) =>
      f.options
        .map((opt) => opt.value)
        .filter((v) => v && v !== "clear_filters" && !dateFilterKeys.includes(v))
    );
    filterKeys.forEach((key) => {
      const values = new Set(data.map((row) => row[key]).filter(Boolean));
      valuesMap[key] = Array.from(values);
    });
    return valuesMap;
  }, [data, filters, dateFilterKeys]);

  // Reset pagination when data changes (e.g. tab switch, new filter)
  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply search filter
    filtered = filtered.filter((row) =>
      Object.values(row).some(
        (value) =>
          value &&
          value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    // Apply filters
    Object.entries(filterValues).forEach(([key, value]) => {
      if (!value || key === "filter_type") return;

      // Date range filters
      if (dateFilterKeys.includes(key) && (value.start || value.end)) {
        filtered = filtered.filter((row) => {
          const rowDate = row[key]
            ? parse(row[key], "MM/dd/yyyy", new Date())
            : null;
          if (!isValid(rowDate)) return false;
          const startDate = value.start ? new Date(value.start) : null;
          const endDate = value.end ? new Date(value.end) : null;

          if (startDate && endDate && !isSameDay(startDate, endDate)) {
            return isWithinInterval(rowDate, {
              start: startDate,
              end: endDate,
            });
          } else if (startDate) {
            return isSameDay(rowDate, startDate);
          }
          return true;
        });
      } else if (typeof value === "string" && value) {
        // String value filters — match row[key] to value
        filtered = filtered.filter((row) => row[key] === value);
      }
    });

    return filtered;
  }, [data, searchTerm, filterValues, dateFilterKeys]);

  const pagination = useMemo(() => {
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = filteredData.slice(startIndex, endIndex);

    return {
      totalItems,
      totalPages,
      startIndex,
      endIndex,
      currentData,
    };
  }, [filteredData, currentPage, itemsPerPage]);

  const { totalPages, startIndex, currentData } = pagination;

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

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

  const handleToggleActive = useCallback(
    (rowIndex) => {
      if (onToggleActive) {
        onToggleActive(startIndex + rowIndex);
      }
    },
    [onToggleActive, startIndex]
  );

  const handleExportCSV = useCallback(() => {
    exportTableData(
      filteredData,
      columns,
      `${tableName.toLowerCase().replace(/\s+/g, "-")}.csv`,
      tableName
    );
    setExportDropdownOpen(false);
  }, [filteredData, columns, tableName]);

  const handleExportPDF = useCallback(() => {
    exportTableToPDF(
      filteredData,
      columns,
      `${tableName.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      tableName
    );
    setExportDropdownOpen(false);
  }, [filteredData, columns, tableName]);

  const handlePrint = useCallback(() => {
    printTableData(filteredData, columns, tableName);
  }, [filteredData, columns, tableName]);

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

    dropdown.style.position = "fixed";
    dropdown.style.zIndex = "9999";
    dropdown.style.overflowY = "auto";

    // Align left edge of dropdown to left of button
    const leftPos = buttonRect.left - dropdownWidth - 4;
    dropdown.style.left = `${Math.max(leftPos, 4)}px`;
    dropdown.style.right = "auto";

    if (spaceBelow >= dropdownHeight) {
      dropdown.style.top = `${buttonRect.bottom + 2}px`;
      dropdown.style.bottom = "auto";
      dropdown.style.maxHeight = `${spaceBelow}px`;
    } else if (spaceAbove >= dropdownHeight) {
      dropdown.style.top = `${buttonRect.top - dropdownHeight - 2}px`;
      dropdown.style.bottom = "auto";
      dropdown.style.maxHeight = `${spaceAbove}px`;
    } else {
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

  const toggleExportDropdown = useCallback(() => {
    setExportDropdownOpen((prev) => !prev);
    if (!exportDropdownOpen) {
      setTimeout(() => positionExportDropdown(), 0);
    }
  }, [exportDropdownOpen]);

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

  const positionDateFilterDropdown = () => {
    const startInput = dateFilterStartInputRef.current;
    const dropdown = dateFilterDropdownRef.current;

    if (!startInput || !dropdown) return;

    const startInputRect = startInput.getBoundingClientRect();
    const dropdownHeight = dropdown.scrollHeight || 300;
    const spaceBelow = window.innerHeight - startInputRect.bottom - 10;
    const spaceAbove = startInputRect.top - 10;

    dropdown.style.position = "fixed";
    dropdown.style.zIndex = "9999";
    dropdown.style.overflowY = "auto";
    dropdown.style.left = `${startInputRect.left}px`;
    dropdown.style.right = "auto";

    if (spaceBelow >= dropdownHeight) {
      dropdown.style.top = `${startInputRect.bottom + 4}px`;
      dropdown.style.bottom = "auto";
      dropdown.style.maxHeight = `${spaceBelow}px`;
    } else if (spaceAbove >= dropdownHeight) {
      dropdown.style.top = `${startInputRect.top - dropdownHeight - 4}px`;
      dropdown.style.bottom = "auto";
      dropdown.style.maxHeight = `${spaceAbove}px`;
    } else {
      dropdown.style.top = `${startInputRect.bottom + 4}px`;
      dropdown.style.bottom = "auto";
      dropdown.style.maxHeight = `${spaceBelow}px`;
    }
  };

  const handleFilterValueChange = (filterKey, value) => {
    setFilterValues((prev) => ({
      ...prev,
      [filterKey]: value,
    }));
    onFilterChange(filterKey, value);
  };

  const handleDateRangeSelect = (range) => {
    const selectedFilterType = filterValues.filter_type;
    if (selectedFilterType && dateFilterKeys.includes(selectedFilterType)) {
      const updatedValues = {
        ...filterValues,
        [selectedFilterType]: {
          start: range.start ? new Date(range.start) : null,
          end: range.end ? new Date(range.end) : null,
        },
      };

      setFilterValues(updatedValues);
      onFilterChange(selectedFilterType, updatedValues[selectedFilterType]);
    } else {
      const defaultKey = "date_reported";
      const updatedValues = {
        ...filterValues,
        [defaultKey]: {
          start: range.start ? new Date(range.start) : null,
          end: range.end ? new Date(range.end) : null,
        },
      };

      setFilterValues(updatedValues);
      onFilterChange(defaultKey, updatedValues[defaultKey]);
    }
    setIsDateFilterDropdownOpen(false);
  };

  const handleDatePreview = useCallback(
    (range) => {
      const key = currentDateFilterKey || filterValues.filter_type;
      if (key) setLiveRange((prev) => ({ ...prev, [key]: range }));
    },
    [currentDateFilterKey, filterValues.filter_type]
  );

  const resetFilters = () => {
    setFilterValues({ filter_type: "" });
    setLiveRange({});
    setCurrentDateFilterKey(null);
    onFilterChange("filter_type", "");
  };

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
        (dateFilterStartInputRef.current &&
          dateFilterStartInputRef.current.contains(event.target)) ||
        (dateFilterEndInputRef.current &&
          dateFilterEndInputRef.current.contains(event.target)) ||
        (dateFilterDropdownRef.current &&
          dateFilterDropdownRef.current.contains(event.target))
      ) {
        return;
      }
      setOpenDropdown(null);
      setExportDropdownOpen(false);
      setIsDateFilterDropdownOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isDateFilterDropdownOpen) {
      positionDateFilterDropdown();
    }
  }, [isDateFilterDropdownOpen]);

  return (
    <div
      className={`custom-table-container ${
        exportDropdownOpen ? "export-dropdown-open" : ""
      }`}
    >
      {selectedItems.length > 0 && tableName === "ManageColumn" && (
        <div className="selected-items-actions">
          <Button
            label="Assign to Staff"
            icon={<FiRefreshCw />}
            iconPosition="left"
            variant="outline"
            onClick={() =>
              onAssignToStaff(selectedItems.map((item) => item.id))
            }
            width="auto"
          />
          <Button
            label="Move candidates"
            icon={<FaExchangeAlt />}
            iconPosition="left"
            variant="outline"
            onClick={() =>
              onMoveCandidates(selectedItems.map((item) => item.id))
            }
            width="auto"
          />
          <Button
            label="Delete"
            icon={<RxCross2 />}
            iconPosition="left"
            variant="secondary-danger"
            onClick={() => onDelete(selectedItems.map((item) => item.id))}
            width="auto"
          />
        </div>
      )}

      <TableHeader
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filters={filters}
        filterValues={filterValues}
        handleFilterValueChange={handleFilterValueChange}
        resetFilters={resetFilters}
        currentDateFilterKey={currentDateFilterKey}
        setCurrentDateFilterKey={setCurrentDateFilterKey}
        isDateFilterDropdownOpen={isDateFilterDropdownOpen}
        setIsDateFilterDropdownOpen={setIsDateFilterDropdownOpen}
        handleDateRangeSelect={handleDateRangeSelect}
        liveRange={liveRange}
        onDatePreview={handleDatePreview}
        dateFilterKeys={dateFilterKeys}
        uniqueFilterValues={uniqueFilterValues}
        toggleExportDropdown={toggleExportDropdown}
        exportDropdownOpen={exportDropdownOpen}
        handleExportCSV={handleExportCSV}
        handleExportPDF={handleExportPDF}
        handlePrint={handlePrint}
        exportButtonRef={exportButtonRef}
        exportDropdownRef={exportDropdownRef}
        dateFilterStartInputRef={dateFilterStartInputRef}
        dateFilterEndInputRef={dateFilterEndInputRef}
        dateFilterDropdownRef={dateFilterDropdownRef}
        onFilterTypeSelect={onFilterTypeSelect}
      />

      <TableBody
        columns={columns}
        currentData={currentData}
        showCheckbox={showCheckbox}
        showActions={showActions}
        actions={actions}
        selectedRows={selectedRows}
        handleCheckboxChange={handleCheckboxChange}
        handleSelectAllChange={handleSelectAllChange}
        handleToggleActive={handleToggleActive}
        toggleDropdown={toggleDropdown}
        openDropdown={openDropdown}
        setOpenDropdown={setOpenDropdown}
        menuRefs={menuRefs}
        tableContainerRef={tableContainerRef}
        tableName={tableName}
        hasStatusDot={hasStatusDot}
        startIndex={startIndex}
      />

      {!hidePagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default CustomTable;

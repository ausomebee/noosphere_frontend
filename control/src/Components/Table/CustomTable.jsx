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
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [filterValues, setFilterValues] = useState({
    category: "",
    priority: "",
    date_reported: null,
    date_updated: null,
    assigned_to: "",
    stage_completion: "",
    date_created: null,
    due_date: null,
    plan: "",
    account_status: "",
    account_officer: "",
    status: "",
    nextBillingDate: null,
    billingCycle: "",
    lastPaymentStatus: "",
    filter_type: "",
  });
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

  // Extract unique values for filters
  const uniqueCategories = useMemo(() => {
    const categories = new Set(data.map((row) => row.category).filter(Boolean));
    return Array.from(categories);
  }, [data]);

  const uniquePriorities = useMemo(() => {
    const priorities = new Set(data.map((row) => row.priority).filter(Boolean));
    return Array.from(priorities);
  }, [data]);

  const uniqueAssignedTo = useMemo(() => {
    const assignToSet = new Set(
      data.map((row) => row.assigned_to).filter(Boolean)
    );
    return Array.from(assignToSet);
  }, [data]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(data.map((row) => row.status).filter(Boolean));
    return Array.from(statuses);
  }, [data]);

  const uniqueBillingCycles = useMemo(() => {
    const cycles = new Set(data.map((row) => row.billingCycle).filter(Boolean));
    return Array.from(cycles);
  }, [data]);

  const uniquePaymentStatuses = useMemo(() => {
    const statuses = new Set(
      data.map((row) => row.lastPaymentStatus).filter(Boolean)
    );
    return Array.from(statuses);
  }, [data]);

  const uniquePlans = useMemo(() => {
    const plans = new Set(data.map((row) => row.plan).filter(Boolean));
    return Array.from(plans);
  }, [data]);

  const uniqueAccountStatuses = useMemo(() => {
    const statuses = new Set(
      data.map((row) => row.account_status).filter(Boolean)
    );
    return Array.from(statuses);
  }, [data]);

  const uniqueAccountOfficers = useMemo(() => {
    const officers = new Set(
      data.map((row) => row.account_officer).filter(Boolean)
    );
    return Array.from(officers);
  }, [data]);

  const stageCompletionOptions = useMemo(() => {
    return Array.from({ length: 11 }, (_, i) => `${i * 10}%`);
  }, []);

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
      if (value && (value.start || value.end)) {
        if (
          key === "date_reported" ||
          key === "date_updated" ||
          key === "date_created" ||
          key === "due_date" ||
          key === "nextBillingDate"
        ) {
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
        }
      } else if (value && key !== "filter_type") {
        if (key === "category") {
          filtered = filtered.filter((row) => row.category === value);
        } else if (key === "priority") {
          filtered = filtered.filter((row) => row.priority === value);
        } else if (key === "assigned_to") {
          filtered = filtered.filter((row) => row.assigned_to === value);
        } else if (key === "stage_completion") {
          const percentage = parseInt(value.replace("%", ""), 10);
          filtered = filtered.filter((row) => {
            const rowPercentage = parseInt(row.stage_completion || "0", 10);
            return rowPercentage === percentage;
          });
        } else if (key === "plan") {
          filtered = filtered.filter((row) => row.plan === value);
        } else if (key === "account_status") {
          filtered = filtered.filter((row) => row.account_status === value);
        } else if (key === "account_officer") {
          filtered = filtered.filter((row) => row.account_officer === value);
        } else if (key === "status") {
          filtered = filtered.filter((row) => row.status === value);
        } else if (key === "billingCycle") {
          filtered = filtered.filter((row) => row.billingCycle === value);
        } else if (key === "lastPaymentStatus") {
          filtered = filtered.filter((row) => row.lastPaymentStatus === value);
        }
      }
    });

    return filtered;
  }, [data, searchTerm, filterValues]);

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
      const updatedData = [...data];
      updatedData[startIndex + rowIndex].active =
        !updatedData[startIndex + rowIndex].active;
    },
    [data, startIndex]
  );

  const handleExportCSV = useCallback(() => {
    exportTableData(
      data,
      columns,
      `${tableName.toLowerCase().replace(/\s+/g, "-")}.csv`,
      tableName
    );
    setExportDropdownOpen(false);
  }, [data, columns, tableName]);

  const handleExportPDF = useCallback(() => {
    exportTableToPDF(
      data,
      columns,
      `${tableName.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      tableName
    );
    setExportDropdownOpen(false);
  }, [data, columns, tableName]);

  const handlePrint = useCallback(() => {
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
    const headerRect = tableContainerRef.current.querySelector("thead")?.getBoundingClientRect();
    const dropdownRect = dropdown.getBoundingClientRect();

    if (!headerRect) return;

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

  const positionDateFilterDropdown = () => {
    const startInput = dateFilterStartInputRef.current;
    const dropdown = dateFilterDropdownRef.current;

    if (!startInput || !dropdown) return;

    const startInputRect = startInput.getBoundingClientRect();
    const dropdownRect = dropdown.getBoundingClientRect();

    const dropdownHeight = dropdownRect.height;
    const spaceBelow = window.innerHeight - startInputRect.bottom - 10;
    const spaceAbove = startInputRect.top - 10;

    let top;

    if (spaceBelow >= dropdownHeight) {
      top = startInput.offsetHeight + 4;
      dropdown.style.top = `${top}px`;
      dropdown.style.bottom = "auto";
      dropdown.style.maxHeight = `${spaceBelow}px`;
    } else if (spaceAbove >= dropdownHeight) {
      top = -dropdownHeight - 4;
      dropdown.style.top = `${top}px`;
      dropdown.style.bottom = "auto";
      dropdown.style.maxHeight = `${spaceAbove}px`;
    } else {
      top = startInput.offsetHeight + 4;
      dropdown.style.top = `${top}px`;
      dropdown.style.bottom = "auto";
      dropdown.style.maxHeight = `${spaceBelow}px`;
    }

    dropdown.style.position = "absolute";
    dropdown.style.overflowY = "auto";
    dropdown.style.left = "0";
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
    if (
      selectedFilterType &&
      [
        "date_reported",
        "date_updated",
        "date_created",
        "due_date",
        "nextBillingDate",
      ].includes(selectedFilterType)
    ) {
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

  const resetFilters = () => {
    setFilterValues({
      category: "",
      priority: "",
      date_reported: null,
      date_updated: null,
      assigned_to: "",
      stage_completion: "",
      date_created: null,
      due_date: null,
      plan: "",
      account_status: "",
      account_officer: "",
      status: "",
      nextBillingDate: null,
      billingCycle: "",
      lastPaymentStatus: "",
      filter_type: "",
    });
    setCurrentDateFilterKey(null);
    onFilterChange("category", "");
    onFilterChange("priority", "");
    onFilterChange("date_reported", null);
    onFilterChange("date_updated", null);
    onFilterChange("assigned_to", "");
    onFilterChange("stage_completion", "");
    onFilterChange("date_created", null);
    onFilterChange("due_date", null);
    onFilterChange("plan", "");
    onFilterChange("account_status", "");
    onFilterChange("account_officer", "");
    onFilterChange("status", "");
    onFilterChange("nextBillingDate", null);
    onFilterChange("billingCycle", "");
    onFilterChange("lastPaymentStatus", "");
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
        uniqueCategories={uniqueCategories}
        uniquePriorities={uniquePriorities}
        uniqueAssignedTo={uniqueAssignedTo}
        stageCompletionOptions={stageCompletionOptions}
        uniquePlans={uniquePlans}
        uniqueAccountStatuses={uniqueAccountStatuses}
        uniqueAccountOfficers={uniqueAccountOfficers}
        uniqueStatuses={uniqueStatuses}
        uniqueBillingCycles={uniqueBillingCycles}
        uniquePaymentStatuses={uniquePaymentStatuses}
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default CustomTable;

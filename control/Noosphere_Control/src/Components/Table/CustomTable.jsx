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
import DateFilterDropdown from "./DateFilterModal";
import "./CustomTable.css";
import {
  CheckboxInput,
  SearchInput,
  SelectInput,
  SwitchInput,
  TextInput,
} from "../Input/Inputs";
import { FaExchangeAlt } from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";
import { RxCross2 } from "react-icons/rx";
import Button from "../Button/Button";

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
    assign_to: "",
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

  const uniqueAssignTo = useMemo(() => {
    const assignToSet = new Set(
      data.map((row) => row.assigned_to).filter(Boolean)
    );
    return Array.from(assignToSet);
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
      if (value) {
        if (key === "assign_to") {
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
        } else if (
          (key === "date_created" ||
            key === "nextBillingDate" ||
            key === "due_date") &&
          value.start
        ) {
          filtered = filtered.filter((row) => {
            const rowDate = parse(row[key], "MM/dd/yyyy", new Date());
            if (
              value.start &&
              value.end &&
              !isSameDay(value.start, value.end)
            ) {
              return isWithinInterval(rowDate, {
                start: value.start,
                end: value.end,
              });
            } else {
              return isSameDay(rowDate, value.start);
            }
          });
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

  const { totalItems, totalPages, startIndex, currentData } = pagination;

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
      console.log(
        `Toggled active state for row ${rowIndex}: ${
          updatedData[startIndex + rowIndex].active
        }`
      );
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
    const tableRect = tableContainerRef.current.getBoundingClientRect();
    const dropdownRect = dropdown.getBoundingClientRect();

    const dropdownHeight = dropdownRect.height;
    const dropdownWidth = dropdownRect.width;
    const spaceBelow = tableRect.bottom - buttonRect.bottom - 10;
    const spaceAbove = buttonRect.top - tableRect.top - 10;

    let top;

    if (spaceBelow >= dropdownHeight) {
      top = button.offsetHeight + 2;
      dropdown.style.top = `${top}px`;
      dropdown.style.bottom = "auto";
      dropdown.style.maxHeight = `${spaceBelow}px`;
    } else if (spaceAbove >= dropdownHeight) {
      top = -dropdownHeight - 2;
      dropdown.style.top = `${top}px`;
      dropdown.style.bottom = "auto";
      dropdown.style.maxHeight = `${spaceAbove}px`;
    } else {
      top = button.offsetHeight + 2;
      dropdown.style.top = `${top}px`;
      dropdown.style.bottom = "auto";
      dropdown.style.maxHeight = `${Math.min(spaceBelow, dropdownHeight)}px`;
    }

    const additionalOffset = 4;
    const left = -dropdownWidth - additionalOffset;

    dropdown.style.left = `${left}px`;
    dropdown.style.right = "auto";
    dropdown.style.position = "absolute";
    dropdown.style.zIndex = "1000";
    dropdown.style.overflowY = "auto";
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
    if (currentDateFilterKey) {
      setFilterValues((prev) => ({
        ...prev,
        [currentDateFilterKey]: range,
      }));
      onFilterChange(currentDateFilterKey, range);
    }
    setIsDateFilterDropdownOpen(false);
  };

  const resetFilters = () => {
    setFilterValues({
      assign_to: "",
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
    });
    setCurrentDateFilterKey(null);
    onFilterChange("assign_to", "");
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
      <div className="table-header">
        <div className="search-filters-container">
          <div className="search-container">
            <SearchInput
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filters-container">
            <h2 className="filter-text">Filters:</h2>
            {filters.map((filter, index) => (
              <div key={index} className="filter-wrapper">
                <div className="filter-select-container">
                  <SelectInput
                    value={filterValues[filter.key] || ""}
                    onChange={(e) => {
                      const newFilterValue = e.target.value;
                      handleFilterValueChange(filter.key, newFilterValue);
                      if (newFilterValue === "") {
                        resetFilters();
                      }
                    }}
                    options={filter.options}
                    className="table-filter-select"
                  />
                  {(filterValues[filter.key] === "date_created" ||
                    filterValues[filter.key] === "nextBillingDate" ||
                    filterValues[filter.key] === "due_date") && (
                    <div className="date-filter-input-container">
                      <TextInput
                        type="text"
                        value={
                          filterValues[filter.key]?.start
                            ? format(
                                filterValues[filter.key].start,
                                "MMM d, yyyy"
                              )
                            : "Select start date"
                        }
                        readOnly
                        onClick={() => {
                          setCurrentDateFilterKey(filter.key);
                          setIsDateFilterDropdownOpen(true);
                        }}
                        className="date-filter-input date-filter-input-start"
                        ref={dateFilterStartInputRef}
                      />
                      <span className="date-filter-demarcator"> - </span>
                      <TextInput
                        type="text"
                        value={
                          filterValues[filter.key]?.end
                            ? format(
                                filterValues[filter.key].end,
                                "MMM d, yyyy"
                              )
                            : "Select end date"
                        }
                        readOnly
                        onClick={() => {
                          setCurrentDateFilterKey(filter.key);
                          setIsDateFilterDropdownOpen(true);
                        }}
                        className="date-filter-input date-filter-input-end"
                        ref={dateFilterEndInputRef}
                      />
                      {isDateFilterDropdownOpen &&
                        currentDateFilterKey === filter.key && (
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
                  {filterValues[filter.key] === "assign_to" && (
                    <SelectInput
                      value={filterValues.assign_to || ""}
                      onChange={(e) =>
                        handleFilterValueChange("assign_to", e.target.value)
                      }
                      options={[
                        { value: "", label: "Select Assign To" },
                        ...uniqueAssignTo.map((name) => ({
                          value: name,
                          label: name,
                        })),
                      ]}
                      className="filter-value-select"
                    />
                  )}
                  {filterValues[filter.key] === "stage_completion" && (
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
                  )}
                  {filterValues[filter.key] === "plan" && (
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
                  )}
                  {filterValues[filter.key] === "account_status" && (
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
                  )}
                  {filterValues[filter.key] === "account_officer" && (
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
                  )}
                  {filterValues[filter.key] === "status" && (
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
                  )}
                  {filterValues[filter.key] === "billingCycle" && (
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
                  )}
                  {filterValues[filter.key] === "lastPaymentStatus" && (
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

      <div
        className="table-container no-scrollbar::-webkit-scrollbar no-scrollbar"
        ref={tableContainerRef}
      >
        <table className="custom-table">
          <thead>
            <tr>
              {showCheckbox && (
                <th className="checkbox-column">
                  <CheckboxInput
                    checked={
                      selectedRows.length > 0 &&
                      selectedRows.length ===
                        currentData.filter((row) => row.hasCheckbox).length
                    }
                    onChange={handleSelectAllChange}
                  />
                </th>
              )}
              {columns.map((col, index) => (
                <th key={index}>{col.header}</th>
              ))}
              {showActions && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {currentData.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    columns.length + (showActions ? 2 : showCheckbox ? 1 : 0)
                  }
                  className="table-empty-state"
                >
                  <div className="table-empty-state-content">
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
                      className="table-empty-state-icon"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <span>Nothing to show here for {tableName} Table</span>
                  </div>
                </td>
              </tr>
            ) : (
              currentData.map((row, rowIndex) => (
                <tr key={row.item_id || rowIndex}>
                  {showCheckbox && row.hasCheckbox && (
                    <td className="checkbox-column">
                      <CheckboxInput
                        checked={selectedRows.includes(rowIndex)}
                        onChange={() => handleCheckboxChange(rowIndex, row)}
                      />
                    </td>
                  )}
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className="table-cell">
                      {col.hasColumnActions ? (
                        <div className="action-menu">
                          <button
                            className="action-button"
                            onClick={() => toggleDropdown(rowIndex, colIndex)}
                            ref={(el) => {
                              const key = `${rowIndex}-${colIndex}`;
                              if (!menuRefs.current[key]) {
                                menuRefs.current[key] = {};
                              }
                              menuRefs.current[key].button = el;
                            }}
                          >
                            {row[col.key]}
                          </button>
                          {openDropdown === `${rowIndex}-${colIndex}` && (
                            <div
                              className="action-dropdown"
                              ref={(el) => {
                                const key = `${rowIndex}-${colIndex}`;
                                if (!menuRefs.current[key]) {
                                  menuRefs.current[key] = {};
                                }
                                menuRefs.current[key].dropdown = el;
                              }}
                              style={{ zIndex: 1000 }}
                            >
                              {col.columnActions.map((action, index) => (
                                <button
                                  key={index}
                                  className={`dropdown-item ${
                                    action.className || ""
                                  }`}
                                  onClick={() => {
                                    action.onClick(row);
                                    setOpenDropdown(null);
                                  }}
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : col.type === "stage_completion" ? (
                        <div className="progress-bars">
                          <div
                            className="progress-fills"
                            style={{ width: `${row[col.key]}%` }}
                          ></div>
                          <span className="progress-texts">{`${
                            row[col.key]
                          }%`}</span>
                        </div>
                      ) : col.type === "plan" ? (
                        <span
                          className={`plan-label plan-${row[
                            col.key
                          ].toLowerCase()}`}
                        >
                          {row[col.key]}
                        </span>
                      ) : col.type === "subscription_status" ? (
                        <span
                          className={`subscription_status-label subscription_status-${row[
                            col.key
                          ].toLowerCase()}`}
                        >
                          <span className="status-dot" />
                          {row[col.key]}
                        </span>
                      ) : col.type === "payment_status" ? (
                        <span
                          className={`payment_status-label payment_status-${row[
                            col.key
                          ].toLowerCase()}`}
                        >
                          {row[col.key]}
                        </span>
                      ) : col.type === "status" ? (
                        <span
                          className={`status-label status-${row[
                            col.key
                          ].toLowerCase()}`}
                        >
                          {hasStatusDot && <span className="status-dot" />}
                          {row[col.key]}
                        </span>
                      ) : col.type === "document" ? (
                        <div className="document-cell">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="table-document-icon"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                          </svg>
                          {row[col.key]}
                        </div>
                      ) : col.type === "severity" ? (
                        <span
                          className={`severity-label severity-${row[
                            col.key
                          ].toLowerCase()}`}
                        >
                          {row[col.key]}
                        </span>
                      ) : col.type === "active" ? (
                        <SwitchInput
                          checked={row[col.key]}
                          onChange={() => handleToggleActive(rowIndex)}
                        />
                      ) : col.type === "day_time" ? (
                        <div className="day-time-cell">
                          {row[col.key] ? (
                            <>
                              <span>{row[col.key].date || "N/A"}</span>
                              <span>{row[col.key].time || "N/A"}</span>
                            </>
                          ) : (
                            <span>N/A</span>
                          )}
                        </div>
                      ) : col.type === "priority" ? (
                        <span
                          className={`priority-label priority-${row[
                            col.key
                          ].toLowerCase()}`}
                        >
                          {row[col.key]}
                        </span>
                      ) : (
                        row[col.key]
                      )}
                    </td>
                  ))}
                  {showActions && (
                    <td className="action-cell">
                      {row.hasActions && (
                        <div className="action-menu">
                          <button
                            className="action-button"
                            onClick={() => toggleDropdown(rowIndex, "action")}
                            ref={(el) => {
                              const key = `${rowIndex}-action`;
                              if (!menuRefs.current[key]) {
                                menuRefs.current[key] = {};
                              }
                              menuRefs.current[key].button = el;
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="12" cy="5" r="1" />
                              <circle cx="12" cy="19" r="1" />
                            </svg>
                          </button>
                          {openDropdown === `${rowIndex}-action` && (
                            <div
                              className="action-dropdown"
                              ref={(el) => {
                                const key = `${rowIndex}-action`;
                                if (!menuRefs.current[key]) {
                                  menuRefs.current[key] = {};
                                }
                                menuRefs.current[key].dropdown = el;
                              }}
                            >
                              {actions.map((action, index) => (
                                <button
                                  key={index}
                                  className={`dropdown-item ${
                                    action.className || ""
                                  }`}
                                  onClick={() => {
                                    action.onClick(row);
                                    setOpenDropdown(null);
                                  }}
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
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

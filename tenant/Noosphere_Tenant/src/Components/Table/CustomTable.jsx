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
  itemsPerPage = 5,
  tableName = "Table",
  onSelectionChange,
  hasStatusDot = false,
  actionLinkPrefix,
  actionText,
  loading,
  hideSearch = false, // New prop to hide search
  hideTableActions = false // New prop to hide table actions
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
  const [isDateFilterDropdownOpen, setIsDateFilterDropdownOpen] =
    useState(false);
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
    switch (type) {
      case "client":
        return [
          { value: "", label: "Select Client" },
          ...getUniqueValues("client"),
        ];
      case "serviceType":
        return [
          { value: "", label: "Select Service Type" },
          ...getUniqueValues("serviceType"),
        ];
      case "programs":
        return [
          { value: "", label: "Select Programs" },
          ...getUniqueValues("programs"),
        ];
      case "sessions":
        return [
          { value: "", label: "Select Sessions" },
          ...getUniqueValues("sessions"),
        ];
      case "therapist":
        return [
          { value: "", label: "Select Therapist" },
          ...getUniqueValues("therapist"),
        ];
      case "uploadBy":
        return [
          { value: "", label: "Select Upload By" },
          ...getUniqueValues("uploadBy"),
        ];
      case "description":
        return [
          { value: "", label: "Select Description" },
          ...getUniqueValues("description"),
        ];
      case "code":
        return [
          { value: "", label: "Select Code" },
          ...getUniqueValues("code"),
        ];
      case "createdBy":
        return [
          { value: "", label: "Select Created By" },
          ...getUniqueValues("createdBy"),
        ];
      case "timeSheetNumber":
        return [
          { value: "", label: "Select TimeSheet Number" },
          ...getUniqueValues("timeSheetNumber"),
        ];
      case "approval":
        return [
          { value: "", label: "Select Approval" },
          ...getUniqueValues("approval"),
        ];
      case "added_by":
        return [
          { value: "", label: "Select Added By" },
          ...getUniqueValues("added_by"),
        ];
      case "":
        return [];
      case "ToggleActive":
        return [
          { value: "", label: "Select ToggleActive" },
          { value: "true", label: "True" },
          { value: "false", label: "False" },
        ];
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
      default:
        return [];
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
      filterValues.filter_type !== "stage_completion"
    ) {
      if (filterValues.filter_type === "ToggleActive") {
        filtered = filtered.filter(
          (row) =>
            row[filterValues.filter_type]?.toString() === filterValues.value
        );
      } else {
        filtered = filtered.filter(
          (row) =>
            row[filterValues.filter_type]?.toString().toLowerCase() ===
            filterValues.value.toLowerCase()
        );
      }
    }

    if (
      filters &&
      filterValues.filter_type === "dateTime" &&
      filterValues.dateAdded &&
      (filterValues.dateAdded.start || filterValues.dateAdded.end)
    ) {
      filtered = filtered.filter((row) => {
        const dateString = row.dateTime ? String(row.dateTime) : null;
        const rowDate = dateString
          ? parse(dateString, "MM/dd/yyyy", new Date())
          : null;
        if (!isValid(rowDate)) return false;
        const startDate = filterValues.dateAdded.start
          ? parse(
              format(filterValues.dateAdded.start, "MM/dd/yyyy"),
              "MM/dd/yyyy",
              new Date()
            )
          : null;
        const endDate = filterValues.dateAdded.end
          ? parse(
              format(filterValues.dateAdded.end, "MM/dd/yyyy"),
              "MM/dd/yyyy",
              new Date()
            )
          : null;
        console.log("Date Filter:", {
          dateString,
          rowDate,
          startDate,
          endDate,
        });
        if (startDate && endDate && !isSameDay(startDate, endDate)) {
          return isWithinInterval(rowDate, { start: startDate, end: endDate });
        } else if (startDate) {
          return isSameDay(rowDate, startDate);
        }
        return true;
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
        console.log("Stage Filter:", { min, max, completion, row });
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
      if (onSelectionChange)
        onSelectionChange(newSelectedRows, newSelectedItems);
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
  const handlePrint = useCallback(
    () => printTableData(data, columns, tableName),
    [data, columns, tableName]
  );
  const toggleDropdown = useCallback(
    (rowIndex, colIndex) => {
      const key = `${rowIndex}-${colIndex}`;
      setOpenDropdown((prev) => (prev === key ? null : key));
      if (openDropdown !== key)
        setTimeout(() => positionDropdown(rowIndex, colIndex), 0);
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
    const headerRect = tableContainerRef.current
      .querySelector("thead")
      ?.getBoundingClientRect();
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
  const handleFilterValueChange = useCallback(
    (filterKey, value) => {
      if (!filters) return;
      setFilterValues((prev) => {
        const newValues = { ...prev, [filterKey]: value };
        console.log("Filter Values Updated:", newValues);
        return newValues;
      });
      if (onFilterChange) onFilterChange(filterKey, value);
    },
    [filters, onFilterChange]
  );
  const handleDateRangeSelect = useCallback(
    (range) => {
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
  const resetFilters = useCallback(() => {
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
      setSearchTerm(""); // Also clear search term when resetting filters
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filters]);

  return (
    <div
      className={`custom-table-container ${
        exportDropdownOpen ? "export-dropdown-open" : ""
      }`}
    >
      {/* Conditionally render table header based on hideSearch prop */}
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
              resetFilters={filters ? resetFilters : () => {}}
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
          {showActions && !hideTableActions && (
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
          <div className="w-full flex justify-center">
            <span className="btn-spinner">
              <svg
                className="spinner animate-spin"
                width="36"
                height="36"
                viewBox="0 0 36 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93"
                  stroke="#000000"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
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
            handleToggleActive={handleToggleActive}
            actionLinkPrefix={actionLinkPrefix}
            actionText={actionText}
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
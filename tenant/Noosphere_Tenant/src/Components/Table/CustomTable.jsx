import React, { useState, useRef, useEffect } from "react";
import { Menu } from "@headlessui/react";
import { exportTableData, printTableData } from "../../utils/TableUtils";
import Pagination from "./Pagination";
import "./CustomTable.css";
import {
  CheckboxInput,
  SearchInput,
  SelectInput,
  SwitchInput,
  TextInput,
} from "../Input/Inputs";

const CustomTable = ({
  data,
  columns,
  filters,
  onFilterChange,
  actions,
  showActions = true,
  itemsPerPage = 5,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const tableContainerRef = useRef(null);
  const menuRefs = useRef([]);

  // Filter data based on search term
  const filteredData = data.filter((row) =>
    Object.values(row).some(
      (value) =>
        value &&
        value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Pagination logic
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle individual checkbox change
  const handleCheckboxChange = (rowIndex) => {
    setSelectedRows((prev) =>
      prev.includes(rowIndex)
        ? prev.filter((index) => index !== rowIndex)
        : [...prev, rowIndex]
    );
  };

  // Handle "Select All" checkbox change
  const handleSelectAllChange = () => {
    if (
      selectedRows.length ===
      currentData.filter((row) => row.hasCheckbox).length
    ) {
      setSelectedRows([]);
    } else {
      setSelectedRows(
        currentData
          .map((row, index) => (row.hasCheckbox ? index : null))
          .filter((index) => index !== null)
      );
    }
  };

  // Handle toggle switch for Active column
  const handleToggleActive = (rowIndex) => {
    const updatedData = [...data];
    updatedData[startIndex + rowIndex].active =
      !updatedData[startIndex + rowIndex].active;
    console.log(
      `Toggled active state for row ${rowIndex}: ${
        updatedData[startIndex + rowIndex].active
      }`
    );
  };

  // Handle export and print
  const handleExport = () => {
    exportTableData(data, columns, "table-data.csv");
  };

  const handlePrint = () => {
    printTableData(data, columns);
  };

  // Position dropdown within table bounds
  const positionDropdown = (rowIndex) => {
    const button = menuRefs.current[rowIndex]?.button;
    const dropdown = menuRefs.current[rowIndex]?.dropdown;
    const tableContainer = tableContainerRef.current;

    if (!button || !dropdown || !tableContainer) return;

    const buttonRect = button.getBoundingClientRect();
    const tableRect = tableContainer.getBoundingClientRect();
    const dropdownRect = dropdown.getBoundingClientRect();

    // Reset styles
    dropdown.style.top = '';
    dropdown.style.bottom = '';
    dropdown.style.left = '';
    dropdown.style.right = '';
    dropdown.style.maxHeight = '';
    dropdown.style.maxWidth = '';

    // Calculate available space relative to table container's visible area
    const spaceBelow = tableRect.bottom - buttonRect.bottom;
    const spaceAbove = buttonRect.top - tableRect.top;
    const spaceRight = tableRect.right - buttonRect.right;
    const spaceLeft = buttonRect.left - tableRect.left;

    // Vertical positioning: prioritize above for last item, constrain height
    if (spaceAbove >= dropdownRect.height && spaceBelow < dropdownRect.height) {
      // Position above if below would exceed (common for last item)
      dropdown.style.top = `-${dropdownRect.height + 5}px`;
      dropdown.style.bottom = 'auto';
    } else {
      // Position below and constrain height to fit within table
      const maxHeight = Math.min(spaceBelow + 5, tableRect.height - buttonRect.height - 10);
      dropdown.style.top = `${buttonRect.height + 5}px`;
      dropdown.style.maxHeight = `${maxHeight > 0 ? maxHeight : 10}px`; // Minimum height fallback
      dropdown.style.overflowY = 'auto';
    }

    // Horizontal positioning: keep within table width
    if (spaceRight >= dropdownRect.width) {
      dropdown.style.right = '10px'; // Match padding
    } else if (spaceLeft >= dropdownRect.width) {
      dropdown.style.left = '10px';
      dropdown.style.right = 'auto';
    } else {
      dropdown.style.right = '10px';
      dropdown.style.maxWidth = `${spaceRight - 10}px`;
      dropdown.style.overflowX = 'auto';
    }
  };

  return (
    <div className="custom-table-container">
      {/* Search and Filters */}
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
              <SelectInput
                key={index}
                value={filter.value}
                onChange={(e) => onFilterChange(filter.key, e.target.value)}
                options={filter.options}
              />
            ))}
          </div>
        </div>
        <div className="table-actions">
          <button onClick={handleExport} className="action-button">
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button onClick={handlePrint} className="action-button">
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
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container" ref={tableContainerRef}>
        <table className="custom-table">
          <thead>
            <tr>
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
              {columns.map((col, index) => (
                <th key={index}>{col.header}</th>
              ))}
              {showActions && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {currentData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="checkbox-column">
                  {row.hasCheckbox && (
                    <CheckboxInput
                      checked={selectedRows.includes(rowIndex)}
                      onChange={() => handleCheckboxChange(rowIndex)}
                    />
                  )}
                </td>
                {columns.map((col, colIndex) => (
                  <td key={colIndex}>
                    {col.type === "stage_completion" ? (
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
                    ) : col.type === "status" ? (
                      <span
                        className={`status-label status-${row[
                          col.key
                        ].toLowerCase()}`}
                      >
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
                          className="document-icon"
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
                        <div>{row[col.key].date}</div>
                        <div>{row[col.key].time}</div>
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
                      <Menu as="div" className="action-menu">
                        {({ open }) => (
                          <>
                            <Menu.Button
                              className="action-button"
                              ref={(el) => {
                                if (!menuRefs.current[rowIndex])
                                  menuRefs.current[rowIndex] = {};
                                menuRefs.current[rowIndex].button = el;
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
                            </Menu.Button>
                            <Menu.Items
                              className="action-dropdown"
                              ref={(el) => {
                                if (!menuRefs.current[rowIndex])
                                  menuRefs.current[rowIndex] = {};
                                menuRefs.current[rowIndex].dropdown = el;
                                if (open) positionDropdown(rowIndex);
                              }}
                            >
                              {actions.map((action, index) => (
                                <Menu.Item key={index}>
                                  {({ active }) => (
                                    <button
                                      className={`dropdown-item ${
                                        active ? "active" : ""
                                      } ${action.className || ""}`}
                                      onClick={() => action.onClick(row)}
                                    >
                                      {action.label}
                                    </button>
                                  )}
                                </Menu.Item>
                              ))}
                            </Menu.Items>
                          </>
                        )}
                      </Menu>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default CustomTable;
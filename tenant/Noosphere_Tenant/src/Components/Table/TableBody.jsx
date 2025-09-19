import React from "react";
import { CheckboxInput, SwitchInput } from "../Input/Inputs";
import { Link } from "react-router-dom";

const TableBody = ({
  currentData,
  columns,
  showCheckbox,
  showActions,
  selectedRows,
  handleCheckboxChange,
  handleSelectAllChange,
  toggleDropdown,
  openDropdown,
  menuRefs,
  actions,
  tableName,
  hasStatusDot,
  handleToggleActive,
  actionLinkPrefix = "",
  actionText = "View",
  onActionClick,
}) => {
  const primaryColumns = [
    "Candidate Name",
    "Client",
    "ServiceType",
    "Program",
    "Sessions",
    "Session",
    "Session Type",
    "Therapist",
    "Upload By",
    "Uploaded By",
    "Code",
    "Created By",
    "TimeSheet Number",
    "Domain",
    "Target",
    "Team Lead",
    "Name",
    "Diagnosis Description",
    "Category",
    "CPT Code(s)",
    "Service Type(s)",
  ];

  const getFileIcon = (fileName) => {
    const extension = fileName?.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return <span style={{ color: "#FF0000" }}>📄</span>;
      case "doc":
      case "docx":
        return <span style={{ color: "#0000FF" }}>📄</span>;
      case "xls":
      case "xlsx":
        return <span style={{ color: "#008000" }}>📊</span>;
      default:
        return <span style={{ color: "#888" }}>📁</span>;
    }
  };

  const renderCellContent = (col, row, rowIndex) => {
    try {
      // 1. Custom render function
      if (typeof col.render === "function") {
        const output = col.render(row);
        if (
          typeof output === "string" ||
          typeof output === "number" ||
          React.isValidElement(output)
        ) {
          return output;
        }
        return JSON.stringify(output);
      }

      // 2. Column with dropdown actions
      if (col.hasColumnActions && Array.isArray(col.columnActions)) {
        const key = `${rowIndex}-${col.key}`;
        return (
          <div className="action-menu">
            <button
              className="action-button"
              onClick={() => toggleDropdown(rowIndex, col.key)}
              ref={(el) => {
                if (!menuRefs.current[key]) menuRefs.current[key] = {};
                menuRefs.current[key].button = el;
              }}
            >
              {row[col.key]}
            </button>
            {openDropdown === key && (
              <div
                className="action-dropdown"
                ref={(el) => {
                  if (!menuRefs.current[key]) menuRefs.current[key] = {};
                  menuRefs.current[key].dropdown = el;
                }}
                style={{ zIndex: 1000 }}
              >
                {col.columnActions.map((action, index) => (
                  <button
                    key={index}
                    className={`dropdown-item ${action.className || ""}`}
                    onClick={() => {
                      action.onClick(row);
                      toggleDropdown(null);
                    }}
                  >
                    {action.icon && <span className="dropdown-icon">{action.icon}</span>}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      }

      // 3. Handle special types
      switch (col.type) {
        case "stage_completion":
          return (
            <div className="progress-container">
              <div className="progress-bars">
                <div
                  className={`progress-fills ${row[col.key] >= 80 ? "high" : ""}`}
                  style={{
                    width: `${row[col.key]}%`,
                    backgroundColor: row[col.key] >= 80 ? "#D92D20" : "#004ABA",
                  }}
                />
                <div
                  className="progress-remaining"
                  style={{
                    width: `${100 - row[col.key]}%`,
                    backgroundColor: "#f7f7f7",
                  }}
                />
              </div>
              <span className="progress-texts">{`${row[col.key]}%`}</span>
            </div>
          );
        case "document":
          return (
            <div className="document-cell">
              {getFileIcon(row[col.key])} {row[col.key]}
            </div>
          );
        case "active":
          return (
            <SwitchInput
              checked={row[col.key]}
              onChange={() => handleToggleActive(rowIndex)}
            />
          );
        case "day_time":
          return (
            <div className="day-time-cell">
              <span>{row[col.key]?.date || "N/A"}</span>
              <span>{row[col.key]?.time || "N/A"}</span>
            </div>
          );
        case "approval":
          return (
            <span className={`approval-label approval-${row[col.key]?.toLowerCase()}`}>
              <span className="status-dot" />
              {row[col.key]}
            </span>
          );
        case "statusText":
          return (
            <span className={`status-label status-${row[col.key]?.toLowerCase()}`}>
              {hasStatusDot && <span className="status-dot" />}
              {row[col.key]}
            </span>
          );
        default:
          break;
      }

      // 4. Fallback render
      const value = row[col.key];
      if (value === null || value === undefined || typeof value === "boolean")
        return String(value ?? "N/A");
      if (typeof value === "object") return JSON.stringify(value);
      return value || "N/A";
    } catch (error) {
      console.error(`Error rendering cell (${col.header}):`, error);
      return "N/A";
    }
  };

  // Helper function to get actions for a specific row
  const getActionsForRow = (row) => {
    if (typeof actions === 'function') {
      return actions(row);
    }
    return actions || [];
  };

  // Helper function to get items for a dropdown action
  const getActionItems = (action, row) => {
    if (typeof action.items === 'function') {
      return action.items(row);
    }
    return action.items || [];
  };

  // Helper function to get label for an action item
  const getItemLabel = (item, row) => {
    if (typeof item.label === 'function') {
      return item.label(row);
    }
    return item.label;
  };

  // Helper function to get className for an action item
  const getItemClassName = (item, row) => {
    if (typeof item.className === 'function') {
      return item.className(row);
    }
    return item.className || "";
  };

  return (
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
          {columns.map((col, idx) => (
            <th key={idx}>{col.header}</th>
          ))}
          {showActions && <th>Action</th>}
        </tr>
      </thead>

      <tbody>
        {currentData.length === 0 ? (
          <tr>
            <td
              colSpan={
                columns.length +
                (showActions ? 1 : 0) +
                (showCheckbox ? 1 : 0)
              }
              className="table-empty-state"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="80"
                height="80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white-light2 mx-auto"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <div className="table-empty-state-content">
                <p className="text-lg font-bold text-gray-600">
                  No {tableName} data available
                </p>
                <span>{tableName} that you create will be displayed here</span>
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
                <td
                  key={colIndex}
                  className={`table-cell ${
                    primaryColumns.includes(col.header)
                      ? "primary-text"
                      : "secondary-text"
                  }`}
                >
                  {renderCellContent(col, row, rowIndex)}
                </td>
              ))}

              {showActions && row.hasActions && (
                <td className="action-cell">
                  <div className="action-group">
                    {actionText && getActionsForRow(row).every(action => action.type !== "dropdown") && (
                      <>
                        {onActionClick ? (
                          <button
                            className="action-link primary-text"
                            onClick={() => onActionClick(row)}
                          >
                            {actionText}
                          </button>
                        ) : actionLinkPrefix ? (
                          <Link
                            to={`${actionLinkPrefix}${row.item_id || rowIndex}`}
                            className="action-link primary-text"
                          >
                            {actionText}
                          </Link>
                        ) : null}
                      </>
                    )}
                    {getActionsForRow(row).map((action, i) => {
                      if (action.type === "icon") {
                        return (
                          <button
                            key={i}
                            className={`action-icon ${action.className || ""}`}
                            onClick={() => action.onClick(row)}
                            title={action.label}
                          >
                            {action.icon}
                          </button>
                        );
                      } else if (action.type === "dropdown") {
                        const key = `${rowIndex}-action-${i}`;
                        return (
                          <div key={i} className="action-menu">
                            <button
                              className="action-button"
                              onClick={() => toggleDropdown(rowIndex, `action-${i}`)}
                              ref={(el) => {
                                if (!menuRefs.current[key]) menuRefs.current[key] = {};
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
                            {openDropdown === key && (
                              <div
                                className="action-dropdown"
                                ref={(el) => {
                                  if (!menuRefs.current[key]) menuRefs.current[key] = {};
                                  menuRefs.current[key].dropdown = el;
                                }}
                              >
                                {getActionItems(action, row).map((item, itemIndex) => (
                                  <button
                                    key={itemIndex}
                                    className={`dropdown-item ${getItemClassName(item, row)}`}
                                    onClick={() => {
                                      item.onClick(row);
                                      toggleDropdown(null);
                                    }}
                                  >
                                    {item.icon && <span className="dropdown-icon">{item.icon}</span>}
                                    {getItemLabel(item, row)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
};

export default TableBody;
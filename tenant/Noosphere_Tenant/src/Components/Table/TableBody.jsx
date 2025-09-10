import React from "react";
import { CheckboxInput, SwitchInput } from "../Input/Inputs";
import { Link } from "react-router-dom";
import { FaEdit, FaTrash, FaEye } from "react-icons/fa";

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
}) => {
  const primaryColumns = [
    "Candidate Name",
    "Client",
    "ServiceType",
    "Program",
    "Sessions",
    "Session",
    "Therapist",
    "Upload By",
    "Code",
    "Created By",
    "TimeSheet Number",
    "Domain",
    "Target"
  ];

  const getFileIcon = (fileName) => {
    const extension = fileName?.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FF0000"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M10 13h4v4h-4z" />
          </svg>
        );
      case "doc":
      case "docx":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0000FF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M8 13h8" />
            <path d="M8 17h8" />
          </svg>
        );
      case "xls":
      case "xlsx":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#008000"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M8 13l4 4 4-4" />
          </svg>
        );
      default:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#c49494"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        );
    }
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
              colSpan={columns.length + (showActions ? 2 : showCheckbox ? 1 : 0)}
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
                <p className="text-lg font-bold text-gray-600">No {tableName} data available</p>
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
                  className={`table-cell ${primaryColumns.includes(col.header) ? "primary-text" : "secondary-text"}`}
                >
                  {col.hasColumnActions ? (
                    <div className="action-menu">
                      <button
                        className="action-button"
                        onClick={() => toggleDropdown(rowIndex, colIndex)}
                        ref={(el) => {
                          const key = `${rowIndex}-${colIndex}`;
                          if (!menuRefs.current[key]) menuRefs.current[key] = {};
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
                  ) : col.type === "stage_completion" ? (
                    <div className="progress-container">
                      <div className="progress-bars">
                        <div
                          className={`progress-fills ${row[col.key] >= 80 ? "high" : ""}`}
                          style={{
                            width: `${row[col.key]}%`,
                            backgroundColor: row[col.key] >= 80 ? "#D92D20" : "#004ABA",
                          }}
                        ></div>
                        <div
                          className="progress-remaining"
                          style={{
                            width: `${100 - row[col.key]}%`,
                            backgroundColor: "#f7f7f7",
                          }}
                        ></div>
                      </div>
                      <span className="progress-texts">{`${row[col.key]}%`}</span>
                    </div>
                  ) : col.type === "document" ? (
                    <div className="document-cell">
                      {getFileIcon(row[col.key])}
                      {row[col.key]}
                    </div>
                  ) : col.type === "active" ? (
                    <SwitchInput
                      checked={row[col.key]}
                      onChange={() => handleToggleActive(rowIndex)}
                    />
                  ) : col.type === "day_time" ? (
                    <div className="day-time-cell">
                      <span>{row[col.key]?.date || "N/A"}</span>
                      <span>{row[col.key]?.time || "N/A"}</span>
                    </div>
                  ) : col.type === "approval" ? (
                    <span className={`approval-label approval-${row[col.key].toLowerCase()}`}>
                      <span className="status-dot" />
                      {row[col.key]}
                    </span>
                  ) : (
                    row[col.key] || "N/A"
                  )}
                </td>
              ))}
              {showActions && row.hasActions && (
                <td className="action-cell">
                  <div className="action-group">
                    {actionLinkPrefix && actionText && (
                      <Link to={`${actionLinkPrefix}${row.item_id || rowIndex}`} className="action-link primary-text">
                        {actionText}
                      </Link>
                    )}
                    {actions.map((action, index) => {
                      if (action.type === "icon") {
                        return (
                          <button
                            key={index}
                            className={`action-icon ${action.className || ""}`}
                            onClick={() => action.onClick(row)}
                            title={action.label}
                          >
                            {action.icon}
                          </button>
                        );
                      } else if (action.type === "dropdown") {
                        return (
                          <div key={index} className="action-menu">
                            <button
                              className="action-button"
                              onClick={() => toggleDropdown(rowIndex, `action-${index}`)}
                              ref={(el) => {
                                const key = `${rowIndex}-action-${index}`;
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
                            {openDropdown === `${rowIndex}-action-${index}` && (
                              <div
                                className="action-dropdown"
                                ref={(el) => {
                                  const key = `${rowIndex}-action-${index}`;
                                  if (!menuRefs.current[key]) menuRefs.current[key] = {};
                                  menuRefs.current[key].dropdown = el;
                                }}
                              >
                                {action.items.map((item, itemIndex) => (
                                  <button
                                    key={itemIndex}
                                    className={`dropdown-item ${item.className || ""}`}
                                    onClick={() => {
                                      item.onClick(row);
                                      toggleDropdown(null);
                                    }}
                                  >
                                    {item.icon && <span className="dropdown-icon">{item.icon}</span>}
                                    {item.label}
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
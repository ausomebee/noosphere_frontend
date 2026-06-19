import React from "react";
import {
  CheckboxInput,
  SwitchInput,
} from "../Input/Inputs";

const TableBody = ({
  columns,
  currentData,
  showCheckbox,
  showActions,
  actions,
  selectedRows,
  handleCheckboxChange,
  handleSelectAllChange,
  handleToggleActive,
  toggleDropdown,
  openDropdown,
  setOpenDropdown,
  menuRefs,
  tableContainerRef,
  tableName,
  hasStatusDot,
  startIndex,
}) => {
  // If a row action opens a "view"/"edit" route, make the name (first plain
  // text column) clickable so users don't have to open the action menu.
  const primaryAction = React.useMemo(() => {
    if (!Array.isArray(actions)) return null;
    return (
      actions.find((a) => /view|profile|details/i.test(a?.label || "")) ||
      actions.find((a) => /edit/i.test(a?.label || "")) ||
      null
    );
  }, [actions]);

  const nameColIndex = React.useMemo(
    () => columns.findIndex((c) => !c.type && !c.hasColumnActions),
    [columns]
  );

  return (
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
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="table-empty-state-icon"
                  >
                    <path d="M22 12h-6l-2 3H10l-2-3H2" />
                    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                  </svg>
                  <span className="table-empty-state-title">No records found</span>
                  <span className="table-empty-state-sub">
                    There are no {tableName.toLowerCase()} entries to display right now.
                  </span>
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
                          >
                            {col.columnActions.map((action, index) => (
                              <button
                                key={index}
                                className={`dropdown-item ${action.className || ""}`}
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
                        <span className="progress-texts">{`${row[col.key]}%`}</span>
                      </div>
                    ) : col.type === "plan" ? (
                      <span className={`plan-label plan-${row[col.key].toLowerCase()}`}>
                        {row[col.key]}
                      </span>
                    ) : col.type === "subscription_status" ? (
                      <span
                        className={`subscription_status-label subscription_status-${row[col.key].toLowerCase()}`}
                      >
                        <span className="status-dot" />
                        {row[col.key]}
                      </span>
                    ) : col.type === "payment_status" ? (
                      <span
                        className={`payment_status-label payment_status-${row[col.key].toLowerCase()}`}
                      >
                        {row[col.key]}
                      </span>
                    ) : col.type === "status" ? (
                      <span
                        className={`status-label status-${row[col.key].toLowerCase()}`}
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
                          aria-hidden="true"
                          focusable="false"
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
                        className={`severity-label severity-${row[col.key].toLowerCase()}`}
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
                        className={`priority-label priority-${row[col.key]
                          .toLowerCase()
                          .replace(/[\s-]/g, "-")}`}
                      >
                        {row[col.key]}
                      </span>
                    ) : colIndex === nameColIndex &&
                      primaryAction &&
                      row.hasActions ? (
                      <button
                        type="button"
                        className="table-link-cell"
                        title={primaryAction.label}
                        onClick={(e) => {
                          e.stopPropagation();
                          primaryAction.onClick(row);
                        }}
                      >
                        {row[col.key]}
                      </button>
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
                            if (!menuRefs.current[key]) menuRefs.current[key] = {};
                            menuRefs.current[key].button = el;
                          }}
                          aria-label="Row actions"
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
                            aria-hidden="true"
                            focusable="false"
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
                              if (!menuRefs.current[key]) menuRefs.current[key] = {};
                              menuRefs.current[key].dropdown = el;
                            }}
                          >
                            {actions.map((action, index) => (
                              <button
                                key={index}
                                className={`dropdown-item ${action.className || ""}`}
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
  );
};

export default TableBody;

import React from "react";

const TableActions = ({
  toggleExportDropdown,
  exportDropdownOpen,
  handleExportCSV,
  handleExportPDF,
  handlePrint,
  exportButtonRef,
  exportDropdownRef,
}) => (
  <div className="table-actions">
    <div className="action-menu">
      <button
        onClick={toggleExportDropdown}
        className="action-button"
        ref={exportButtonRef}
        aria-label="Export data"
        aria-expanded={exportDropdownOpen}
        aria-haspopup="true"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
      {exportDropdownOpen && (
        <div className="action-dropdown export-dropdown" ref={exportDropdownRef} role="menu">
          <button className="dropdown-item" role="menuitem" onClick={handleExportCSV}>
            Export as CSV
          </button>
          <button className="dropdown-item" role="menuitem" onClick={handleExportPDF}>
            Export as PDF
          </button>
        </div>
      )}
    </div>
    <button onClick={handlePrint} className="action-button" aria-label="Print">
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
        aria-hidden="true"
        focusable="false"
      >
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
    </button>
  </div>
);

export default TableActions;

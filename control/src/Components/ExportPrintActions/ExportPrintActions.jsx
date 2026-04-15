import React, { useState, useRef, useEffect, useCallback } from "react";
import { FiDownload, FiPrinter } from "react-icons/fi";

const ExportPrintActions = ({ onExportCSV, onExportPDF, onPrint }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!dropdownOpen) {
      updatePosition();
    }
    setDropdownOpen((prev) => !prev);
  };

  return (
    <div className="table-actions">
      <div className="action-menu">
        <button
          onClick={handleToggle}
          className="action-button"
          ref={buttonRef}
          aria-label="Export data"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
        >
          <FiDownload size={20} aria-hidden="true" />
        </button>
        {dropdownOpen && (
          <div
            className="action-dropdown export-dropdown"
            ref={dropdownRef}
            style={dropdownStyle}
            role="menu"
          >
            <button
              className="dropdown-item"
              onClick={() => {
                onExportCSV?.();
                setDropdownOpen(false);
              }}
            >
              Export as CSV
            </button>
            <button
              className="dropdown-item"
              onClick={() => {
                onExportPDF?.();
                setDropdownOpen(false);
              }}
            >
              Export as PDF
            </button>
          </div>
        )}
      </div>
      <button onClick={onPrint} className="action-button" aria-label="Print">
        <FiPrinter size={20} aria-hidden="true" />
      </button>
    </div>
  );
};

export default ExportPrintActions;

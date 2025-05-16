import React, { useRef, useState } from "react";
import {
  exportTableData,
  printTableData,
  exportTableToPDF,
} from "../../../utils/TableUtils";
import "./TenantList.css";
import { FaArrowLeft } from "react-icons/fa"; // Importing the back arrow icon

const TenantListViewPayment = ({
  title = "Tenants",
  breadcrumb = "Tenants / ACME Corp / Billing & Payments / Payment Info",
  paymentInfo = {
    Plan: "Basic Plan",
    Period: "Aug - Sep",
    "Payment ID": "IDCabAS3029bdtfr",
    "Payment Date": "01/08/24",
    "Time of Payment": "01:24:46",
    "Payment Amount": "$256",
    "Payment Method": {
      icon: "/amex-icon.png",
      number: "XXXX-XXXX-XXXX-2345",
    },
    Invoice: {
      id: "Inv32b87456",
      link: "#",
    },
  },
  onExportCSV = exportTableData,
  onExportPDF = exportTableToPDF,
  onPrint = printTableData,
  onBack,
}) => {
  const exportButtonRef = useRef(null);
  const exportDropdownRef = useRef(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const toggleExportDropdown = () => {
    setExportDropdownOpen(!exportDropdownOpen);
  };

  const handleExportCSV = () => {
    onExportCSV(paymentInfo);
    setExportDropdownOpen(false);
  };

  const handleExportPDF = () => {
    onExportPDF(paymentInfo);
    setExportDropdownOpen(false);
  };

  const handlePrint = () => {
    onPrint(paymentInfo);
  };

  return (
    <div className="tenant-payment-page">
      {/* Header */}
    <div className="tenant-header">
      <button className="back-button" onClick={onBack}>
        <FaArrowLeft/> Back
      </button>
      <div className="header-info">
        <h1>{title}</h1>
        <p className="breadcrumb">
          {breadcrumb.split(" / ").slice(0, -1).join(" / ")}
          {breadcrumb.includes(" / ") && " / "}
          <span className="breadcrumb-active">
            {breadcrumb.split(" / ").slice(-1)}
          </span>
        </p>
      </div>
    </div>

    {/* Payment Info */}
    <div className="payment-info">
      <div className="header-actions">
        <h2>PAYMENT INFO</h2>
        <div className="table-actions">
          <div className="action-menu">
            <button
              onClick={toggleExportDropdown}
              className="action-button"
              ref={exportButtonRef}
            >
              {/* Export Icon */}
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
            {/* Print Icon */}
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

        <div className="payment-card">
          {Object.entries(paymentInfo).map(([label, value]) => (
            <div className="payment-row" key={label}>
              <span>{label}</span>
              <span>
                {label === "Payment Method" && typeof value === "object" ? (
                  <>
                    <img src={value.icon} alt="Card" className="card-icon" />
                    {value.number}
                  </>
                ) : label === "Invoice" && typeof value === "object" ? (
                  <span className="invoice-link">
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
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    {value.id} <a href={value.link}>View</a>
                  </span>
                ) : (
                  value
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TenantListViewPayment;

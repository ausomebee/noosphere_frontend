import React from "react";
import {
  exportTableData,
  printTableData,
  exportTableToPDF,
} from "../../../utils/TableUtils";
import ExportPrintActions from "../../../Components/ExportPrintActions/ExportPrintActions";
import "./TenantList.css";
import { FaArrowLeft } from "react-icons/fa";

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
  onBack,
  onViewInvoice,
}) => {

  const handleViewInvoice = (e) => {
    e.preventDefault();
    if (onViewInvoice && paymentInfo.Invoice?.id) {
      onViewInvoice(paymentInfo.Invoice?.id);
    }
  };

  return (
    <div className="tenant-payment-page" style={{ padding: "20px" }}>
      {/* Header */}
      <div className="tenant-header">
        <button className="back-button" onClick={onBack}>
          <FaArrowLeft /> Back
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
          <ExportPrintActions
            onExportCSV={() => exportTableData(paymentInfo)}
            onExportPDF={() => exportTableToPDF(paymentInfo)}
            onPrint={() => printTableData(paymentInfo)}
          />
        </div>
        <div className="payment-card">
          {Object.entries(paymentInfo).map(([label, value]) => (
            <div className="payment-row" key={label}>
              <span>{label}</span>
              <span>
                {label === "Payment Method" &&
                typeof value === "object" &&
                value !== null ? (
                  <>
                    {typeof value.icon === "string" ? (
                      <img src={value.icon} alt="Card" className="card-icon" loading="lazy" />
                    ) : (
                      value.icon
                    )}
                    {value.number || "N/A"}
                  </>
                ) : label === "Invoice" &&
                  typeof value === "object" &&
                  value !== null ? (
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
                    invoice_{value.id || "N/A"}{" "}
                    <a href="#" onClick={handleViewInvoice}>
                      View
                    </a>
                  </span>
                ) : typeof value === "object" && value !== null ? (
                  JSON.stringify(value) // Fallback for unexpected objects
                ) : (
                  value || "N/A" // Handle null/undefined values
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

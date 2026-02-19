import React, { useState } from "react";

import { FaChevronRight, FaArrowLeft } from "react-icons/fa";
import { FiCreditCard } from "react-icons/fi";
import CustomTable from "../../Components/Table/CustomTable";
import "./BillingAndPayments.css";

// Sample table data and columns (replace with actual data)
// Payment Activity Log Data
const paymentData = [
  {
    id: 1,
    payment_id: "PAY12345",
    invoice_id: "INV67890",
    name: "John Doe",
    attempt: 1,
    day_time: { date: "5/25/2025", time: "9:00 AM" },
    amount: "$100",
    method: "Credit Card",
    status: "Completed",
    hasActions: false,
    hasCheckbox: false,
  },
  {
    id: 2,
    payment_id: "PAY12346",
    invoice_id: "INV67891",
    name: "Jane Smith",
    attempt: 2,
    day_time: { date: "5/26/2025", time: "2:30 PM" },
    amount: "$250",
    method: "Bank Transfer",
    status: "Failed",
    hasActions: false,
    hasCheckbox: false,
  },
  {
    id: 3,
    payment_id: "PAY12347",
    invoice_id: "INV67892",
    name: "Alice Johnson",
    attempt: 1,
    day_time: { date: "5/27/2025", time: "10:15 AM" },
    amount: "$180",
    method: "PayPal",
    status: "Completed",
    hasActions: false,
    hasCheckbox: false,
  },
  {
    id: 4,
    payment_id: "PAY12348",
    invoice_id: "INV67893",
    name: "Bob Brown",
    attempt: 3,
    day_time: { date: "5/27/2025", time: "3:45 PM" },
    amount: "$300",
    method: "Credit Card",
    status: "Pending",
    hasActions: false,
    hasCheckbox: false,
  },
];

// Invoice Activity Log Data
const invoiceData = [
  {
    id: 1,
    invoice_id: "INV67890",
    name: "John Doe",
    day_time: { date: "5/20/2025", time: "8:00 AM" },
    due_date: "5/30/2025",
    amount: "$150",
    status: "Pending",
  },
  {
    id: 2,
    invoice_id: "INV67891",
    name: "Jane Smith",
    day_time: { date: "5/22/2025", time: "11:20 AM" },
    due_date: "6/01/2025",
    amount: "$250",
    status: "Overdue",
  },
  {
    id: 3,
    invoice_id: "INV67892",
    name: "Alice Johnson",
    day_time: { date: "5/25/2025", time: "9:30 AM" },
    due_date: "6/05/2025",
    amount: "$180",
    status: "Paid",
  },
  {
    id: 4,
    invoice_id: "INV67893",
    name: "Bob Brown",
    day_time: { date: "5/27/2025", time: "1:00 PM" },
    due_date: "6/06/2025",
    amount: "$300",
    status: "Pending",
  },
];

// Account Suspension Log Data
const suspensionData = [
  {
    id: 1,
    name: "Jane Smith",
    day_time: { date: "5/27/2025", time: "9:32 AM" },
    reason: "Non-payment",
    attempt: 2,
    status: "Suspended",
  },
  {
    id: 2,
    name: "Tom Wilson",
    day_time: { date: "5/26/2025", time: "4:00 PM" },
    reason: "Non-payment",
    attempt: 3,
    status: "Suspended",
  },
  {
    id: 3,
    name: "Sarah Davis",
    day_time: { date: "5/25/2025", time: "2:15 PM" },
    reason: "Policy Violation",
    attempt: 1,
    status: "Suspended",
  },
];

// Account Reactivation Log Data
const reactivationData = [
  {
    id: 1,
    name: "John Doe",
    day_time: { date: "5/27/2025", time: "11:00 AM" },
    reason: "Payment Received",
    status: "Active",
  },
  {
    id: 2,
    name: "Alice Johnson",
    day_time: { date: "5/26/2025", time: "3:30 PM" },
    reason: "Payment Received",
    status: "Active",
  },
  {
    id: 3,
    name: "Emily Clark",
    day_time: { date: "5/25/2025", time: "10:45 AM" },
    reason: "Appeal Approved",
    status: "Active",
  },
];

const paymentColumns = [
  { key: "payment_id", header: "Payment ID" },
  { key: "invoice_id", header: "Invoice ID" },
  { key: "name", header: "Tenant" },
  { key: "attempt", header: "Attempt No" },
  { key: "day_time", header: "Date & Time", type: "day_time" },
  { key: "amount", header: "Amount" },
  { key: "status", header: "Status", type: "status" },
];
const invoiceColumns = [
  { key: "invoice_id", header: "Invoice ID" },
  { key: "name", header: "Tenant" },
  { key: "day_time", header: "Date & Time", type: "day_time" },
  { key: "due_date", header: "Due Date" },
  { key: "amount", header: "Amount" },
  { key: "status", header: "Status", type: "status" },
];
const suspensionColumns = [
  { key: "name", header: "Tenant" },
  { key: "day_time", header: "Timestamp", type: "day_time" },
  { key: "reason", header: "Reason" },
  { key: "attempt", header: "Payment Attempts" },
];
const reactivationColumns = [
  { key: "name", header: "Tenant" },
  { key: "day_time", header: "Timestamp", type: "day_time" },
  { key: "reason", header: "reason" },
  { key: "status", header: "Status", type: "status" },
];

// Define filter options for each report type
const filterOptions = {
  payment: [
    {
      key: "filter_type",
      value: "",
      options: [
        { value: "", label: "Select Filter" },
        { value: "date_paid", label: "Date Paid" },
        { value: "payment_method", label: "Payment Method" },
        { value: "status", label: "Status" },
        { value: "clear_filters", label: "Clear Filters" },
      ],
    },
  ],
  invoice: [
    {
      key: "filter_type",
      value: "",
      options: [
        { value: "", label: "Select Filter" },
        { value: "date_issued", label: "Date Issued" },
        { value: "due_date", label: "Due Date" },
        { value: "status", label: "Status" },
        { value: "clear_filters", label: "Clear Filters" },
      ],
    },
  ],
  suspension: [
    {
      key: "filter_type",
      value: "",
      options: [
        { value: "", label: "Select Filter" },
        { value: "suspension_date", label: "Suspension Date" },
        { value: "reason", label: "Reason" },
        { value: "status", label: "Status" },
        { value: "clear_filters", label: "Clear Filters" },
      ],
    },
  ],
  reactivation: [
    {
      key: "filter_type",
      value: "",
      options: [
        { value: "", label: "Select Filter" },
        { value: "reactivation_date", label: "Reactivation Date" },
        { value: "reason", label: "Reason" },
        { value: "status", label: "Status" },
        { value: "clear_filters", label: "Clear Filters" },
      ],
    },
  ],
};

const BillingReports = () => {
  const [selectedReport, setSelectedReport] = useState(null); // State to track selected report

  const handleSelectReport = (reportType) => {
    setSelectedReport(reportType);
  };

  const handleBack = () => {
    setSelectedReport(null); // Return to the list view
  };

  const getReportTitle = () => {
    switch (selectedReport) {
      case "payment":
        return "Payment Activity Log";
      case "invoice":
        return "Invoice Activity Log";
      case "suspension":
        return "Account Suspension Log";
      case "reactivation":
        return "Account Reactivation Log";
      default:
        return "Billing Activity Reports";
    }
  };

  const getTableData = () => {
    switch (selectedReport) {
      case "payment":
        return paymentData;
      case "invoice":
        return invoiceData;
      case "suspension":
        return suspensionData;
      case "reactivation":
        return reactivationData;
      default:
        return [];
    }
  };

  const getColumns = () => {
    switch (selectedReport) {
      case "payment":
        return paymentColumns;
      case "invoice":
        return invoiceColumns;
      case "suspension":
        return suspensionColumns;
      case "reactivation":
        return reactivationColumns;
      default:
        return [];
    }
  };

  const filters = filterOptions[selectedReport] || [];

  const handleFilterChange = (key, value) => {
    // Add logic to filter table data if needed
  };

  return (
    <>
      <div className="billing-board-header">
        <div className="billing-board-title">
          {selectedReport ? (
            <div className="tenant-header">
              <div onClick={handleBack} className="back-link">
                <FaArrowLeft /> Back
              </div>
              <div className="tenant-title-container">
                <h1 className="tenant-title">Billing</h1>
                <h2 className="tenant-title-breadcrumbs">
                  Reports /{" "}
                  <span className="tenant-title-breadcrumbs-org">
                    {getReportTitle()}
                  </span>
                </h2>
              </div>
            </div>
          ) : (
            <>
              <h1>Billing & Payment</h1>
              <p>Manage all billing and payment related activities</p>
            </>
          )}
        </div>
      </div>

      <div className="billing-reports-container">
        {!selectedReport ? (
          <>
            <div className="billing-reports-header">
              <FiCreditCard className="reports-icon" />
              <h2 className="billing-reports-title">
                Billing Activity Reports
              </h2>
            </div>
            <ul className="billing-reports-list">
              <li className="billing-reports-item">
                <button
                  className="billing-reports-button"
                  onClick={() => handleSelectReport("invoice")}
                >
                  <span>Invoice Activity Log</span>
                  <FaChevronRight className="billing-reports-icon" />
                </button>
              </li>
              <li className="billing-reports-item">
                <button
                  className="billing-reports-button"
                  onClick={() => handleSelectReport("payment")}
                >
                  <span>Payment Activity Log</span>
                  <FaChevronRight className="billing-reports-icon" />
                </button>
              </li>
              <li className="billing-reports-item">
                <button
                  className="billing-reports-button"
                  onClick={() => handleSelectReport("suspension")}
                >
                  <span>Account Suspension Log</span>
                  <FaChevronRight className="billing-reports-icon" />
                </button>
              </li>
              <li className="billing-reports-item">
                <button
                  className="billing-reports-button"
                  onClick={() => handleSelectReport("reactivation")}
                >
                  <span>Account Reactivation Log</span>
                  <FaChevronRight className="billing-reports-icon" />
                </button>
              </li>
            </ul>
          </>
        ) : (
          <CustomTable
            data={getTableData()}
            columns={getColumns()}
            filters={filters}
            onFilterChange={handleFilterChange}
            showActions={false}
            showCheckbox={false}
          />
        )}
      </div>
    </>
  );
};

export default BillingReports;

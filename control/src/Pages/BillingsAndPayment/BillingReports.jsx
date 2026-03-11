/**
 * BillingReports.jsx
 *
 * ─────────────────────────────────────────────
 * BACKEND API CONTRACT (for all four report logs)
 * ─────────────────────────────────────────────
 *
 * 1. PAYMENT ACTIVITY LOG
 *    GET /api/billing/reports/payment-activity
 *    Query params:
 *      page        number   (default 1)
 *      limit       number   (default 10)
 *      status      string   "Failed" | "Completed"
 *      startDate   string   ISO-8601 date  (filter by payment date)
 *      endDate     string   ISO-8601 date
 *    Response:
 *      {
 *        data: [
 *          {
 *            paymentId:   string,   // "PAY001"
 *            invoiceId:   string,   // "Invoice_32408"
 *            tenantName:  string,   // "ACME Corp"
 *            attemptNo:   number,   // 1
 *            createdAt:   string,   // ISO-8601 datetime  "2024-12-10T12:34:00Z"
 *            amount:      number,   // 5000
 *            status:      string    // "Failed" | "Completed"
 *          }
 *        ],
 *        total: number,
 *        page:  number,
 *        limit: number
 *      }
 *
 * 2. INVOICE ACTIVITY LOG
 *    GET /api/billing/reports/invoice-activity
 *    Query params:
 *      page        number
 *      limit       number
 *      status      string   "Upcoming" | "Due" | "Overdue" | "Paid"
 *      startDate   string   ISO-8601  (filter by due date)
 *      endDate     string   ISO-8601
 *    Response:
 *      {
 *        data: [
 *          {
 *            invoiceId:  string,   // "Invoice_32408"
 *            tenantName: string,   // "ACME Corp"
 *            createdAt:  string,   // ISO-8601 datetime
 *            dueDate:    string,   // ISO-8601 date  "2024-12-10"
 *            amount:     number,   // 5000
 *            status:     string    // "Upcoming" | "Due" | "Overdue" | "Paid"
 *          }
 *        ],
 *        total: number,
 *        page:  number,
 *        limit: number
 *      }
 *
 * 3. ACCOUNT SUSPENSION LOG
 *    GET /api/billing/reports/account-suspensions
 *    Query params:
 *      page    number
 *      limit   number
 *      reason  string   "Manual Suspension" | "Payment Failure"
 *    Response:
 *      {
 *        data: [
 *          {
 *            tenantName:      string,   // "ACME Corp"
 *            suspendedAt:     string,   // ISO-8601 datetime
 *            reason:          string,   // "Manual Suspension" | "Payment Failure"
 *            paymentAttempts: number | string  // 7 or "N/A"
 *          }
 *        ],
 *        total: number,
 *        page:  number,
 *        limit: number
 *      }
 *
 * 4. ACCOUNT REACTIVATION LOG
 *    GET /api/billing/reports/account-reactivations
 *    Query params:
 *      page    number
 *      limit   number
 *      reason  string   "New subscription" | "Payment Failure" | "Manual Suspension"
 *    Response:
 *      {
 *        data: [
 *          {
 *            tenantName:  string,   // "ACME Corp"
 *            reactivatedAt: string, // ISO-8601 datetime
 *            reason:      string,   // "New subscription" | "Payment Failure"
 *            paymentId:   string    // "PAY 001"
 *          }
 *        ],
 *        total: number,
 *        page:  number,
 *        limit: number
 *      }
 *
 * ─────────────────────────────────────────────
 * DATA MAPPING (frontend row shape from API response)
 * ─────────────────────────────────────────────
 * payment row:
 *   payment_id   ← paymentId
 *   invoice_id   ← invoiceId
 *   tenant       ← tenantName
 *   attempt      ← attemptNo
 *   day_time     ← { date: "MM/dd/yyyy", time: "h:mm a" }  parsed from createdAt
 *   date_created ← "MM/dd/yyyy"  (used for date-range filter)
 *   amount       ← "$N"  formatted
 *   status       ← status
 *
 * invoice row:
 *   invoice_id   ← invoiceId
 *   tenant       ← tenantName
 *   day_time     ← { date, time }  parsed from createdAt
 *   due_date     ← "MM/dd/yyyy"  parsed from dueDate  (also used for date-range filter)
 *   amount       ← "$N"  formatted
 *   status       ← status
 *
 * suspension row:
 *   tenant           ← tenantName
 *   day_time         ← { date, time }  parsed from suspendedAt
 *   reason           ← reason
 *   payment_attempts ← paymentAttempts
 *
 * reactivation row:
 *   tenant     ← tenantName
 *   day_time   ← { date, time }  parsed from reactivatedAt
 *   reason     ← reason
 *   payment_id ← paymentId
 *   hasActions ← true  (shows 3-dot menu)
 */

import React, { useState, useCallback } from "react";
import { FaChevronRight, FaArrowLeft } from "react-icons/fa";
import { FiCreditCard } from "react-icons/fi";
import CustomTable from "../../Components/Table/CustomTable";
import { SectionSpinner } from "../../Components/LoadingSpinner";
import { showToast } from "../../Helper/ShowToast";
import useAuth from "../../hooks/useAuth";
import api from "../../api/InvoiceApi";
import "./BillingAndPayments.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (iso) => {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US");
};

const formatTime = (iso) => {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDayTime = (iso) => ({
  date: formatDate(iso),
  time: formatTime(iso),
});

const formatAmount = (amount) =>
  amount != null ? `$${Number(amount).toLocaleString()}` : "N/A";

// ─── Row mappers ─────────────────────────────────────────────────────────────

const mapPaymentRow = (item) => ({
  payment_id:   item.id        ? `PAY${item.id}`        : item.paymentId  || "N/A",
  invoice_id:   item.invoiceId ? `INV${item.invoiceId}` : "N/A",
  tenant:       item.tenant?.companyName || item.tenantId || "N/A",
  attempt:      item.attemptNo ?? item.attempt ?? "N/A",
  day_time:     formatDayTime(item.createdAt),
  date_created: formatDate(item.createdAt),
  amount:       formatAmount(item.amount),
  status:       item.status || "N/A",
  hasCheckbox:  false,
  hasActions:   false,
});

const mapInvoiceRow = (item) => ({
  invoice_id:  item.id ? `INV${item.id}` : item.invoiceId || "N/A",
  tenant:      item.tenant?.companyName || item.tenantId || "N/A",
  day_time:    formatDayTime(item.createdAt),
  due_date:    formatDate(item.dueDate),
  amount:      formatAmount(item.total ?? item.amount),
  status:      item.status || "N/A",
  hasCheckbox: false,
});

const mapSuspensionRow = (item) => {
  const byName = item.deactivatedBy
    ? `${item.deactivatedBy.firstName || ""} ${item.deactivatedBy.lastName || ""}`.trim()
    : null;
  return {
    tenant:       item.tenant?.companyName || item.tenantName || item.tenantId || "N/A",
    day_time:     formatDayTime(item.deactivatedAt || item.createdAt),
    reason:       item.reason || "N/A",
    deactivated_by: byName || item.details || "N/A",
    hasCheckbox:  false,
  };
};

const mapReactivationRow = (item) => {
  const byName = item.reactivatedBy
    ? `${item.reactivatedBy.firstName || ""} ${item.reactivatedBy.lastName || ""}`.trim()
    : null;
  return {
    tenant:      item.tenant?.companyName || item.tenantName || item.tenantId || "N/A",
    day_time:    formatDayTime(item.reactivatedAt || item.activatedAt || item.createdAt),
    reason:      item.reason || "N/A",
    reactivated_by: byName || "N/A",
    hasCheckbox: false,
    hasActions:  true,
  };
};

const ROW_MAPPERS = {
  payment:      mapPaymentRow,
  invoice:      mapInvoiceRow,
  suspension:   mapSuspensionRow,
  reactivation: mapReactivationRow,
};

// ─── Column definitions ──────────────────────────────────────────────────────

const paymentColumns = [
  { key: "payment_id",   header: "Payment ID"   },
  { key: "invoice_id",   header: "Invoice ID"   },
  { key: "tenant",       header: "Tenant"        },
  { key: "attempt",      header: "Attempt No"    },
  { key: "day_time",     header: "Date & Time",  type: "day_time" },
  { key: "amount",       header: "Amount"        },
  { key: "status",       header: "Status",       type: "status"   },
];

const invoiceColumns = [
  { key: "invoice_id", header: "Invoice ID"   },
  { key: "tenant",     header: "Tenant"        },
  { key: "day_time",   header: "Date & Time",  type: "day_time" },
  { key: "due_date",   header: "Due Date"      },
  { key: "amount",     header: "Amount"        },
  { key: "status",     header: "Status",       type: "status"   },
];

const suspensionColumns = [
  { key: "tenant",         header: "Tenant"          },
  { key: "day_time",       header: "Timestamp",      type: "day_time" },
  { key: "reason",         header: "Reason"          },
  { key: "deactivated_by", header: "Deactivated By"  },
];

const reactivationColumns = [
  { key: "tenant",         header: "Tenant"          },
  { key: "day_time",       header: "Timestamp",      type: "day_time" },
  { key: "reason",         header: "Reason"          },
  { key: "reactivated_by", header: "Reactivated By"  },
];

// ─── Filter definitions ──────────────────────────────────────────────────────
// "status"       → uses built-in second-select (unique values derived from data)
// "date_created" → uses inline date-range picker (in CustomTable.dateFilterKeys)
// "due_date"     → uses inline date-range picker (in CustomTable.dateFilterKeys)
// "reason"       → uses built-in second-select

const paymentFilters = [
  {
    key: "filter_type",
    options: [
      { value: "",              label: "Select"        },
      { value: "status",        label: "Status"        },
      { value: "date_created",  label: "Date"          },
      { value: "clear_filters", label: "Clear Filters" },
    ],
  },
];

const invoiceFilters = [
  {
    key: "filter_type",
    options: [
      { value: "",              label: "Select"        },
      { value: "status",        label: "Status"        },
      { value: "due_date",      label: "Due Date"      },
      { value: "clear_filters", label: "Clear Filters" },
    ],
  },
];

const suspensionFilters = [
  {
    key: "filter_type",
    options: [
      { value: "",              label: "Select"        },
      { value: "reason",        label: "Reason"        },
      { value: "clear_filters", label: "Clear Filters" },
    ],
  },
];

const reactivationFilters = [
  {
    key: "filter_type",
    options: [
      { value: "",              label: "Select"        },
      { value: "reason",        label: "Reason"        },
      { value: "clear_filters", label: "Clear Filters" },
    ],
  },
];

// ─── Report config (static — data fetched at runtime) ────────────────────────

const REPORT_CONFIG = {
  payment: {
    title:       "Payment Activity Log",
    columns:     paymentColumns,
    filters:     paymentFilters,
    showActions: false,
  },
  invoice: {
    title:       "Invoice Activity Log",
    columns:     invoiceColumns,
    filters:     invoiceFilters,
    showActions: false,
  },
  suspension: {
    title:       "Account Suspension Log",
    columns:     suspensionColumns,
    filters:     suspensionFilters,
    showActions: false,
  },
  reactivation: {
    title:       "Account Reactivation Log",
    columns:     reactivationColumns,
    filters:     reactivationFilters,
    showActions: true,
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

const BillingReports = () => {
  const { accessToken, refreshToken } = useAuth();
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async (reportKey) => {
    setLoading(true);
    setReportData([]);
    try {
      let raw = [];
      if (reportKey === "payment") {
        const res = await api.GetReportPayments({ accessToken, refreshToken });
        raw = res.data || [];
      } else if (reportKey === "invoice") {
        const res = await api.GetReportInvoices({ accessToken, refreshToken });
        raw = res.data || [];
      } else if (reportKey === "suspension") {
        const res = await api.GetDeactivationLogs({ accessToken, refreshToken });
        raw = res.data?.data || [];
      } else if (reportKey === "reactivation") {
        const res = await api.GetActivationLogs({ accessToken, refreshToken });
        raw = res.data?.data || [];
      }
      setReportData(raw.map(ROW_MAPPERS[reportKey]));
    } catch (err) {
      showToast(err.message || "Failed to load report", "error");
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshToken]);

  const handleSelectReport = (key) => {
    setSelectedReport(key);
    fetchReport(key);
  };

  const handleBack = () => {
    setSelectedReport(null);
    setReportData([]);
  };

  const config = selectedReport ? REPORT_CONFIG[selectedReport] : null;

  return (
    <>
      <div className="billing-board-header">
        <div className="billing-board-title">
          {selectedReport ? (
            <div className="report-header-centered">
              <div onClick={handleBack} className="back-link report-back-btn">
                <FaArrowLeft /> Back
              </div>
              <div className="report-title-container">
                <h1 className="report-page-title">Billing</h1>
                <h2 className="report-page-breadcrumbs">
                  Reports /{" "}
                  <span className="report-page-breadcrumbs-active">
                    {config.title}
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
              <h2 className="billing-reports-title">Billing Activity Reports</h2>
            </div>
            <ul className="billing-reports-list">
              {Object.entries(REPORT_CONFIG).map(([key, r]) => (
                <li key={key} className="billing-reports-item">
                  <button
                    className="billing-reports-button"
                    onClick={() => handleSelectReport(key)}
                  >
                    <span>{r.title}</span>
                    <FaChevronRight className="billing-reports-icon" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : loading ? (
          <SectionSpinner />
        ) : (
          <CustomTable
            data={reportData}
            columns={config.columns}
            filters={config.filters}
            showActions={config.showActions}
            actions={
              config.showActions
                ? [{ label: "View Details", onClick: (row) => console.log("View", row) }]
                : undefined
            }
            showCheckbox={false}
            itemsPerPage={10}
            tableName={config.title}
          />
        )}
      </div>
    </>
  );
};

export default BillingReports;

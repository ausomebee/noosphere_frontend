import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import "./TenantSingle.css";
import Button from "../../../Components/Button/Button";
import { FiArrowUpRight } from "react-icons/fi";
import CustomTable from "../../../Components/Table/CustomTable";
import "../../../Components/Table/CustomTable.css";
import TableFilterModal from "../../../Components/ReusableModal/TableFilterModal";
import TableFilterDateModal from "../../../Components/ReusableModal/TableFilterDateModal";
import tenantApi from "../../../api/TenantApis";
import useAuth from "../../../hooks/useAuth";
import { showToast } from "../../../Helper/ShowToast";
import { SectionSpinner } from "../../../Components/LoadingSpinner";

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US");
};

const INVOICE_TABS = ["All", "paid", "pending", "overdue", "upcoming"];

const TenantSingleBilling = () => {
  const { tenantId } = useParams();
  const { accessToken, refreshToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [subscription, setSubscription] = useState(null);

  const [activeInvoiceTab, setActiveInvoiceTab] = useState("All");
  const [activePaymentTab, setActivePaymentTab] = useState("All");

  const [invoiceFilterModal, setInvoiceFilterModal] = useState(null); // "status"|"date"
  const [paymentFilterModal, setPaymentFilterModal] = useState(null); // "status"|"method"|"date"
  const [invoiceFilters, setInvoiceFilters] = useState({ status: "", dateRange: null });
  const [paymentFilters, setPaymentFilters] = useState({ status: "", method: "", dateRange: null });

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [invoicesRes, paymentsRes, featuresRes] = await Promise.allSettled([
        tenantApi.GetTenantInvoices({ accessToken, refreshToken, tenantId }),
        tenantApi.GetTenantPayments({ accessToken, refreshToken, tenantId }),
        tenantApi.GetTenantFeatures({ accessToken, refreshToken, tenantId }),
      ]);

      if (invoicesRes.status === "fulfilled") {
        const raw = invoicesRes.value;
        setInvoices(raw?.data?.data || raw?.data || raw || []);
      } else {
        if (import.meta.env.DEV)
          console.warn("Invoices fetch error:", invoicesRes.reason?.message);
      }

      if (paymentsRes.status === "fulfilled") {
        const raw = paymentsRes.value;
        setPayments(raw?.data?.data || raw?.data || raw || []);
      } else {
        if (import.meta.env.DEV)
          console.warn("Payments fetch error:", paymentsRes.reason?.message);
      }

      if (featuresRes.status === "fulfilled") {
        setSubscription(featuresRes.value?.data || featuresRes.value);
      }
    } catch (err) {
      showToast(err.message || "Failed to load billing data", "error");
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshToken, tenantId]);

  const fetchInvoicesByStatus = useCallback(
    async (status) => {
      try {
        setLoading(true);
        const res = await tenantApi.GetTenantInvoicesByStatus({
          accessToken,
          refreshToken,
          tenantId,
          status,
        });
        const raw = res;
        setInvoices(raw?.data?.data || raw?.data || raw || []);
      } catch (err) {
        showToast(err.message || "Failed to load invoices", "error");
      } finally {
        setLoading(false);
      }
    },
    [accessToken, refreshToken, tenantId]
  );

  const fetchPaymentsByStatus = useCallback(
    async (status) => {
      try {
        setLoading(true);
        const res = await tenantApi.GetTenantPaymentsByStatus({
          accessToken,
          refreshToken,
          tenantId,
          status,
        });
        const raw = res;
        setPayments(raw?.data?.data || raw?.data || raw || []);
      } catch (err) {
        showToast(err.message || "Failed to load payments", "error");
      } finally {
        setLoading(false);
      }
    },
    [accessToken, refreshToken, tenantId]
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleInvoiceTabChange = (tab) => {
    setActiveInvoiceTab(tab);
    if (tab === "All") {
      tenantApi
        .GetTenantInvoices({ accessToken, refreshToken, tenantId })
        .then((res) => {
          const raw = res;
          setInvoices(raw?.data?.data || raw?.data || raw || []);
        })
        .catch((err) => showToast(err.message || "Failed to load invoices", "error"));
    } else {
      fetchInvoicesByStatus(tab);
    }
  };

  const handlePaymentTabChange = (tab) => {
    setActivePaymentTab(tab);
    if (tab === "All") {
      tenantApi
        .GetTenantPayments({ accessToken, refreshToken, tenantId })
        .then((res) => {
          const raw = res;
          setPayments(raw?.data?.data || raw?.data || raw || []);
        })
        .catch((err) => showToast(err.message || "Failed to load payments", "error"));
    } else {
      fetchPaymentsByStatus(tab);
    }
  };

  // Plan info
  const planName =
    subscription?.plan?.name ||
    subscription?.planName ||
    subscription?.data?.plan?.name ||
    "—";

  // Map invoices to table rows (flexible field names)
  const invoiceData = (Array.isArray(invoices) ? invoices : []).map((inv) => ({
    id: inv.id || inv.invoiceId,
    document: inv.invoiceNumber || inv.invoiceId || inv.id || "—",
    date_created: formatDate(inv.createdAt || inv.dateCreated || inv.issueDate),
    due_date: formatDate(inv.dueDate || inv.due_date),
    billing_frequency: inv.billingFrequency || "—",
    amount: (inv.total ?? inv.amount) != null ? `$${Number(inv.total ?? inv.amount).toFixed(2)}` : "—",
    status: inv.status || "—",
    hasCheckbox: true,
  }));

  // Map payments to table rows (flexible field names)
  const paymentData = (Array.isArray(payments) ? payments : []).map((pay) => ({
    id: pay.id || pay.paymentId,
    reference: pay.reference || pay.paymentReference || pay.id || "—",
    amount: pay.amount != null ? `$${Number(pay.amount).toFixed(2)}` : "—",
    method: pay.method || pay.paymentMethod || "—",
    date: formatDate(pay.paymentDate || pay.createdAt || pay.paidAt),
    status: pay.status || "—",
    hasCheckbox: true,
  }));

  const invoiceColumns = [
    { key: "document", header: "INVOICE" },
    { key: "date_created", header: "DATE CREATED" },
    { key: "due_date", header: "DUE DATE" },
    { key: "billing_frequency", header: "FREQUENCY" },
    { key: "amount", header: "AMOUNT" },
    ...(activeInvoiceTab === "All"
      ? [{ key: "status", header: "STATUS", type: "status" }]
      : []),
  ];

  const paymentColumns = [
    { key: "reference", header: "REFERENCE" },
    { key: "amount", header: "AMOUNT" },
    { key: "method", header: "METHOD" },
    { key: "date", header: "DATE" },
    ...(activePaymentTab === "All"
      ? [{ key: "status", header: "STATUS", type: "status" }]
      : []),
  ];

  const invoiceTabs = [
    { name: "All", label: "All" },
    { name: "Paid", label: "Paid" },
    { name: "Upcoming", label: "Upcoming" },
    { name: "Due", label: "Due" },
    { name: "Overdue", label: "Overdue" },
  ];

  const paymentTabs = [
    { name: "All", label: "All" },
    { name: "paid", label: "Paid" },
    { name: "failed", label: "Failed" },
    { name: "pending", label: "Pending" },
  ];

  // Filter modal options derived from data
  const invoiceStatusOpts = useMemo(() => [
    { value: "", label: "All Statuses" },
    ...[...new Set(invoiceData.map((r) => r.status).filter((s) => s && s !== "—"))].map((s) => ({ value: s, label: s })),
  ], [invoiceData]);

  const paymentStatusOpts = useMemo(() => [
    { value: "", label: "All Statuses" },
    ...[...new Set(paymentData.map((r) => r.status).filter((s) => s && s !== "—"))].map((s) => ({ value: s, label: s })),
  ], [paymentData]);

  const paymentMethodOpts = useMemo(() => [
    { value: "", label: "All Methods" },
    ...[...new Set(paymentData.map((r) => r.method).filter((m) => m && m !== "—"))].map((m) => ({ value: m, label: m })),
  ], [paymentData]);

  // Client-side filtering
  const filteredInvoiceData = useMemo(() => invoiceData.filter((row) => {
    if (invoiceFilters.status && row.status !== invoiceFilters.status) return false;
    return true;
  }), [invoiceData, invoiceFilters]);

  const filteredPaymentData = useMemo(() => paymentData.filter((row) => {
    if (paymentFilters.status && row.status !== paymentFilters.status) return false;
    if (paymentFilters.method && row.method !== paymentFilters.method) return false;
    return true;
  }), [paymentData, paymentFilters]);

  const invoiceTableFilters = useMemo(() => [
    {
      key: "filter_type",
      options: [
        { value: "", label: "Filter by..." },
        ...(activeInvoiceTab === "All" ? [{ value: "status", label: "Status" }] : []),
        { value: "date", label: "Date" },
        { value: "clear_filters", label: "Clear Filters" },
      ],
    },
  ], [activeInvoiceTab]);

  const paymentTableFilters = useMemo(() => [
    {
      key: "filter_type",
      options: [
        { value: "", label: "Filter by..." },
        ...(activePaymentTab === "All" ? [{ value: "status", label: "Status" }] : []),
        { value: "method", label: "Method" },
        { value: "clear_filters", label: "Clear Filters" },
      ],
    },
  ], [activePaymentTab]);

  const handleInvoiceFilterTypeSelect = (type) => setInvoiceFilterModal(type);
  const handlePaymentFilterTypeSelect = (type) => setPaymentFilterModal(type);

  if (loading) {
    return (
      <div className="tenant-list-container">
        <SectionSpinner />
      </div>
    );
  }

  return (
    <div className="tenant-list-container">
      {/* Plan Info Section */}
      <h3 className="tenant-header-gen">Plan Info</h3>
      <div className="plan-info">
        <div className="plan-details">
          <div className="plan-item">
            <p>
              <span className="plan-badge">
                {planName !== "—" ? planName : "Enterprise"}
              </span>{" "}
              Plan
            </p>
            <Button
              label="Change plan"
              iconPosition="right"
              icon={<FiArrowUpRight size={20} />}
              width="180px"
            />
          </div>
        </div>
      </div>

      {/* Invoices Section */}
      <h3 className="tenant-header-gen">Invoices</h3>
      <div className="invoices-tabs-container">
        <div className="tenants-tabs">
          {invoiceTabs.map((tab) => (
            <button
              key={tab.name}
              className={`tenants-tab ${activeInvoiceTab === tab.name ? "active" : ""}`}
              onClick={() => handleInvoiceTabChange(tab.name)}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <CustomTable
          data={filteredInvoiceData}
          columns={invoiceColumns}
          filters={invoiceTableFilters}
          onFilterTypeSelect={handleInvoiceFilterTypeSelect}
          showActions={false}
          itemsPerPage={10}
          tableName="Invoices"
        />
        <TableFilterModal
          isOpen={invoiceFilterModal === "status"}
          onClose={() => setInvoiceFilterModal(null)}
          title="Filter by Status"
          label="Select status"
          options={invoiceStatusOpts}
          onApply={(val) => setInvoiceFilters((p) => ({ ...p, status: val }))}
        />
        <TableFilterDateModal
          isOpen={invoiceFilterModal === "date"}
          onClose={() => setInvoiceFilterModal(null)}
          title="Filter by due date"
          onApply={(range) => setInvoiceFilters((p) => ({ ...p, dateRange: range }))}
        />
      </div>

      {/* Payments Section */}
      <h3 className="tenant-header-gen" style={{ marginTop: 32 }}>Payments</h3>
      <div className="invoices-tabs-container">
        <div className="tenants-tabs">
          {paymentTabs.map((tab) => (
            <button
              key={tab.name}
              className={`tenants-tab ${activePaymentTab === tab.name ? "active" : ""}`}
              onClick={() => handlePaymentTabChange(tab.name)}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <CustomTable
          data={filteredPaymentData}
          columns={paymentColumns}
          filters={paymentTableFilters}
          onFilterTypeSelect={handlePaymentFilterTypeSelect}
          showActions={false}
          itemsPerPage={10}
          tableName="Payments"
        />
      </div>
    </div>
  );
};

export default TenantSingleBilling;

import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

import CustomTable from "../../Components/Table/CustomTable";
import { SelectInput, TextInput } from "../../Components/Input/Inputs";
import api from "../../api/InvoiceApi";
import api2 from "../../api/TenantApis";
import useAuth from "../../hooks/useAuth";
import SubscriptionInvoice from "../../Components/Invoice/SubscriptionInvoice";
import TenantListViewPayment from "../../Pages/Tenant/TenantList/TenantListViewPayment";
import { SiVisa, SiMastercard, SiAmericanexpress, SiPaypal } from "react-icons/si";
import { showToast } from "../../Helper/ShowToast";
import { formatDate } from "../../Helper/Formatters";
import "./BillingAndPayments.css";

const statusMap = {
  // Payment statuses
  successful: "Successful",
  in_progress: "InProgress",
  failed: "Failed",
  // Invoice statuses
  paid: "Paid",
  upcoming: "Upcoming",
  due: "Due",
  overdue: "Overdue",
};

const BillingManager = () => {
  const { accessToken, refreshToken } = useAuth();

  const [activeTab, setActiveTab] = useState("invoices");
  const [activeSubTab, setActiveSubTab] = useState("all");
  const [filterValues, setFilterValues] = useState({
    totalBilled: "all_time",
    invoicesDue: "all_time",
  });
  const [customDates, setCustomDates] = useState({
    totalBilled: { start: null, end: null },
    invoicesDue: { start: null, end: null },
  });
  const [overviewData, setOverviewData] = useState({
    totalTenants: "0",
    totalBilled: {
      all_time: "$0",
      this_week: "$0",
      this_month: "$0",
      this_year: "$0",
      custom: "$0",
    },
    invoicesDue: {
      all_time: "0",
      this_week: "0",
      this_month: "0",
      this_year: "0",
      custom: "0",
    },
  });
  const [loading, setLoading] = useState(true);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentView, setShowPaymentView] = useState(false);
  const [invoiceData, setInvoiceData] = useState([]);
  const [paymentData, setPaymentData] = useState([]);
  const [invoiceCounts, setInvoiceCounts] = useState({
    All: 0,
    Paid: 0,
    Upcoming: 0,
    Due: 0,
    Overdue: 0,
  });
  const [paymentCounts, setPaymentCounts] = useState({
    All: 0,
    Successful: 0,
    InProgress: 0,
    Failed: 0,
  });

  const buildInvoiceItems = (items, billingFrequency) => {
    const rows = [];
    let rowNum = 1;
    (items || []).forEach((item) => {
      rows.push({
        id: `${rowNum++}`,
        description: item.description,
        rate: formatNumber(item.rate?.price || 0, true),
        quantity: item.quantity,
        price: formatNumber(item.price || 0, true),
      });
      (item.extraFeaturesWithPrice || []).forEach((feature) => {
        const isYearly = billingFrequency?.toLowerCase() === "yearly";
        const featurePrice = isYearly
          ? feature.pricePerYear?.price || 0
          : feature.pricePerMonth?.price || 0;
        const qty = item.quantity || 1;
        rows.push({
          id: `${rowNum++}`,
          description: "Add-on Feature",
          rate: formatNumber(featurePrice, true),
          quantity: qty,
          price: formatNumber(featurePrice * qty, true),
        });
      });
    });
    return rows;
  };

  const extractIdNumber = (id) => {
    if (!id || typeof id !== "string") return id;
    return id.replace(/^(PAY00|invoice_|INV)/, ""); // Updated to handle "INV" prefix
  };

  const formatPaymentId = (id) => `PAY00${id}`;
  const formatInvoiceId = (id) => `invoice_${id}`;

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    if (activeTab === "invoices") setActiveSubTab("all");
    else setActiveSubTab("all");
  };

  const handleDateChange = (key, field, value) => {
    setCustomDates((prev) => {
      const updatedDates = { ...prev, [key]: { ...prev[key], [field]: value } };
      setFilterValues((prevValues) => ({
        ...prevValues,
        [key]:
          updatedDates[key].start && updatedDates[key].end
            ? "custom"
            : prevValues[key],
      }));
      return updatedDates;
    });
  };

  const formatNumber = (value, isCurrency = false) => {
    if (value === null || value === undefined) return isCurrency ? "$0" : "0";
    const absValue = Math.abs(value);
    let formattedValue;
    let suffix = "";

    if (absValue >= 1_000_000_000) {
      formattedValue = (absValue / 1_000_000_000).toFixed(2);
      suffix = "b";
    } else if (absValue >= 1_000_000) {
      formattedValue = (absValue / 1_000_000).toFixed(2);
      suffix = "m";
    } else if (absValue >= 1_000) {
      formattedValue = (absValue / 1_000).toFixed(2);
      suffix = "k";
    } else {
      // Under 1,000: show the full figure (no abbreviation).
      formattedValue = absValue.toString();
    }

    if (suffix && formattedValue.endsWith(".00")) {
      formattedValue = formattedValue.slice(0, -3);
    }

    return isCurrency
      ? `$${formattedValue}${suffix}`
      : `${formattedValue}${suffix}`;
  };

  const getPaymentIcon = (name) => {
    const brand = (name || "").toLowerCase();
    if (brand === "amex" || brand === "american express") return <SiAmericanexpress size={20} />;
    if (brand === "mastercard") return <SiMastercard size={20} />;
    if (brand === "paypal") return <SiPaypal size={20} />;
    return <SiVisa size={20} />;
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);

        const params = {
          from: "all",
          to: "all",
          accessToken,
          refreshToken,
        };

        const fetchTenants = api2.GetTenantCount({ accessToken, refreshToken });
        const fetchBillingTotal = api.GetBillingTotalMetric(params);
        const fetchBillingDue = api.GetBillingDueMetric(params);

        const [tenantResponse, billingTotalResponse, billingDueResponse] =
          await Promise.all([
            fetchTenants.catch((err) => ({ error: err })),
            fetchBillingTotal.catch((err) => ({ error: err })),
            fetchBillingDue.catch((err) => ({ error: err })),
          ]);

        const tenantCount = tenantResponse.error ? 0 : tenantResponse.data || 0;

        const totalBilled = {
          all_time: formatNumber(
            billingTotalResponse.error
              ? 0
              : billingTotalResponse.data?.allTime?._sum?.total ?? 0,
            true
          ),
          this_week: formatNumber(
            billingTotalResponse.error
              ? 0
              : billingTotalResponse.data?.thisWeek?._sum?.total ?? 0,
            true
          ),
          this_month: formatNumber(
            billingTotalResponse.error
              ? 0
              : billingTotalResponse.data?.thisMonth?._sum?.total ?? 0,
            true
          ),
          this_year: formatNumber(
            billingTotalResponse.error
              ? 0
              : billingTotalResponse.data?.thisYear?._sum?.total ?? 0,
            true
          ),
          custom: "$0",
        };

        const invoicesDue = {
          all_time: formatNumber(
            billingDueResponse.error
              ? 0
              : billingDueResponse.data?.allTime?._sum?.total ?? 0
          ),
          this_week: formatNumber(
            billingDueResponse.error
              ? 0
              : billingDueResponse.data?.thisWeek?._sum?.total ?? 0
          ),
          this_month: formatNumber(
            billingDueResponse.error
              ? 0
              : billingDueResponse.data?.thisMonth?._sum?.total ?? 0
          ),
          this_year: formatNumber(
            billingDueResponse.error
              ? 0
              : billingDueResponse.data?.thisYear?._sum?.total ?? 0
          ),
          custom: "0",
        };

        setOverviewData({
          totalTenants: formatNumber(tenantCount),
          totalBilled,
          invoicesDue,
        });
      } catch (err) {
        if (import.meta.env.DEV) console.error("Error fetching metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const params =
          activeSubTab === "all"
            ? { status: "all", accessToken, refreshToken }
            : {
                status: statusMap[activeSubTab] || activeSubTab,
                accessToken,
                refreshToken,
              };

        const fetchInvoiceCounts = api.GetCountForInvoice({
          accessToken,
          refreshToken,
        });
        const fetchPaymentCounts = api.GetCountForPayment({
          accessToken,
          refreshToken,
        });

        const [
          invoicesResponse,
          paymentsResponse,
          invoiceCountsResponse,
          paymentCountsResponse,
        ] = await Promise.all([
          activeTab === "invoices"
            ? api.GetInvoiceByAllAndStatus(params).catch((err) => ({
                error: err,
                data: [],
              }))
            : Promise.resolve({ data: [] }),
          activeTab === "payments"
            ? api.GetPaymentByAllAndStatus(params).catch((err) => ({
                error: err,
                data: [],
              }))
            : Promise.resolve({ data: [] }),
          fetchInvoiceCounts.catch((err) => ({
            error: err,
            data: {
              All: { _count: { _all: 0 } },
              Paid: { _count: { _all: 0 } },
              Upcoming: { _count: { _all: 0 } },
              Due: { _count: { _all: 0 } },
              Overdue: { _count: { _all: 0 } },
            },
          })),
          fetchPaymentCounts.catch((err) => ({
            error: err,
            data: {
              All: { _count: { _all: 0 } },
              Successful: { _count: { _all: 0 } },
              InProgress: { _count: { _all: 0 } },
              Failed: { _count: { _all: 0 } },
            },
          })),
        ]);

        if (activeTab === "invoices") {
          const invoices = (invoicesResponse.data || []).map((inv) => ({
            invoice_id: inv.invoiceId,
            tenant: inv.tenant,
            date_created: formatDate(inv.createdAt),
            due_date: formatDate(inv.dueDate),
            status: inv.status,
            hasActions: true,
          }));
          setInvoiceData(invoices);
        }

        if (activeTab === "payments") {
          const payments = (paymentsResponse.data || []).map((pay) => ({
            payment_id: formatPaymentId(pay.id),
            invoice_id: formatInvoiceId(pay.invoiceId),
            tenant: pay.tenant?.companyName,
            date_paid: formatDate(pay.createdAt),
            amount: formatNumber(pay.amount, true),
            status: pay.status,
            hasActions: true,
          }));
          setPaymentData(payments);
        }

        setInvoiceCounts({
          All: invoiceCountsResponse.data?.All?._count?._all ?? 0,
          Paid: invoiceCountsResponse.data?.Paid?._count?._all ?? 0,
          Upcoming: invoiceCountsResponse.data?.Upcoming?._count?._all ?? 0,
          Due: invoiceCountsResponse.data?.Due?._count?._all ?? 0,
          Overdue: invoiceCountsResponse.data?.Overdue?._count?._all ?? 0,
        });

        setPaymentCounts({
          All: paymentCountsResponse.data?.All?._count?._all ?? 0,
          Successful: paymentCountsResponse.data?.Successful?._count?._all ?? 0,
          InProgress: paymentCountsResponse.data?.InProgress?._count?._all ?? 0,
          Failed: paymentCountsResponse.data?.Failed?._count?._all ?? 0,
        });

        if (
          invoicesResponse.error ||
          paymentsResponse.error ||
          invoiceCountsResponse.error ||
          paymentCountsResponse.error
        ) {
          throw new Error("Failed to fetch some data.");
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error(`Error fetching ${activeTab}:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, activeSubTab]);

  useEffect(() => {
    const fetchCustomMetrics = async () => {
      if (
        (filterValues.totalBilled === "custom" &&
          customDates.totalBilled.start &&
          customDates.totalBilled.end) ||
        (filterValues.invoicesDue === "custom" &&
          customDates.invoicesDue.start &&
          customDates.invoicesDue.end)
      ) {
        try {
          setLoading(true);
  
          const totalBilledPromise =
            filterValues.totalBilled === "custom" &&
            customDates.totalBilled.start &&
            customDates.totalBilled.end
              ? api.GetBillingTotalMetric({
                  from: customDates.totalBilled.start,
                  to: customDates.totalBilled.end,
                  accessToken,
                  refreshToken,
                })
              : Promise.resolve({ data: { _sum: { total: 0 } } });

          const invoicesDuePromise =
            filterValues.invoicesDue === "custom" &&
            customDates.invoicesDue.start &&
            customDates.invoicesDue.end
              ? api.GetBillingDueMetric({
                  from: customDates.invoicesDue.start,
                  to: customDates.invoicesDue.end,
                  accessToken,
                  refreshToken,
                })
              : Promise.resolve({ data: { _sum: { total: 0 } } });

          const [totalBilledResponse, invoicesDueResponse] = await Promise.all([
            totalBilledPromise.catch((err) => ({ error: err })),
            invoicesDuePromise.catch((err) => ({ error: err })),
          ]);

          const updatedOverviewData = { ...overviewData };

          if (filterValues.totalBilled === "custom") {
            updatedOverviewData.totalBilled.custom = formatNumber(
              totalBilledResponse.error
                ? 0
                : totalBilledResponse.data?._sum?.total ?? 0,
              true
            );
          }

          if (filterValues.invoicesDue === "custom") {
            updatedOverviewData.invoicesDue.custom = formatNumber(
              invoicesDueResponse.error
                ? 0
                : invoicesDueResponse.data?._sum?.total ?? 0
            );
          }

          setOverviewData(updatedOverviewData);
        } catch (err) {
          if (import.meta.env.DEV) console.error("Error fetching custom metrics:", err);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchCustomMetrics();
  }, [customDates, filterValues]);

  const closeInvoiceModal = () => {
    setShowInvoiceModal(false);
    setSelectedInvoice(null);
  };

  const handleViewInvoice = async (rowOrInvoiceId, invoiceId) => {
    try {
      const finalInvoiceId = invoiceId || extractIdNumber(rowOrInvoiceId?.invoice_id || rowOrInvoiceId);
      const response = await api.GetInvoiceById({
        id: finalInvoiceId,
        accessToken,
        refreshToken,
      });
      const invoiceData = response.data || {};

      const invoice = {
        companyName: "noosphere",
        companyAddress: invoiceData.companyAddress,
        invoiceId: invoiceData.invoiceId || finalInvoiceId,
        dueDate: formatDate(invoiceData.dueDate),
        billingFrequency: invoiceData.billingFrequency,
        customerInfo: invoiceData.customerInfo,
        items: buildInvoiceItems(invoiceData.items, invoiceData.billingFrequency),
        total: formatNumber(invoiceData.total || 0, true),
      };
      setSelectedInvoice(invoice);
      setShowInvoiceModal(true);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error fetching invoice:", err);
    }
  };

  const handleViewPayment = async (row) => {
    try {
      const paymentId = extractIdNumber(row.payment_id);
      const response = await api.GetPaymentById({
        id: paymentId,
        accessToken,
        refreshToken,
      });
      const paymentData = response.data || {};

      const payment = {
        Plan: paymentData.Plan || "N/A",
        Period:
          paymentData.Period && typeof paymentData.Period === "object"
            ? `${formatDate(paymentData.Period.start)} - ${formatDate(paymentData.Period.stop)}`
            : paymentData.Period || "N/A",
        "Payment ID": formatPaymentId(paymentId),
        "Payment Date": formatDate(paymentData.paymentDate),
        "Time of Payment": formatDate(paymentData.paymentTime),
        "Payment Amount": formatNumber(paymentData.amount, true),
        "Payment Method": {
          icon: getPaymentIcon(paymentData.paymentMethod?.name),
          number: paymentData.paymentMethod?.code || "N/A",
        },
        Invoice: {
          id: paymentData.invoice?.invoiceId?.replace(/^INV/, "") || "N/A",
          ...paymentData.invoice,
          link: "#",
        },
      };
      setSelectedPayment(payment);
      setShowPaymentView(true);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error fetching payment:", err);
    }
  };

  const handleDownloadInvoice = async (row) => {
    try {
      const invoiceId = extractIdNumber(row.invoice_id);
      const response = await api.GetInvoiceById({
        id: invoiceId,
        accessToken,
        refreshToken,
      });
      const invoiceData = response.data || {};

      const invoice = {
        companyName: "noosphere",
        companyAddress: invoiceData.companyAddress,
        invoiceId: invoiceData.invoiceId || invoiceId,
        dueDate: formatDate(invoiceData.dueDate),
        billingFrequency: invoiceData.billingFrequency,
        customerInfo: invoiceData.customerInfo,
        items: buildInvoiceItems(invoiceData.items, invoiceData.billingFrequency),
        total: formatNumber(invoiceData.total || 0, true),
      };

      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.width = "700px";
      document.body.appendChild(tempContainer);

      const root = createRoot(tempContainer);
      root.render(<SubscriptionInvoice {...invoice} />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(tempContainer, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice_${invoiceId}.pdf`);

      root.unmount();
      document.body.removeChild(tempContainer);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error generating PDF:", err);
      alert("Failed to download invoice. Please try again.");
    }
  };

  const tabs = [
    { key: "invoices", label: "Invoices" },
    { key: "payments", label: "Payments" },
  ];

  const invoiceSubTabs = [
    { key: "all", label: "All", count: invoiceCounts.All },
    { key: "paid", label: "Paid", count: invoiceCounts.Paid },
    { key: "upcoming", label: "Upcoming", count: invoiceCounts.Upcoming },
    { key: "due", label: "Due/Unpaid", count: invoiceCounts.Due },
    { key: "overdue", label: "Overdue", count: invoiceCounts.Overdue },
  ];

  const paymentSubTabs = [
    { key: "all", label: "All", count: paymentCounts.All },
    { key: "successful", label: "Successful", count: paymentCounts.Successful },
    {
      key: "in_progress",
      label: "Payment in Progress",
      count: paymentCounts.InProgress,
    },
    { key: "failed", label: "Failed", count: paymentCounts.Failed },
  ];

  const invoiceColumns = [
    { key: "invoice_id", header: "Invoice ID" },
    { key: "tenant", header: "Tenant" },
    { key: "date_created", header: "Date Created" },
    { key: "due_date", header: "Due Date" },
    ...(activeSubTab === "all"
      ? [{ key: "status", header: "Status", type: "status" }]
      : []),
  ];

  const paymentColumns = [
    { key: "payment_id", header: "Payment ID" },
    { key: "invoice_id", header: "Invoice ID" },
    { key: "tenant", header: "Tenant" },
    { key: "date_paid", header: "Date" },
    { key: "amount", header: "Amount" },
    ...(activeSubTab === "all"
      ? [{ key: "status", header: "Status", type: "status" }]
      : []),
  ];

  const invoiceFilters = [
    {
      key: "filter_type",
      value: "",
      options: [
        { value: "", label: "Select Filter" },
        { value: "date_created", label: "Date Created" },
        { value: "due_date", label: "Date Due" },
        { value: "status", label: "Status" },
        { value: "clear_filters", label: "Clear Filters" },
      ],
    },
  ];

  const paymentFilters = [
    {
      key: "filter_type",
      value: "",
      options: [
        { value: "", label: "Select Filter" },
        { value: "date_paid", label: "Date Paid" },
        { value: "status", label: "Status" },
        { value: "clear_filters", label: "Clear Filters" },
      ],
    },
  ];

  const invoiceActions = [
    { label: "View Invoice", onClick: handleViewInvoice },
    { label: "Download Invoice", onClick: handleDownloadInvoice },
  ];

  const paymentActions = [
    { label: "View Payment", onClick: handleViewPayment },
    { label: "Download Invoice", onClick: handleDownloadInvoice },
  ];

  const getFilteredData = () => {
    if (activeTab === "invoices") {
      return invoiceData;
    } else {
      return activeSubTab === "all"
        ? paymentData
        : paymentData.filter(
            (item) =>
              item.status.toLowerCase() ===
              (statusMap[activeSubTab] || activeSubTab).toLowerCase()
          );
    }
  };

  const handleBackFromPayment = () => {
    setShowPaymentView(false);
    setSelectedPayment(null);
  };

  return (
    <>
      {/* Invoice Modal */}
      {showInvoiceModal && selectedInvoice && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100000,
          }}
          onClick={closeInvoiceModal}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "8px",
              maxWidth: "900px",
              width: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
              position: "relative",
              padding: "20px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "none",
                border: "none",
                fontSize: "16px",
                cursor: "pointer",
              }}
              onClick={closeInvoiceModal}
            >
              ✕
            </button>
            <SubscriptionInvoice {...selectedInvoice} />
          </div>
        </div>
      )}

      {showPaymentView && selectedPayment ? (
        <div className="payment-view-container">
          <TenantListViewPayment
            title="Billing & Payments"
            breadcrumb={" Invoices & Payment / Payment Information"}
            paymentInfo={selectedPayment}
            onBack={handleBackFromPayment}
            onViewInvoice={handleViewInvoice}
            // NEW: Pass modal state and functions
            showInvoiceModal={showInvoiceModal}
            selectedInvoice={selectedInvoice}
            closeInvoiceModal={closeInvoiceModal}
          />
        </div>
      ) : (
        <>
          <div className="billing-board-header">
            <div className="billing-board-title">
              <h1>Billing & Payment</h1>
              <p>Manage all billing and payment related activities</p>
            </div>
          </div>
          <div>
            <h3 className="tenant-section-label">Overview</h3>
            <div className="overview-card-wrapper-invoice">
              <div className="overview-card-invoice">
                <div>
                  <label>Total Tenants</label>
                  <p>{overviewData.totalTenants}</p>
                </div>
              </div>
              <div className="overview-card-invoice">
                <div>
                  <label>Total Billed</label>
                  <p>{overviewData.totalBilled[filterValues.totalBilled]}</p>
                </div>
                <div className="overview-select-container">
                  <SelectInput
                    onChange={(e) =>
                      handleFilterChange("totalBilled", e.target.value)
                    }
                    options={[
                      { value: "all_time", label: "All time" },
                      { value: "this_week", label: "This week" },
                      { value: "this_month", label: "This month" },
                      { value: "this_year", label: "This year" },
                      { value: "custom", label: "Custom period" },
                    ]}
                    className="overview-select-input"
                  />
                  {filterValues.totalBilled === "custom" && (
                    <div className="date-range-picker date-range-picker-below">
                      <TextInput
                        label="From"
                        type="date"
                        value={customDates.totalBilled.start || ""}
                        onChange={(e) =>
                          handleDateChange(
                            "totalBilled",
                            "start",
                            e.target.value
                          )
                        }
                        className="date-filter-input-small"
                        placeholder="Start date"
                      />
                      <TextInput
                        label="To"
                        type="date"
                        value={customDates.totalBilled.end || ""}
                        onChange={(e) =>
                          handleDateChange("totalBilled", "end", e.target.value)
                        }
                        className="date-filter-input-small"
                        placeholder="End date"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="overview-card-invoice">
                <div>
                  <label>Invoices Due</label>
                  <p>{overviewData.invoicesDue[filterValues.invoicesDue]}</p>
                </div>
                <div className="overview-select-container">
                  <SelectInput
                    onChange={(e) =>
                      handleFilterChange("invoicesDue", e.target.value)
                    }
                    options={[
                      { value: "all_time", label: "All time" },
                      { value: "this_week", label: "This week" },
                      { value: "this_month", label: "This month" },
                      { value: "this_year", label: "This year" },
                      { value: "custom", label: "Custom period" },
                    ]}
                    className="overview-select-input"
                  />
                  {filterValues.invoicesDue === "custom" && (
                    <div className="date-range-picker date-range-picker-below">
                      <TextInput
                        type="date"
                        value={customDates.invoicesDue.start || ""}
                        onChange={(e) =>
                          handleDateChange(
                            "invoicesDue",
                            "start",
                            e.target.value
                          )
                        }
                        className="date-filter-input-small"
                        placeholder="Start date"
                      />
                      <TextInput
                        type="date"
                        value={customDates.invoicesDue.end || ""}
                        onChange={(e) =>
                          handleDateChange("invoicesDue", "end", e.target.value)
                        }
                        className="date-filter-input-small"
                        placeholder="End date"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <h3 className="tenant-section-label">INVOICES & PAYMENTS</h3>
            <div className="invoice-tabs-container">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`invoice-tab ${
                    activeTab === tab.key ? "active" : ""
                  }`}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setActiveSubTab("all");
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="sub-tabs-container">
              {activeTab === "invoices" &&
                invoiceSubTabs.map((subTab) => (
                  <button
                    key={subTab.key}
                    className={`sub-tab ${
                      activeSubTab === subTab.key ? "active" : ""
                    }`}
                    onClick={() => setActiveSubTab(subTab.key)}
                  >
                    {subTab.label}{" "}
                    <span className="candidate-count">{subTab.count}</span>
                  </button>
                ))}
              {activeTab === "payments" &&
                paymentSubTabs.map((subTab) => (
                  <button
                    key={subTab.key}
                    className={`sub-tab ${
                      activeSubTab === subTab.key ? "active" : ""
                    }`}
                    onClick={() => setActiveSubTab(subTab.key)}
                  >
                    {subTab.label}{" "}
                    <span className="candidate-count">{subTab.count}</span>
                  </button>
                ))}
            </div>
            <div className="invoice-table-container">
              <CustomTable
                data={getFilteredData()}
                columns={
                  activeTab === "invoices" ? invoiceColumns : paymentColumns
                }
                filters={
                  activeTab === "invoices" ? invoiceFilters : paymentFilters
                }
                onFilterChange={handleFilterChange}
                actions={
                  activeTab === "invoices" ? invoiceActions : paymentActions
                }
                showActions={true}
                itemsPerPage={10}
                tableName={activeTab === "invoices" ? "Invoices" : "Payments"}
                showCheckbox={false}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default BillingManager;
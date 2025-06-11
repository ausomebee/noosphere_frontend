import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import Layout from "../Layout/ControlLayout";
import CustomTable from "../../Components/Table/CustomTable";
import { SelectInput, TextInput } from "../../Components/Input/Inputs";
import api from "../../api/InvoiceApi";
import api2 from "../../api/TenantApis";
import { useSelector } from "react-redux";
import SubscriptionInvoice from "../../Components/Invoice/SubscriptionInvoice";
import TenantListViewPayment from "../../Pages/Tenant/TenantList/TenantListViewPayment";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const BillingManager = () => {
  const token = useSelector((state) => state.authentication?.user?.token);
  const accessToken = token;
  const refreshToken = token;

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
  const [error, setError] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentView, setShowPaymentView] = useState(false);
  const [invoiceData, setInvoiceData] = useState([]);

  const extractInvoiceIdNumber = (invoiceId) => {
    if (!invoiceId || typeof invoiceId !== "string") return invoiceId;
    return invoiceId.replace("invoice_", "");
  };

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
        [key]: updatedDates[key].start && updatedDates[key].end ? "custom" : prevValues[key],
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
    } else if (absValue >= 100) {
      formattedValue = absValue.toString();
      suffix = "h";
    } else {
      formattedValue = absValue.toString();
    }

    if (suffix !== "h" && formattedValue.endsWith(".00")) {
      formattedValue = formattedValue.slice(0, -3);
    }

    return isCurrency ? `$${formattedValue}${suffix}` : `${formattedValue}${suffix}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = {
          from: "all",
          to: "all",
          accessToken,
          refreshToken,
        };

        const fetchTenants = api2.GetTenantCount({ accessToken, refreshToken });
        const fetchBillingTotal = api.GetBillingTotalMetric(params);
        const fetchBillingDue = api.GetBillingDueMetric(params);

        const [tenantResponse, billingTotalResponse, billingDueResponse] = await Promise.all([
          fetchTenants.catch((err) => ({ error: err })),
          fetchBillingTotal.catch((err) => ({ error: err })),
          fetchBillingDue.catch((err) => ({ error: err })),
        ]);

        const tenantCount = tenantResponse.error ? 0 : tenantResponse.data || 0;

        const totalBilled = {
          all_time: formatNumber(
            billingTotalResponse.error ? 0 : billingTotalResponse.data?.allTime?._sum?.total ?? 0,
            true
          ),
          this_week: formatNumber(
            billingTotalResponse.error ? 0 : billingTotalResponse.data?.thisWeek?._sum?.total ?? 0,
            true
          ),
          this_month: formatNumber(
            billingTotalResponse.error ? 0 : billingTotalResponse.data?.thisMonth?._sum?.total ?? 0,
            true
          ),
          this_year: formatNumber(
            billingTotalResponse.error ? 0 : billingTotalResponse.data?.thisYear?._sum?.total ?? 0,
            true
          ),
          custom: "$0",
        };

        const invoicesDue = {
          all_time: formatNumber(
            billingDueResponse.error ? 0 : billingDueResponse.data?.allTime?._sum?.total ?? 0
          ),
          this_week: formatNumber(
            billingDueResponse.error ? 0 : billingDueResponse.data?.thisWeek?._sum?.total ?? 0
          ),
          this_month: formatNumber(
            billingDueResponse.error ? 0 : billingDueResponse.data?.thisMonth?._sum?.total ?? 0
          ),
          this_year: formatNumber(
            billingDueResponse.error ? 0 : billingDueResponse.data?.thisYear?._sum?.total ?? 0
          ),
          custom: "0",
        };

        setOverviewData({
          totalTenants: formatNumber(tenantCount),
          totalBilled,
          invoicesDue,
        });
      } catch (err) {
        console.error("Error fetching metrics:", err);
        setError("Failed to load metrics. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError(null);

        const params =
          activeSubTab === "all"
            ? { status: "all", accessToken, refreshToken }
            : {
                status: activeSubTab
                  .split("_")[0]
                  .toLowerCase()
                  .replace(/\b\w/g, (c) => c.toUpperCase()),
                accessToken,
                refreshToken,
              };
        const invoicesResponse = await api.GetInvoiceByAllAndStatus(params);
        const invoices = (invoicesResponse.data || []).map((inv) => ({
          invoice_id: `invoice_${inv.invoiceId}`, // Format for display
          tenant: inv.tenant,
          date_created: formatDate(inv.createdAt),
          due_date: formatDate(inv.dueDate),
          status: inv.status,
          hasActions: true,
        }));

        setInvoiceData(invoices);
      } catch (err) {
        console.error("Error fetching invoices:", err);
        setError("Failed to load invoices. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [activeSubTab]);

  useEffect(() => {
    const fetchCustomMetrics = async () => {
      if (
        (filterValues.totalBilled === "custom" && customDates.totalBilled.start && customDates.totalBilled.end) ||
        (filterValues.invoicesDue === "custom" && customDates.invoicesDue.start && customDates.invoicesDue.end)
      ) {
        try {
          setLoading(true);
          setError(null);

          const totalBilledPromise =
            filterValues.totalBilled === "custom" && customDates.totalBilled.start && customDates.totalBilled.end
              ? api.GetBillingTotalMetric({
                  from: customDates.totalBilled.start,
                  to: customDates.totalBilled.end,
                  accessToken,
                  refreshToken,
                })
              : Promise.resolve({ data: { _sum: { total: 0 } } });

          const invoicesDuePromise =
            filterValues.invoicesDue === "custom" && customDates.invoicesDue.start && customDates.invoicesDue.end
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
              totalBilledResponse.error ? 0 : totalBilledResponse.data?._sum?.total ?? 0,
              true
            );
          }

          if (filterValues.invoicesDue === "custom") {
            updatedOverviewData.invoicesDue.custom = formatNumber(
              invoicesDueResponse.error ? 0 : invoicesDueResponse.data?._sum?.total ?? 0
            );
          }

          setOverviewData(updatedOverviewData);
        } catch (err) {
          console.error("Error fetching custom metrics:", err);
          setError("Failed to load custom metrics.");
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

  const handleViewInvoice = async (rowOrInvoiceId) => {
    try {
      const invoiceId = typeof rowOrInvoiceId === "string"
        ? extractInvoiceIdNumber(rowOrInvoiceId)
        : extractInvoiceIdNumber(rowOrInvoiceId.invoice_id);
      const response = await api.GetInvoiceById({ id: invoiceId, accessToken, refreshToken });
      const invoiceData = response.data || {};

      const invoice = {
        companyName: "noosphere",
        companyAddress: invoiceData.companyAddress || {
          street: "931 10th street",
          suite: "Suite 776, Modesto",
          state: "CA 95354",
        },
        invoiceId: invoiceData.invoiceId || invoiceId,
        dueDate: formatDate(invoiceData.dueDate),
        billingFrequency: invoiceData.billingFrequency || "Monthly",
        customerInfo: invoiceData.customerInfo || {
          name: "Unknown Tenant",
          street: "24, Allison Street",
          city: "Dallas, Texas, US",
          zip: "655849",
        },
        items: (invoiceData.items || []).map((item) => ({
          id: item.id,
          description: item.description,
          rate: formatNumber(item.rate?.price || 0, true),
          quantity: item.quantity,
          price: formatNumber(item.price || 0, true),
        })),
        total: formatNumber(invoiceData.total || 0, true),
      };
      setSelectedInvoice(invoice);
      setShowInvoiceModal(true);
    } catch (err) {
      console.error("Error fetching invoice:", err);
      setError("Failed to load invoice details.");
    }
  };

  const handleViewPayment = (row) => {
    const payment = {
      Plan: "Basic Plan",
      Period: "N/A",
      "Payment ID": row.payment_id,
      "Payment Date": row.date_paid,
      "Time of Payment": "N/A",
      "Payment Amount": row.amount,
      "Payment Method": {
        icon: "/amex-icon.png",
        number: "XXXX-XXXX-XXXX-2345",
      },
      Invoice: {
        id: row.invoice_id,
        link: "#",
      },
    };
    setSelectedPayment(payment);
    setShowPaymentView(true);
  };

  const handleBackFromPayment = () => {
    setShowPaymentView(false);
    setSelectedPayment(null);
  };

  const handleDownloadInvoice = async (row) => {
    try {
      const invoiceId = extractInvoiceIdNumber(row.invoice_id);
      const response = await api.GetInvoiceById({ id: invoiceId, accessToken, refreshToken });
      const invoiceData = response.data || {};

      const invoice = {
        companyName: "noosphere",
        companyAddress: invoiceData.companyAddress || {
          street: "931 10th street",
          suite: "Suite 776, Modesto",
          state: "CA 95354",
        },
        invoiceId: invoiceData.invoiceId || invoiceId,
        dueDate: formatDate(invoiceData.dueDate),
        billingFrequency: invoiceData.billingFrequency || "Monthly",
        customerInfo: invoiceData.customerInfo || {
          name: row.tenant,
          street: "24, Allison Street",
          city: "Dallas, Texas, US",
          zip: "655849",
        },
        items: (invoiceData.items || []).map((item) => ({
          id: item.id,
          description: item.description,
          rate: formatNumber(item.rate?.price || 0, true),
          quantity: item.quantity,
          price: formatNumber(item.price || 0, true),
        })),
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
      console.error("Error generating PDF:", err);
      alert("Failed to download invoice. Please try again.");
    }
  };

  const tabs = [
    { key: "invoices", label: "Invoices" },
    { key: "payments", label: "Payments" },
  ];

  const invoiceSubTabs = [
    { key: "all", label: "All", count: invoiceData.length },
    {
      key: "paid",
      label: "Paid",
      count: invoiceData.filter((item) => item.status.toLowerCase() === "paid").length,
    },
    {
      key: "upcoming",
      label: "Upcoming",
      count: invoiceData.filter((item) => item.status.toLowerCase() === "upcoming").length,
    },
    {
      key: "due_unpaid",
      label: "Due/Unpaid",
      count: invoiceData.filter((item) => item.status.toLowerCase() === "due/unpaid").length,
    },
    {
      key: "overdue",
      label: "Overdue",
      count: invoiceData.filter((item) => item.status.toLowerCase() === "overdue").length,
    },
  ];

  const paymentSubTabs = [
    { key: "all", label: "All", count: 123 },
    { key: "successful", label: "Successful", count: 94 },
    { key: "in_progress", label: "Payment in Progress", count: 12 },
    { key: "failed", label: "Failed", count: 10 },
  ];

  const paymentDataAll = [
    {
      payment_id: "PAY001",
      invoice_id: "invoice_0ca31f2f-3bdb-4742-a7d1-5885e94e839e",
      tenant: "ACME Corporation Ltd",
      date_paid: "12/10/2024",
      amount: "$5,000",
      status: "Successful",
      hasActions: true,
    },
    {
      payment_id: "PAY002",
      invoice_id: "invoice_0ca31f2f-3bdb-4742-a7d1-5885e94e839e",
      tenant: "ACME Corporation Ltd",
      date_paid: "12/10/2024",
      amount: "$5,000",
      status: "Failed",
      hasActions: true,
    },
    {
      payment_id: "PAY003",
      invoice_id: "invoice_0ca31f2f-3bdb-4742-a7d1-5885e94e839e",
      tenant: "ACME Corporation Ltd",
      date_paid: "12/10/2024",
      amount: "$5,000",
      status: "In-Progress",
      hasActions: true,
    },
  ];

  const paymentDataOther = [
    {
      payment_id: "PAY001",
      invoice_id: "invoice_0ca31f2f-3bdb-4742-a7d1-5885e94e839e",
      tenant: "ACME Corporation Ltd",
      date_paid: "12/10/2024",
      amount: "$5,000",
      hasActions: true,
    },
    {
      payment_id: "PAY002",
      invoice_id: "invoice_0ca31f2f-3bdb-4742-a7d1-5885e94e839e",
      tenant: "ACME Corporation Ltd",
      date_paid: "12/10/2024",
      amount: "$5,000",
      hasActions: true,
    },
    {
      payment_id: "PAY003",
      invoice_id: "invoice_0ca31f2f-3bdb-4742-a7d1-5885e94e839e",
      tenant: "ACME Corporation Ltd",
      date_paid: "12/10/2024",
      amount: "$5,000",
      hasActions: true,
    },
  ];

  const invoiceColumns = [
    { key: "invoice_id", header: "Invoice ID" },
    { key: "tenant", header: "Tenant" },
    { key: "date_created", header: "Date Created" },
    { key: "due_date", header: "Due Date" },
    ...(activeSubTab === "all" ? [{ key: "status", header: "Status", type: "status" }] : []),
  ];

  const paymentColumns = [
    { key: "payment_id", header: "Payment ID" },
    { key: "invoice_id", header: "Invoice ID" },
    { key: "tenant", header: "Tenant" },
    { key: "date_paid", header: "Date" },
    { key: "amount", header: "Amount" },
    ...(activeSubTab === "all" ? [{ key: "status", header: "Status", type: "status" }] : []),
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
      if (activeSubTab === "all") return paymentDataAll;
      return paymentDataOther.filter(() => true);
    }
  };

  return (
    <Layout>
      {showPaymentView && selectedPayment ? (
        <div className="payment-view-container">
          <TenantListViewPayment
            title="Payment Details"
            breadcrumb={`Tenants / ${selectedPayment.Invoice.id} / Billing & Payments / Payment Info`}
            paymentInfo={selectedPayment}
            onBack={handleBackFromPayment}
            onViewInvoice={handleViewInvoice}
          />
        </div>
      ) : (
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
                zIndex: 1000,
              }}
              onClick={closeInvoiceModal}
            >
              <div
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "8px",
                  maxWidth: "700px",
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
                    onChange={(e) => handleFilterChange("totalBilled", e.target.value)}
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
                        type="date"
                        value={customDates.totalBilled.start || ""}
                        onChange={(e) => handleDateChange("totalBilled", "start", e.target.value)}
                        className="date-filter-input-small"
                        placeholder="Start date"
                      />
                      <TextInput
                        type="date"
                        value={customDates.totalBilled.end || ""}
                        onChange={(e) => handleDateChange("totalBilled", "end", e.target.value)}
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
                    onChange={(e) => handleFilterChange("invoicesDue", e.target.value)}
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
                        onChange={(e) => handleDateChange("invoicesDue", "start", e.target.value)}
                        className="date-filter-input-small"
                        placeholder="Start date"
                      />
                      <TextInput
                        type="date"
                        value={customDates.invoicesDue.end || ""}
                        onChange={(e) => handleDateChange("invoicesDue", "end", e.target.value)}
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
                  className={`invoice-tab ${activeTab === tab.key ? "active" : ""}`}
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
                    className={`sub-tab ${activeSubTab === subTab.key ? "active" : ""}`}
                    onClick={() => setActiveSubTab(subTab.key)}
                  >
                    {subTab.label} <span className="candidate-count">{subTab.count}</span>
                  </button>
                ))}
              {activeTab === "payments" &&
                paymentSubTabs.map((subTab) => (
                  <button
                    key={subTab.key}
                    className={`sub-tab ${activeSubTab === subTab.key ? "active" : ""}`}
                    onClick={() => setActiveSubTab(subTab.key)}
                  >
                    {subTab.label} <span className="candidate-count">{subTab.count}</span>
                  </button>
                ))}
            </div>
            <div className="invoice-table-container">
              <CustomTable
                data={getFilteredData()}
                columns={activeTab === "invoices" ? invoiceColumns : paymentColumns}
                filters={activeTab === "invoices" ? invoiceFilters : paymentFilters}
                onFilterChange={handleFilterChange}
                actions={activeTab === "invoices" ? invoiceActions : paymentActions}
                showActions={true}
                itemsPerPage={10}
                tableName={activeTab === "invoices" ? "Invoices" : "Payments"}
                showCheckbox={false}
              />
            </div>
          </div>
        </>
      )}
    </Layout>
  );
};

export default BillingManager;
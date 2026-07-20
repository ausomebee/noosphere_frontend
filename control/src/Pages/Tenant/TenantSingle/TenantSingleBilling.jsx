import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { parse, isWithinInterval, isSameDay, isValid } from "date-fns";
import "./TenantSingle.css";
import Button from "../../../Components/Button/Button";
import { FiArrowUpRight, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { SiAmericanexpress, SiMastercard, SiPaypal, SiVisa } from "react-icons/si";
import CustomTable from "../../../Components/Table/CustomTable";
import TableFilterModal from "../../../Components/ReusableModal/TableFilterModal";
import TableFilterDateModal from "../../../Components/ReusableModal/TableFilterDateModal";
import tenantApi from "../../../api/TenantApis";
import invoiceApi from "../../../api/InvoiceApi";
import useAuth from "../../../hooks/useAuth";
import usePermission from "../../../hooks/usePermission";
import { showToast, showApiError } from "../../../Helper/ShowToast";
import { formatDateShortMonth as formatDateDisplay, formatDateMonthYear } from "../../../Helper/Formatters";
import { SectionSpinner } from "../../../Components/LoadingSpinner";
import SubscriptionInvoice from "../../../Components/Invoice/SubscriptionInvoice";
import TenantListViewPayment from "../../../Pages/Tenant/TenantList/TenantListViewPayment";
import GeneratePaymentLinkModal from "../../../Components/ReusableModal/GeneratePaymentLinkModal";
import { createRoot } from "react-dom/client";

// MM/dd/yyyy format required by CustomTable's date range filter parser
const toFilterDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return "—";
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}/${day}/${d.getFullYear()}`;
};

const formatCurrency = (value) => {
  if (value == null) return "$0";
  return `$${Number(value).toLocaleString()}`;
};

const CardBrandIcon = ({ brand }) => {
  const size = 36;
  const b = (brand || "").toLowerCase();
  if (b === "amex" || b === "american express") return <SiAmericanexpress size={size} color="#fff" />;
  if (b === "mastercard")                       return <SiMastercard size={size} color="#fff" />;
  if (b === "paypal")                           return <SiPaypal size={size} color="#fff" />;
  return <SiVisa size={size} color="#fff" />;
};

const INVOICE_SUB_TABS = [
  { name: "All",      label: "All" },
  { name: "Paid",     label: "Paid" },
  { name: "Upcoming", label: "Upcoming" },
  { name: "Due",      label: "Due/Unpaid" },
  { name: "Overdue",  label: "Overdue" },
];

const PAYMENT_SUB_TABS = [
  { name: "All",        label: "All" },
  { name: "Successful", label: "Successful" },
  { name: "Failed",     label: "Failed" },
  { name: "InProgress", label: "In Progress" },
];

const INVOICE_FILTERS = [
  {
    key: "filter_type",
    options: [
      { value: "",                    label: "Select Filter" },
      { value: "status",              label: "Status" },
      { value: "inv_date_created",    label: "Date Created" },
      { value: "inv_due_date",        label: "Due Date" },
      { value: "clear_filters",       label: "Clear Filters" },
    ],
  },
];

const PAYMENT_FILTERS = [
  {
    key: "filter_type",
    options: [
      { value: "",              label: "Select Filter" },
      { value: "status",        label: "Status" },
      { value: "method",        label: "Method" },
      { value: "clear_filters", label: "Clear Filters" },
    ],
  },
];

const TenantSingleBilling = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermission();

  const [loading, setLoading]                 = useState(true);
  const [tenant, setTenant]                   = useState(null);
  const [paymentMethods, setPaymentMethods]   = useState([]);
  // allInvoices/allPayments hold the full list (for counts)
  const [allInvoices, setAllInvoices] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  // displayed holds the currently active tab's data
  const [displayInvoices, setDisplayInvoices] = useState([]);
  const [displayPayments, setDisplayPayments] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);

  const [mainTab, setMainTab]                   = useState("invoices");
  const [activeInvoiceTab, setActiveInvoiceTab] = useState("All");
  const [activePaymentTab, setActivePaymentTab] = useState("All");

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice]   = useState(null);
  const [invoiceLoading, setInvoiceLoading]     = useState(false);
  const [isPaymentLinkModalOpen, setIsPaymentLinkModalOpen] = useState(false);
  const [showPaymentView, setShowPaymentView] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const carouselRef = useRef(null);
  const scrollCarousel = (dir) => {
    if (carouselRef.current) carouselRef.current.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  // Filter modal state
  const [openFilterModal, setOpenFilterModal] = useState(null); // e.g. "inv-status", "inv-date_created", "pay-status"
  const [invoiceFilters, setInvoiceFilters] = useState({ status: "", dateCreated: null, dueDate: null });
  const [paymentFilters, setPaymentFilters] = useState({ status: "", method: "" });

  const extractList = (raw) => raw?.data?.data || raw?.data || (Array.isArray(raw) ? raw : []);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [tenantRes, invoicesRes, paymentsRes, paymentMethodsRes] = await Promise.allSettled([
        tenantApi.GetSingleTenant({ tenantId, accessToken, refreshToken }),
        tenantApi.GetTenantInvoices({ accessToken, refreshToken, tenantId }),
        tenantApi.GetTenantPayments({ accessToken, refreshToken, tenantId }),
        tenantApi.GetTenantPaymentMethods({ accessToken, refreshToken, tenantId }),
      ]);
      if (tenantRes.status === "fulfilled") {
        const d = tenantRes.value?.data || tenantRes.value;
        setTenant(d || null);
      }
      if (invoicesRes.status === "fulfilled") {
        const list = extractList(invoicesRes.value);
        setAllInvoices(list);
        setDisplayInvoices(list);
      }
      if (paymentsRes.status === "fulfilled") {
        const list = extractList(paymentsRes.value);
        setAllPayments(list);
        setDisplayPayments(list);
      }
      if (paymentMethodsRes.status === "fulfilled") {
        const list = extractList(paymentMethodsRes.value);
        setPaymentMethods(list);
      }
    } catch (err) {
      showApiError(err, "LOAD_BILLING_DATA");
    } finally {
      setLoading(false);
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleInvoiceTabChange = useCallback(async (tab) => {
    setActiveInvoiceTab(tab);
    if (tab === "All") { setDisplayInvoices(allInvoices); return; }
    setDisplayInvoices([]);
    try {
      setTabLoading(true);
      const res = await tenantApi.GetTenantInvoicesByStatus({ accessToken, refreshToken, tenantId, status: tab });
      setDisplayInvoices(extractList(res));
    } catch {
      setDisplayInvoices([]);
    } finally {
      setTabLoading(false);
    }
  }, [tenantId, allInvoices]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePaymentTabChange = useCallback(async (tab) => {
    setActivePaymentTab(tab);
    if (tab === "All") { setDisplayPayments(allPayments); return; }
    setDisplayPayments([]);
    try {
      setTabLoading(true);
      const res = await tenantApi.GetTenantPaymentsByStatus({ accessToken, refreshToken, tenantId, status: tab });
      setDisplayPayments(extractList(res));
    } catch {
      setDisplayPayments([]);
    } finally {
      setTabLoading(false);
    }
  }, [tenantId, allPayments]); // eslint-disable-line react-hooks/exhaustive-deps

  // Plan info derived from tenant
  const subscription     = tenant?.Subscription?.[0] || null;
  const plan             = subscription?.plan || null;
  const planTypeBadge    = plan?.planType ? plan.planType.charAt(0).toUpperCase() + plan.planType.slice(1).toLowerCase() : "—";
  const clientSeatsUsed  = tenant?._count?.clientLinks ?? 0;
  const clientSeatsTotal = plan?.forClient ?? 0;
  const seatsPercent     = clientSeatsTotal > 0 ? Math.min((clientSeatsUsed / clientSeatsTotal) * 100, 100) : 0;
  const nextPaymentDate  = formatDateDisplay(subscription?.endDate);
  const hasInvoice       = !!tenant?.Invoice?.[0]?.id;

  const mapInvoice = (inv) => ({
    id:           inv.id || inv.invoiceId,
    document:     inv.invoiceNumber || inv.invoiceId || inv.id || "—",
    date_created: toFilterDate(inv.createdAt || inv.dateCreated || inv.issueDate),
    due_date:     toFilterDate(inv.dueDate || inv.due_date),
    amount:       (inv.total ?? inv.amount) != null ? `$${Number(inv.total ?? inv.amount).toFixed(2)}` : "—",
    status:       inv.status || "—",
    hasCheckbox:  true,
    hasActions:   true,
  });

  const mapPayment = (pay) => ({
    id:        pay.id || pay.paymentId,
    invoiceId: pay.invoice?.id || pay.invoiceId || null,
    reference: pay.transactionRef || pay.transactionId || pay.reference || pay.id || "—",
    amount:    pay.amount != null ? `$${Number(pay.amount).toFixed(2)}` : "—",
    method:    pay.gateway || pay.method || pay.paymentMethod || "—",
    date:      toFilterDate(pay.paymentDate || pay.createdAt || pay.paidAt),
    status:    pay.status || "—",
    hasCheckbox: true,
    hasActions:  true,
  });

  // Table data — from active display list
  const invoiceData = useMemo(() => (Array.isArray(displayInvoices) ? displayInvoices : []).map(mapInvoice), [displayInvoices]);
  const paymentData = useMemo(() => (Array.isArray(displayPayments) ? displayPayments : []).map(mapPayment), [displayPayments]);

  // Counts from full "All" data for tab badges
  const invoiceCounts = useMemo(() => {
    const counts = { All: allInvoices.length };
    allInvoices.forEach((inv) => {
      const s = inv.status || "";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [allInvoices]);

  const paymentCounts = useMemo(() => {
    const counts = { All: allPayments.length };
    allPayments.forEach((pay) => {
      const s = pay.status || "";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [allPayments]);

  // Unique status/method options derived from full data (for filter modals)
  const invoiceStatusOpts = useMemo(() => [
    { value: "", label: "All Statuses" },
    ...[...new Set(allInvoices.map((inv) => inv.status).filter(Boolean))].map((s) => ({ value: s, label: s })),
  ], [allInvoices]);

  const paymentStatusOpts = useMemo(() => [
    { value: "", label: "All Statuses" },
    ...[...new Set(allPayments.map((pay) => pay.status).filter(Boolean))].map((s) => ({ value: s, label: s })),
  ], [allPayments]);

  const paymentMethodOpts = useMemo(() => [
    { value: "", label: "All Methods" },
    ...[...new Set(allPayments.map((pay) => pay.method || pay.paymentMethod).filter(Boolean))].map((m) => ({ value: m, label: m })),
  ], [allPayments]);

  // Apply external filters to current tab data
  const parseDate = (str) => str && str !== "—" ? parse(str, "MM/dd/yyyy", new Date()) : null;

  const filteredInvoiceData = useMemo(() => invoiceData.filter((row) => {
    if (invoiceFilters.status && row.status !== invoiceFilters.status) return false;
    if (invoiceFilters.dateCreated) {
      const d = parseDate(row.date_created);
      if (!isValid(d)) return false;
      const { start, end } = invoiceFilters.dateCreated;
      if (start && end && !isSameDay(start, end)) {
        if (!isWithinInterval(d, { start, end })) return false;
      } else if (start && !isSameDay(d, start)) return false;
    }
    if (invoiceFilters.dueDate) {
      const d = parseDate(row.due_date);
      if (!isValid(d)) return false;
      const { start, end } = invoiceFilters.dueDate;
      if (start && end && !isSameDay(start, end)) {
        if (!isWithinInterval(d, { start, end })) return false;
      } else if (start && !isSameDay(d, start)) return false;
    }
    return true;
  }), [invoiceData, invoiceFilters]);

  const filteredPaymentData = useMemo(() => paymentData.filter((row) => {
    if (paymentFilters.status && row.status !== paymentFilters.status) return false;
    if (paymentFilters.method && row.method !== paymentFilters.method) return false;
    return true;
  }), [paymentData, paymentFilters]);

  const buildInvoiceItems = (items, billingFrequency) => {
    const rows = [];
    let n = 1;
    (items || []).forEach((item) => {
      rows.push({ id: `${n++}`, description: item.description, rate: formatCurrency(item.rate?.price || 0), quantity: item.quantity, price: formatCurrency(item.price || 0) });
      (item.extraFeaturesWithPrice || []).forEach((feature) => {
        const isYearly = billingFrequency?.toLowerCase() === "yearly";
        const fp = isYearly ? feature.pricePerYear?.price || 0 : feature.pricePerMonth?.price || 0;
        rows.push({ id: `${n++}`, description: "Add-on Feature", rate: formatCurrency(fp), quantity: item.quantity || 1, price: formatCurrency(fp * (item.quantity || 1)) });
      });
    });
    return rows;
  };

  const handleViewInvoice = async (invoiceId) => {
    const id = invoiceId || tenant?.Invoice?.[0]?.id;
    if (!id) { showToast("No invoice available", "error"); return; }
    try {
      setInvoiceLoading(true);
      const response = await invoiceApi.GetInvoiceById({ id, accessToken, refreshToken });
      const data = response.data || {};
      setSelectedInvoice({
        companyName:      "noosphere",
        companyAddress:   data.companyAddress,
        invoiceId:        data.invoiceId || id,
        dueDate:          formatDateDisplay(data.dueDate),
        billingFrequency: data.billingFrequency,
        customerInfo:     data.customerInfo,
        items:            buildInvoiceItems(data.items, data.billingFrequency),
        total:            formatCurrency(data.total || 0),
      });
      setShowInvoiceModal(true);
    } catch (err) {
      showApiError(err, "LOAD_INVOICE");
    } finally {
      setInvoiceLoading(false);
    }
  };

  const getPaymentIcon = (name) => {
    const brand = (name || "").toLowerCase();
    if (brand === "amex" || brand === "american express") return <SiAmericanexpress size={20} />;
    if (brand === "mastercard") return <SiMastercard size={20} />;
    if (brand === "paypal") return <SiPaypal size={20} />;
    return <SiVisa size={20} />;
  };

  const handleViewPayment = async (row) => {
    try {
      const paymentId = row.id;
      const response = await invoiceApi.GetPaymentById({ id: paymentId, accessToken, refreshToken });
      const paymentData = response.data || {};

      const payment = {
        Plan: paymentData.Plan || "N/A",
        Period:
          paymentData.Period && typeof paymentData.Period === "object"
            ? `${formatDateDisplay(paymentData.Period.start)} - ${formatDateDisplay(paymentData.Period.stop)}`
            : paymentData.Period || "N/A",
        "Payment ID": `PAY00${paymentId}`,
        "Payment Date": formatDateDisplay(paymentData.paymentDate),
        "Time of Payment": formatDateDisplay(paymentData.paymentTime),
        "Payment Amount": paymentData.amount != null ? `$${Number(paymentData.amount).toLocaleString()}` : "N/A",
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
      showApiError(err, "LOAD_PAYMENT_DETAILS");
    }
  };

  const handleDownloadInvoice = async (row) => {
    try {
      const invoiceId = row.id;
      const response = await invoiceApi.GetInvoiceById({ id: invoiceId, accessToken, refreshToken });
      const data = response.data || {};

      const invoice = {
        companyName: "noosphere",
        companyAddress: data.companyAddress,
        invoiceId: data.invoiceId || invoiceId,
        dueDate: formatDateDisplay(data.dueDate),
        billingFrequency: data.billingFrequency,
        customerInfo: data.customerInfo,
        items: buildInvoiceItems(data.items, data.billingFrequency),
        total: formatCurrency(data.total || 0),
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

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice_${invoiceId}.pdf`);

      root.unmount();
      document.body.removeChild(tempContainer);
    } catch (err) {
      showApiError(err, "DOWNLOAD_INVOICE");
    }
  };

  const handleDownloadPaymentInvoice = async (row) => {
    try {
      let invoiceId = row.invoiceId;
      if (!invoiceId) {
        const res = await invoiceApi.GetPaymentById({ id: row.id, accessToken, refreshToken });
        invoiceId = res.data?.invoice?.id || res.data?.invoiceId;
      }
      if (!invoiceId) {
        showToast("No invoice found for this payment", "error");
        return;
      }
      await handleDownloadInvoice({ id: invoiceId });
    } catch (err) {
      showApiError(err, "LOAD_PAYMENT_INVOICE");
    }
  };

  const invoiceColumns = [
    { key: "document",     header: "NAME" },
    { key: "date_created", header: "DATE CREATED" },
    { key: "due_date",     header: "DUE DATE" },
    { key: "status",       header: "STATUS", type: "status" },
  ];

  const paymentColumns = [
    { key: "reference", header: "REFERENCE" },
    { key: "amount",    header: "AMOUNT" },
    { key: "method",    header: "METHOD" },
    { key: "date",      header: "DATE" },
    { key: "status",    header: "STATUS", type: "status" },
  ];

  const invoiceActions = [
    { label: "View Invoice",     onClick: (row) => handleViewInvoice(row.id) },
    { label: "Download Invoice", onClick: handleDownloadInvoice },
  ];

  const paymentActions = [
    { label: "View Payment", onClick: handleViewPayment },
    { label: "Download Invoice", onClick: handleDownloadPaymentInvoice },
  ];

  if (loading) {
    return (
      <div className="tenant-list-container">
        <SectionSpinner />
      </div>
    );
  }

  return (
    <div className="tenant-list-container">
      {/* Plan Info */}
      <h3 className="tenant-header-gen">PLAN INFO</h3>
      <div className="plan-info-billing">
        <div className="plan-info-col">
          <span className="plan-badge-billing">{planTypeBadge}</span>
          <p className="plan-name-billing">Plan</p>
          {hasPermission("generate_payment_link") && (
            <Button
              label="Change plan"
              iconPosition="right"
              icon={<FiArrowUpRight size={18} />}
              width="auto"
              onClick={() => setIsPaymentLinkModalOpen(true)}
            />
          )}
        </div>
        <div className="plan-info-col">
          <label className="plan-info-col-label">USAGE</label>
          <p className="plan-info-col-sub">Client seats</p>
          <div className="usage-bar">
            <div className="usage-filled" style={{ width: `${seatsPercent}%` }} />
          </div>
          <p className="plan-info-col-usage">{clientSeatsUsed} out of {clientSeatsTotal} used</p>
        </div>
        <div className="plan-info-col">
          <label className="plan-info-col-label">NEXT PAYMENT</label>
          <p className="plan-info-col-date">{nextPaymentDate}</p>
          <Button
            label="View invoice"
            iconPosition="right"
            icon={<FiArrowUpRight size={16} />}
            variant="outline"
            width="auto"
            onClick={() => handleViewInvoice(null)}
            loading={invoiceLoading}
            disabled={!hasInvoice}
          />
        </div>
      </div>

      {/* Payment Methods */}
      <h3 className="tenant-header-gen">PAYMENT METHODS</h3>
      <div className="payment-methods-carousel-wrapper">
        {paymentMethods.length > 1 && (
          <button className="carousel-arrow carousel-arrow-left" onClick={() => scrollCarousel(-1)}>
            <FiChevronLeft size={20} />
          </button>
        )}
        <div className="payment-methods-list" ref={carouselRef}>
          {paymentMethods.length === 0 ? (
            <p className="no-data-text">No payment methods on file.</p>
          ) : (
            paymentMethods.map((card) => (
              <div key={card.id} className="payment-method-card">
                <div className="payment-card-top">
                  <div className="payment-card-chip">
                    <div className="chip-line" />
                    <div className="chip-line" />
                    <div className="chip-line" />
                  </div>
                  <CardBrandIcon brand={card.cardType} />
                </div>
                <div className="payment-card-number-row">
                  <span className="payment-card-label">CARD NUMBER</span>
                  <span className="payment-card-number">•••• •••• •••• {card.lastFourDigits}</span>
                </div>
                <div className="payment-card-bottom">
                  <div className="payment-card-info">
                    <span className="payment-card-label">CARD HOLDER</span>
                    <span className="payment-card-value">{card.holderName}</span>
                  </div>
                  <div className="payment-card-info">
                    <span className="payment-card-label">ADDED</span>
                    <span className="payment-card-value">
                      {card.createdAt ? formatDateMonthYear(card.createdAt) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {paymentMethods.length > 1 && (
          <button className="carousel-arrow carousel-arrow-right" onClick={() => scrollCarousel(1)}>
            <FiChevronRight size={20} />
          </button>
        )}
      </div>

      {/* Invoices & Payments */}
      <h3 className="tenant-header-gen">INVOICES &amp; PAYMENTS</h3>
      <div className="invoices-tabs-container">
        <div className="billing-main-tabs">
          <button
            className={`billing-main-tab ${mainTab === "invoices" ? "active" : ""}`}
            onClick={() => setMainTab("invoices")}
          >
            Invoices
          </button>
          <button
            className={`billing-main-tab ${mainTab === "payments" ? "active" : ""}`}
            onClick={() => setMainTab("payments")}
          >
            Payments
          </button>
        </div>

        {mainTab === "invoices" ? (
          <>
            <div className="tenants-tabs">
              {INVOICE_SUB_TABS.map((tab) => {
                const count = tab.name === "All" ? invoiceCounts.All : invoiceCounts[tab.name];
                return (
                  <button
                    key={tab.name}
                    className={`tenants-tab ${activeInvoiceTab === tab.name ? "active" : ""}`}
                    onClick={() => handleInvoiceTabChange(tab.name)}
                  >
                    <span>{tab.label}</span>
                    {count > 0 && <span className="tab-count">{count}</span>}
                  </button>
                );
              })}
            </div>
            {tabLoading ? <SectionSpinner /> : (
              <CustomTable
                data={filteredInvoiceData}
                columns={invoiceColumns}
                filters={INVOICE_FILTERS}
                onFilterTypeSelect={(type) => {
                  if (type === "clear_filters") {
                    setInvoiceFilters({ status: "", dateCreated: null, dueDate: null });
                  } else if (type === "inv_date_created") {
                    setOpenFilterModal("inv-date_created");
                  } else if (type === "inv_due_date") {
                    setOpenFilterModal("inv-due_date");
                  } else {
                    setOpenFilterModal(`inv-${type}`);
                  }
                }}
                actions={invoiceActions}
                showActions={true}
                showCheckbox={false}
                itemsPerPage={10}
                tableName="Invoices"
              />
            )}
          </>
        ) : (
          <>
            <div className="tenants-tabs">
              {PAYMENT_SUB_TABS.map((tab) => {
                const count = tab.name === "All" ? paymentCounts.All : paymentCounts[tab.name];
                return (
                  <button
                    key={tab.name}
                    className={`tenants-tab ${activePaymentTab === tab.name ? "active" : ""}`}
                    onClick={() => handlePaymentTabChange(tab.name)}
                  >
                    <span>{tab.label}</span>
                    {count > 0 && <span className="tab-count">{count}</span>}
                  </button>
                );
              })}
            </div>
            {tabLoading ? <SectionSpinner /> : (
              <CustomTable
                data={filteredPaymentData}
                columns={paymentColumns}
                filters={PAYMENT_FILTERS}
                onFilterTypeSelect={(type) => {
                  if (type === "clear_filters") {
                    setPaymentFilters({ status: "", method: "" });
                  } else {
                    setOpenFilterModal(`pay-${type}`);
                  }
                }}
                actions={paymentActions}
                showActions={true}
                showCheckbox={false}
                itemsPerPage={10}
                tableName="Payments"
              />
            )}
          </>
        )}

        {/* Invoice filter modals */}
        <TableFilterModal
          isOpen={openFilterModal === "inv-status"}
          onClose={() => setOpenFilterModal(null)}
          title="Filter by Status"
          label="Select status"
          options={invoiceStatusOpts}
          onApply={(val) => { setInvoiceFilters((p) => ({ ...p, status: val })); setOpenFilterModal(null); }}
        />
        <TableFilterDateModal
          isOpen={openFilterModal === "inv-date_created"}
          onClose={() => setOpenFilterModal(null)}
          title="Filter by Date Created"
          onApply={(range) => { setInvoiceFilters((p) => ({ ...p, dateCreated: range })); setOpenFilterModal(null); }}
        />
        <TableFilterDateModal
          isOpen={openFilterModal === "inv-due_date"}
          onClose={() => setOpenFilterModal(null)}
          title="Filter by Due Date"
          onApply={(range) => { setInvoiceFilters((p) => ({ ...p, dueDate: range })); setOpenFilterModal(null); }}
        />

        {/* Payment filter modals */}
        <TableFilterModal
          isOpen={openFilterModal === "pay-status"}
          onClose={() => setOpenFilterModal(null)}
          title="Filter by Status"
          label="Select status"
          options={paymentStatusOpts}
          onApply={(val) => { setPaymentFilters((p) => ({ ...p, status: val })); setOpenFilterModal(null); }}
        />
        <TableFilterModal
          isOpen={openFilterModal === "pay-method"}
          onClose={() => setOpenFilterModal(null)}
          title="Filter by Method"
          label="Select method"
          options={paymentMethodOpts}
          onApply={(val) => { setPaymentFilters((p) => ({ ...p, method: val })); setOpenFilterModal(null); }}
        />
      </div>

      {showInvoiceModal && selectedInvoice && (
        <div
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100000 }}
          onClick={() => setShowInvoiceModal(false)}
        >
          <div
            style={{ backgroundColor: "#fff", borderRadius: "8px", maxWidth: "900px", width: "100%", maxHeight: "80vh", overflowY: "auto", position: "relative", padding: "20px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", fontSize: "16px", cursor: "pointer" }}
              onClick={() => setShowInvoiceModal(false)}
            >
              ✕
            </button>
            <SubscriptionInvoice {...selectedInvoice} />
          </div>
        </div>
      )}

      {showPaymentView && selectedPayment && (
        <div
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100000 }}
          onClick={() => setShowPaymentView(false)}
        >
          <div
            style={{ backgroundColor: "#fff", borderRadius: "8px", maxWidth: "900px", width: "100%", maxHeight: "80vh", overflowY: "auto", position: "relative", padding: "20px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <TenantListViewPayment
              paymentInfo={selectedPayment}
              onBack={() => setShowPaymentView(false)}
              onViewInvoice={(invoiceId) => {
                setShowPaymentView(false);
                handleViewInvoice(invoiceId);
              }}
            />
          </div>
        </div>
      )}

      <GeneratePaymentLinkModal
        isOpen={isPaymentLinkModalOpen}
        onClose={() => setIsPaymentLinkModalOpen(false)}
        tenantId={tenantId}
      />
    </div>
  );
};

export default TenantSingleBilling;

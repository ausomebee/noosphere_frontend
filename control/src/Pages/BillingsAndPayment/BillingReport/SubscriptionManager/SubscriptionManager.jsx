import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import CustomTable from "../../../../Components/Table/CustomTable";
import { SelectInput, TextInput } from "../../../../Components/Input/Inputs";
import Button from "../../../../Components/Button/Button";
import ResumeSubscriptionModal from "../../../../Components/ReusableModal/SubcriptionModals/ResumeSubscriptionModal";
import CancelSubscriptionModal from "../../../../Components/ReusableModal/SubcriptionModals/CancelSubscriptionModal";
import PauseSubscriptionModal from "../../../../Components/ReusableModal/SubcriptionModals/PauseSubscriptionModal";
import TenantListViewPayment from "../../../../Pages/Tenant/TenantList/TenantListViewPayment";
import SubscriptionInvoice from "../../../../Components/Invoice/SubscriptionInvoice";
import api from "../../../../api/SubcriptionApis";
import apiInvoice from "../../../../api/InvoiceApi";
import { createRoot } from "react-dom/client";
import LoadingSpinner from "../../../../Components/LoadingSpinner";
import { showToast } from "../../../../Helper/ShowToast";
import { debounce } from "lodash";

const SubscriptionManager = () => {
  const navigate = useNavigate();
  const token = useSelector((state) => state.authentication?.user?.token);
  const accessToken = token;
  const refreshToken = token;
  const adminId = useSelector((state) => state.authentication?.user?.id);

  const [activeTab, setActiveTab] = useState("all");
  const [filterValue, setFilterValue] = useState("");
  const [checkboxSelectedRows, setCheckboxSelectedRows] = useState([]);
  const [selectSelectedNames, setSelectSelectedNames] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState(new Set());
  const [selectedItems, setSelectedItems] = useState([]);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState([]);
  const [subscriptionCounts, setSubscriptionCounts] = useState({
    All: 0,
    ACTIVE: 0,
    PAUSED: 0,
    PENDING: 0,
    CANCELLED: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPaymentView, setShowPaymentView] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(false);
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);

  const cache = useRef(new Map()); // In-memory cache for GET APIs

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const formatNumber = useCallback((value, isCurrency = false) => {
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
      formattedValue = absValue.toString();
    }

    if (suffix && formattedValue.endsWith(".00")) {
      formattedValue = formattedValue.slice(0, -3);
    }

    return isCurrency
      ? `$${formattedValue}${suffix}`
      : `${formattedValue}${suffix}`;
  }, []);

  const extractIdNumber = useCallback((id) => {
    if (!id || typeof id !== "string") return id;
    return id.replace(/^(PAY00|invoice_|INV)/, "");
  }, []);

  const formatPaymentId = useCallback((id) => `PAY00${id}`, []);
  const formatInvoiceId = useCallback((id) => `invoice_${id}`, []);

  const handleFilterChange = useCallback((key, value) => {
    setFilterValue(value);
    setActiveTab("all");
  }, []);

  const subscriptionStats = useMemo(
    () => [
      { key: "all", label: "All", count: subscriptionCounts.All },
      { key: "active", label: "Active", count: subscriptionCounts.ACTIVE },
      { key: "paused", label: "Paused", count: subscriptionCounts.PAUSED },
      { key: "pending", label: "Pending", count: subscriptionCounts.PENDING },
      {
        key: "canceled",
        label: "Canceled",
        count: subscriptionCounts.CANCELLED,
      },
    ],
    [subscriptionCounts]
  );

  const allColumns = useMemo(
    () => [
      { key: "companyName", header: "Name" },
      { key: "plan", header: "Plan", type: "plan" },
      {
        key: "status",
        header: "Subscription Status",
        type: "subscription_status",
      },
      { key: "nextBillingDate", header: "Next Billing Date" },
      { key: "billingCycle", header: "Billing Cycle" },
      { key: "amount", header: "Amount" },
      {
        key: "lastPaymentStatus",
        header: "Last Payment Status",
        type: "payment_status",
      },
    ],
    []
  );

  const filteredColumns = useMemo(
    () => allColumns.filter((col) => col.key !== "status"),
    [allColumns]
  );

  const filters = useMemo(
    () => [
      {
        key: "filter_type",
        value: "",
        options: [
          { value: "", label: "Select Filter" },
          { value: "nextBillingDate", label: "Billing Date" },
          { value: "billingCycle", label: "Billing Cycle" },
          { value: "lastPaymentStatus", label: "Last Payment Status" },
          { value: "plan", label: "Plan" },
          { value: "clear_filters", label: "Clear Filters" },
        ],
      },
    ],
    []
  );

  const handleViewTenantProfile = useCallback(
    (row) => {
      navigate(`/tenants/tenant-lists/overview/${row.tenantId}`);
    },
    [navigate]
  );

  const handleViewPayment = useCallback(
    async (row) => {
      const paymentId = row.paymentId;
      const cacheKey = `payment_${paymentId}`;
      if (cache.current.has(cacheKey)) {
        setSelectedPayment(cache.current.get(cacheKey));
        setShowPaymentView(true);
        return;
      }

      setIsPaymentLoading(true);
      try {
        const response = await apiInvoice.GetPaymentById({
          id: paymentId,
          accessToken,
          refreshToken,
        });
        const paymentData = response.data || {};

        const payment = {
          Plan: paymentData.Plan || row.plan,
          Period: paymentData.Period,
          "Payment ID": formatPaymentId(paymentId),
          "Payment Date": formatDate(paymentData.paymentDate),
          "Time of Payment": formatDate(paymentData.paymentTime),
          "Payment Amount": formatNumber(
            paymentData.amount || row.amount,
            true
          ),
          "Payment Method": {
            icon: "/visa-icon.png",
            number: paymentData.paymentMethod?.code || "N/A",
          },
          Invoice: {
            id:
              paymentData.invoice?.invoiceId?.replace(/^INV/, "") ||
              row.invoiceId ||
              "N/A",
            link: "#",
          },
        };
        cache.current.set(cacheKey, payment);
        setSelectedPayment(payment);
        setShowPaymentView(true);
      } catch (err) {
        setError("Failed to load payment details.");
        if (import.meta.env.DEV) console.error("Error fetching payment:", err);
      } finally {
        setIsPaymentLoading(false);
      }
    },
    [accessToken, refreshToken, formatPaymentId, formatDate, formatNumber]
  );

  const handleViewInvoice = useCallback(
    async (rowOrInvoiceId, invoiceId) => {
      const finalInvoiceId =
        invoiceId ||
        extractIdNumber(rowOrInvoiceId?.invoiceId || rowOrInvoiceId);
      const cacheKey = `invoice_${finalInvoiceId}`;
      if (cache.current.has(cacheKey)) {
        setSelectedInvoice(cache.current.get(cacheKey));
        setShowInvoiceModal(true);
        return;
      }

      setIsInvoiceLoading(true);
      try {
        const response = await apiInvoice.GetInvoiceById({
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
          items: (invoiceData.items || []).map((item, index) => ({
            id: `${index + 1}`,
            description: item.description,
            rate: formatNumber(item.rate?.price || 0, true),
            quantity: item.quantity,
            price: formatNumber(item.price || 0, true),
          })),
          total: formatNumber(invoiceData.total || 0, true),
        };
        cache.current.set(cacheKey, invoice);
        setSelectedInvoice(invoice);
        setShowInvoiceModal(true);
      } catch (err) {
        setError("Failed to load invoice details.");
        if (import.meta.env.DEV) console.error("Error fetching invoice:", err);
      } finally {
        setIsInvoiceLoading(false);
      }
    },
    [accessToken, refreshToken, extractIdNumber, formatDate, formatNumber]
  );

  const debouncedDownloadInvoice = useCallback(
    debounce(async (row) => {
      setIsDownloadingInvoice(true);
      try {
        const invoiceId = extractIdNumber(row.invoiceId);
        const response = await apiInvoice.GetInvoiceById({
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
          items: (invoiceData.items || []).map((item, index) => ({
            id: `${index + 1}`,
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

        const html2canvas = (await import("html2canvas")).default;
        const { jsPDF } = await import("jspdf");

        const canvas = await html2canvas(tempContainer, { scale: 1 }); // Reduced scale for performance
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
        showToast("Invoice downloaded successfully", "success");
      } catch (err) {
        if (import.meta.env.DEV) console.error("Error generating PDF:", err);
        showToast("Failed to download invoice. Please try again.", "error");
      } finally {
        setIsDownloadingInvoice(false);
      }
    }, 500),
    [accessToken, refreshToken, extractIdNumber, formatDate, formatNumber]
  );

  const activeActions = useMemo(
    () => [
      {
        label: "Pause Subscription",
        onClick: (row) => {
          setSelectedItems([row]);
          setIsPauseModalOpen(true);
        },
      },
      {
        label: "Cancel Subscription",
        onClick: (row) => {
          setSelectedItems([row]);
          setIsCancelModalOpen(true);
        },
      },
      { label: "View Payment History", onClick: handleViewPayment },
      { label: "View Tenant Profile", onClick: handleViewTenantProfile },
      {
        label: "Change Plan",
        onClick: (row) => {} // TODO: implement handler,
      },
    ],
    [handleViewPayment, handleViewTenantProfile]
  );

  const pausedActions = useMemo(
    () => [
      {
        label: "Resume Subscription",
        onClick: (row) => {
          setSelectedItems([row]);
          setIsResumeModalOpen(true);
        },
      },
      {
        label: "Cancel Subscription",
        onClick: (row) => {
          setSelectedItems([row]);
          setIsCancelModalOpen(true);
        },
      },
      { label: "View Payment History", onClick: handleViewPayment },
      { label: "View Tenant Profile", onClick: handleViewTenantProfile },
      {
        label: "Change Plan",
        onClick: (row) => {} // TODO: implement handler,
      },
    ],
    [handleViewPayment, handleViewTenantProfile]
  );

  const canceledActions = useMemo(
    () => [
      { label: "View Payment History", onClick: handleViewPayment },
      { label: "View Tenant Profile", onClick: handleViewTenantProfile },
      {
        label: "Assign a New Plan",
        onClick: (row) => {} // TODO: implement handler,
      },
    ],
    [handleViewPayment, handleViewTenantProfile]
  );

  const defaultActions = useMemo(
    () => [
      {
        label: "Pause Subscription",
        onClick: (row) => {
          setSelectedItems([row]);
          setIsPauseModalOpen(true);
        },
      },
      {
        label: "Cancel Subscription",
        onClick: (row) => {
          setSelectedItems([row]);
          setIsCancelModalOpen(true);
        },
      },
      {
        label: "Resume Subscription",
        onClick: (row) => {
          setSelectedItems([row]);
          setIsResumeModalOpen(true);
        },
      },
      { label: "View Payment History", onClick: handleViewPayment },
      { label: "View Tenant Profile", onClick: handleViewTenantProfile },
      {
        label: "Change Plan",
        onClick: (row) => {} // TODO: implement handler,
      },
    ],
    [handleViewPayment, handleViewTenantProfile]
  );

  const getActionsForTab = useCallback(() => {
    switch (activeTab) {
      case "active":
        return activeActions;
      case "paused":
        return pausedActions;
      case "canceled":
        return canceledActions;
      default:
        return defaultActions;
    }
  }, [activeActions, pausedActions, canceledActions, defaultActions]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params =
        activeTab === "all"
          ? { status: "all", accessToken, refreshToken }
          : {
              status: activeTab.toUpperCase().replace("CANCELED", "CANCELLED"),
              accessToken,
              refreshToken,
            };

      const [subscriptionsResponse, countsResponse] = await Promise.all([
        api.GetSubscriptionByStatus(params).catch((err) => ({
          error: err,
          data: [],
        })),
        api
          .GetCountForSubscription({ accessToken, refreshToken })
          .catch((err) => ({
            error: err,
            data: {
              All: { _count: { _all: 0 } },
              ACTIVE: { _count: { _all: 0 } },
              PAUSED: { _count: { _all: 0 } },
              PENDING: { _count: { _all: 0 } },
              CANCELLED: { _count: { _all: 0 } },
            },
          })),
      ]);

      const subscriptions = (subscriptionsResponse.data || []).map((sub) => ({
        id: sub.id,
        tenantId: sub.tenantId,
        companyName: sub.tenant?.companyName || "N/A",
        plan: sub.plan?.name || "N/A",
        status: sub.status.toLowerCase().replace("CANCELED", "CANCELLED"),
        nextBillingDate: formatDate(sub.endDate),
        billingCycle: sub.billingCycle || "N/A",
        amount: sub.payment?.amount || 0,
        lastPaymentStatus: sub.payment?.status || "N/A",
        paymentId: sub.payment?.id,
        invoiceId: sub.payment?.invoiceId,
        hasCheckbox: true,
        hasActions: true,
      }));

      setSubscriptionData(subscriptions);
      setSubscriptionCounts({
        All: countsResponse.data?.All?._count?._all ?? 0,
        ACTIVE: countsResponse.data?.ACTIVE?._count?._all ?? 0,
        PAUSED: countsResponse.data?.PAUSED?._count?._all ?? 0,
        PENDING: countsResponse.data?.PENDING?._count?._all ?? 0,
        CANCELLED: countsResponse.data?.CANCELLED?._count?._all ?? 0,
      });

      if (subscriptionsResponse.error || countsResponse.error) {
        throw new Error("Failed to fetch some data.");
      }
    } catch (err) {
      setError("Failed to load subscriptions. Please try again later.");
      if (import.meta.env.DEV) console.error("Error fetching subscriptions:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, accessToken, refreshToken, formatDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (subscriptionData.length > 0 && checkboxSelectedRows.length === 0) {
      handleCheckboxSelectionChange([0], [subscriptionData[0]]);
    }
  }, [subscriptionData]);

  const getFilteredData = useMemo(() => {
    let data = [...subscriptionData];
    if (activeTab !== "all") {
      data = data.filter(
        (item) =>
          item.status.toLowerCase() ===
          activeTab.replace("canceled", "cancelled")
      );
    }
    return data;
  }, [subscriptionData, activeTab]);

  const updateSelections = useCallback(
    (checkboxRows, selectNames, checkboxItems) => {
      const filteredData = getFilteredData;
      const checkboxSelectedItems = checkboxItems.filter(Boolean);
      const selectSelectedItems = filteredData.filter((item) =>
        selectNames.includes(item.companyName)
      );

      const combinedItems = [
        ...checkboxSelectedItems,
        ...selectSelectedItems,
      ].filter(
        (item, index, self) =>
          self.findIndex((i) => i.companyName === item.companyName) === index
      );

      setSelectedItems(combinedItems);
      const statuses = new Set(
        combinedItems.map((item) => item.status.toLowerCase())
      );
      setSelectedStatuses(statuses);
    },
    [getFilteredData]
  );

  const handleCheckboxSelectionChange = useCallback(
    (selectedRows, selectedItems) => {
      setCheckboxSelectedRows(selectedRows);
      updateSelections(selectedRows, selectSelectedNames, selectedItems);
    },
    [selectSelectedNames, updateSelections]
  );

  const handleSelectChange = useCallback(
    (e) => {
      const selectedOptions = Array.from(e.target.selectedOptions).map(
        (option) => option.value
      );
      setSelectSelectedNames(selectedOptions);
      updateSelections(checkboxSelectedRows, selectedOptions, selectedItems);
    },
    [checkboxSelectedRows, selectedItems, updateSelections]
  );

  const renderBulkActions = useMemo(() => {
    if (selectedItems.length === 0) {
      return null;
    }

    if (selectedStatuses.size === 1) {
      if (selectedStatuses.has("active")) {
        return (
          <div className="bulk-actions">
            <Button
              label="Pause Subscription"
              variant="outline"
              onClick={() => setIsPauseModalOpen(true)}
              width="200px"
            />
            <Button
              label="Cancel Subscription"
              variant="secondary-danger"
              onClick={() => setIsCancelModalOpen(true)}
              width="200px"
            />
          </div>
        );
      } else if (selectedStatuses.has("paused")) {
        return (
          <div className="bulk-actions">
            <Button
              label="Resume Subscription"
              variant="outline"
              onClick={() => setIsResumeModalOpen(true)}
              width="200px"
            />
            <Button
              label="Cancel Subscription"
              variant="secondary-danger"
              onClick={() => setIsCancelModalOpen(true)}
              width="200px"
            />
          </div>
        );
      }
    } else if (
      selectedStatuses.has("active") &&
      selectedStatuses.has("paused")
    ) {
      return (
        <div className="bulk-actions">
          <Button
            label="Cancel Subscription"
            variant="secondary-danger"
            onClick={() => setIsCancelModalOpen(true)}
            width="200px"
          />
        </div>
      );
    }

    return null;
  }, [selectedItems, selectedStatuses]);

  const handleBackFromPayment = useCallback(() => {
    setShowPaymentView(false);
    setSelectedPayment(null);
  }, []);

  const closeInvoiceModal = useCallback(() => {
    setShowInvoiceModal(false);
    setSelectedInvoice(null);
  }, []);

  const handleSave = useCallback(
    async (data) => {
      setLoading(true);
      setError(null);
      try {
        const subscriptionIds =
          data.items.length === 1
            ? data.items[0].id
            : data.items.map((item) => item.id);

        const payload = {
          subscriptionId: subscriptionIds,
          adminId,
          comment: data.comment || "",
          reason: data.reason,
          mailNotification: Boolean(data.notifyTenant),
          accessToken,
          refreshToken,
        };

        let response;
        if (data.resumptionType) {
          if (data.resumptionType === "now") {
            response = await api.ResumeSubscriptionNow({
              ...payload,
              status: "ACTIVE",
            });
            showToast("Subscription resumed successfully", "success");
          } else if (data.resumptionType === "specificDate") {
            response = await api.ResumeSubscriptionLater({
              ...payload,
              resumeShedule: data.specificDate,
            });
            showToast(
              "Subscription scheduled to resume successfully",
              "success"
            );
          }
        } else if (data.pauseType) {
          if (data.pauseType === "indefinitely") {
            response = await api.PauseSubscriptionNow({
              ...payload,
              status: "PAUSED",
            });
            showToast("Subscription paused successfully", "success");
          } else if (data.pauseType === "until") {
            response = await api.PauseSubscriptionUntil({
              ...payload,
              status: "PAUSED",
              resumeShedule: data.untilDate,
            });
            showToast("Subscription paused until specified date", "success");
          } else if (data.pauseType === "specificDate") {
            response = await api.PauseSubscriptionSchedule({
              ...payload,
              pauseSchedule: data.specificDate,
            });
            showToast("Subscription pause scheduled successfully", "success");
          }
        } else if (data.cancellationType) {
          if (data.cancellationType === "immediately") {
            response = await api.CancelSubscriptionNow({
              ...payload,
              status: "CANCELLED",
            });
            showToast("Subscription cancelled successfully", "success");
          } else if (data.cancellationType === "endOfCycle") {
            response = await api.CancelSubscriptionLater({
              ...payload,
            });
            showToast("Subscription scheduled for cancellation", "success");
          }
        }

        if (response) {
          await fetchData();
          setSelectedItems([]);
          setCheckboxSelectedRows([]);
          setSelectSelectedNames([]);
          setSelectedStatuses(new Array());
        }
      } catch (err) {
        setError("Failed to perform subscription action.");
        showToast("Error updating subscription: " + err.message, "error");
        if (import.meta.env.DEV) console.error("Error saving subscription action:", err);
      } finally {
        setLoading(false);
      }
    },
    [adminId, accessToken, refreshToken, fetchData]
  );

  const selectOptions = useMemo(
    () =>
      getFilteredData.map((item) => ({
        value: item.companyName,
        label: item.companyName,
      })),
    [getFilteredData]
  );

  return (
    <>
      {loading && <LoadingSpinner />}
      {(isPaymentLoading || isInvoiceLoading || isDownloadingInvoice) && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1000,
          }}
        >
          <LoadingSpinner />
        </div>
      )}
      {error && (
        <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>
      )}
      {showInvoiceModal && selectedInvoice && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: "0",
            backgroundColor: "rgba(0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100000,
          }}
          onClick={() => closeInvoiceModal()}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 8,
              maxWidth: "800px",
              width: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
              position: "relative",
              padding: 20,
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
              onClick={() => closeInvoiceModal()}
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
            breadcrumb={"Subscriptions / Payment"}
            paymentInfo={selectedPayment}
            onBack={handleBackFromPayment}
            onViewInvoice={handleViewInvoice}
            showInvoiceModal={showInvoiceModal}
            selectedInvoice={selectedInvoice}
            closeInvoiceModal={closeInvoiceModal}
          />
        </div>
      ) : (
        <div>
          <div className="billing-board-header">
            <div className="billing-board-title">
              <h1>Subscriptions</h1>
              <p>Manage all subscription related activities</p>
            </div>
          </div>
          <div>
            <h3 className="tenant-section-label">SUBSCRIPTIONS</h3>
            <div className="subscription-tabs-container">
              {subscriptionStats.map((tab) => (
                <button
                  key={tab.key}
                  className={`subscription-tab ${
                    activeTab === tab.key ? "active" : ""
                  }`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}{" "}
                  <span className="candidate-count">{tab.count}</span>
                </button>
              ))}
            </div>
            <div className="subscription-table-container">
              {renderBulkActions}
              <CustomTable
                data={getFilteredData}
                columns={activeTab === "all" ? allColumns : filteredColumns}
                filters={filters}
                onFilterChange={handleFilterChange}
                actions={getActionsForTab()}
                showActions={true}
                itemsPerPage={10}
                tableName="Subscriptions"
                showCheckbox={true}
                onSelectionChange={handleCheckboxSelectionChange}
              />
            </div>
          </div>
        </div>
      )}

      <ResumeSubscriptionModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
        onSave={handleSave}
        selectedItems={selectedItems}
      />
      <CancelSubscriptionModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onSave={handleSave}
        selectedItems={selectedItems}
      />
      <PauseSubscriptionModal
        isOpen={isPauseModalOpen}
        onClose={() => setIsPauseModalOpen(false)}
        onSave={handleSave}
        selectedItems={selectedItems}
      />
    </>
  );
};

export default SubscriptionManager;

import React, { Suspense, lazy } from "react";

import "../../BillingAndPayments.css";
import AccessDenied from "../../../../Components/AccessDenied/AccessDenied";
import usePermission from "../../../../hooks/usePermission";
import usePersistedTab from "../../../../hooks/usePersistedTab";
import SectionLoader from "../../../../Components/SectionLoader";

const InvoiceManagement = lazy(() => import("./InvoiceManagement"));
const PaymentManagement = lazy(() => import("./PaymentManagement"));

const AutoBilling = () => {
  const [activeTab, setActiveTab] = usePersistedTab("control:autoBilling", "invoice");
  const { hasPermission } = usePermission();

  const subscriptionStats = [
    { key: "invoice", label: "INVOICE MANAGEMENT" },
    { key: "payment", label: "PAYMENT & ACCOUNT ACCESS" },
  ];

  if (!hasPermission("view_auto_billing")) return <AccessDenied />;

  return (
    <>
      <div className="billing-board-header">
        <div className="billing-board-title">
          <h1>Billing & Payment</h1>
          <p>Manage all billing and payment related activities</p>
        </div>
      </div>
      <div className="subscription-tabs-container">
        {subscriptionStats.map((tab) => (
          <button
            key={tab.key}
            className={`subscription-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="auto-tab-content">
        <Suspense fallback={<SectionLoader />}>
          {activeTab === "invoice" && <InvoiceManagement />}
          {activeTab === "payment" && <PaymentManagement />}
        </Suspense>
      </div>
    </>
  );
};

export default AutoBilling;
import React, { useState, Suspense, lazy } from "react";
import Layout from "../../../Layout/ControlLayout";
import "../../BillingAndPayments.css";

const InvoiceManagement = lazy(() => import("./InvoiceManagement"));
const PaymentManagement = lazy(() => import("./PaymentManagement"));

const AutoBilling = () => {
  const [activeTab, setActiveTab] = useState("invoice");

  const subscriptionStats = [
    { key: "invoice", label: "INVOICE MANAGEMENT" },
    { key: "payment", label: "PAYMENT & ACCOUNT ACCESS" },
  ];

  return (
    <Layout>
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
        <Suspense fallback={<div>Loading...</div>}>
          {activeTab === "invoice" && <InvoiceManagement />}
          {activeTab === "payment" && <PaymentManagement />}
        </Suspense>
      </div>
    </Layout>
  );
};

export default AutoBilling;
import React, { useState } from "react";
import Layout from "../../Layout/ControlLayout";
import "./TenantSingle.css";
import Button from "../../../Components/Button/Button";
import { FiArrowUpRight } from "react-icons/fi";
import { CheckboxInput, SwitchInput } from "../../../Components/Input/Inputs";
import CustomTable from "../../../Components/Table/CustomTable";
import "../../../Components/Table/CustomTable.css";
import TenantListViewPayment from "../TenantList/TenantListViewPayment";

const TenantSingleBilling = () => {
  const paymentMethods = [
    {
      type: "amex",
      logo: "https://raw.githubusercontent.com/payrexx/payment-logos/master/credit-cards/amex/amex.png",
      number: "XXXX-XXXX-XXXX-2345",
      expiry: "01/28",
      status: "Active",
    },
    {
      type: "mastercard",
      logo: "https://raw.githubusercontent.com/payrexx/payment-logos/master/credit-cards/mastercard/mastercard.png",
      number: "XXXX-XXXX-XXXX-2345",
      expiry: "01/28",
      status: "Inactive",
    },
    {
      type: "paypal",
      logo: "https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg",
      number: "XXXX-XXXX-XXXX-2345",
      expiry: "01/24",
      status: "Expired",
    },
    {
      type: "paypal",
      logo: "https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg",
      number: "XXXX-XXXX-XXXX-2345",
      expiry: "01/24",
      status: "Expired",
    },
    {
      type: "paypal",
      logo: "https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg",
      number: "XXXX-XXXX-XXXX-2345",
      expiry: "01/24",
      status: "Expired",
    },
    {
      type: "paypal",
      logo: "https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg",
      number: "XXXX",
      expiry: "",
      status: "Expiry",
    },
    {
      type: "stripe",
      logo: "https://img.icons8.com/color/48/000000/stripe.png",
      number: "XXXX-XXXX-XXXX-2345",
      expiry: "01/30",
      status: "Active",
    },
  ];

  const [tableDataState, setTableDataState] = useState([
    {
      id: "1",
      document: "Invoice_32408.pdf",
      date_created: "12/10/2024",
      due_date: "12/10/2024",
      status: "Paid",
      hasActions: true,
      hasCheckbox: true,
    },
    {
      id: "2",
      document: "Invoice_32409.pdf",
      date_created: "12/13/2024",
      due_date: "12/13/2024",
      status: "Pending",
      hasActions: true,
      hasCheckbox: true,
    },
    {
      id: "3",
      document: "Invoice_32410.pdf",
      date_created: "01/10/2024",
      due_date: "01/10/2024",
      status: "Default",
      hasActions: true,
      hasCheckbox: true,
    },
    {
      id: "4",
      document: "Invoice_32411.pdf",
      date_created: "02/01/2024",
      due_date: "02/01/2024",
      status: "Upcoming",
      hasActions: true,
      hasCheckbox: true,
    },
  ]);

  const [activeTab, setActiveTab] = useState("All");

  const tabs = [
    { name: "All", count: tableDataState.length },
    {
      name: "Paid",
      count: tableDataState.filter((item) => item.status === "Paid").length,
    },
    {
      name: "Pending",
      count: tableDataState.filter((item) => item.status === "Pending").length,
    },
    {
      name: "Default",
      count: tableDataState.filter((item) => item.status === "Default").length,
    },
    {
      name: "Upcoming",
      count: tableDataState.filter((item) => item.status === "Upcoming").length,
    },
  ];

  const columns =
    activeTab === "All"
      ? [
          { key: "document", header: "Name", type: "document" },
          { key: "date_created", header: "Date Created" },
          { key: "due_date", header: "Due Date" },
          { key: "status", header: "Status", type: "status" },
        ]
      : [
          { key: "document", header: "Name", type: "document" },
          { key: "date_created", header: "Date Created" },
          { key: "due_date", header: "Due Date" },
        ];

  const [viewPaymentId, setViewPaymentId] = useState(null);

  const actions = [
    {
      label: "View Payment",
      onClick: (row) => {
        setViewPaymentId(row.id);
      },
    },
  ];

  const filteredData =
    activeTab === "All"
      ? tableDataState
      : tableDataState.filter((item) => item.status === activeTab);

  const [filters, setFilters] = useState([
    {
      key: "filter_type",
      value: "",
      options: [
        { value: "", label: "Select Filter" },
        { value: "date_created", label: "Date Created" },
        { value: "due_date", label: "Due Date" },
      ],
    },
  ]);

  const handleFilterChange = (key, value) => {
    console.log(`Filter changed: ${key} = ${value}`);
    setFilters((prevFilters) =>
      prevFilters.map((filter) =>
        filter.key === key ? { ...filter, value } : filter
      )
    );
  };

  return (
    <Layout>
      <div className="tenant-list-container">
        {viewPaymentId ? (
          <TenantListViewPayment
            paymentId={viewPaymentId}
            onBack={() => setViewPaymentId(null)}
          />
        ) : (
          <>
            {/* Plan Info Section */}
            <h3 className="tenant-header-gen">Plan Info</h3>
            <div className="plan-info">
              <div className="plan-details">
                <div className="plan-item">
                  <p>
                    <span className="plan-badge">Enterprise</span> Plan
                  </p>
                  <Button
                    label="Change plan"
                    iconPosition="right"
                    icon={<FiArrowUpRight size={20} />}
                    width="180px"
                  />
                </div>
                <div className="plan-item">
                  <label>Usage</label>
                  <p>Client seats</p>
                  <div className="usage-bar">
                    <div
                      className="usage-filled"
                      style={{ width: "60%" }}
                    ></div>
                  </div>
                  <p>12 out of 20 used</p>
                </div>
                <div className="plan-item next-payment-box">
                  <label>Next Payment</label>
                  <p style={{ fontWeight: 600, color: "#004aba" }}>
                    Nov 20, 2025
                  </p>
                  <Button
                    label="View invoice"
                    icon={<FiArrowUpRight size={20} />}
                    iconPosition="right"
                    variant="outline"
                    width="200px"
                  />
                </div>
              </div>
            </div>

            {/* Payment Methods Section (Carousel) */}
            <h3 className="tenant-header-gen">Payment Methods</h3>
            <div className="payment-methods-container no-scrollbar::-webkit-scrollbar no-scrollbar">
              {paymentMethods.map((method, index) => (
                <div key={index} className="payment-method-card">
                  <div className="payment-method-header">
                    <img
                      src={method.logo}
                      alt={`${method.type} logo`}
                      className="card-icon"
                    />
                    <span className="card-number">{method.number}</span>
                  </div>
                  <div className="payment-method-footer">
                    <span className="expiry">Expiry: {method.expiry}</span>
                    <span
                      className={`status ${
                        method.status.toLowerCase() === "active"
                          ? "status-active"
                          : method.status.toLowerCase() === "inactive"
                          ? "status-inactive"
                          : "status-expired"
                      }`}
                    >
                      {method.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Invoices Section with Tabs */}
            <h3 className="tenant-header-gen">Invoices</h3>
            <div className="invoices-tabs-container">
              <div className="tenants-tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.name}
                    className={`tenants-tab ${
                      activeTab === tab.name ? "active" : ""
                    }`}
                    onClick={() => setActiveTab(tab.name)}
                  >
                    <span>{tab.name}</span>
                    {tab.count > 0 && (
                      <span className="tab-count">{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>

              <CustomTable
                data={filteredData}
                columns={columns}
                filters={filters}
                onFilterChange={handleFilterChange}
                actions={actions}
                showActions={true}
                itemsPerPage={10}
                tableName="Invoices"
              />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default TenantSingleBilling;

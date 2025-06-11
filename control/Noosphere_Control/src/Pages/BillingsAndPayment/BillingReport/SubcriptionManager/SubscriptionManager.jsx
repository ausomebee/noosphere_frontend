import React, { useState, useCallback } from "react";
import Layout from "../../../Layout/ControlLayout";
import CustomTable from "../../../../Components/Table/CustomTable";
import { SelectInput, TextInput } from "../../../../Components/Input/Inputs";
import Button from "../../../../Components/Button/Button";

const SubscriptionManager = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [filterValue, setFilterValue] = useState("");
  const [checkboxSelectedRows, setCheckboxSelectedRows] = useState([]); // Track checkbox selections
  const [selectSelectedNames, setSelectSelectedNames] = useState([]); // Track <select> selections
  const [selectedStatuses, setSelectedStatuses] = useState(new Set());
  const [selectedItems, setSelectedItems] = useState([]); // Store selected items for bulk actions

  const handleFilterChange = (key, value) => {
    setFilterValue(value);
    setActiveTab("all"); // Reset to "all" tab when applying filters
  };

  // Dynamic data for stats
  const subscriptionStats = [
    { key: "all", label: "All", count: "123.4k" },
    { key: "active", label: "Active", count: "18.5k" },
    { key: "paused", label: "Paused", count: "20k" },
    { key: "canceled", label: "Canceled", count: "25k" },
    { key: "pending", label: "Pending", count: "60k" },
  ];

  // Dynamic table data with unique IDs
  const subscriptionData = [
    { id: 1, name: "ACME Corp", plan: "Basic", status: "Active", nextBillingDate: "12/10/2024", billingCycle: "Monthly", amount: "$500", lastPaymentStatus: "Success", hasCheckbox: true, hasActions: true },
    { id: 2, name: "Thomas Marco The...", plan: "Gold", status: "Active", nextBillingDate: "12/13/2024", billingCycle: "Monthly", amount: "$500", lastPaymentStatus: "Success", hasCheckbox: true, hasActions: true },
    { id: 3, name: "West ABA", plan: "Enterprise", status: "Paused", nextBillingDate: "1/10/2025", billingCycle: "Yearly", amount: "$400", lastPaymentStatus: "Success", hasCheckbox: true, hasActions: true },
    { id: 4, name: "Jefferson Mental Hlth...", plan: "Basic", status: "Active", nextBillingDate: "2/1/2025", billingCycle: "Yearly", amount: "$400", lastPaymentStatus: "Success", hasCheckbox: true, hasActions: true },
    { id: 5, name: "Langrey Health", plan: "Enterprise", status: "Canceled", nextBillingDate: "2/1/2025", billingCycle: "Monthly", amount: "$400", lastPaymentStatus: "Success", hasCheckbox: true, hasActions: true },
    { id: 6, name: "You Mind Centre", plan: "Basic", status: "Active", nextBillingDate: "2/1/2025", billingCycle: "Monthly", amount: "$400", lastPaymentStatus: "Success", hasCheckbox: true, hasActions: true },
    { id: 7, name: "Midrand General Hlth...", plan: "Gold", status: "Pending", nextBillingDate: "2/1/2025", billingCycle: "Monthly", amount: "$500", lastPaymentStatus: "Pending", hasCheckbox: true, hasActions: true },
    { id: 8, name: "Langrey Health", plan: "Enterprise", status: "Active", nextBillingDate: "2/1/2025", billingCycle: "Monthly", amount: "$500", lastPaymentStatus: "Success", hasCheckbox: true, hasActions: true },
    { id: 9, name: "You Mind Centre", plan: "Basic", status: "Active", nextBillingDate: "2/1/2025", billingCycle: "Yearly", amount: "$400", lastPaymentStatus: "Success", hasCheckbox: true, hasActions: true },
    { id: 10, name: "Midrand General Hlth...", plan: "Gold", status: "Canceled", nextBillingDate: "2/1/2025", billingCycle: "Monthly", amount: "$500", lastPaymentStatus: "Failed", hasCheckbox: true, hasActions: true },
    { id: 11, name: "Langrey Health", plan: "Enterprise", status: "Pending", nextBillingDate: "2/1/2025", billingCycle: "Monthly", amount: "$400", lastPaymentStatus: "Success", hasCheckbox: true, hasActions: true },
    { id: 12, name: "You Mind Centre", plan: "Basic", status: "Active", nextBillingDate: "2/1/2025", billingCycle: "Monthly", amount: "$400", lastPaymentStatus: "Success", hasCheckbox: true, hasActions: true },
    { id: 13, name: "Midrand General Hlth...", plan: "Gold", status: "Paused", nextBillingDate: "2/1/2025", billingCycle: "Monthly", amount: "$400", lastPaymentStatus: "Success", hasCheckbox: true, hasActions: true },
  ];

  // Dynamic columns
  const allColumns = [
    { key: "name", header: "Name" },
    { key: "plan", header: "Plan", type: "plan" },
    { key: "status", header: "Subscription Status", type: "subscription_status" },
    { key: "nextBillingDate", header: "Next Billing Date" },
    { key: "billingCycle", header: "Billing Cycle" },
    { key: "amount", header: "Amount" },
    { key: "lastPaymentStatus", header: "Last Payment Status", type: "payment_status" },
  ];

  // Columns without Subscription Status for other tabs
  const filteredColumns = allColumns.filter((col) => col.key !== "status");

  // Dynamic filters
  const filters = [
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
  ];

  // Define actions for each tab
  const activeActions = [
    { label: "Pause Subscription", onClick: (row) => console.log("Pause", row) },
    { label: "Cancel Subscription", onClick: (row) => console.log("Cancel", row) },
    { label: "View Payment History", onClick: (row) => console.log("View Payment", row) },
    { label: "View Tenant Profile", onClick: (row) => console.log("View Tenant", row) },
    { label: "Change Plan", onClick: (row) => console.log("Change Plan", row) },
  ];

  const pausedActions = [
    { label: "Resume Subscription", onClick: (row) => console.log("Resume", row) },
    { label: "Cancel Subscription", onClick: (row) => console.log("Cancel", row) },
    { label: "View Payment History", onClick: (row) => console.log("View Payment", row) },
    { label: "View Tenant Profile", onClick: (row) => console.log("View Tenant", row) },
    { label: "Change Plan", onClick: (row) => console.log("Change Plan", row) },
  ];

  const canceledActions = [
    { label: "View Payment History", onClick: (row) => console.log("View Payment", row) },
    { label: "View Tenant Profile", onClick: (row) => console.log("View Tenant", row) },
    { label: "Assign a New Plan", onClick: (row) => console.log("Assign Plan", row) },
  ];

  const defaultActions = [
    { label: "Pause Subscription", onClick: (row) => console.log("Pause", row) },
    { label: "Cancel Subscription", onClick: (row) => console.log("Cancel", row) },
    { label: "Resume Subscription", onClick: (row) => console.log("Resume", row) },
    { label: "View Payment History", onClick: (row) => console.log("View Payment", row) },
    { label: "View Tenant Profile", onClick: (row) => console.log("View Tenant", row) },
    { label: "Change Plan", onClick: (row) => console.log("Change Plan", row) },
  ];

  const getActionsForTab = () => {
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
  };

  const getFilteredData = () => {
    let data = [...subscriptionData];
    if (activeTab !== "all") {
      data = data.filter((item) => item.status.toLowerCase() === activeTab);
    }
    // Remove the filterValue-based filtering since CustomTable handles it
    return data;
  };

  const displayedColumns = activeTab === "all" ? allColumns : filteredColumns;

  // Handle checkbox selection changes from CustomTable
  const handleCheckboxSelectionChange = useCallback((selectedRows, selectedItems) => {
    setCheckboxSelectedRows(selectedRows);
    updateSelections(selectedRows, selectSelectedNames, selectedItems);
  }, [selectSelectedNames]);

  // Handle select element changes
  const handleSelectChange = useCallback((e) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
    setSelectSelectedNames(selectedOptions);
    updateSelections(checkboxSelectedRows, selectedOptions, []);
  }, [checkboxSelectedRows]);

  // Combine selections from checkbox and select, update statuses and items
  const updateSelections = (checkboxRows, selectNames, checkboxItems) => {
    const filteredData = getFilteredData();
    // Map checkbox-selected rows to their items
    const checkboxSelectedItems = checkboxRows.map(index => filteredData[index]).filter(Boolean);
    // Map select-selected names to their items
    const selectSelectedItems = filteredData.filter(item => selectNames.includes(item.name));

    // Combine and deduplicate selected items
    const combinedItems = [...checkboxSelectedItems, ...selectSelectedItems].filter(
      (item, index, self) => self.findIndex(i => i.name === item.name) === index
    );

    setSelectedItems(combinedItems);

    // Update statuses based on combined selections
    const statuses = new Set(combinedItems.map(item => item.status.toLowerCase()));
    setSelectedStatuses(statuses);
  };

  // Button rendering logic based on selected statuses
  const renderBulkActions = () => {
    if (selectedItems.length === 0) return null;

    if (selectedStatuses.size === 1) {
      if (selectedStatuses.has("active")) {
        return (
          <div className="bulk-actions">
            <Button
              label="Pause Subscription"
              variant="outline"
              onClick={() => console.log("Bulk Pause", selectedItems)}
              width="200px"
            />
            <Button
              label="Cancel Subscription"
              variant="secondary-danger"
              onClick={() => console.log("Bulk Cancel", selectedItems)}
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
              onClick={() => console.log("Bulk Resume", selectedItems)}
              width="200px"
            />
            <Button
              label="Cancel Subscription"
              variant="secondary-danger"
              onClick={() => console.log("Bulk Cancel", selectedItems)}
              width="200px"
            />
          </div>
        );
      }
    } else if (selectedStatuses.has("active") && selectedStatuses.has("paused")) {
      return (
        <div className="bulk-actions">
          <Button
            label="Cancel Subscription"
            variant="secondary-danger"
            onClick={() => console.log("Bulk Cancel", selectedItems)}
            width="200px"
          />
        </div>
      );
    }

    return null;
  };

  // Options for the select element
  const selectOptions = getFilteredData().map(item => ({
    value: item.name,
    label: item.name,
  }));

  return (
    <Layout>
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
              className={`subscription-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label} <span className="candidate-count">{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="subscription-table-container">
          {renderBulkActions()}
          <CustomTable
            data={getFilteredData()}
            columns={displayedColumns}
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
    </Layout>
  );
};

export default SubscriptionManager;
import React, { useState } from "react";
import {
  SwitchInput,
  TextInput,
  TextareaInput,
  SelectInput,
} from "../../../../Components/Input/Inputs"; // Adjust path as needed
import Button from "../../../../Components/Button/Button"; // Adjust path as needed
import SubscriptionInvoice from "../../../../Components/Invoice/SubscriptionInvoice"; // Adjust path as needed

const InvoiceManagement = () => {
  // State for modal visibility
  const [showModal, setShowModal] = useState(false);

  // State for form values
  const [invoiceSettings, setInvoiceSettings] = useState({
    // General
    autoGenerateInvoice: false,
    // Upcoming Invoices
    sendUpcomingInvoices: false,
    upcomingDaysBefore: "10",
    upcomingEmailHeader: "Type Something",
    upcomingEmailBody: "Enter message",
    // Due Invoices
    sendDueInvoices: false,
    dueEmailHeader: "Type Something",
    dueEmailBody: "Enter message",
    // Overdue Invoices
    overdueDaysPast: "10",
    overdueReminderTimes: "1",
    attachInvoiceToReminder: false,
  });

  // State to manage dynamic reminders
  const [reminders, setReminders] = useState([
    {
      sendOn: "3",
      emailHeader: "Type Something",
      emailBody: "Enter message",
      editMode: false,
    },
  ]);

  // State to manage edit mode for other form sections
  const [editMode, setEditMode] = useState({
    upcomingInvoices: false,
    dueInvoices: false,
  });

  // Toggle edit mode for sections
  const toggleEditMode = (section) => {
    setEditMode((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Toggle edit mode for a specific reminder
  const toggleReminderEditMode = (index) => {
    setReminders((prev) =>
      prev.map((reminder, i) =>
        i === index ? { ...reminder, editMode: !reminder.editMode } : reminder
      )
    );
  };

  // Handle form changes
  const handleInputChange = (key, value, index = null) => {
    if (index !== null) {
      // Handle reminder-specific changes
      setReminders((prev) =>
        prev.map((reminder, i) =>
          i === index
            ? {
                ...reminder,
                [key]:
                  key === "sendOn"
                    ? Math.min(
                        parseInt(value, 10),
                        parseInt(invoiceSettings.overdueDaysPast, 10)
                      ).toString()
                    : value,
              }
            : reminder
        )
      );
    } else {
      // Handle other settings
      if (key === "overdueReminderTimes") {
        const newCount = parseInt(value, 10);
        const currentCount = reminders.length;
        if (newCount > currentCount) {
          // Add new reminders
          const newReminders = Array.from(
            { length: newCount - currentCount },
            () => ({
              sendOn: "1",
              emailHeader: "Type Something",
              emailBody: "Enter message",
              editMode: false,
            })
          );
          setReminders((prev) => [...prev, ...newReminders]);
        } else if (newCount < currentCount) {
          // Remove excess reminders
          setReminders((prev) => prev.slice(0, newCount));
        }
      }
      setInvoiceSettings((prev) => ({
        ...prev,
        [key]: value,
      }));
    }
  };

  // Handle Save for a specific reminder
  const handleSaveReminder = (index) => {
    console.log(`Saving Reminder ${index + 1} settings:`, reminders[index]);
    // TODO: Send data to an endpoint
    toggleReminderEditMode(index);
  };

  // Handle Save for other sections
  const handleSave = (section) => {
    console.log(`Saving ${section} settings:`, invoiceSettings);
    // TODO: Send data to an endpoint
    toggleEditMode(section);
  };

  // Show invoice template in modal
  const handleViewInvoiceTemplate = () => {
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
  };

  // Dummy data for SubscriptionInvoice
  const invoiceData = {
    companyName: "noosphere",
    companyAddress: {
      street: "931 10th street",
      suite: "Suite 776, Modesto",
      state: "CA 95354",
    },
    invoiceId: "INV001331",
    dueDate: "12 May 2025",
    billingFrequency: "Monthly",
    customerInfo: {
      name: "ACME Org",
      street: "24, Allison Street",
      city: "Dallas, Texas, US",
      zip: "655849",
    },
    items: [
      {
        id: "1",
        description: "Noosphere ABA PMS\n(Plan Name)",
        rate: "(Rate)",
        quantity: 1,
        price: "(Price)",
      },
    ],
    total: "(Price)",
  };

  return (
    <div className="invoice-management-container">
      {/* Modal */}
      {showModal && (
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
          onClick={closeModal}
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
              onClick={closeModal}
            >
              ✕
            </button>
            <SubscriptionInvoice {...invoiceData} />
          </div>
        </div>
      )}

      {/* General Section */}
      <h3 className="section-title">GENERAL</h3>
      <div className="form-section">
        <div className="form-row">
          <div className="form-header">
            <label>
              Auto-generate a payment invoice when a tenant purchases a plan
            </label>
            <SwitchInput
              checked={invoiceSettings.autoGenerateInvoice}
              onChange={(e) =>
                handleInputChange("autoGenerateInvoice", e.target.checked)
              }
            />
          </div>
        </div>

        <div className="form-row">
          <Button
            label="View Invoice Template"
            variant="outline"
            width="auto"
            onClick={handleViewInvoiceTemplate}
          />
        </div>
      </div>

      {/* Upcoming Invoices Section */}
      <h3 className="section-title">UPCOMING INVOICES</h3>
      <div className="form-section">
        <div className="form-row">
          <div className="form-header-one">
            <div className="upcoming-invoice-controls">
              <label>Send invoices to tenants</label>
              <div style={{ width: "80px", marginBottom: "-10px" }}>
                <SelectInput
                  value={invoiceSettings.upcomingDaysBefore}
                  onChange={(e) =>
                    handleInputChange("upcomingDaysBefore", e.target.value)
                  }
                  options={Array.from({ length: 30 }, (_, i) => ({
                    value: (i + 1).toString(),
                    label: (i + 1).toString(),
                  }))}
                  className="invoice-select"
                />
              </div>
              <label>days before due date</label>
            </div>
            <SwitchInput
              checked={invoiceSettings.sendUpcomingInvoices}
              onChange={(e) =>
                handleInputChange("sendUpcomingInvoices", e.target.checked)
              }
            />
          </div>
        </div>

        <div className="form-header-two">
          <label>Upcoming Invoice Email</label>
        </div>
        <div className="form-row">
          <div className="form-inputs">
            <TextInput
              label="Email Header"
              value={invoiceSettings.upcomingEmailHeader}
              onChange={(e) =>
                handleInputChange("upcomingEmailHeader", e.target.value)
              }
              placeholder="Type Something"
              disabled={!editMode.upcomingInvoices}
            />
            <TextareaInput
              label="Email Body"
              value={invoiceSettings.upcomingEmailBody}
              onChange={(e) =>
                handleInputChange("upcomingEmailBody", e.target.value)
              }
              placeholder="Enter message"
              rows={4}
              disabled={!editMode.upcomingInvoices}
            />
            {!editMode.upcomingInvoices ? (
              <Button
                label="Edit"
                variant="outline"
                onClick={() => toggleEditMode("upcomingInvoices")}
                width="100px"
              />
            ) : (
              <div className="edit-actions">
                <Button
                  label="Cancel"
                  variant="outline"
                  onClick={() => toggleEditMode("upcomingInvoices")}
                  width="100px"
                />
                <Button
                  label="Save"
                  variant="primary"
                  onClick={() => handleSave("upcomingInvoices")}
                  width="100px"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Due Invoices Section */}
      <h3 className="section-title">DUE INVOICES</h3>
      <div className="form-section">
        <div className="form-row">
          <div className="form-header">
            <label>Send payment invoice to tenants on due date</label>
            <SwitchInput
              checked={invoiceSettings.sendDueInvoices}
              onChange={(e) =>
                handleInputChange("sendDueInvoices", e.target.checked)
              }
            />
          </div>
        </div>
        <div className="form-header-two">
          <label>Due Invoice Email</label>
        </div>
        <div className="form-row">
          <div className="form-inputs">
            <TextInput
              label="Email Header"
              value={invoiceSettings.dueEmailHeader}
              onChange={(e) => handleInputChange("dueEmailHeader", e.target.value)}
              placeholder="Type Something"
              disabled={!editMode.dueInvoices}
            />
            <div className="textarea-row">
              <TextareaInput
                label="Email Body"
                value={invoiceSettings.dueEmailBody}
                onChange={(e) => handleInputChange("dueEmailBody", e.target.value)}
                placeholder="Enter message"
                rows={4}
                disabled={!editMode.dueInvoices}
              />
            </div>
            {!editMode.dueInvoices ? (
              <Button
                label="Edit"
                variant="outline"
                onClick={() => toggleEditMode("dueInvoices")}
                width="100px"
              />
            ) : (
              <div className="edit-actions">
                <Button
                  label="Cancel"
                  variant="outline"
                  onClick={() => toggleEditMode("dueInvoices")}
                  width="100px"
                />
                <Button
                  label="Save"
                  variant="primary"
                  onClick={() => handleSave("dueInvoices")}
                  width="100px"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overdue Invoices Section */}
      <h3 className="section-title">OVERDUE INVOICES</h3>
      <div className="form-section">
        <div className="form-row">
          <div className="upcoming-invoice-controls">
            <label>Mark due/unpaid invoices as overdue after</label>
            <div style={{ width: "80px", marginBottom: "-10px" }}>
              <SelectInput
                value={invoiceSettings.overdueDaysPast}
                onChange={(e) =>
                  handleInputChange("overdueDaysPast", e.target.value)}
                options={Array.from({ length: 30 }, (_, i) => ({
                  value: (i + 1).toString(),
                  label: (i + 1).toString(),
                }))}
                className="invoice-select"
              />
            </div>
            <label>days past due date</label>
          </div>
        <div className="form-row">
          <div className="form-header-one">
            <div className="upcoming-invoice-controls">
              <label>Send unpaid invoice reminder</label>
              <div style={{ width: "80px", marginBottom: "-10px" }}>
                <SelectInput
                  value={invoiceSettings.overdueReminderTimes}
                  onChange={(e) =>
                    handleInputChange("overdueReminderTimes", e.target.value)
                  }
                  options={Array.from({ length: 5 }, (_, i) => ({
                    value: (i + 1).toString(),
                    label: (i + 1).toString(),
                  }))}
                  className="invoice-select"
                />
              </div>
              <label>times before marking as overdue</label>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-header">
            <label>Attach payment invoice to each reminder email?</label>
            <SwitchInput
              checked={invoiceSettings.attachInvoiceToReminder}
              onChange={(e) =>
                handleInputChange("attachInvoiceToReminder", e.target.checked)}
            />
          </div>
        </div>

        {reminders.map((reminder, index) => (
          <React.Fragment key={index}>
            <div className="form-header-two">
              <label>Reminder Email {index + 1}</label>
            </div>
            <div className="overdue-form-row">
              <div className="form-inputs">
                <div className="upcoming-invoice-controls">
                  <label>Send on:</label>
                  <div style={{ width: "80px", marginBottom: "-10px"}}>
                    <SelectInput
                      value={reminder.sendOn}
                      onChange={(e) => {
                        handleInputChange("sendOn", e.target.value, index)
                      }}
                      options={Array.from(
                        {
                          length: parseInt(invoiceSettings.overdueDaysPast, 10),
                        },
                        (_, i) => ({
                          value: (i + 1).toString(),
                          label: (i + 1).toString(),
                        })
                      )}
                      className="invoice-select"
                    />
                  </div>
                  <label>days after due date</label>
                </div>
                <TextInput
                  label="Email Header"
                  value={reminder.emailHeader}
                  onChange={(e) =>
                    handleInputChange("emailHeader", e.target.value, index)}
                  disabled={!reminder.editMode}
                  placeholder="Type Something"
                />
                <TextareaInput
                  label="Email Body"
                  value={reminder.emailBody}
                  onChange={(e) => {
                    handleInputChange("emailBody", e.target.value, index)
                  }}
                  disabled={!reminder.editMode}
                  placeholder="Enter message"
                  rows={4}
                />
                {!reminder.editMode ? (
                  <Button
                    label="Edit"
                    variant="outline"
                    onClick={() => toggleReminderEditMode(index)}
                    width="100px"
                  />
                ) : (
                  <div className="edit-actions">
                    <Button
                      label="Cancel"
                      variant="outline"
                      onClick={() => toggleReminderEditMode(index)}
                      width="100px"
                      />
                    <Button
                      label="Save"
                      variant="primary"
                      onClick={() => handleSaveReminder(index)}
                      width="100px"
                    />
                  </div>
                )}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
    </div>
  );
};

export default InvoiceManagement;
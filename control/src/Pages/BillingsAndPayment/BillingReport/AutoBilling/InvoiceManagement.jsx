import React, { useState, useEffect, useCallback } from "react";
import debounce from "lodash/debounce";
import {
  SwitchInput,
  TextInput,
  TextareaInput,
  SelectInput,
} from "../../../../Components/Input/Inputs";
import Button from "../../../../Components/Button/Button";
import SubscriptionInvoice from "../../../../Components/Invoice/SubscriptionInvoice";
import api from "../../../../api/AutoBillingInvoiceAPIs";
import { showToast } from "../../../../Helper/ShowToast";
import useAuth from "../../../../hooks/useAuth";

const InvoiceManagement = () => {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveMode, setSaveMode] = useState("batch"); // "batch" or "individual"
  const [invoiceSettings, setInvoiceSettings] = useState({
    id: "",
    autoGenerateInvoice: false,
    sendUpcomingInvoices: false,
    upcomingDaysBefore: "10",
    upcomingEmailHeader: "Type Something",
    upcomingEmailBody: "Enter message",
    sendDueInvoices: false,
    dueEmailHeader: "Type Something",
    dueEmailBody: "Enter message",
    overdueDaysPast: "10",
    overdueReminderTimes: "1",
    attachInvoiceToReminder: false,
  });
  const [reminders, setReminders] = useState([
    {
      sendOn: "3",
      emailHeader: "Type Something",
      emailBody: "Enter message",
      editMode: false,
      saved: false,
    },
  ]);
  const [editMode, setEditMode] = useState({
    upcomingInvoices: false,
    dueInvoices: false,
  });

  const { accessToken, refreshToken } = useAuth();

  const fetchInvoiceSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.GetInvoiceManagementAllField({
        accessToken,
        refreshToken,
      });
      const data = response.data;
      setInvoiceSettings({
        id: data.id,
        autoGenerateInvoice: data.onPlanPurchase,
        sendUpcomingInvoices: false,
        upcomingDaysBefore: data.daysBeforeDueDate.toString(),
        upcomingEmailHeader: data.upcomingInvoiceHeader,
        upcomingEmailBody: data.upcomingInvoiceBody,
        sendDueInvoices: data.onDueDate || false,
        dueEmailHeader: data.dueInvoiceHeader,
        dueEmailBody: data.dueInvoiceBody,
        overdueDaysPast: data.markOverDue.toString(),
        overdueReminderTimes: data.unpaidReminderTimesBefore.toString(),
        attachInvoiceToReminder: data.attachInvoiceToReminder,
      });
      const reminderCount = parseInt(data.unpaidReminderTimesBefore, 10) || 1;
      const reminderEmail = Array.isArray(data.reminderEmail) ? data.reminderEmail : [];
      const mappedReminders = reminderEmail.map((rem) => ({
        sendOn: Math.min(rem.sendOn, parseInt(data.markOverDue, 10)).toString(),
        emailHeader: rem.header || "Type Something",
        emailBody: rem.body || "Enter message",
        editMode: false,
        saved: false,
      }));
      const defaultReminders = Array.from(
        { length: reminderCount - mappedReminders.length },
        (_, i) => ({
          sendOn: Math.min(
            mappedReminders.length + i + 1,
            parseInt(data.markOverDue, 10)
          ).toString(),
          emailHeader: mappedReminders[0]?.emailHeader || "Type Something",
          emailBody: mappedReminders[0]?.emailBody || "Enter message",
          editMode: false,
          saved: false,
        })
      );
      setReminders([...mappedReminders, ...defaultReminders]);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoiceSettings();
  }, [fetchInvoiceSettings]);

  const debouncedSave = useCallback(
    debounce(async (settings, reminders, section, index = null) => {
      setIsLoading(true);
      try {
        const { id } = settings;
        if (section === "autoGenerateInvoice") {
          await api.UpdatePlanPurchaseToggle({
            accessToken,
            refreshToken,
            id,
            onPlanPurchase: settings.autoGenerateInvoice,
          });
        } else if (section === "upcomingDaysBefore") {
          await api.UpdateDayBeforeDueNumber({
            accessToken,
            refreshToken,
            id,
            daysBeforeDueDate: parseInt(settings.upcomingDaysBefore, 10),
          });
        } else if (section === "upcomingInvoices") {
          await api.UpcomingInvoiceEmail({
            accessToken,
            refreshToken,
            id,
            upcomingInvoiceHeader: settings.upcomingEmailHeader,
            upcomingInvoiceBody: settings.upcomingEmailBody,
          });
        } else if (section === "sendDueInvoices") {
          await api.UpdateOnDueDateToggle({
            accessToken,
            refreshToken,
            id,
            onDueDate: settings.sendDueInvoices,
          });
        } else if (section === "dueInvoices") {
          await api.DueInvoiceEmail({
            accessToken,
            refreshToken,
            id,
            dueInvoiceHeader: settings.dueEmailHeader,
            dueInvoiceBody: settings.dueEmailBody,
          });
        } else if (section === "overdueDaysPast") {
          await api.MarkOverDueCount({
            accessToken,
            refreshToken,
            id,
            markOverDue: parseInt(settings.overdueDaysPast, 10),
          });
        } else if (section === "overdueReminderTimes") {
          await api.ReminderTimesBefore({
            accessToken,
            refreshToken,
            id,
            unpaidReminderTimesBefore: parseInt(
              settings.overdueReminderTimes,
              10
            ),
          });
        } else if (section === "attachInvoiceToReminder") {
          await api.UpdateAttachToReminderToggle({
            accessToken,
            refreshToken,
            id,
            attachInvoiceToReminder: settings.attachInvoiceToReminder,
          });
        } else if (section === "reminder") {
          await api.ReminderEmail({
            accessToken,
            refreshToken,
            id,
            reminderEmail: reminders.map((r) => ({
              header: r.emailHeader,
              body: r.emailBody,
              sendOn: parseInt(r.sendOn, 10),
            })),
          });
          setReminders((prev) =>
            prev.map((r) => ({ ...r, saved: false }))
          );
        }
        showToast(`${section} settings updated successfully`, "success");
        await fetchInvoiceSettings();
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        setIsLoading(false);
      }
    }, 500),
    [fetchInvoiceSettings]
  );

  const toggleEditMode = (section) => {
    setEditMode((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toggleReminderEditMode = (index) => {
    setReminders((prev) =>
      prev.map((reminder, i) =>
        i === index ? { ...reminder, editMode: !reminder.editMode } : reminder
      )
    );
  };

  const handleInputChange = (key, value, index = null) => {
    if (index !== null) {
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
                saved: false,
              }
            : reminder
        )
      );
    } else {
      if (key === "overdueReminderTimes") {
        const newCount = parseInt(value, 10);
        const currentCount = reminders.length;
        if (newCount > currentCount) {
          const newReminders = Array.from(
            { length: newCount - currentCount },
            (_, i) => ({
              sendOn: Math.min(
                currentCount + i + 1,
                parseInt(invoiceSettings.overdueDaysPast, 10)
              ).toString(),
              emailHeader: reminders[0]?.emailHeader || "Type Something",
              emailBody: reminders[0]?.emailBody || "Enter message",
              editMode: false,
              saved: false,
            })
          );
          setReminders((prev) => [...prev, ...newReminders]);
        } else if (newCount < currentCount) {
          setReminders((prev) => prev.slice(0, newCount));
        }
        debouncedSave(
          { ...invoiceSettings, [key]: value },
          reminders,
          "overdueReminderTimes"
        );
      } else if (key === "autoGenerateInvoice") {
        debouncedSave(
          { ...invoiceSettings, [key]: value },
          reminders,
          "autoGenerateInvoice"
        );
      } else if (key === "upcomingDaysBefore") {
        debouncedSave(
          { ...invoiceSettings, [key]: value },
          reminders,
          "upcomingDaysBefore"
        );
      } else if (key === "sendDueInvoices") {
        debouncedSave(
          { ...invoiceSettings, [key]: value },
          reminders,
          "sendDueInvoices"
        );
      } else if (key === "overdueDaysPast") {
        debouncedSave(
          { ...invoiceSettings, [key]: value },
          reminders,
          "overdueDaysPast"
        );
      } else if (key === "attachInvoiceToReminder") {
        debouncedSave(
          { ...invoiceSettings, [key]: value },
          reminders,
          "attachInvoiceToReminder"
        );
      }
      setInvoiceSettings((prev) => ({
        ...prev,
        [key]: value,
      }));
    }
  };

  const handleSave = (section) => {
    debouncedSave(invoiceSettings, reminders, section);
    toggleEditMode(section);
  };

  const handleSaveReminder = (index) => {
    setReminders((prev) => {
      const updatedReminders = prev.map((reminder, i) =>
        i === index ? { ...reminder, saved: true, editMode: false } : reminder
      );
      if (saveMode === "individual") {
        // Send only the current reminder
        debouncedSave(invoiceSettings, [updatedReminders[index]], "reminder", index);
      } else {
        // Batch mode: Send all when all are saved or for single reminder
        const allSaved = updatedReminders.every((r) => r.saved);
        if (allSaved || updatedReminders.length === 1) {
          debouncedSave(invoiceSettings, updatedReminders, "reminder", index);
        }
      }
      return updatedReminders;
    });
  };

  const handleSaveAllReminders = () => {
    setReminders((prev) => {
      const updatedReminders = prev.map((r) => ({ ...r, saved: true }));
      debouncedSave(invoiceSettings, updatedReminders, "reminder");
      return updatedReminders;
    });
  };

  const handleViewInvoiceTemplate = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

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
              onClick={closeModal}
            >
              ✕
            </button>
            <SubscriptionInvoice {...invoiceData} />
          </div>
        </div>
      )}

      <h3 className="tenant-section-label">GENERAL</h3>
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

      <h3 className="tenant-section-label">UPCOMING INVOICES</h3>
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
                  disabled={!invoiceSettings.sendUpcomingInvoices}
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

        {invoiceSettings.sendUpcomingInvoices && (
          <>
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
          </>
        )}
      </div>

      <h3 className="tenant-section-label">DUE INVOICES</h3>
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

        {invoiceSettings.sendDueInvoices && (
          <>
            <div className="form-header-two">
              <label>Due Invoice Email</label>
            </div>
            <div className="form-row">
              <div className="form-inputs">
                <TextInput
                  label="Email Header"
                  value={invoiceSettings.dueEmailHeader}
                  onChange={(e) =>
                    handleInputChange("dueEmailHeader", e.target.value)
                  }
                  placeholder="Type Something"
                  disabled={!editMode.dueInvoices}
                />
                <div className="textarea-row">
                  <TextareaInput
                    label="Email Body"
                    value={invoiceSettings.dueEmailBody}
                    onChange={(e) =>
                      handleInputChange("dueEmailBody", e.target.value)
                    }
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
          </>
        )}
      </div>

      <h3 className="tenant-section-label">OVERDUE INVOICES</h3>
      <div className="form-section">
        <div className="form-row">
          <div className="upcoming-invoice-controls">
            <label>Mark due/unpaid invoices as overdue after</label>
            <div style={{ width: "80px", marginBottom: "-10px" }}>
              <SelectInput
                value={invoiceSettings.overdueDaysPast}
                onChange={(e) =>
                  handleInputChange("overdueDaysPast", e.target.value)
                }
                options={Array.from({ length: 30 }, (_, i) => ({
                  value: (i + 1).toString(),
                  label: (i + 1).toString(),
                }))}
                className="invoice-select"
              />
            </div>
            <label>days past due date</label>
          </div>
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
                handleInputChange("attachInvoiceToReminder", e.target.checked)
              }
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-header">
            <label>Save reminders individually</label>
            <SwitchInput
              checked={saveMode === "individual"}
              onChange={(e) =>
                setSaveMode(e.target.checked ? "individual" : "batch")
              }
            />
          </div>
        </div>

        {reminders.map((reminder, index) => (
          <React.Fragment key={index}>
            <div className="form-row">
              <div className="form-header-two">
                <label>Reminder Email {index + 1}</label>
              </div>
              <div className="overdue-form-row">
                <div className="form-inputs">
                  <div className="upcoming-invoice-controls">
                    <label>Send on:</label>
                    <div style={{ width: "80px", marginBottom: "-10px" }}>
                      <SelectInput
                        value={reminder.sendOn}
                        onChange={(e) =>
                          handleInputChange("sendOn", e.target.value, index)
                        }
                        options={Array.from(
                          {
                            length: parseInt(
                              invoiceSettings.overdueDaysPast,
                              10
                            ),
                          },
                          (_, i) => ({
                            value: (i + 1).toString(),
                            label: (i + 1).toString(),
                          })
                        )}
                        className="invoice-select"
                        disabled={!reminder.editMode}
                      />
                    </div>
                    <label>days after due date</label>
                  </div>
                  <TextInput
                    label="Email Header"
                    value={reminder.emailHeader}
                    onChange={(e) =>
                      handleInputChange("emailHeader", e.target.value, index)
                    }
                    disabled={!reminder.editMode}
                    placeholder="Type Something"
                  />
                  <TextareaInput
                    label="Email Body"
                    value={reminder.emailBody}
                    onChange={(e) =>
                      handleInputChange("emailBody", e.target.value, index)
                    }
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
            </div>
          </React.Fragment>
        ))}
        {reminders.length > 1 && saveMode === "batch" && (
          <div className="form-row">
            <Button
              label="Save All Reminders"
              variant="primary"
              onClick={handleSaveAllReminders}
              width="auto"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceManagement;
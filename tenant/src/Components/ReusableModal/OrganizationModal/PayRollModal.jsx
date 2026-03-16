import React, { useState, useEffect } from "react";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";

const formatRate = (item) => {
  const rate = item.rate || {};
  if (item.type === "Flat Rate") return `$${rate.rate || 0}`;
  if (item.type === "Percentage based") return `${rate.unit || 0}%`;
  if (item.type === "Time based") return `$${rate.unit || 0} per ${rate.duration || "hour"}`;
  return "N/A";
};

const PayrollModal = ({
  isOpen,
  onClose,
  onSave,
  modalMode,
  selectedPayroll,
  payrollSettings,
  tenantStaffId,
}) => {
  const [formData, setFormData] = useState({
    paymentSchedule: "",
    ratePerHour: "0",
    minimumHours: "0",
  });
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData({
      paymentSchedule: payrollSettings.paymentSchedule || "",
      ratePerHour: payrollSettings.ratePerHour || "0",
      minimumHours: payrollSettings.minimumHours || "0",
    });
    setSubmitError("");
  }, [payrollSettings]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSubmitError("");

    if (!formData.ratePerHour || isNaN(parseFloat(formData.ratePerHour))) {
      setSubmitError("Rate per hour must be a valid number");
      return;
    }

    const showMinHours = formData.paymentSchedule !== "HOURLY" &&
      formData.paymentSchedule !== "DAILY";

    if (showMinHours && formData.minimumHours && isNaN(parseFloat(formData.minimumHours))) {
      setSubmitError("Minimum hours must be a valid number");
      return;
    }

    const payroll = {
      id: payrollSettings.id,
      paymentSchedule: formData.paymentSchedule,
      ratePerHour: formData.ratePerHour,
      minimumHours: showMinHours ? formData.minimumHours : null,
      incomeItems: (payrollSettings.incomeItems || []).map((item) => ({ id: item.id })),
      deductions: (payrollSettings.deductions || []).map((item) => ({ id: item.id })),
      tenantStaffId,
    };

    setSaving(true);
    try {
      await onSave({ id: payrollSettings.id, payroll });
      onClose();
    } catch (e) {
      setSubmitError(e.message || "Failed to save payroll settings");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSubmitError("");
    onClose();
  };

  const showMinHours = formData.paymentSchedule !== "HOURLY" &&
    formData.paymentSchedule !== "DAILY";

  const isEdit = modalMode === "edit";

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? "Edit Payroll Settings" : "View Payroll Settings"}
      primaryButtonText={isEdit ? "Save" : null}
      secondaryButtonText="Close"
      onPrimaryButtonClick={isEdit ? handleSave : null}
      onSecondaryButtonClick={handleClose}
      primaryButtonLoading={saving}
      size="lg"
    >
      <div className="p-4 bg-gray-200 rounded-md">
        {submitError && (
          <div className="mb-4 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded">
            {submitError}
          </div>
        )}

        <h2 className="text-center border-b p-3 text-gray-400 text-lg">
          Gross Income
        </h2>

        {/* Basic Pay */}
        <div className="flex justify-between p-20 items-center border-b">
          <div>
            <h2 className="text-left text-gray-400 text-base">Basic Pay</h2>
          </div>
          <div className="flex gap-4">
            <div className="flex-col flex">
              <label>Rate Per Hour</label>
              <div className="custom-time-container">
                <div className="custom-time-div-two">
                  <span className="custom-time-label">$</span>
                </div>
                <input
                  type="text"
                  value={formData.ratePerHour}
                  onChange={(e) =>
                    isEdit && handleInputChange("ratePerHour", e.target.value)
                  }
                  className="custom-time-input-two"
                  readOnly={!isEdit}
                />
              </div>
            </div>
            {showMinHours && (
              <div className="flex-col flex">
                <label>Minimum Hours</label>
                <div className="custom-time-container">
                  <input
                    type="text"
                    value={formData.minimumHours}
                    onChange={(e) =>
                      isEdit && handleInputChange("minimumHours", e.target.value)
                    }
                    className="custom-time-input-two"
                    readOnly={!isEdit}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Income Items */}
        <h2 className="text-center border-b p-6 text-gray-400 text-lg">
          Income Items
        </h2>
        {payrollSettings.incomeItems?.length > 0 ? (
          payrollSettings.incomeItems.map((item) => (
            <div
              key={item.id}
              className="flex justify-between p-20 items-center border-b"
            >
              <div>
                <h2 className="text-left text-gray-400 text-base">
                  {item.name}
                </h2>
              </div>
              <div className="flex">
                <div className="flex-col flex">
                  <label>{item.type}</label>
                  <div className="custom-time-container">
                    <input
                      type="text"
                      value={formatRate(item)}
                      className="custom-time-input-two"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex justify-center p-20 items-center border-b">
            <p className="text-gray-400 text-sm">No income items assigned</p>
          </div>
        )}

        {/* Deductions */}
        <h2 className="text-center border-b p-6 text-gray-400 text-lg">
          Deductions
        </h2>
        {payrollSettings.deductions?.length > 0 ? (
          payrollSettings.deductions.map((item) => (
            <div
              key={item.id}
              className="flex justify-between p-20 items-center border-b"
            >
              <div>
                <h2 className="text-left text-gray-400 text-base">
                  {item.name}
                </h2>
              </div>
              <div className="flex">
                <div className="flex-col flex">
                  <label>{item.type}</label>
                  <div className="custom-time-container">
                    <input
                      type="text"
                      value={formatRate(item)}
                      className="custom-time-input-two"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex justify-center p-20 items-center border-b">
            <p className="text-gray-400 text-sm">No deductions assigned</p>
          </div>
        )}

        {modalMode === "view" && selectedPayroll && (
          <>
            <h2 className="text-center border-b p-6 text-gray-400 text-lg">
              Payroll Details
            </h2>
            <div className="space-y-4 p-20">
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-400 font-medium w-32">Payroll Date</p>
                <p className="text-gray-600">{selectedPayroll.payrollDate || "N/A"}</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-400 font-medium w-32">Pay Period</p>
                <p className="text-gray-600">{selectedPayroll.payPeriod || "N/A"}</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-400 font-medium w-32">Total Payroll Value</p>
                <p className="text-gray-600">{selectedPayroll.totalPayrollValue || "N/A"}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </ReusableModal>
  );
};

export default PayrollModal;

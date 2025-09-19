import React, { useState, useEffect } from "react";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";
import { showToast } from "../../../Helper/ShowToast";
const PayrollModal = ({
  isOpen,
  onClose,
  onSave,
  modalMode,
  selectedPayroll,
  payrollSettings,
  tenantStaffId,
}) => {
  // Local state to manage editable fields
  const [formData, setFormData] = useState({
    paymentSchedule: payrollSettings.paymentSchedule || "Weekly",
    ratePerHour: payrollSettings.rate?.replace("$", "") || "0",
    minimumHours: payrollSettings.minimumHours || "0",
    monthlyFlatFee: payrollSettings.monthlyFlatFee?.replace("$", "") || "N/A",
    otherPays: payrollSettings.otherPay?.map((op) => ({
      type: op.label.toLowerCase(),
      rate: op.value.replace("$", ""),
    })) || [],
    deductions: payrollSettings.deductions?.map((d) => ({
      type: d.label.toLowerCase(),
      rate: d.value.replace("$", ""),
    })) || [],
  });

  // State for submission errors
  const [submitError, setSubmitError] = useState("");

  // Sync formData with payrollSettings when it changes
  useEffect(() => {
    setFormData({
      paymentSchedule: payrollSettings.paymentSchedule || "Weekly",
      ratePerHour: payrollSettings.rate?.replace("$", "") || "0",
      minimumHours: payrollSettings.minimumHours || "0",
      monthlyFlatFee: payrollSettings.monthlyFlatFee?.replace("$", "") || "N/A",
      otherPays: payrollSettings.otherPay?.map((op) => ({
        type: op.label.toLowerCase(),
        rate: op.value.replace("$", ""),
      })) || [],
      deductions: payrollSettings.deductions?.map((d) => ({
        type: d.label.toLowerCase(),
        rate: d.value.replace("$", ""),
      })) || [],
    });
    setSubmitError(""); // Clear error when payrollSettings change
  }, [payrollSettings]);

  // Handle input changes for simple fields
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle changes for otherPays and deductions arrays
  const handleArrayInputChange = (arrayName, index, value) => {
    setFormData((prev) => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item, i) =>
        i === index ? { ...item, rate: value } : item
      ),
    }));
  };

  // Validate payroll object before saving
  const validatePayroll = (payroll) => {
    if (!payroll.tenantStaffId) {
      return "Tenant Staff ID is required";
    }
    if (!payroll.paymentSchedule) {
      return "Payment schedule is required";
    }
    if (!payroll.ratePerHour || isNaN(parseFloat(payroll.ratePerHour))) {
      return "Rate per hour must be a valid number";
    }
    if (
      payroll.paymentSchedule !== "Monthly" &&
      (!payroll.minimumHours || isNaN(parseFloat(payroll.minimumHours)))
    ) {
      return "Minimum hours must be a valid number";
    }
    if (
      payroll.paymentSchedule === "Monthly" &&
      payroll.monthlyFlatFee !== "N/A" &&
      isNaN(parseFloat(payroll.monthlyFlatFee))
    ) {
      return "Monthly flat fee must be a valid number";
    }
    if (
      payroll.otherPays.some(
        (op) => !op.type || !op.rate || isNaN(parseFloat(op.rate))
      )
    ) {
      return "All other pays must have a valid type and rate";
    }
    if (
      payroll.deductions.some(
        (d) => !d.type || !d.rate || isNaN(parseFloat(d.rate))
      )
    ) {
      return "All deductions must have a valid type and rate";
    }
    return null;
  };

  // Handle save button click
  const handleSave = async () => {
    setSubmitError(""); // Clear previous errors
    const payroll = {
      id: payrollSettings.id,
      paymentSchedule: formData.paymentSchedule,
      ratePerHour: formData.ratePerHour,
      minimumHours: formData.minimumHours,
      monthlyFlatFee:
        formData.paymentSchedule === "Monthly" ? formData.monthlyFlatFee : "N/A",
      otherPays: formData.otherPays,
      deductions: formData.deductions,
      tenantStaffId,
    };

    // Validate payroll
    const validationError = validatePayroll(payroll);
    if (validationError) {
      setSubmitError(validationError);

      return;
    }

    try {

      await onSave({ id: payrollSettings.id, payroll }); // Pass id and payroll object
      onClose(); // Close modal only on success
    } catch (e) {
      const errorMessage = e.message || "Failed to save payroll settings";
      setSubmitError(errorMessage);
      
    }
  };

  // Handle modal close
  const handleClose = () => {
    setSubmitError(""); // Clear error when closing
    onClose();
  };

  const Row = ({ label, value }) => (
    <div className="flex items-center gap-2">
      <p className="text-sm text-gray-400 font-medium w-32">{label}</p>
      <p className="text-gray-600">{value || "N/A"}</p>
    </div>
  );

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        modalMode === "view" ? "Payroll BreakDown" : "Edit Payroll Settings"
      }
      primaryButtonText={modalMode === "edit" ? "Save" : null}
      secondaryButtonText="Close"
      onPrimaryButtonClick={modalMode === "edit" ? handleSave : null}
      onSecondaryButtonClick={handleClose}
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
        <div className="flex justify-between p-20 items-center border-b">
          <div>
            <h2 className="text-left text-gray-400 text-base">Basic Pay</h2>
          </div>
          <div className="flex">
            <div className="flex-col flex">
              <label htmlFor="hourlyRate">Hourly Rate</label>
              <div className="custom-time-container">
                <div className="custom-time-div-two">
                  <span className="custom-time-label">$</span>
                </div>
                <input
                  type="text"
                  value={formData.ratePerHour}
                  onChange={(e) =>
                    modalMode === "edit" &&
                    handleInputChange("ratePerHour", e.target.value)
                  }
                  className="custom-time-input-two"
                  readOnly={modalMode === "view"}
                />
              </div>
            </div>
            {formData.paymentSchedule !== "Hourly" &&
              formData.paymentSchedule !== "Monthly" && (
                <div className="flex-col flex ml-4">
                  <label htmlFor="numberHours">Number of Hours</label>
                  <div className="custom-time-container">
                    <div className="custom-time-div-two">
                      <span className="custom-time-label">$</span>
                    </div>
                    <input
                      type="text"
                      value={formData.minimumHours}
                      onChange={(e) =>
                        modalMode === "edit" &&
                        handleInputChange("minimumHours", e.target.value)
                      }
                      className="custom-time-input-two"
                      readOnly={modalMode === "view"}
                    />
                  </div>
                </div>
              )}
            {formData.paymentSchedule === "Monthly" && (
              <div className="flex-col flex ml-4">
                <label htmlFor="monthlyFlatFee">Monthly Flat Fee</label>
                <div className="custom-time-container">
                  <div className="custom-time-div-two">
                    <span className="custom-time-label">$</span>
                  </div>
                  <input
                    type="text"
                    value={formData.monthlyFlatFee}
                    onChange={(e) =>
                      modalMode === "edit" &&
                      handleInputChange("monthlyFlatFee", e.target.value)
                    }
                    className="custom-time-input-two"
                    readOnly={modalMode === "view"}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-between p-20 items-center border-b">
          <div>
            <h2 className="text-left text-gray-400 text-base">Fixed Bonus</h2>
          </div>
          <div className="flex">
            <div className="flex-col flex">
              <label htmlFor="rate">Rate</label>
              <div className="custom-time-container">
                <div className="custom-time-div-two">
                  <span className="custom-time-label">$</span>
                </div>
                <input
                  type="text"
                  value={
                    formData.otherPays.find(
                      (item) => item.type === "weekly bonus"
                    )?.rate || "--"
                  }
                  onChange={(e) =>
                    modalMode === "edit" &&
                    handleArrayInputChange(
                      "otherPays",
                      formData.otherPays.findIndex(
                        (item) => item.type === "weekly bonus"
                      ),
                      e.target.value
                    )
                  }
                  className="custom-time-input-two"
                  readOnly={modalMode === "view"}
                />
              </div>
            </div>
          </div>
        </div>
        <h2 className="text-center border-b p-6 text-gray-400 text-lg">
          Other Pay
        </h2>
        {formData.otherPays.length > 0 ? (
          formData.otherPays
            .filter((item) => item.type !== "weekly bonus")
            .map((item, index) => (
              <div
                key={index}
                className="flex justify-between p-20 items-center border-b"
              >
                <div>
                  <h2 className="text-left text-gray-400 text-base">
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                  </h2>
                </div>
                <div className="flex">
                  <div className="flex-col flex">
                    <label htmlFor={`rate-${index}`}>Rate</label>
                    <div className="custom-time-container">
                      <div className="custom-time-div-two">
                        <span className="custom-time-label">$</span>
                      </div>
                      <input
                        type="text"
                        value={item.rate}
                        onChange={(e) =>
                          modalMode === "edit" &&
                          handleArrayInputChange("otherPays", index, e.target.value)
                        }
                        className="custom-time-input-two"
                        readOnly={modalMode === "view"}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
        ) : (
          <div className="flex justify-between p-20 items-center border-b">
            <div>
              <h2 className="text-left text-gray-400 text-base">Other Pay</h2>
            </div>
            <div className="flex">
              <div className="flex-col flex">
                <label htmlFor="rate">Rate</label>
                <div className="custom-time-container">
                  <div className="custom-time-div-two">
                    <span className="custom-time-label">$</span>
                  </div>
                  <input
                    type="text"
                    value="--"
                    className="custom-time-input-two"
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        <h2 className="text-center border-b p-6 text-gray-400 text-lg">
          Deduction
        </h2>
        {formData.deductions.length > 0 ? (
          formData.deductions.map((item, index) => (
            <div
              key={index}
              className="flex justify-between p-20 items-center border-b"
            >
              <div>
                <h2 className="text-left text-gray-400 text-base">
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </h2>
              </div>
              <div className="flex">
                <div className="flex-col flex">
                  <label htmlFor={`deduction-${index}`}>Rate</label>
                  <div className="custom-time-container">
                    <div className="custom-time-div-two">
                      <span className="custom-time-label">$</span>
                    </div>
                    <input
                      type="text"
                      value={item.rate}
                      onChange={(e) =>
                        modalMode === "edit" &&
                        handleArrayInputChange("deductions", index, e.target.value)
                      }
                      className="custom-time-input-two"
                      readOnly={modalMode === "view"}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex justify-between p-20 items-center border-b">
            <div>
              <h2 className="text-left text-gray-400 text-base">Deductions</h2>
            </div>
            <div className="flex">
              <div className="flex-col flex">
                <label htmlFor="deduction">Rate</label>
                <div className="custom-time-container">
                  <div className="custom-time-div-two">
                    <span className="custom-time-label">$</span>
                  </div>
                  <input
                    type="text"
                    value="--"
                    className="custom-time-input-two"
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        {modalMode === "view" && selectedPayroll && (
          <>
            <h2 className="text-center border-b p-6 text-gray-400 text-lg">
              Payroll Details
            </h2>
            <div className="space-y-4 p-20">
              <Row label="Payroll Date" value={selectedPayroll.payrollDate} />
              <Row label="Pay Period" value={selectedPayroll.payPeriod} />
              <Row label="Total Payroll Value" value={selectedPayroll.payrollValue} />
            </div>
          </>
        )}
      </div>
    </ReusableModal>
  );
};

export default PayrollModal;
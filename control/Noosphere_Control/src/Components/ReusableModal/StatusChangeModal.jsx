import React, { useState, useEffect } from "react";
import ReusableModal from "../../Components/ReusableModal/ReusableModal";
import { IoMdAlert } from "react-icons/io";
import { PasswordInput } from "../../Components/Input/Inputs";
import { showToast } from "../../Helper/ShowToast";
import "./ReusableModal.css";

const StatusChangeModal = ({ isOpen, onClose, onConfirm, plan, action }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setError("");
      setIsLoading(false);
    }
  }, [isOpen]);

  const validatePassword = () => {
    if (!password.trim()) {
      setError("Administrative password is required.");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return false;
    }
    setError("");
    return true;
  };

  const handleConfirm = async (e) => {
    e?.preventDefault(); // Prevent form submission if called from form
    if (!validatePassword()) return;

    setIsLoading(true);
    try {
      await onConfirm({ plan, action, administratorPassword: password });
      onClose();
    } catch (err) {
      setError(err.message || "Invalid administrative password");
    } finally {
      setIsLoading(false);
    }
  };

  const title = action === "activate" ? "Activate Plan" : "Deactivate Plan";
  const message =
    action === "activate"
      ? `Are you sure you want to activate the ${
          plan?.name || "Unnamed Plan"
        } plan?`
      : `Are you sure you want to deactivate the ${
          plan?.name || "Unnamed Plan"
        } plan?`;

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="" // Kept as per your design
      primaryButtonText="Complete"
      secondaryButtonText="Cancel"
      primaryButtonColor={action === "activate" ? "#12b76a" : "#D92D20"}
      secondaryButtonColor="#ffffff"
      onPrimaryButtonClick={handleConfirm}
      onSecondaryButtonClick={onClose}
      primaryButtonDisabled={!password.trim() || isLoading}
    >
      <form onSubmit={handleConfirm}>
        <div className="delete-confirmation-content">
          <IoMdAlert className="warning-icon" />
          <h3>{title}</h3>
          <p>{message}</p>

          <p>Enter administrative password to complete this action</p>
          <PasswordInput
            label="Administrative Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your Administrative password"
            id="admin-password" // Added for accessibility
            error={error} // Added for error display
            autoFocus={isOpen} // Added for UX
          />
        </div>
      </form>
    </ReusableModal>
  );
};

export default StatusChangeModal;

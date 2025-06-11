import React, { useState, useEffect } from "react";
import ReusableModal from "../../Components/ReusableModal/ReusableModal";
import { IoMdAlert } from "react-icons/io";
import { PasswordInput } from "../../Components/Input/Inputs";
import { showToast } from "../../Helper/ShowToast";
import "./ReusableModal.css";

const DeletePlanModal = ({ isOpen, onClose, onConfirm, plan }) => {
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
      await onConfirm({ plan, administratorPassword: password });
      onClose();
    } catch (err) {
      setError(err.message || "Invalid administrative password");
    } finally {
      setIsLoading(false);
    }
  };

  const title = "Delete Plan";
  const message = `Are you sure you want to delete the "${plan?.name || "Unnamed Plan"}" plan? This action cannot be undone.`;

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      primaryButtonText="Delete"
      secondaryButtonText="Cancel"
      primaryButtonColor="#D92D20"
      secondaryButtonColor="#ffffff"
      onPrimaryButtonClick={handleConfirm}
      onSecondaryButtonClick={onClose}
      primaryButtonDisabled={!password.trim() || isLoading}
      primaryButtonLoading={isLoading}
    >
      <div className="delete-confirmation-content">
        <IoMdAlert className="warning-icon" />
        <h3>{title}</h3>
        <p>{message}</p>
        <form onSubmit={handleConfirm}>
          <div className="password-input-wrapper">
            <PasswordInput
              label="Administrative Password"
              id="admin-password" // Added for accessibility
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your Administrative password"
              error={error}
              autoFocus={isOpen} // Focus input when modal opens
            />
          </div>
        </form>
      </div>
    </ReusableModal>
  );
};

export default DeletePlanModal;
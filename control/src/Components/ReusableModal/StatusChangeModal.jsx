import React, { useState, useEffect } from "react";
import ReusableModal from "../../Components/ReusableModal/ReusableModal";
import { IoMdAlert } from "react-icons/io";
import { PasswordInput } from "../../Components/Input/Inputs";
import { showToast, showApiError } from "../../Helper/ShowToast";
import "./ReusableModal.css";

const StatusChangeModal = ({ isOpen, onClose, onConfirm, plan, action }) => {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setIsLoading(false);
    }
  }, [isOpen]);

  const validatePassword = () => {
    if (!password.trim()) {
      showToast("Administrative password is required.", "error");
      return false;
    }
    if (password.length < 6) {
      showToast("Password must be at least 6 characters long.", "error");
      return false;
    }
    return true;
  };

  const handleConfirm = async (e) => {
    e?.preventDefault();
    if (!validatePassword()) return;

    setIsLoading(true);
    try {
      await onConfirm({ plan, action, administratorPassword: password });
      onClose();
    } catch (err) {
      showApiError(err, "VERIFY_ADMIN_PASSWORD");
    } finally {
      setIsLoading(false);
    }
  };

  const title = action === "activate" ? "Activate Plan" : "Deactivate Plan";
  const message =
    action === "activate"
      ? `Are you sure you want to activate the ${plan?.name || "Unnamed Plan"} plan?`
      : `Are you sure you want to deactivate the ${plan?.name || "Unnamed Plan"} plan?`;

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      primaryButtonText="Complete"
      secondaryButtonText="Cancel"
      primaryButtonColor={action === "activate" ? "#12b76a" : "#D92D20"}
      secondaryButtonColor="#ffffff"
      onPrimaryButtonClick={handleConfirm}
      onSecondaryButtonClick={onClose}
      primaryButtonDisabled={!password.trim() || isLoading}
      primaryButtonLoading={isLoading}
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
            id="admin-password"
            autoFocus={isOpen}
          />
        </div>
      </form>
    </ReusableModal>
  );
};

export default StatusChangeModal;

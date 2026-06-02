import React, { useState, useEffect } from "react";
import ReusableModal from "../../Components/ReusableModal/ReusableModal";
import { IoMdAlert } from "react-icons/io";
import { PasswordInput } from "../../Components/Input/Inputs";
import { showToast, showApiError } from "../../Helper/ShowToast";
import "./ReusableModal.css";

const DeletePlanModal = ({ isOpen, onClose, onConfirm, plan }) => {
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
      await onConfirm({ plan, administratorPassword: password });
      onClose();
    } catch (err) {
      showApiError(err, "VERIFY_ADMIN_PASSWORD");
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
      <form onSubmit={handleConfirm} className="modal-form">
        <div className="delete-confirmation-content">
          <IoMdAlert className="warning-icon" />
          <h3>{title}</h3>
          <p>{message}</p>
          <div className="password-input-wrapper">
            <PasswordInput
              label="Administrative Password"
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your Administrative password"
              autoFocus={isOpen}
            />
          </div>
        </div>
      </form>
    </ReusableModal>
  );
};

export default DeletePlanModal;

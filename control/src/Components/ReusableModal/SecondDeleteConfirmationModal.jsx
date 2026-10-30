import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import ReusableModal from "./ReusableModal";
import { IoMdAlert } from "react-icons/io";
import { TextInput, SelectInput, PasswordInput } from "../Input/Inputs";
import "./ReusableModal.css";

const DeleteConfirmationModal = ({
  isOpen,
  onCancel,
  onConfirm,
  title,
  message,
  confirmButtonText = "Remove",
  confirmButtonColor = "#D92D20",
  showConfirmButton = true,
  showSecondaryButton = true,
  icon: IconComponent,
  isFeatureDeletion = false,
  featureGroupOptions: providedFeatureGroupOptions,
  isLoading = false,
  groupTitle,
  featureId,
  requirePassword = false,
}) => {
  const featureGroups = useSelector(
    (state) => state.featureManagement.featureGroups
  );
  const [step, setStep] = useState(
    isFeatureDeletion ? (requirePassword ? 1 : 1) : 0
  );
  const [selectedGroup, setSelectedGroup] = useState("");
  const [password, setPassword] = useState("");

  // Reset step and form state when modal opens or isFeatureDeletion changes
  useEffect(() => {
    if (isOpen) {
      setStep(isFeatureDeletion ? (requirePassword ? 1 : 1) : 0);
      setSelectedGroup("");
      setPassword("");
    }
  }, [isOpen, isFeatureDeletion, requirePassword]);

  // Add placeholder option to featureGroupOptions
  const featureGroupOptions = [
    { value: "", label: "Select ...", disabled: true, hidden: true },
    ...(providedFeatureGroupOptions ||
      featureGroups.map((group) => ({
        value: group.title,
        label: group.title,
      }))),
  ];

  const handleSelectGroup = () => {
    if (selectedGroup) {
      setStep(requirePassword ? 1 : 2);
    }
  };

  const handleProceedToPassword = () => {
    setStep(2);
  };

  const handleConfirm = () => {
    if (!requirePassword || password.trim()) {
      if (isFeatureDeletion) {
        onConfirm({ groupTitle, featureId, administratorPassword: password });
      } else {
        onConfirm({ selectedGroup, administratorPassword: password });
      }
      // Reset form state
      setSelectedGroup("");
      setPassword("");
      setStep(isFeatureDeletion ? (requirePassword ? 1 : 1) : 0);
      // Close the modal
      onCancel();
    }
  };

  const handleCancel = () => {
    setStep(isFeatureDeletion ? (requirePassword ? 1 : 1) : 0);
    setSelectedGroup("");
    setPassword("");
    onCancel();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleCancel}
      title=""
      primaryButtonText={
        step === 0 ? "Next" : step === 1 ? confirmButtonText : "Complete"
      }
      secondaryButtonText="Cancel"
      primaryButtonColor={confirmButtonColor}
      secondaryButtonColor="#ffffff"
      onPrimaryButtonClick={
        step === 0
          ? handleSelectGroup
          : step === 1
          ? requirePassword
            ? handleProceedToPassword
            : handleConfirm
          : handleConfirm
      }
      onSecondaryButtonClick={handleCancel}
      showPrimaryButton={showConfirmButton}
      showSecondaryButton={showSecondaryButton}
      primaryButtonDisabled={
        isLoading ||
        (step === 0 && !selectedGroup) ||
        (step === 2 && requirePassword && !password.trim())
      }
      secondaryButtonDisabled={isLoading}
      primaryButtonLoading={isLoading}
      footerClassName={
        showConfirmButton && !showSecondaryButton
          ? "center-footer"
          : !showConfirmButton && showSecondaryButton
          ? "center-footer"
          : ""
      }
    >
      <form className="modal-form">
        <div className="delete-confirmation-content">
          {step === 0 ? (
            <>
              <h3>Select Feature Group to Delete</h3>
              <SelectInput
                label="Feature Group"
                name="featureGroup"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                options={featureGroupOptions}
                placeholder="Select ..."
                emptyHint="No feature groups found. Create one in Feature Management."
              />
            </>
          ) : (
            <>
              {IconComponent ? (
                <IconComponent className="warning-icon" />
              ) : (
                <IoMdAlert className="warning-icon" />
              )}
              <h3>{title}</h3>
              {step === 1 ? (
                <p>{message}</p>
              ) : (
                <>
                  <form>
                    <p>Enter administrative password to complete this action</p>
                    <PasswordInput
                      label="Administrative Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your Administrative password"
                      disabled={isLoading}
                    />
                  </form>
                </>
              )}
            </>
          )}
        </div>
      </form>
    </ReusableModal>
  );
};

export default DeleteConfirmationModal;

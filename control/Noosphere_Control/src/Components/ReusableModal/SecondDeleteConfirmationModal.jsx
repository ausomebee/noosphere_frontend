import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import ReusableModal from './ReusableModal';
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
}) => {
  const featureGroups = useSelector((state) => state.featureManagement.featureGroups);
  const [step, setStep] = useState(isFeatureDeletion ? 1 : 0);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [password, setPassword] = useState("");

  // Reset step when modal opens or isFeatureDeletion changes
  useEffect(() => {
    if (isOpen) {
      setStep(isFeatureDeletion ? 1 : 0);
      setSelectedGroup("");
      setPassword("");
    }
  }, [isOpen, isFeatureDeletion]);

  // Add placeholder option to featureGroupOptions
  const featureGroupOptions = [
    { value: "", label: "Select ...", disabled: true, hidden: true }, // Placeholder option
    ...(providedFeatureGroupOptions || featureGroups.map((group) => ({
      value: group.title,
      label: group.title,
    }))),
  ];

  const handleSelectGroup = () => {
    if (selectedGroup) {
      setStep(1);
    }
  };

  const handleProceedToPassword = () => {
    setStep(2);
  };

  const handleConfirm = () => {
    if (password.trim()) {
      if (isFeatureDeletion) {
        onConfirm({ groupTitle, featureId }); // Pass groupTitle and featureId for feature deletion
      } else {
        onConfirm(selectedGroup); // Pass selectedGroup for feature group deletion
      }
      // Reset form state
      setSelectedGroup("");
      setPassword("");
      // Close the modal
      onCancel();
    }
  };

  const handleCancel = () => {
    setStep(isFeatureDeletion ? 1 : 0);
    setSelectedGroup("");
    setPassword("");
    onCancel();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleCancel}
      title=""
      primaryButtonText={step === 0 ? "Next" : step === 1 ? confirmButtonText : "Complete"}
      secondaryButtonText="Cancel"
      primaryButtonColor={confirmButtonColor}
      secondaryButtonColor="#ffffff"
      onPrimaryButtonClick={step === 0 ? handleSelectGroup : step === 1 ? handleProceedToPassword : handleConfirm}
      onSecondaryButtonClick={handleCancel}
      showPrimaryButton={showConfirmButton}
      showSecondaryButton={showSecondaryButton}
      primaryButtonDisabled={isLoading}
      secondaryButtonDisabled={isLoading}
      footerClassName={
        showConfirmButton && !showSecondaryButton
          ? 'center-footer'
          : !showConfirmButton && showSecondaryButton
          ? 'center-footer'
          : ''
      }
    >
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
              placeholder="Select ..." // Keep this in case SelectInput uses it
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
    </ReusableModal>
  );
};

export default DeleteConfirmationModal;
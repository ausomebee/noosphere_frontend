import React, { useState, useEffect } from 'react';
import ReusableModal from "./ReusableModal";
import { CheckboxInput } from "../Input/Inputs";

const AssignToPlanModal = ({ isOpen, onClose, onSave, featureId, currentGroupTitle, currentPlans }) => {
  const [selectedPlans, setSelectedPlans] = useState([]);

  // Pre-populate with the feature's current plans
  useEffect(() => {
    if (currentPlans) {
      setSelectedPlans(currentPlans);
    }
  }, [currentPlans]);

  const planOptions = [
    { value: "Basic", label: "Basic Plan" },
    { value: "Standard", label: "Standard Plan" },
    { value: "Pro", label: "Pro Plan" },
    { value: "Enterprise", label: "Enterprise Plan" },
  ];

  const handlePlanChange = (e) => {
    const { value, checked } = e.target;
    setSelectedPlans((prevPlans) =>
      checked
        ? [...prevPlans, value]
        : prevPlans.filter((plan) => plan !== value)
    );
  };

  const handleSave = () => {
    if (selectedPlans.length > 0) {
      onSave({
        featureId,
        groupTitle: currentGroupTitle,
        plans: selectedPlans,
      });
    }
    onClose();
  };

  const handleClose = () => {
    setSelectedPlans(currentPlans || []); // Reset to current plans on close
    onClose();
  };

  return (
    <div>
      <ReusableModal
        isOpen={isOpen}
        onClose={handleClose}
        title="Assign to plan"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        primaryButtonColor="#000000"
        secondaryButtonColor="#ffffff"
        onPrimaryButtonClick={handleSave}
        onSecondaryButtonClick={handleClose}
      >
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Select the plan(s) you want to assign this feature to
          </p>
          <div className="space-y-2">
            {planOptions.map((plan) => (
              <CheckboxInput
                key={plan.value}
                label={plan.label}
                name="plans"
                value={plan.value}
                checked={selectedPlans.includes(plan.value)}
                onChange={handlePlanChange}
              />
            ))}
          </div>
        </div>
      </ReusableModal>
    </div>
  );
};

export default AssignToPlanModal;
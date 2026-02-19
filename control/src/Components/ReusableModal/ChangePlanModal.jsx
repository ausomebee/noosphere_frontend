import React, { useState, useEffect, useMemo } from "react";
import ReusableModal from "./ReusableModal";
import { SelectInput } from "../Input/Inputs";

const ChangePlanModal = ({ isOpen, onClose, onSave, currentPlanId, plans = [] }) => {
  const [selectedToPlan, setSelectedToPlan] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Reset selected plan when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedToPlan("");
    }
  }, [isOpen]);

  // Memoize plan options for performance
  const planOptions = useMemo(
    () =>
      plans.map((plan) => ({
        value: plan.id,
        label: plan.name,
      })),
    [plans]
  );

  // Get current plan label
  const currentPlanLabel =
    plans.find((plan) => plan.id === currentPlanId)?.name || "Unknown Plan";

  // Handle save action
  const handleSave = async () => {
    if (!selectedToPlan) return;
    setIsLoading(true);
    try {
      await onSave({ fromPlanId: currentPlanId, toPlanId: selectedToPlan });
      setSelectedToPlan("");
      onClose();
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to change plan:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Plan"
      primaryButtonText={isLoading ? "Saving..." : "Save"}
      secondaryButtonText="Cancel"
      primaryButtonColor="#000000"
      secondaryButtonColor="#ffffff"
      onPrimaryButtonClick={handleSave}
      onSecondaryButtonClick={onClose}
      primaryButtonDisabled={isLoading || !selectedToPlan}
    >
      <div className="modal-content-wrapper" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <SelectInput
          label="Change from"
          value={currentPlanId || ""}
          options={[{ value: currentPlanId || "", label: currentPlanLabel }]}
          disabled
        />
        <SelectInput
          label="Change to"
          value={selectedToPlan}
          onChange={(e) => setSelectedToPlan(e.target.value)}
          options={[{ value: "", label: "Select a plan" }, ...planOptions]}
        />
      </div>
    </ReusableModal>
  );
};

export default ChangePlanModal;
import React, { useState } from "react";
import ReusableModal from "./ReusableModal";
import usePricingForm from "../../Pages/BillingsAndPayment/usePricingForm";
import { showToast } from "../../Helper/ShowToast";

const PricingPlanModal = ({
  isOpen,
  onClose,
  onSave,
  initialPlanType = "Standard",
  features = [],
  admins = [],
  tenants = [],
}) => {
  const initialData = {
    name: "",
    type: initialPlanType,
    assignedTo: "",
    accountManager: "",
    pricing: {
      pricePerMonth: { amount: "", currency: "USD" },
      pricePerYear: { amount: "", currency: "USD" },
      clients: "10",
      storage: "5GB",
      userOption: "clients",
    },
    features: [],
    extraPricing: [],
  };

  const {
    activeTab,
    setActiveTab,
    tabs,
    validateForm,
    handleSave,
    resetForm,
  } = usePricingForm({
    initialData,
    initialPlanType,
    features,
    admins,
    tenants,
    isEditMode: false, // Explicitly set for creating new plans
    onSave,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleNextClick = async () => {
    if (!validateForm(activeTab)) {
      showToast("Please fill in all required fields.", "error");
      return;
    }
    const currentIndex = tabs.findIndex((tab) => tab.name === activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1].name);
    } else {
      setIsSaving(true);
      try {
        await handleSave();
        handleClose();
      } catch {
        // Save failed (validation or API error). The error is already surfaced
        // via toast; keep the modal open so the user can correct and retry.
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handlePreviousClick = () => {
    const currentIndex = tabs.findIndex((tab) => tab.name === activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].name);
    } else {
      handleClose();
    }
  };

  return (
    isOpen && (
      <ReusableModal
        isOpen={isOpen}
        onClose={handleClose}
        title="Add New Plan"
        primaryButtonText={activeTab === tabs[tabs.length - 1].name ? "Save" : "Next"}
        secondaryButtonText={activeTab === tabs[0].name ? "Cancel" : "Previous"}
        primaryButtonColor="#000000"
        secondaryButtonColor="#ffffff"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onPrimaryButtonClick={handleNextClick}
        onSecondaryButtonClick={handlePreviousClick}
        primaryButtonLoading={isSaving}
      />
    )
  );
};

export default PricingPlanModal;
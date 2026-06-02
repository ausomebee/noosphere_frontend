import React, { useMemo, useState } from "react";
import ReusableModal from "./ReusableModal";
import usePricingForm from "../../Pages/BillingsAndPayment/usePricingForm";
import { showToast } from "../../Helper/ShowToast";

const EditPricingModal = ({ isOpen, onClose, onSave, plan, features = [], admins = [], tenants = [] }) => {

  // Memoize initialData and ensure features are included
  const initialData = useMemo(() => {
    if (!plan) {
      return {
        name: "",
        type: "Standard",
        assignedTo: "",
        accountManager: "",
        colourCode: "#000000",
        pricing: {
          pricePerMonth: { amount: "0", currency: "USD" },
          pricePerYear: { amount: "0", currency: "USD" },
          clients: "unlimited",
          storage: "unlimited",
          userOption: "clients",
        },
        features: [],
        extraPricing: [],
      };
    }

    // Merge plan.features with features prop to ensure all features are available
    const planFeatures = Array.isArray(plan.features)
      ? plan.features.map((f, i) => ({
          id: f.id || `temp-${i}`,
          name: f.name || f || "Unnamed Feature",
        }))
      : [];

    const mergedFeatures = [
      ...planFeatures,
      ...(Array.isArray(features)
        ? features.map((f, i) => ({
            id: String(f.id || `feature-${i}`),
            name: f.name || "Unnamed Feature",
          }))
        : []),
    ].reduce((acc, f) => {
      // Remove duplicates by id or name
      if (!acc.some((existing) => existing.id === f.id || existing.name === f.name)) {
        acc.push(f);
      }
      return acc;
    }, []);

    return {
      name: plan.name || "Unnamed Plan",
      type: plan.type === "enterprise" ? "Enterprise" : "Standard",
      assignedTo: plan.tenantId || "",
      accountManager: plan.accountManager || "",
      colourCode: plan.colourCode || "#000000",
      pricing: {
        pricePerMonth: {
          amount: plan.pricing?.cost
            ? String(parseFloat(plan.pricing.cost.match(/(\d+\.?\d*)/)?.[1] || 0))
            : "0",
          currency: plan.pricing?.cost?.match(/([A-Z]{3})/)?.[1] || "USD",
        },
        pricePerYear: {
          amount: plan.pricing?.cost
            ? String((parseFloat(plan.pricing.cost.match(/(\d+\.?\d*)/)?.[1] || 0) * 12).toFixed(2))
            : "0",
          currency: plan.pricing?.cost?.match(/([A-Z]{3})/)?.[1] || "USD",
        },
        clients: plan.pricing?.extra
          ? String(parseInt(plan.pricing.extra.match(/(\d+)/)?.[1] || 10, 10))
          : "unlimited",
        storage: plan.pricing?.storage
          ? plan.pricing.storage.match(/(\d+|unlimited)/)?.[1] + "GB" || "unlimited"
          : "unlimited",
        userOption: plan.pricing?.userType || "clients",
      },
      features: planFeatures,
      extraPricing: Array.isArray(plan.extraFeatures)
        ? plan.extraFeatures.map((e, i) => ({
            id: e.id || `extra-${i}`,
            cost: "200",
            storage: "2400",
            extra: "USD",
            name: e.name || "Unnamed Extra Feature",
          }))
        : [],
    };
  }, [plan, features]);


  const {
    activeTab,
    setActiveTab,
    tabs,
    validateForm,
    handleSave,
    resetForm,
  } = usePricingForm({
    initialData,
    features, // Pass the original features prop
    admins,
    tenants,
    isEditMode: true,
    onSave,
    initialPlanType: initialData.type,
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
        title="Edit Plan"
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

export default EditPricingModal;
import React, { useState, useEffect, useCallback } from "react";
import ReusableModal from "./ReusableModal";
import { RadioInput, SelectInput } from "../Input/Inputs";
import Button from "../Button/Button";
import useAuth from "../../hooks/useAuth";
import billingApi from "../../api/BillingApis";
import invoiceApi from "../../api/InvoiceApi";
import { showToast, showApiError } from "../../Helper/ShowToast";
import "../ProspectPanel/ProspectPanel.css";
import SectionLoader from "../SectionLoader";

const getFrequencyPayload = (freq) => {
  if (freq === "monthly") return { billingFrequency: "Monthly", quantity: 1 };
  const match = freq.match(/^(\d+)_years?$/);
  if (match)
    return { billingFrequency: "Yearly", quantity: parseInt(match[1], 10) };
  return { billingFrequency: "Monthly", quantity: 1 };
};

const formatEventLabel = (event) => {
  switch (event) {
    case "PAYMENT_LINK_GENERATED":
      return "Payment link generated";
    case "PAYMENT_LINK_REGENERATED":
      return "Payment link regenerated";
    case "PAYMENT_LINK_EXPIRED":
      return "Payment link expired";
    case "PAYMENT_LINK_PAID":
      return "Plan purchase payment made on";
    default:
      return event;
  }
};

const formatHistoryDate = (isoString) => {
  const d = new Date(isoString);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yy}, ${hh}:${min}`;
};

const GeneratePaymentLinkModal = ({ isOpen, onClose, tenantId }) => {
  const { accessToken, refreshToken } = useAuth();

  const [activeTab, setActiveTab] = useState("Plan Settings");
  const [selectedPlanType, setSelectedPlanType] = useState("STANDARD");
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [renewalFrequency, setRenewalFrequency] = useState("");
  const [generatedLink, setGeneratedLink] = useState(null);
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const fetchPlans = useCallback(
    async (planType) => {
      try {
        setLoadingPlans(true);
        const response = await billingApi.GetPlanByPlanType({
          planType,
          accessToken,
          refreshToken,
        });
        const activePlans = (response.data || []).filter((p) => p.active);
        setPlans(activePlans);
        setSelectedPlanId("");
        setSelectedPlan(null);
      } catch (err) {
        showApiError(err, "LOAD_PLANS");
        setPlans([]);
      } finally {
        setLoadingPlans(false);
      }
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (isOpen) {
      fetchPlans(selectedPlanType);
    }
  }, [selectedPlanType, isOpen, fetchPlans]);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab("Plan Settings");
      setSelectedPlanType("STANDARD");
      setSelectedPlanId("");
      setSelectedPlan(null);
      setRenewalFrequency("");
      setGeneratedLink(null);
      setInvoiceHistory([]);
    }
  }, [isOpen]);

  const handlePlanSelect = (planId) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    setSelectedPlan(plan || null);
  };

  const handleGenerateLinks = async () => {
    if (!selectedPlanId) {
      showToast("Please select a plan", "error");
      return;
    }
    if (!renewalFrequency) {
      showToast("Please select a renewal frequency", "error");
      return;
    }
    setIsGeneratingLink(true);
    try {
      const { billingFrequency, quantity } =
        getFrequencyPayload(renewalFrequency);
      const res = await invoiceApi.GeneratePaymentLink({
        tenantId,
        planId: selectedPlanId,
        billingFrequency,
        quantity,
        accessToken,
        refreshToken,
      });
      setGeneratedLink(res.data || null);
      setActiveTab("Payment Link");
      showToast("Payment link generated successfully!", "success");
    } catch (err) {
      showApiError(err, "GENERATE_PAYMENT_LINK");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = async (url) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      showToast("Link copied to clipboard!", "success");
    } catch {
      showToast("Failed to copy link", "error");
    }
  };

  const fetchInvoiceHistory = useCallback(async () => {
    if (!tenantId) return;
    try {
      setIsLoadingHistory(true);
      const res = await invoiceApi.GetInvoiceHistory({
        tenantId,
        accessToken,
        refreshToken,
      });
      setInvoiceHistory(res.data || []);
    } catch (err) {
      if (import.meta.env.DEV)
        console.error("Failed to fetch invoice history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen && activeTab === "Payment Link") {
      fetchInvoiceHistory();
    }
  }, [isOpen, activeTab, fetchInvoiceHistory]);

  const handleRegenerateLink = async () => {
    if (!tenantId) return;
    setIsGeneratingLink(true);
    try {
      const res = await invoiceApi.RegeneratePaymentLink({
        tenantId,
        accessToken,
        refreshToken,
      });
      setGeneratedLink(res.data || null);
      showToast("Payment link regenerated!", "success");
    } catch (err) {
      showApiError(err, "REGENERATE_PAYMENT_LINK");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Payment Link"
      tabs={[
        {
          name: "Plan Settings",
          content: (
            <div className="plan-settings-tab">
              <div className="plan-type-section">
                <label className="plan-type-section-label">
                  Select Plan Type
                </label>
                <div className="plan-type-radios">
                  <label className="plan-type-radio-label">
                    <RadioInput
                      name="planType"
                      value="STANDARD"
                      checked={selectedPlanType === "STANDARD"}
                      onChange={(e) => setSelectedPlanType(e.target.value)}
                    />
                    Standard
                  </label>
                  <label className="plan-type-radio-label">
                    <RadioInput
                      name="planType"
                      value="ENTERPRISE"
                      checked={selectedPlanType === "ENTERPRISE"}
                      onChange={(e) => setSelectedPlanType(e.target.value)}
                    />
                    Enterprise
                  </label>
                </div>
              </div>

              <SelectInput
                label="Renewal Frequency"
                value={renewalFrequency}
                onChange={(e) => setRenewalFrequency(e.target.value)}
                options={[
                  { value: "", label: "Select frequency" },
                  { value: "monthly", label: "Monthly" },
                  { value: "1_year", label: "1 Year" },
                  { value: "2_years", label: "2 Years" },
                  { value: "3_years", label: "3 Years" },
                  { value: "4_years", label: "4 Years" },
                  { value: "5_years", label: "5 Years" },
                  { value: "6_years", label: "6 Years" },
                  { value: "7_years", label: "7 Years" },
                  { value: "8_years", label: "8 Years" },
                  { value: "9_years", label: "9 Years" },
                  { value: "10_years", label: "10 Years" },
                ]}
              />

              <SelectInput
                label="Select Plan"
                value={selectedPlanId}
                onChange={(e) => handlePlanSelect(e.target.value)}
                options={[
                  {
                    value: "",
                    label: loadingPlans ? "Loading plans..." : "Select a plan",
                  },
                  ...plans.map((p) => ({ value: p.id, label: p.name })),
                ]}
                disabled={loadingPlans}
                emptyHint="No plans found. Create one in Billing & Payments → Plans & Pricing."
              />

              {selectedPlan && (
                <div className="modal-plan-card">
                  <div
                    className="modal-plan-header"
                    style={{
                      backgroundColor: selectedPlan.colourCode || "#003A9B",
                    }}
                  >
                    <h3 className="modal-plan-title">{selectedPlan.name}</h3>
                  </div>
                  <div className="modal-plan-pricing">
                    <h4>Pricing</h4>
                    <p>
                      {selectedPlan.pricePerMonth?.currency || "$"}
                      {selectedPlan.pricePerMonth?.price || 0} PER MONTH
                    </p>
                    <p>
                      {selectedPlan.forStorage
                        ? `${selectedPlan.forStorage} DATA STORAGE`
                        : "Unlimited DATA STORAGE"}
                    </p>
                    {selectedPlan.extraFeaturesWithPrice?.length > 0 && (
                      <p>
                        $
                        {selectedPlan.extraFeaturesWithPrice[0]?.pricePerMonth
                          ?.price || 0}{" "}
                        FOR EVERY EXTRA CLIENT
                      </p>
                    )}
                  </div>
                  <div className="modal-plan-features">
                    <h4>PLAN FEATURES</h4>
                    <ul>
                      {selectedPlan.features?.map((f, i) => (
                        <li key={f.id || i}>{f.name || f}</li>
                      ))}
                      {(!selectedPlan.features ||
                        selectedPlan.features.length === 0) && (
                        <li>No features available</li>
                      )}
                    </ul>
                  </div>
                  {selectedPlanType === "ENTERPRISE" &&
                    selectedPlan.extraFeatures?.length > 0 && (
                      <div className="modal-plan-extras">
                        <h4>PLAN EXTRAS</h4>
                        <ul>
                          {selectedPlan.extraFeatures.map((f, i) => (
                            <li key={f.id || i}>{f.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              )}
            </div>
          ),
        },
        {
          name: "Payment Link",
          content: (
            <div className="payment-link-tab">
              {generatedLink && (
                <div className="payment-link-row active">
                  <div className="payment-link-url-container">
                    <span className="payment-link-url">{generatedLink}</span>
                    <button
                      className="copy-link-btn"
                      onClick={() => handleCopyLink(generatedLink)}
                    >
                      Copy link
                    </button>
                  </div>
                </div>
              )}
              {isLoadingHistory ? (
                <SectionLoader />
              ) : invoiceHistory.length === 0 && !generatedLink ? (
                <p className="no-links-message">
                  No payment link generated yet. Go to Plan Settings to generate
                  a link.
                </p>
              ) : (
                <div className="payment-links-list">
                  {(() => {
                    const lastExpiredIdx = invoiceHistory.reduce(
                      (last, entry, i) =>
                        entry.event === "PAYMENT_LINK_EXPIRED" ? i : last,
                      -1
                    );
                    return invoiceHistory.map((entry, idx) => (
                      <div key={entry.tokenId || idx} className="history-entry">
                        <span className="history-entry-text">
                          {formatEventLabel(entry.event)}{" "}
                          {formatHistoryDate(entry.time)}
                        </span>
                        {entry.event === "PAYMENT_LINK_EXPIRED" &&
                          idx === lastExpiredIdx && (
                            <Button
                              label="Regenerate link"
                              variant="primary"
                              onClick={handleRegenerateLink}
                              width="auto"
                              loading={isGeneratingLink}
                            />
                          )}
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          ),
        },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      primaryButtonText={
        activeTab === "Plan Settings" ? "Generate payment link" : "Close"
      }
      secondaryButtonText={
        activeTab === "Plan Settings" ? "Cancel" : null
      }
      onPrimaryButtonClick={
        activeTab === "Plan Settings" ? handleGenerateLinks : onClose
      }
      onSecondaryButtonClick={
        activeTab === "Plan Settings" ? onClose : null
      }
      primaryButtonLoading={isGeneratingLink}
    />
  );
};

export default GeneratePaymentLinkModal;

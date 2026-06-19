import { useState, useEffect, useRef } from "react";
import { showToast } from "../../Helper/ShowToast";
import {
  RadioInput,
  SelectInput,
  TextInput,
  SwitchInput,
} from "../../Components/Input/Inputs";
import Button from "../../Components/Button/Button";
import { AiOutlineDelete } from "react-icons/ai";
import "../../Components/ReusableModal/ReusableModal.css";
import ColorPicker from "../../Components/ColorPicker";

// Debounce utility function
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Deep equality check for objects
const areEqual = (obj1, obj2) => {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};

const usePricingForm = ({
  initialData = {},
  initialPlanType = "Standard",
  features = [],
  admins = [],
  isEditMode = false,
  onSave,
}) => {

  const [activeTab, setActiveTab] = useState("General");
  const [enableExtraPricing, setEnableExtraPricing] = useState(
    Array.isArray(initialData.extraPricing) && initialData.extraPricing.length > 0
  );
  const [userOption, setUserOption] = useState(
    initialData.pricing?.userOption || "clients"
  );
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Normalize features to ensure consistent IDs
  const normalizedFeatures = Array.isArray(features)
    ? features.map((f, i) => ({
        id: String(f.id || `feature-${i}`),
        name: f.name || "Unnamed Feature",
      }))
    : [];

  const [formData, setFormData] = useState({
    name: initialData.name || "",
    type: initialData.type || initialPlanType,
    accountManager: initialData.accountManager || "",
    colorCode: initialData.colourCode || "#000000",
    pricing: {
      pricePerMonth: {
        amount: initialData.pricing?.pricePerMonth?.amount || "0",
        currency: initialData.pricing?.pricePerMonth?.currency || "USD",
      },
      pricePerYear: {
        amount: initialData.pricing?.pricePerYear?.amount || "0",
        currency: initialData.pricing?.pricePerYear?.currency || "USD",
      },
      clients: initialData.pricing?.clients || "unlimited",
      storage: initialData.pricing?.storage || "unlimited",
      userOption: initialData.pricing?.userOption || "clients",
    },
    features: Array.isArray(initialData.features)
      ? initialData.features.map((f, i) => ({
          id: String(f.id || `temp-${i}`),
          name: f.name || "Unnamed Feature",
          uniqueId: f.uniqueId || Date.now() + i,
        }))
      : [],
    extraPricing: Array.isArray(initialData.extraPricing)
      ? initialData.extraPricing.map((e, i) => ({
          id: String(e.id || `extra-${i}`),
          cost: String(e.cost || "0"),
          storage: String(e.storage || "0"),
          extra: e.extra || "USD",
          name: e.name || "Unnamed Extra Feature",
        }))
      : [],
  });
  const [pricePerMonth, setPricePerMonth] = useState(
    initialData.pricing?.pricePerMonth?.amount || "0"
  );
  const [pricePerYear, setPricePerYear] = useState(
    initialData.pricing?.pricePerYear?.amount || "0"
  );
  const [clients, setClients] = useState(
    initialData.pricing?.clients || "unlimited"
  );
  const [storage, setStorage] = useState(
    initialData.pricing?.storage || "unlimited"
  );
  const [currency, setCurrency] = useState(
    initialData.pricing?.pricePerMonth?.currency || "USD"
  );

  // Store previous initialData for comparison
  const prevInitialDataRef = useRef(initialData);

  // Sync state variables with initialData only when necessary
  useEffect(() => {
    if (areEqual(prevInitialDataRef.current, initialData)) {
      return;
    }

    const newFormData = {
      name: initialData.name || "",
      type: initialData.type || initialPlanType,
      accountManager: initialData.accountManager || "",
      colorCode: initialData.colourCode || "#000000",
      pricing: {
        pricePerMonth: {
          amount: initialData.pricing?.pricePerMonth?.amount || "0",
          currency: initialData.pricing?.pricePerMonth?.currency || "USD",
        },
        pricePerYear: {
          amount: initialData.pricing?.pricePerYear?.amount || "0",
          currency: initialData.pricing?.pricePerYear?.currency || "USD",
        },
        clients: initialData.pricing?.clients || "unlimited",
        storage: initialData.pricing?.storage || "unlimited",
        userOption: initialData.pricing?.userOption || "clients",
      },
      features: Array.isArray(initialData.features)
        ? initialData.features.map((f, i) => {
            // Try to match with normalizedFeatures
            const matchedFeature = normalizedFeatures.find(
              (nf) => nf.name === f.name || String(nf.id) === String(f.id)
            );
            return {
              id: matchedFeature ? String(matchedFeature.id) : String(f.id || `temp-${i}`),
              name: matchedFeature ? matchedFeature.name : f.name || "Unnamed Feature",
              uniqueId: f.uniqueId || Date.now() + i,
            };
          })
        : [],
      extraPricing: Array.isArray(initialData.extraPricing)
        ? initialData.extraPricing.map((e, i) => ({
            id: String(e.id || `extra-${i}`),
            cost: String(e.cost || "0"),
            storage: String(e.storage || "0"),
            extra: e.extra || "USD",
            name: e.name || "Unnamed Extra Feature",
          }))
        : [],
    };

    setFormData((prev) => (areEqual(prev, newFormData) ? prev : newFormData));
    setPricePerMonth(initialData.pricing?.pricePerMonth?.amount || "0");
    setPricePerYear(initialData.pricing?.pricePerYear?.amount || "0");
    setClients(initialData.pricing?.clients || "unlimited");
    setStorage(initialData.pricing?.storage || "unlimited");
    setCurrency(initialData.pricing?.pricePerMonth?.currency || "USD");
    setUserOption(initialData.pricing?.userOption || "clients");
    setEnableExtraPricing(
      Array.isArray(initialData.extraPricing) && initialData.extraPricing.length > 0
    );


    prevInitialDataRef.current = initialData;
  }, [initialData, initialPlanType, normalizedFeatures]);

  // Log formData changes for debugging with debouncing
  const debouncedLog = useRef(
    debounce((data) => {
    }, 500)
  ).current;

  useEffect(() => {
    debouncedLog(formData);
  }, [formData]);

  const handleOpenColorPicker = () => {
    setShowColorPicker(true);
  };

  const handleCloseColorPicker = () => {
    setShowColorPicker(false);
  };

  const availableFeatures = Array.isArray(normalizedFeatures)
    ? normalizedFeatures.filter((feature) => {
        if (!feature?.id || !feature?.name) {
        
          return false;
        }
        const isAssigned =
          formData.features.some((f) => String(f.id) === String(feature.id)) ||
          formData.extraPricing.some(
            (extra) => String(extra.id) === String(feature.id)
          );
        return !isAssigned;
      })
    : [];

  // Handle extra pricing addition only if needed
  useEffect(() => {
    if (
      !Array.isArray(normalizedFeatures) ||
      !normalizedFeatures.length ||
      !normalizedFeatures.every((f) => f.id && f.name)
    ) {

      return;
    }
    if (
      isEditMode &&
      enableExtraPricing &&
      formData.extraPricing.length === 0 &&
      Array.isArray(initialData.extraPricing) &&
      initialData.extraPricing.length === 0
    ) {
      handleAddExtraPricing(normalizedFeatures[0]?.id);
    }
  }, [enableExtraPricing, normalizedFeatures, isEditMode, initialData.extraPricing]);

  const clientOptions = [
    { value: "5", label: "5" },
    { value: "10", label: "10" },
    { value: "15", label: "15" },
    { value: "20", label: "20" },
    { value: "30", label: "30" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
    { value: "200", label: "200" }, 
    { value: "500", label: "500" }, 
    { value: "unlimited", label: "Unlimited" },
  ];

  const currencySymbols = { USD: "$", EUR: "€", GBP: "£" };

  const storageOptions = Array.from({ length: 20 }, (_, i) => {
    const value = 5 * (i + 1) + "GB";
    return { value, label: value };
  }).concat([
    { value: "unlimited", label: "Unlimited" },
  ]);

  const currencyOptions = [
    { value: "USD", label: "USD" },
    { value: "EUR", label: "EUR" },
    { value: "GBP", label: "GBP" },
  ];

  const userOptions = [
    { value: "clients", label: "Clients" },
    { value: "staffs", label: "Staffs" },
  ];

  const adminOptions = [
    { value: "", label: "Select Manager" },
    ...admins.map((admin) => ({
      value: admin.id,
      label: admin.name || admin.id,
    })),
  ];

  const validateForm = (tabName) => {
    const msgs = [];
    if (tabName === "General") {
      if (!formData.name?.trim()) msgs.push("Plan name is required.");
      if (!formData.colorCode || !/^#[0-9A-Fa-f]{6}$/.test(formData.colorCode))
        msgs.push("A valid hex color code is required.");
    } else if (tabName === "Setting & Pricing") {
      if (!pricePerMonth || !/^\d*\.?\d+$/.test(pricePerMonth))
        msgs.push("Valid monthly price is required.");
      if (!pricePerYear || !/^\d*\.?\d+$/.test(pricePerYear))
        msgs.push("Valid yearly price is required.");
      if (!clients) msgs.push("Number of clients is required.");
      if (!storage) msgs.push("Storage amount is required.");
      if (formData.features.some((f) => !f.id || f.id.startsWith("temp-")))
        msgs.push("All features must be selected.");
      if (
        enableExtraPricing &&
        formData.extraPricing.some(
          (e) => !e.id || e.id.startsWith("extra-") || !e.cost || !e.storage
        )
      )
        msgs.push("All extra features must have valid values.");
    }
    if (msgs.length > 0) {
      showToast(msgs[0], "error");
      return false;
    }
    return true;
  };

  const handleAddFeature = (featureId) => {
    if (!featureId || !Array.isArray(normalizedFeatures) || !normalizedFeatures.length) {
      showToast("No features available to add.", "error");
      return;
    }
    const selectedFeature = normalizedFeatures.find(
      (f) => String(f.id) === String(featureId)
    );
    if (selectedFeature) {
      setFormData((prev) => ({
        ...prev,
        features: [
          ...prev.features,
          { ...selectedFeature, uniqueId: Date.now() + Math.random() },
        ],
      }));
    } else {
      showToast("Selected feature not found.", "error");
    }
  };

  const handleUpdateFeature = (uniqueId, newFeatureId) => {
    if (newFeatureId) {
      const selectedFeature = normalizedFeatures.find(
        (f) => String(f.id) === String(newFeatureId)
      );
      if (selectedFeature) {
        setFormData((prev) => ({
          ...prev,
          features: prev.features.map((feature) =>
            feature.uniqueId === uniqueId
              ? { ...selectedFeature, uniqueId }
              : feature
          ),
        }));
      } else {
        showToast("Selected feature not found.", "error");
      }
    }
  };

  const handleDeleteFeature = (uniqueId) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter(
        (feature) => feature.uniqueId !== uniqueId
      ),
    }));
  };

  const handleAddExtraPricing = (featureId) => {
    if (
      !Array.isArray(normalizedFeatures) ||
      !normalizedFeatures.length ||
      !normalizedFeatures.some((f) => f.id)
    ) {
      showToast("No valid features available for extra pricing.", "error");
      return;
    }
    const validFeatureId =
      featureId && normalizedFeatures.some((f) => String(f.id) === String(featureId))
        ? featureId
        : normalizedFeatures[0]?.id;
    if (!validFeatureId) {
      showToast("No valid feature ID available.", "error");
      return;
    }
    const selectedFeature = normalizedFeatures.find((f) => String(f.id) === String(validFeatureId));
    setFormData((prev) => ({
      ...prev,
      extraPricing: [
        ...prev.extraPricing,
        {
          id: String(validFeatureId),
          cost: "0",
          storage: "0",
          extra: currency,
          name: selectedFeature?.name || "Unnamed Extra Feature",
        },
      ],
    }));
  };

  const handleUpdateExtraPricing = (index, field, value) => {
    setFormData((prev) => {
      const newExtraPricing = [...prev.extraPricing];
      newExtraPricing[index] = {
        ...newExtraPricing[index],
        [field]: String(value),
      };
      if (field === "id") {
        const selectedFeature = normalizedFeatures.find((f) => String(f.id) === String(value));
        newExtraPricing[index].name = selectedFeature?.name || "Unnamed Extra Feature";
      }
      return { ...prev, extraPricing: newExtraPricing };
    });
  };

  const handleDeleteExtraPricing = (index) => {
    setFormData((prev) => ({
      ...prev,
      extraPricing: prev.extraPricing.filter((_, i) => i !== index),
    }));
  };

  const handleSave = () => {
    if (!validateForm(activeTab)) {
      showToast("Please correct the errors before saving.", "error");
      return;
    }

    const planData = {
      name: formData.name,
      type: formData.type,
      accountManager: formData.accountManager,
      colourCode: formData.colorCode,
      pricing: {
        pricePerMonth: { amount: pricePerMonth, currency },
        pricePerYear: { amount: pricePerYear, currency },
        clients,
        storage,
        userOption,
      },
      features: formData.features.map((feature) => ({
        id: feature.id,
        name: feature.name,
      })),
      extraPricing: formData.extraPricing.map((extra) => ({
        id: extra.id,
        pricePerMonth: {
          price: parseFloat(extra.cost) || 0,
          currency: extra.extra,
        },
        pricePerYear: {
          price: parseFloat(extra.storage) || 0,
          currency: extra.extra,
        },
      })),
    };

    onSave(planData);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: initialPlanType,
      accountManager: "",
      colorCode: "#000000",
      pricing: {
        pricePerMonth: { amount: "0", currency: "USD" },
        pricePerYear: { amount: "0", currency: "USD" },
        clients: "unlimited",
        storage: "unlimited",
        userOption: "clients",
      },
      features: [],
      extraPricing: [],
    });
    setActiveTab("General");

    setEnableExtraPricing(false);
    setPricePerMonth("0");
    setPricePerYear("0");
    setClients("unlimited");
    setStorage("unlimited");
    setCurrency("USD");
    setUserOption("clients");
    setShowColorPicker(false);
  };

  const tabs = [
    {
      name: "General",
      content: (
        <div className="modal-content-wrapper">
          <div style={{ marginBottom: "18px" }}>
            <p style={{ marginBottom: "16px", fontSize: "14px" }}>Plan Type</p>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <RadioInput
                label="Enterprise Plan"
                checked={formData.type === "Enterprise"}
                onChange={() =>
                  setFormData((prev) => ({ ...prev, type: "Enterprise" }))
                }
                value="Enterprise"
              />
              <RadioInput
                label="Standard Plan"
                checked={formData.type === "Standard"}
                onChange={() =>
                  setFormData((prev) => ({ ...prev, type: "Standard" }))
                }
                value="Standard"
              />
            </div>
          </div>
          <TextInput
            label="Plan Name"
            id="planName"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Type something"

          />
          {formData.type === "Enterprise" && (
            <SelectInput
              label="Manager"
              id="accountManager"
              value={formData.accountManager}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  accountManager: e.target.value,
                }))
              }
              options={adminOptions}
              placeholder="Select Manager"
            />
          )}
          <div className="color-picker-container">
            <div
              className="color-picker-row"
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: "20px",
              }}
            >
              <label style={{ marginRight: "10px" }}>Colour code</label>
              <div
                className="color-preview"
                role="button"
                tabIndex={0}
                onClick={handleOpenColorPicker}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    handleOpenColorPicker();
                }}
                title="Change colour"
                style={{
                  backgroundColor: formData.colorCode || "#000000",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  display: "inline-block",
                  cursor: "pointer",
                }}
              ></div>
              <button
                className="change-button"
                onClick={handleOpenColorPicker}
                style={{
                  marginLeft: "auto",
                  color: "#0000EE",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Change
              </button>
            </div>
          </div>
          {showColorPicker && (
            <ColorPicker
              color={formData.colorCode || "#000000"}
              onChange={(color) =>
                setFormData((prev) => ({ ...prev, colorCode: color }))
              }
              onClose={handleCloseColorPicker}
            />
          )}
        </div>
      ),
    },
    {
      name: "Setting & Pricing",
      content: (
        <div className="pricing-plan-custom-modal-content">
          <div className="pricing-plan-section-titles">Main Features</div>
          <div className="pricing-plan-features-list">
            {formData.features.map((feature) => (
              <div key={feature.uniqueId} className="pricing-plan-feature-item">
                <select
                  value={feature.id || ""}
                  onChange={(e) =>
                    handleUpdateFeature(feature.uniqueId, e.target.value)
                  }
                  className="pricing-plan-custom-select pricing-plan-feature-select-custom"
                  style={{ flex: 1, marginRight: "8px" }}
                >
                  <option value="">Select Feature</option>
                  {normalizedFeatures.length > 0 ? (
                    normalizedFeatures.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      No features available
                    </option>
                  )}
                </select>
                <button
                  className="pricing-plan-delete-btn"
                  onClick={() => handleDeleteFeature(feature.uniqueId)}
                >
                  <AiOutlineDelete color="#B42318" size={16} />
                </button>
              </div>
            ))}

            <div className="pricing-plan-add-button-container">
              <Button
                label="Add Feature"
                variant="outline"
                iconPosition="left"
                onClick={() => handleAddFeature(normalizedFeatures[0]?.id || "")}
                width="auto"
                disabled={!normalizedFeatures.length}
              />
              {!normalizedFeatures.length ? (
                <p style={{ color: "red", fontSize: "12px", marginTop: "8px" }}>
                  No features available.
                </p>
              ) : null}
            </div>

            <div
              className="pricing-plan-form-group"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <label
                className="pricing-plan-custom-label"
                style={{ flex: "0 0 120px" }}
              >
                Price per Month
              </label>
              <div
                className="pricing-plan-input-group"
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "1px solid #e5e5e5",
                  borderRadius: "10px",
                  overflow: "hidden",
                  flex: 1,
                }}
              >
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    type="text"
                    value={pricePerMonth}
                    onChange={(e) => {
                      setPricePerMonth(e.target.value);
                      setFormData((prev) => ({
                        ...prev,
                        pricing: {
                          ...prev.pricing,
                          pricePerMonth: {
                            ...prev.pricing.pricePerMonth,
                            amount: e.target.value,
                          },
                        },
                      }));
                    }}
                    placeholder="0.00"
                    className={`pricing-plan-custom-input ${""}`}
                    style={{
                      border: "none",
                      borderRadius: "0",
                      paddingLeft: "24px",
                      width: "100%",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      left: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#333",
                      fontWeight: "500",
                    }}
                  >
                    {currencySymbols[currency]}
                  </span>
                </div>
                <select
                  value={currency}
                  onChange={(e) => {
                    setCurrency(e.target.value);
                    setFormData((prev) => ({
                      ...prev,
                      pricing: {
                        ...prev.pricing,
                        pricePerMonth: {
                          ...prev.pricing.pricePerMonth,
                          currency: e.target.value,
                        },
                        pricePerYear: {
                          ...prev.pricing.pricePerYear,
                          currency: e.target.value,
                        },
                      },
                    }));
                  }}
                  className="pricing-plan-custom-select"
                  style={{
                    border: "none",
                    borderLeft: "1px solid #e5e5e5",
                    borderRadius: "0 6px 6px 0",
                  }}
                >
                  {currencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              className="pricing-plan-form-group"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <label
                className="pricing-plan-custom-label"
                style={{ flex: "0 0 120px" }}
              >
                Price per Year
              </label>
              <div
                className="pricing-plan-input-group"
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "1px solid #e5e5e5",
                  borderRadius: "10px",
                  overflow: "hidden",
                  flex: 1,
                }}
              >
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    type="text"
                    value={pricePerYear}
                    onChange={(e) => {
                      setPricePerYear(e.target.value);
                      setFormData((prev) => ({
                        ...prev,
                        pricing: {
                          ...prev.pricing,
                          pricePerYear: {
                            ...prev.pricing.pricePerYear,
                            amount: e.target.value,
                          },
                        },
                      }));
                    }}
                    placeholder="0.00"
                    className={`pricing-plan-custom-input ${""}`}
                    style={{
                      border: "none",
                      borderRadius: "0",
                      paddingLeft: "24px",
                      width: "100%",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      left: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#333",
                      fontWeight: "500",
                    }}
                  >
                    {currencySymbols[currency]}
                  </span>
                </div>
                <select
                  value={currency}
                  onChange={(e) => {
                    setCurrency(e.target.value);
                    setFormData((prev) => ({
                      ...prev,
                      pricing: {
                        ...prev.pricing,
                        pricePerMonth: {
                          ...prev.pricing.pricePerMonth,
                          currency: e.target.value,
                        },
                        pricePerYear: {
                          ...prev.pricing.pricePerYear,
                          currency: e.target.value,
                        },
                      },
                    }));
                  }}
                  className="pricing-plan-custom-select"
                  style={{
                    border: "none",
                    borderLeft: "1px solid #e5e5e5",
                    borderRadius: "0 6px 6px 0",
                  }}
                >
                  {currencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pricing-plan-form-group pricing-plan-for-group">
              <div className="pricing-plan-input-group">
                <label className="pricing-plan-custom-label">For</label>
                <select
                  value={clients}
                  onChange={(e) => {
                    setClients(e.target.value);
                    setFormData((prev) => ({
                      ...prev,
                      pricing: {
                        ...prev.pricing,
                        clients: e.target.value,
                      },
                    }));
                  }}
                  className="pricing-plan-custom-select"
                >
                  {clientOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={userOption}
                  onChange={(e) => {
                    setUserOption(e.target.value);
                    setFormData((prev) => ({
                      ...prev,
                      pricing: {
                        ...prev.pricing,
                        userOption: e.target.value,
                      },
                    }));
                  }}
                  className="pricing-plan-custom-select"
                >
                  {userOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pricing-plan-input-group">
                <label className="pricing-plan-custom-label">For</label>
                <select
                  value={storage}
                  onChange={(e) => {
                    setStorage(e.target.value);
                    setFormData((prev) => ({
                      ...prev,
                      pricing: {
                        ...prev.pricing,
                        storage: e.target.value,
                      },
                    }));
                  }}
                  className="pricing-plan-custom-select"
                >
                  {storageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="pricing-plan-input-suffix">of Storage</span>
              </div>
            </div>
          </div>

          <div className="pricing-plan-section-titles">Extras</div>
          <div className="pricing-plan-extras-container">
            <SwitchInput
              label="Enable Extras"
              checked={enableExtraPricing}
              onChange={() => setEnableExtraPricing(!enableExtraPricing)}
            />
            {enableExtraPricing && (
              <div>
                {formData.extraPricing.map((extra, index) => (
                  <div key={index} className="pricing-plan-extra-pricing-item">
                    <div
                      className="pricing-plan-input-group"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <label
                        className="pricing-plan-custom-label"
                        style={{ flex: "0 0 120px" }}
                      >
                        Select Extra
                      </label>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          flex: 1,
                        }}
                      >
                        <select
                          value={extra.id || ""}
                          onChange={(e) =>
                            handleUpdateExtraPricing(
                              index,
                              "id",
                              e.target.value
                            )
                          }
                          className="pricing-plan-custom-select pricing-plan-feature-select"
                        >
                          <option value="">Select Extra</option>
                          {normalizedFeatures.length > 0 ? (
                            normalizedFeatures.map((feature) => (
                              <option key={feature.id} value={feature.id}>
                                {feature.name}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>
                              No features available
                            </option>
                          )}
                        </select>
                        <button
                          className="pricing-plan-delete-btn"
                          onClick={() => handleDeleteExtraPricing(index)}
                        >
                          <AiOutlineDelete color="#B42318" size={16} />
                        </button>
                      </div>
                    </div>
                    <div
                      className="pricing-plan-input-group"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <label
                        className="pricing-plan-custom-label"
                        style={{ flex: "0 0 120px" }}
                      >
                        Price per Month
                      </label>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          border: "1px solid #e5e5e5",
                          borderRadius: "10px",
                          overflow: "hidden",
                          flex: 1,
                        }}
                      >
                        <div style={{ position: "relative", flex: 1 }}>
                          <input
                            type="text"
                            value={extra.cost}
                            onChange={(e) =>
                              handleUpdateExtraPricing(
                                index,
                                "cost",
                                e.target.value
                              )
                            }
                            placeholder="0.00"
                            className="pricing-plan-custom-input"
                            style={{
                              border: "none",
                              borderRadius: "0",
                              paddingLeft: "24px",
                              width: "100%",
                            }}
                          />
                          <span
                            style={{
                              position: "absolute",
                              left: "8px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "#333",
                              fontWeight: "500",
                            }}
                          >
                            {currencySymbols[extra.extra]}
                          </span>
                        </div>
                        <select
                          value={extra.extra}
                          onChange={(e) =>
                            handleUpdateExtraPricing(
                              index,
                              "extra",
                              e.target.value
                            )
                          }
                          className="pricing-plan-custom-select"
                          style={{
                            border: "none",
                            borderLeft: "1px solid #e5e5e5",
                            borderRadius: "0 6px 6px 0",
                          }}
                        >
                          {currencyOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div
                      className="pricing-plan-input-group"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <label
                        className="pricing-plan-custom-label"
                        style={{ flex: "0 0 120px" }}
                      >
                        Price per Year
                      </label>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          border: "1px solid #e5e5e5",
                          borderRadius: "10px",
                          overflow: "hidden",
                          flex: 1,
                        }}
                      >
                        <div style={{ position: "relative", flex: 1 }}>
                          <input
                            type="text"
                            value={extra.storage}
                            onChange={(e) =>
                              handleUpdateExtraPricing(
                                index,
                                "storage",
                                e.target.value
                              )
                            }
                            placeholder="0.00"
                            className="pricing-plan-custom-input"
                            style={{
                              border: "none",
                              borderRadius: "0",
                              paddingLeft: "24px",
                              width: "100%",
                            }}
                          />
                          <span
                            style={{
                              position: "absolute",
                              left: "8px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "#333",
                              fontWeight: "500",
                            }}
                          >
                            {currencySymbols[extra.extra]}
                          </span>
                        </div>
                        <select
                          value={extra.extra}
                          onChange={(e) =>
                            handleUpdateExtraPricing(
                              index,
                              "extra",
                              e.target.value
                            )
                          }
                          className="pricing-plan-custom-select"
                          style={{
                            border: "none",
                            borderLeft: "1px solid #e5e5e5",
                            borderRadius: "0 6px 6px 0",
                          }}
                        >
                          {currencyOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  label="+ Add Extra"
                  variant="outline"
                  iconPosition="left"
                  onClick={() => handleAddExtraPricing(normalizedFeatures[0]?.id || "")}
                  width="auto"
                  disabled={!normalizedFeatures.length}
                />
                {!normalizedFeatures.length ? (
                  <p
                    style={{ color: "red", fontSize: "12px", marginTop: "8px" }}
                  >
                    No features available for extra pricing.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ),
    },
  ];

  return {
    activeTab,
    setActiveTab,
    tabs,
    formData,
    enableExtraPricing,
    pricePerMonth,
    setPricePerMonth,
    pricePerYear,
    setPricePerYear,
    clients,
    setClients,
    storage,
    setStorage,
    currency,
    setCurrency,
    userOption,
    setUserOption,
    availableFeatures,
    currencySymbols,
    validateForm,
    handleAddFeature,
    handleUpdateFeature,
    handleDeleteFeature,
    handleAddExtraPricing,
    handleUpdateExtraPricing,
    handleDeleteExtraPricing,
    handleSave,
    resetForm,
  };
};

export default usePricingForm;
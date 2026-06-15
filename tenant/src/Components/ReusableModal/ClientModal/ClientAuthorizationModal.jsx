import React, { useState, useCallback, useEffect } from "react";
import ReusableModal from "../ReusableModal";
import { TextInput, SelectInput } from "../../Input/Inputs";
import { showToast } from "../../../Helper/ShowToast";
import Button from "../../Button/Button";
import { FaPlus, FaTrash } from "react-icons/fa";
import api2 from "../../../api/billingAndPaymentsApi";
import useAuth from "../../../hooks/useAuth";
import useReduxStateDraft from "../../../hooks/useReduxStateDraft";

const AddAuthorizationModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = {},
  mode = "add",
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    title: initialData.title || "",
    authNumber: initialData.authNumber || "",
    startDate: initialData.startDate || "",
    endDate: initialData.endDate || "",
    payer: initialData.payer || "",
    insuranceType: initialData.insuranceType || "",
    // Changed key from serviceCodes → service
    service:
      initialData.service?.length > 0
        ? initialData.service.map((item) => ({
            serviceCodeId: item.serviceCodeId || "",
            modifier: "", // we'll extract later if needed
            units: item.units || "",
            per: item.per || "",
          }))
        : [{ serviceCodeId: "", modifier: "", units: "", per: "" }],
  });

  // Persist the in-progress authorization so an accidental Cancel/close keeps it.
  // Only in "add" mode — edit mode is driven by initialData of a specific record.
  const clearDraft = useReduxStateDraft("add-authorization", {
    values: formData,
    restore: setFormData,
    isOpen: isOpen && mode === "add",
  });

  const [payers, setPayers] = useState([]);
  const [serviceCodes, setServiceCodes] = useState([]); // Full list with id + code
  const [insuranceTypes, setInsuranceTypes] = useState([]);
  const [loadingPayers, setLoadingPayers] = useState(false);
  const [loadingServiceCodes, setLoadingServiceCodes] = useState(false);
  const [loadingInsuranceTypes, setLoadingInsuranceTypes] = useState(false);

  const { tenantId, accessToken, refreshToken } = useAuth();

  const fetchPayers = useCallback(async () => {
    if (!tenantId || !accessToken) return;
    setLoadingPayers(true);
    try {
      const response = await api2.GetPayerByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const payerList = (response?.data || []).map((p) => ({
        value: p.id,
        label: p.payerName,
      }));
      setPayers(payerList);
    } catch (err) {
      console.error("Failed to load payers:", err);
      showToast("Failed to load payers", "error");
    } finally {
      setLoadingPayers(false);
    }
  }, [tenantId, accessToken, refreshToken]);

  const fetchServiceCodes = useCallback(async () => {
    if (!tenantId || !accessToken) return;
    setLoadingServiceCodes(true);
    try {
      const response = await api2.GetTenantServiceCodeByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const data = response?.data || [];
      const activeCodes = data.filter(
        (item) => !item.isDeleted && item.isActive
      );

      // Store full objects: { id, code, description }
      const serviceCodeList = activeCodes.map((item) => ({
        value: item.id, // ← Use ID as value now
        label: `${item.code} - ${item.description}`,
        code: item.code,
        id: item.id,
      }));

      setServiceCodes(serviceCodeList);
    } catch (error) {
      console.error("Failed to load service codes:", error);
      showToast("Failed to load service codes", "error");
    } finally {
      setLoadingServiceCodes(false);
    }
  }, [tenantId, accessToken, refreshToken]);

  const fetchInsuranceTypes = useCallback(async () => {
    if (!tenantId || !accessToken) return;
    setLoadingInsuranceTypes(true);
    try {
      const response = await api2.GetInsuranceTypeByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const data = response?.data || [];
      const insuranceTypeList = data
        .filter((item) => item.isActive)
        .map((item) => ({
          value: item.id,
          label: item.name,
        }));
      setInsuranceTypes(insuranceTypeList);
    } catch (error) {
      console.error("Failed to load insurance types:", error);
      showToast("Failed to load insurance types", "error");
    } finally {
      setLoadingInsuranceTypes(false);
    }
  }, [tenantId, accessToken, refreshToken]);

  useEffect(() => {
    if (isOpen) {
      fetchPayers();
      fetchServiceCodes();
      fetchInsuranceTypes();
    }
  }, [isOpen, fetchPayers, fetchServiceCodes, fetchInsuranceTypes]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleServiceChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      service: prev.service.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleAddService = () => {
    setFormData((prev) => ({
      ...prev,
      service: [
        ...prev.service,
        { serviceCodeId: "", modifier: "", units: "", per: "" },
      ],
    }));
  };

  const handleRemoveService = (index) => {
    if (formData.service.length === 1) {
      showToast("At least one service code is required", "warning");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      service: prev.service.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    // Validation
    if (
      !formData.title ||
      !formData.authNumber ||
      !formData.startDate ||
      !formData.payer
    ) {
      showToast("Please fill all required fields", "error");
      return;
    }

    const invalidServices = formData.service.filter(
      (s) => !s.serviceCodeId || !s.units || Number(s.units) <= 0
    );

    if (invalidServices.length > 0) {
      showToast("Please select a service code and enter valid units", "error");
      return;
    }

    // Check for duplicate serviceCodeId
    const ids = formData.service.map((s) => s.serviceCodeId);
    const hasDuplicates = new Set(ids).size !== ids.length;
    if (hasDuplicates) {
      showToast("Duplicate service codes are not allowed", "error");
      return;
    }

    // Final payload: match exact backend format
    const payload = {
      title: formData.title,
      authNumber: formData.authNumber,
      startDate: formData.startDate,
      endDate: formData.endDate || null,
      payer: formData.payer,
      insuranceType: formData.insuranceType || null,
      service: formData.service.map((item) => ({
        serviceCodeId: item.serviceCodeId,
        modifiers: item.modifier, // Empty object as requested
        units: Number(item.units),
        per: item.per || "SESSION", // default if empty
      })),
    };

    onSubmit(payload);
    clearDraft();
    onClose();
  };

  // Hardcoded options (can be made dynamic later)
  const modifierOptions = [
    { value: "", label: "No Modifier" },
    { value: "HO", label: "HO - Master's-level provider" },
    { value: "HP", label: "HP - Doctoral-level provider" },
    { value: "HN", label: "HN - Associate's-level provider" },
    { value: "HM", label: "HM - Bachelor's-level provider" },
    { value: "95", label: "95 - Synchronous telehealth" },
    { value: "GT", label: "GT - Interactive audio/video" },
    { value: "KX", label: "KX - Requirements met" },
    { value: "59", label: "59 - Distinct procedural service" },
    { value: "76", label: "76 - Repeat same provider" },
    { value: "77", label: "77 - Repeat different provider" },
  ];

  const perOptions = [
    { value: "SESSION", label: "Per Session" },
    { value: "DAY", label: "Per Day" },
    { value: "WEEK", label: "Per Week" },
    { value: "MONTH", label: "Per Month" },
    { value: "YEAR", label: "Per Year" },
  ];

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "edit" ? "Edit Authorization" : "Add Authorization"}
      primaryButtonText="Save Authorization"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit}
      onSecondaryButtonClick={onClose}
      primaryButtonLoading={loading}
      size="lg"
    >
      <div className="space-y-6">
        <TextInput
          label="Authorization Title *"
          placeholder="Enter title"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          required
        />
        <TextInput
          label="Authorization Number *"
          placeholder="Enter number"
          value={formData.authNumber}
          onChange={(e) => handleChange("authNumber", e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <TextInput
            label="Start Date *"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleChange("startDate", e.target.value)}
            required
          />
          <TextInput
            label="End Date"
            type="date"
            value={formData.endDate}
            onChange={(e) => handleChange("endDate", e.target.value)}
          />
        </div>

        <SelectInput
          label="Payer *"
          placeholder="Select payer"
          options={payers}
          value={formData.payer}
          onChange={(e) => handleChange("payer", e.target.value)}
          required
          isLoading={loadingPayers}
        />
        <SelectInput
          label="Insurance Type"
          placeholder="Select type"
          options={insuranceTypes}
          value={formData.insuranceType}
          onChange={(e) => handleChange("insuranceType", e.target.value)}
          isLoading={loadingInsuranceTypes}
        />

        {/* Service Codes Section */}
        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-medium mb-4">Authorized Services</h3>

          <div className="space-y-6">
            {formData.service.map((serviceItem, index) => (
              <div key={serviceItem.serviceCodeId || `service-${index}`} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex gap-4 items-end">
                  <div className="flex-2">
                    <SelectInput
                      label="Service Code *"
                      placeholder="Select service code"
                      options={serviceCodes}
                      value={serviceItem.serviceCodeId}
                      onChange={(e) =>
                        handleServiceChange(
                          index,
                          "serviceCodeId",
                          e.target.value
                        )
                      }
                      isLoading={loadingServiceCodes}
                    />
                  </div>

                  <div className="flex-2">
                    <SelectInput
                      label="Modifier"
                      placeholder="Optional"
                      options={modifierOptions}
                      value={serviceItem.modifier}
                      onChange={(e) =>
                        handleServiceChange(index, "modifier", e.target.value)
                      }
                    />
                  </div>

                  <div className="flex-1">
                    <TextInput
                      label="Units *"
                      type="number"
                      min="1"
                      placeholder="e.g. 10"
                      value={serviceItem.units}
                      onChange={(e) =>
                        handleServiceChange(index, "units", e.target.value)
                      }
                    />
                  </div>

                  <div className="flex-1">
                    <SelectInput
                      label="Per"
                      placeholder="Per..."
                      options={perOptions}
                      value={serviceItem.per}
                      onChange={(e) =>
                        handleServiceChange(index, "per", e.target.value)
                      }
                    />
                  </div>

                  <div className="col-span-1 flex justify-center">
                    {formData.service.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveService(index)}
                        className="text-red-600 hover:text-red-800 mt-6"
                        title="Remove"
                      >
                        <FaTrash className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Button
              label="Add Another Service"
              variant="secondary"
              icon={<FaPlus />}
              onClick={handleAddService}
            />
          </div>
        </div>
      </div>
    </ReusableModal>
  );
};

export default AddAuthorizationModal;

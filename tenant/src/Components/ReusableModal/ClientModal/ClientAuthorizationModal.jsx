import React, { useState, useCallback, useEffect } from "react";
import ReusableModal from "../ReusableModal";
import { TextInput, SelectInput } from "../../Input/Inputs";
import { showToast } from "../../../Helper/ShowToast";
import Button from "../../Button/Button";
import { FaPlus, FaTrash } from "react-icons/fa";
import api2 from "../../../api/billingAndPaymentsApi";
import { useSelector } from "react-redux";

const AddAuthorizationModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = {},
  mode = "add",
}) => {
  const [formData, setFormData] = useState({
    title: initialData.title || "",
    authNumber: initialData.authNumber || "",
    startDate: initialData.startDate || "",
    endDate: initialData.endDate || "",
    payer: initialData.payer || "",
    insuranceType: initialData.insuranceType || "",
    serviceCodes: initialData.serviceCodes?.length > 0 
      ? initialData.serviceCodes 
      : [{ code: "", modifier: "", units: "", per: "" }],
  });

  const [payers, setPayers] = useState([]);
  const [serviceCodes, setServiceCodes] = useState([]);
  const [insuranceTypes, setInsuranceTypes] = useState([]);
  const [loadingPayers, setLoadingPayers] = useState(false);
  const [loadingServiceCodes, setLoadingServiceCodes] = useState(false);
  const [loadingInsuranceTypes, setLoadingInsuranceTypes] = useState(false);

  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const token = useSelector((s) => s.authentication?.user?.token);
  const accessToken = token;
  const refreshToken = token;

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
      const serviceCodeList = data
        .filter((item) => !item.isDeleted && item.isActive)
        .map((item) => ({
          value: item.code,
          label: `${item.code} - ${item.description}`,
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

  // Fetch data when modal opens
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

  const handleServiceCodeChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      serviceCodes: prev.serviceCodes.map((service, i) =>
        i === index ? { ...service, [field]: value } : service
      ),
    }));
  };

  const handleAddServiceCode = () => {
    setFormData((prev) => ({
      ...prev,
      serviceCodes: [
        ...prev.serviceCodes,
        { code: "", modifier: "", units: "", per: "" },
      ],
    }));
  };

  const handleRemoveServiceCode = (index) => {
    if (formData.serviceCodes.length === 1) {
      showToast("At least one service code is required", "warning");
      return;
    }
    
    setFormData((prev) => ({
      ...prev,
      serviceCodes: prev.serviceCodes.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.authNumber || !formData.startDate || !formData.payer) {
      showToast("Please fill all required fields", "error");
      return;
    }

    const invalidServiceCodes = formData.serviceCodes.filter(
      (service) => !service.code || !service.units || Number(service.units) <= 0
    );

    if (invalidServiceCodes.length > 0) {
      showToast("Please fill all required service code fields with valid units", "error");
      return;
    }

    const serviceCodeKeys = formData.serviceCodes.map(
      (service) => `${service.code}-${service.modifier}`
    );
    const hasDuplicates = new Set(serviceCodeKeys).size !== serviceCodeKeys.length;
    
    if (hasDuplicates) {
      showToast("Duplicate service code and modifier combinations found", "error");
      return;
    }

    const formattedData = {
      ...formData,
      serviceCodes: formData.serviceCodes.map(service => ({
        ...service,
        units: Number(service.units)
      }))
    };

    onSubmit(formattedData);

    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "edit" ? "Edit Authorization" : "Add Authorization"}
      primaryButtonText="Save Authorization"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit}
      onSecondaryButtonClick={onClose}
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
          <h3 className="text-lg font-medium mb-4">Add Service Codes</h3>

          {/* Replicated Service Code Forms */}
          <div className="space-y-4">
            {formData.serviceCodes.map((serviceCode, index) => (
              <div key={index} className="">
                <div className="flex">
                  <div className="flex-2">
                    <SelectInput
                      label="Service code"
                      placeholder="Service Code *"
                      options={serviceCodes}
                      value={serviceCode.code}
                      onChange={(e) => handleServiceCodeChange(index, "code", e.target.value)}
                      isLoading={loadingServiceCodes}
                    />
                  </div>

                  <div className="flex-2">
                    <SelectInput
                      label="Modifiers"
                      placeholder="Modifier (optional)"
                      options={modifierOptions}
                      value={serviceCode.modifier}
                      onChange={(e) => handleServiceCodeChange(index, "modifier", e.target.value)}
                    />
                  </div>

                  <div className="flex-1">
                    <TextInput
                      label="Units"
                      type="number"
                      placeholder="Units *"
                      min="1"
                      value={serviceCode.units}
                      onChange={(e) => handleServiceCodeChange(index, "units", e.target.value)}
                    />
                  </div>

                  <div className="flex-1">
                    <SelectInput
                      label="Per"
                      placeholder="Per"
                      options={perOptions}
                      value={serviceCode.per}
                      onChange={(e) => handleServiceCodeChange(index, "per", e.target.value)}
                    />
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    {formData.serviceCodes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveServiceCode(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove service code"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Button
              label="Add Service Code"
              variant="secondary"
              icon={<FaPlus className="w-4 h-4" />}
              onClick={handleAddServiceCode}
            />
          </div>
        </div>
      </div>
    </ReusableModal>
  );
};

// Options data
const modifierOptions = [
  { value: "", label: "None" },
  { value: "HM", label: "HM - Less than Bachelor's" },
  { value: "HN", label: "HN - Bachelor's Degree" },
  { value: "HO", label: "HO - Master's Degree" },
  { value: "HP", label: "HP - Doctoral Level" },
];

const perOptions = [
  { value: "day", label: "Per Day" },
  { value: "week", label: "Per Week" },
  { value: "month", label: "Per Month" },
  { value: "year", label: "Per Year" },
];

export default AddAuthorizationModal;
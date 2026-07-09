import React, { useState } from "react";
import * as Yup from "yup";
import RichTextEditor from "../../../../../../../../Components/Input/RichTextEditor/RichTextEditorInput";
import {
  ReportTextInput,
  ReportSelect,
  ReportMultiSelect,
  ReportRadioGroup,
} from "../../../../../../../../Components/Input/ReportInput/ReportBuilderInputs";
import Button from "../../../../../../../../Components/Button/Button";
import { RxCross2 } from "react-icons/rx";
import "./ImplementationNotesSection.css";

// Service Setting Options
const SERVICE_SETTING_OPTIONS = [
  { value: "home", label: "Home" },
  { value: "clinic", label: "Clinic" },
  { value: "school", label: "School" },
  { value: "community", label: "Community" },
  { value: "telehealth", label: "Telehealth" },
  { value: "multiple-settings", label: "Multiple settings" },
];

// Caregiver Involvement Options
const CAREGIVER_INVOLVEMENT_OPTIONS = [
  { value: "not-involved", label: "Not involved" },
  { value: "observation-only", label: "Observation only" },
  { value: "active-participation", label: "Active participation" },
  { value: "primary-implementer", label: "Primary implementer" },
  { value: "clinically-indicated", label: "As clinically indicated" },
];

// Coordination with Other Providers Options
const COORDINATION_OPTIONS = [
  { value: "none", label: "None" },
  { value: "school-staff", label: "School Staff" },
  { value: "speech-therapist", label: "Speech therapist" },
  { value: "occupational-therapist", label: "Occupational therapist" },
  { value: "physical-therapist", label: "Physical therapist" },
  { value: "medical-provider", label: "Medical provider" },
  { value: "other", label: "Other" },
];

// Fidelity Monitoring Options
const FIDELITY_MONITORING_OPTIONS = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
];

// Helper function to handle "other" selection logic for multi-selects
const handleOtherSelectionMulti = (currentValues, newValue) => {
  // If "other" is being selected and it's not already in the array
  if (newValue.includes("other") && !currentValues.includes("other")) {
    // Clear all other values and keep only "other"
    return ["other"];
  }
  
  // If "other" is already selected and user tries to add another option
  if (currentValues.includes("other") && newValue.length > 1 && newValue.some(v => v !== "other")) {
    // Remove "other" from the array
    const withoutOther = newValue.filter(v => v !== "other");
    return withoutOther;
  }
  
  // Normal selection logic
  return newValue;
};

// Yup Validation Schema
const implementationNotesSchema = Yup.object().shape({
  implementationOverview: Yup.string(),
  serviceSettings: Yup.array().min(1, "At least one service setting is required"),
  sessionStructure: Yup.string(),
  staffRolesResponsibilities: Yup.string(),
  caregiverInvolvement: Yup.string().required("Caregiver involvement is required"),
  caregiverTrainingDetails: Yup.string(),
  materialsRequired: Yup.string(),
  environmentalConsiderations: Yup.string(),
  coordinationWithProviders: Yup.array().min(1, "Coordination with providers is required"),
  coordinationWithProvidersOther: Yup.string().when("coordinationWithProviders", {
    is: (val) => val && val.includes("other"),
    then: (schema) => schema.required("Please specify the provider"),
    otherwise: (schema) => schema.nullable(),
  }),
  implementationConstraints: Yup.string(),
  fidelityMonitoringInPlace: Yup.string().required("Fidelity monitoring is required"),
  fidelityMonitoringNotes: Yup.string(),
});

const ImplementationNotesSection = ({ data = {}, onChange, onRemoveSection, isReadOnly = false }) => {
  const [formData, setFormData] = useState({
    implementationOverview: data.implementationOverview || "",
    serviceSettings: data.serviceSettings || [],
    sessionStructure: data.sessionStructure || "",
    staffRolesResponsibilities: data.staffRolesResponsibilities || "",
    caregiverInvolvement: data.caregiverInvolvement || "",
    caregiverTrainingDetails: data.caregiverTrainingDetails || "",
    materialsRequired: data.materialsRequired || "",
    environmentalConsiderations: data.environmentalConsiderations || "",
    coordinationWithProviders: data.coordinationWithProviders || [],
    coordinationWithProvidersOther: data.coordinationWithProvidersOther || "",
    implementationConstraints: data.implementationConstraints || "",
    fidelityMonitoringInPlace: data.fidelityMonitoringInPlace || "",
    fidelityMonitoringNotes: data.fidelityMonitoringNotes || "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const updateFormData = (field, value) => {
    let finalValue = value;
    
    // Handle "other" selection logic for coordination with providers
    if (field === "coordinationWithProviders") {
      const currentValues = formData[field] || [];
      finalValue = handleOtherSelectionMulti(currentValues, value);
    }
    
    const updated = { ...formData, [field]: finalValue };
    setFormData(updated);
    onChange(updated);

    // Validate on change if touched
    if (touched[field]) {
      validateFormData(updated);
    }
  };

  const validateFormData = async (dataToValidate) => {
    try {
      await implementationNotesSchema.validate(dataToValidate, { abortEarly: false });
      setErrors({});
    } catch (err) {
      const fieldErrors = {};
      err.inner.forEach((e) => {
        fieldErrors[e.path] = e.message;
      });
      setErrors(fieldErrors);
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateFormData(formData);
  };

  const showCoordinationOther = formData.coordinationWithProviders.includes("other");
  const showFidelityNotes = formData.fidelityMonitoringInPlace === "yes";

  return (
    <div className="crb-section-fields">
      {/* Implementation Overview */}
      <RichTextEditor
        label="Implementation overview"
        placeholder="Enter a description..."
        value={formData.implementationOverview}
        onChange={(val) => updateFormData("implementationOverview", val)}
        readOnly={isReadOnly}
      />

      {/* Service Settings - Multi-Select */}
      <ReportMultiSelect
        label="Service Setting(s)"
        placeholder="Select an option"
        options={SERVICE_SETTING_OPTIONS}
        value={formData.serviceSettings}
        onChange={(val) => updateFormData("serviceSettings", val)}
        onBlur={() => handleBlur("serviceSettings")}
        readOnly={isReadOnly}
      />
      {touched.serviceSettings && errors.serviceSettings && (
        <div className="report-builder-error">{errors.serviceSettings}</div>
      )}

      {/* Session Structure */}
      <RichTextEditor
        label="Session Structure"
        placeholder="Enter a description..."
        value={formData.sessionStructure}
        onChange={(val) => updateFormData("sessionStructure", val)}
        readOnly={isReadOnly}
      />

      {/* Staff roles & responsibilities */}
      <RichTextEditor
        label="Staff roles & responsibilities"
        placeholder="Enter a description..."
        value={formData.staffRolesResponsibilities}
        onChange={(val) => updateFormData("staffRolesResponsibilities", val)}
        readOnly={isReadOnly}
      />

      {/* Caregiver Involvement */}
      <ReportSelect
        required
        label="Caregiver involvement"
        placeholder="Select an option"
        options={CAREGIVER_INVOLVEMENT_OPTIONS}
        value={formData.caregiverInvolvement}
        onChange={(val) => updateFormData("caregiverInvolvement", val)}
        onBlur={() => handleBlur("caregiverInvolvement")}
        readOnly={isReadOnly}
      />
      {touched.caregiverInvolvement && errors.caregiverInvolvement && (
        <div className="report-builder-error">{errors.caregiverInvolvement}</div>
      )}

      {/* Caregiver training details */}
      <RichTextEditor
        label="Caregiver training details"
        placeholder="Enter a description..."
        value={formData.caregiverTrainingDetails}
        onChange={(val) => updateFormData("caregiverTrainingDetails", val)}
        readOnly={isReadOnly}
      />

      {/* Materials required */}
      <RichTextEditor
        label="Materials required"
        placeholder="Enter a description..."
        value={formData.materialsRequired}
        onChange={(val) => updateFormData("materialsRequired", val)}
        readOnly={isReadOnly}
      />

      {/* Environmental considerations */}
      <RichTextEditor
        label="Environmental considerations"
        placeholder="Enter a description..."
        value={formData.environmentalConsiderations}
        onChange={(val) => updateFormData("environmentalConsiderations", val)}
        readOnly={isReadOnly}
      />

      {/* Coordination with other providers - Multi-Select */}
      <div className="select-with-other-container">
        <ReportMultiSelect
          label="Coordination with other providers"
          placeholder="Select an option"
          options={COORDINATION_OPTIONS}
          value={formData.coordinationWithProviders}
          onChange={(val) => updateFormData("coordinationWithProviders", val)}
          onBlur={() => handleBlur("coordinationWithProviders")}
          readOnly={isReadOnly}
        />
        {touched.coordinationWithProviders && errors.coordinationWithProviders && (
          <div className="report-builder-error">{errors.coordinationWithProviders}</div>
        )}
        
        {/* Show Other input when "Other" is selected */}
        {showCoordinationOther && (
          <div className="other-input-wrapper">
            <ReportTextInput
              label="Please specify"
              placeholder="Enter other provider"
              value={formData.coordinationWithProvidersOther}
              onChange={(val) => updateFormData("coordinationWithProvidersOther", val)}
              onBlur={() => handleBlur("coordinationWithProvidersOther")}
              readOnly={isReadOnly}
            />
            {touched.coordinationWithProvidersOther && errors.coordinationWithProvidersOther && (
              <div className="report-builder-error">{errors.coordinationWithProvidersOther}</div>
            )}
          </div>
        )}
      </div>

      {/* Implementation constraints or notes */}
      <RichTextEditor
        label="Implementation constraints or notes"
        placeholder="Enter a description..."
        value={formData.implementationConstraints}
        onChange={(val) => updateFormData("implementationConstraints", val)}
        readOnly={isReadOnly}
      />

      {/* Fidelity monitoring in place - Radio Group */}
      <ReportRadioGroup
        required
        label="Fidelity monitoring in place"
        options={FIDELITY_MONITORING_OPTIONS}
        value={formData.fidelityMonitoringInPlace}
        onChange={(val) => updateFormData("fidelityMonitoringInPlace", val)}
        onBlur={() => handleBlur("fidelityMonitoringInPlace")}
        readOnly={isReadOnly}
      />
      {touched.fidelityMonitoringInPlace && errors.fidelityMonitoringInPlace && (
        <div className="report-builder-error">{errors.fidelityMonitoringInPlace}</div>
      )}

      {/* Fidelity monitoring notes (conditionally shown) */}
      {showFidelityNotes && (
        <RichTextEditor
          label="Fidelity monitoring notes"
          placeholder="Enter a description..."
          value={formData.fidelityMonitoringNotes}
          onChange={(val) => updateFormData("fidelityMonitoringNotes", val)}
          readOnly={isReadOnly}
        />
      )}

      {/* Remove Section Button */}
      {!isReadOnly && onRemoveSection && (
      <div className="section-remove-btn-wrapper">
        <Button
          label="Remove Section"
          variant="action-danger"
          size="medium"
          width="auto"
          icon={<RxCross2 size={16} />}
          onClick={onRemoveSection}
        />
      </div>
      )}
    </div>
  );
};

export default ImplementationNotesSection;
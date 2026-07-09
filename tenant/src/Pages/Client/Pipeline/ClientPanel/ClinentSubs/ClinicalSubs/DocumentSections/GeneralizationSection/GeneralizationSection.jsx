import React, { useState } from "react";
import * as Yup from "yup";
import RichTextEditor from "../../../../../../../../Components/Input/RichTextEditor/RichTextEditorInput";
import {
  ReportTextInput,
  ReportSelect,
  ReportMultiSelect,
} from "../../../../../../../../Components/Input/ReportInput/ReportBuilderInputs";
import Button from "../../../../../../../../Components/Button/Button";
import { RxCross2 } from "react-icons/rx";
import "./GeneralizationSection.css";

// Generalization Approach Options
const GENERALIZATION_APPROACH_OPTIONS = [
  { value: "across-settings", label: "Across settings" },
  { value: "across-people", label: "Across people" },
  { value: "across-materials", label: "Across materials" },
  { value: "across-repositories", label: "Across repositories" },
  { value: "across-time", label: "Across time" },
  { value: "natural-environment-teaching", label: "Natural environment teaching" },
  { value: "community-based-practice", label: "Community based practice" },
  { value: "other", label: "Other" },
];

// Settings for Generalization Options
const GENERALIZATION_SETTINGS_OPTIONS = [
  { value: "home", label: "Home" },
  { value: "clinic", label: "Clinic" },
  { value: "school", label: "School" },
  { value: "community", label: "Community" },
  { value: "vocational-setting", label: "Vocational setting" },
  { value: "telehealth", label: "Telehealth" },
  { value: "other", label: "Other" },
];

// People Involved in Generalization Options
const PEOPLE_INVOLVED_OPTIONS = [
  { value: "rbt", label: "RBT" },
  { value: "bcba", label: "BCBA" },
  { value: "caregiver-parent", label: "Caregiver/parent" },
  { value: "teacher-school-staff", label: "Teacher/school staff" },
  { value: "peers", label: "Peers" },
  { value: "other", label: "Other" },
];

// Maintenance Schedule Options
const MAINTENANCE_SCHEDULE_OPTIONS = [
  { value: "each-session", label: "Each session" },
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "at-discharge", label: "At discharge" },
  { value: "clinically-indicated", label: "As clinically indicated" },
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
const generalizationSchema = Yup.object().shape({
  targetBehaviors: Yup.string(),
  generalizationApproach: Yup.array().min(1, "At least one generalization approach is required"),
  generalizationApproachOther: Yup.string().when("generalizationApproach", {
    is: (val) => val && val.includes("other"),
    then: (schema) => schema.required("Please specify the generalization approach"),
    otherwise: (schema) => schema.nullable(),
  }),
  generalizationDescription: Yup.string(),
  settingsForGeneralization: Yup.array().min(1, "At least one setting for generalization is required"),
  settingsForGeneralizationOther: Yup.string().when("settingsForGeneralization", {
    is: (val) => val && val.includes("other"),
    then: (schema) => schema.required("Please specify the setting"),
    otherwise: (schema) => schema.nullable(),
  }),
  peopleInvolvedInGeneralization: Yup.array().min(1, "At least one person must be involved"),
  peopleInvolvedOther: Yup.string().when("peopleInvolvedInGeneralization", {
    is: (val) => val && val.includes("other"),
    then: (schema) => schema.required("Please specify the person involved"),
    otherwise: (schema) => schema.nullable(),
  }),
  materialsVariationPlan: Yup.string(),
  maintenancePlan: Yup.string(),
  maintenanceSchedule: Yup.string().required("Maintenance schedule is required"),
  fadingPlan: Yup.string(),
  criteriaForMaintenanceSuccess: Yup.string(),
  generalizationMaintenanceNotes: Yup.string(),
});

const GeneralizationSection = ({ data = {}, onChange, onRemoveSection, isReadOnly = false }) => {
  const [formData, setFormData] = useState({
    targetBehaviors: data.targetBehaviors || "",
    generalizationApproach: data.generalizationApproach || [],
    generalizationApproachOther: data.generalizationApproachOther || "",
    generalizationDescription: data.generalizationDescription || "",
    settingsForGeneralization: data.settingsForGeneralization || [],
    settingsForGeneralizationOther: data.settingsForGeneralizationOther || "",
    peopleInvolvedInGeneralization: data.peopleInvolvedInGeneralization || [],
    peopleInvolvedOther: data.peopleInvolvedOther || "",
    materialsVariationPlan: data.materialsVariationPlan || "",
    maintenancePlan: data.maintenancePlan || "",
    maintenanceSchedule: data.maintenanceSchedule || "",
    fadingPlan: data.fadingPlan || "",
    criteriaForMaintenanceSuccess: data.criteriaForMaintenanceSuccess || "",
    generalizationMaintenanceNotes: data.generalizationMaintenanceNotes || "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const updateFormData = (field, value) => {
    let finalValue = value;
    
    // Handle "other" selection logic for multi-select fields
    if (field === "generalizationApproach" || field === "settingsForGeneralization" || field === "peopleInvolvedInGeneralization") {
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
      await generalizationSchema.validate(dataToValidate, { abortEarly: false });
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

  const showGeneralizationApproachOther = formData.generalizationApproach.includes("other");
  const showSettingsForGeneralizationOther = formData.settingsForGeneralization.includes("other");
  const showPeopleInvolvedOther = formData.peopleInvolvedInGeneralization.includes("other");

  return (
    <div className="crb-section-fields">
      {/* Target Behavior(s) */}
      <RichTextEditor
        label="Target Behavior(s)"
        placeholder="Enter a description..."
        value={formData.targetBehaviors}
        onChange={(val) => updateFormData("targetBehaviors", val)}
        readOnly={isReadOnly}
      />

      {/* Generalization approach - Multi-Select */}
      <div className="select-with-other-container">
        <ReportMultiSelect
          label="Generalization approach"
          placeholder="Select an option"
          options={GENERALIZATION_APPROACH_OPTIONS}
          value={formData.generalizationApproach}
          onChange={(val) => updateFormData("generalizationApproach", val)}
          onBlur={() => handleBlur("generalizationApproach")}
          readOnly={isReadOnly}
        />
        {touched.generalizationApproach && errors.generalizationApproach && (
          <div className="report-builder-error">{errors.generalizationApproach}</div>
        )}
        
        {/* Show Other input when "Other" is selected */}
        {showGeneralizationApproachOther && (
          <div className="other-input-wrapper">
            <ReportTextInput
              label="Please specify"
              placeholder="Enter other generalization approach"
              value={formData.generalizationApproachOther}
              onChange={(val) => updateFormData("generalizationApproachOther", val)}
              onBlur={() => handleBlur("generalizationApproachOther")}
              readOnly={isReadOnly}
            />
            {touched.generalizationApproachOther && errors.generalizationApproachOther && (
              <div className="report-builder-error">{errors.generalizationApproachOther}</div>
            )}
          </div>
        )}
      </div>

      {/* Generalization description */}
      <RichTextEditor
        label="Generalization description"
        placeholder="Enter a description..."
        value={formData.generalizationDescription}
        onChange={(val) => updateFormData("generalizationDescription", val)}
        readOnly={isReadOnly}
      />

      {/* Settings for generalization - Multi-Select */}
      <div className="select-with-other-container">
        <ReportMultiSelect
          label="Settings for generalization"
          placeholder="Select an option"
          options={GENERALIZATION_SETTINGS_OPTIONS}
          value={formData.settingsForGeneralization}
          onChange={(val) => updateFormData("settingsForGeneralization", val)}
          onBlur={() => handleBlur("settingsForGeneralization")}
          readOnly={isReadOnly}
        />
        {touched.settingsForGeneralization && errors.settingsForGeneralization && (
          <div className="report-builder-error">{errors.settingsForGeneralization}</div>
        )}
        
        {/* Show Other input when "Other" is selected */}
        {showSettingsForGeneralizationOther && (
          <div className="other-input-wrapper">
            <ReportTextInput
              label="Please specify"
              placeholder="Enter other setting"
              value={formData.settingsForGeneralizationOther}
              onChange={(val) => updateFormData("settingsForGeneralizationOther", val)}
              onBlur={() => handleBlur("settingsForGeneralizationOther")}
              readOnly={isReadOnly}
            />
            {touched.settingsForGeneralizationOther && errors.settingsForGeneralizationOther && (
              <div className="report-builder-error">{errors.settingsForGeneralizationOther}</div>
            )}
          </div>
        )}
      </div>

      {/* People involved in generalization - Multi-Select */}
      <div className="select-with-other-container">
        <ReportMultiSelect
          label="People involved in generalization"
          placeholder="Select an option"
          options={PEOPLE_INVOLVED_OPTIONS}
          value={formData.peopleInvolvedInGeneralization}
          onChange={(val) => updateFormData("peopleInvolvedInGeneralization", val)}
          onBlur={() => handleBlur("peopleInvolvedInGeneralization")}
          readOnly={isReadOnly}
        />
        {touched.peopleInvolvedInGeneralization && errors.peopleInvolvedInGeneralization && (
          <div className="report-builder-error">{errors.peopleInvolvedInGeneralization}</div>
        )}
        
        {/* Show Other input when "Other" is selected */}
        {showPeopleInvolvedOther && (
          <div className="other-input-wrapper">
            <ReportTextInput
              label="Please specify"
              placeholder="Enter other person involved"
              value={formData.peopleInvolvedOther}
              onChange={(val) => updateFormData("peopleInvolvedOther", val)}
              onBlur={() => handleBlur("peopleInvolvedOther")}
              readOnly={isReadOnly}
            />
            {touched.peopleInvolvedOther && errors.peopleInvolvedOther && (
              <div className="report-builder-error">{errors.peopleInvolvedOther}</div>
            )}
          </div>
        )}
      </div>

      {/* Materials variation plan */}
      <RichTextEditor
        label="Materials variation plan"
        placeholder="Enter a description..."
        value={formData.materialsVariationPlan}
        onChange={(val) => updateFormData("materialsVariationPlan", val)}
        readOnly={isReadOnly}
      />

      {/* Maintenance plan */}
      <RichTextEditor
        label="Maintenance plan"
        placeholder="Enter a description..."
        value={formData.maintenancePlan}
        onChange={(val) => updateFormData("maintenancePlan", val)}
        readOnly={isReadOnly}
      />

      {/* Maintenance schedule */}
      <ReportSelect
        required
        label="Maintenance schedule"
        placeholder="Select an option"
        options={MAINTENANCE_SCHEDULE_OPTIONS}
        value={formData.maintenanceSchedule}
        onChange={(val) => updateFormData("maintenanceSchedule", val)}
        onBlur={() => handleBlur("maintenanceSchedule")}
        readOnly={isReadOnly}
      />
      {touched.maintenanceSchedule && errors.maintenanceSchedule && (
        <div className="report-builder-error">{errors.maintenanceSchedule}</div>
      )}

      {/* Fading plan */}
      <RichTextEditor
        label="Fading plan"
        placeholder="Enter a description..."
        value={formData.fadingPlan}
        onChange={(val) => updateFormData("fadingPlan", val)}
        readOnly={isReadOnly}
      />

      {/* Criteria for maintenance success */}
      <RichTextEditor
        label="Criteria for maintenance success"
        placeholder="Enter a description..."
        value={formData.criteriaForMaintenanceSuccess}
        onChange={(val) => updateFormData("criteriaForMaintenanceSuccess", val)}
        readOnly={isReadOnly}
      />

      {/* Generalization & maintenance notes */}
      <RichTextEditor
        label="Generalization & maintenance notes"
        placeholder="Enter a description..."
        value={formData.generalizationMaintenanceNotes}
        onChange={(val) => updateFormData("generalizationMaintenanceNotes", val)}
        readOnly={isReadOnly}
      />

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

export default GeneralizationSection;
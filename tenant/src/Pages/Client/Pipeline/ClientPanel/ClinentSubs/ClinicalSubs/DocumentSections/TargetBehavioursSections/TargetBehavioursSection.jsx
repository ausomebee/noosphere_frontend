import React, { useState } from "react";
import * as Yup from "yup";
import RichTextEditor from "../../../../../../../../Components/Input/RichTextEditor/RichTextEditorInput";
import {
  ReportTextInput,
  ReportSelect,
  ReportRadioGroup,
  ReportFileUpload,
  ReportMultiSelect,
} from "../../../../../../../../Components/Input/ReportInput/ReportBuilderInputs";
import Button from "../../../../../../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import "./TargetBehavioursSections.css";
import { showToast } from "../../../../../../../../Helper/ShowToast";

// Behavior Categories
const BEHAVIOR_CATEGORIES = [
  { value: "aggression", label: "Aggression" },
  { value: "self-injury-behavior", label: "Self-Injurious behavior" },
  { value: "property-destruction", label: "Property Destruction" },
  { value: "elopement", label: "Elopement" },
  { value: "noncompliance", label: "Noncompliance" },
  { value: "tantrums", label: "Tantrums" },
  { value: "stereotypy", label: "Stereotypy" },
  { value: "social-skills-deficit", label: "Social Skills Deficits" },
  { value: "communication-deficit", label: "Communication deficit" },
  { value: "academic-learning-behavior", label: "Academic/learning behavior" },
  {
    value: "adaptive-daily-living-skill",
    label: "Adaptive/daily living skill",
  },
  { value: "other", label: "Other" },
];

// Function of Behavior
const FUNCTION_OPTIONS = [
  { value: "attention", label: "Attention" },
  { value: "escape", label: "Escape/Avoidance" },
  { value: "tangible", label: "Access to Tangible" },
  { value: "sensory", label: "Automatic/Sensory" },
  { value: "multiple", label: "Multiple Functions" },
  { value: "unknown", label: "Unknown/Not Yet Determined" },
  { value: "other", label: "Other" },
];

// Behavior Direction
const DIRECTION_OPTIONS = [
  { value: "increase", label: "Increase" },
  { value: "decrease", label: "Decrease" },
];

// Measurement Methods
const MEASUREMENT_METHODS = [
  { value: "frequency", label: "Frequency" },
  { value: "duration", label: "Duration" },
  { value: "latency", label: "Latency" },
  { value: "rate", label: "Rate" },
  { value: "percentage-correct", label: "Percentage Correct" },
  { value: "trials-opportunities", label: "Trials/Opportunities" },
  { value: "task-analysis", label: "Task Analysis" },
  { value: "other", label: "Other" },
];

// Settings/Context
const SETTINGS_OPTIONS = [
  { value: "home", label: "Home" },
  { value: "school", label: "School" },
  { value: "community", label: "Community" },
  { value: "clinic", label: "Clinic/Center" },
  { value: "transitions", label: "Transitions" },
  { value: "group-activities", label: "Group activities" },
  { value: "one-on-one-instruction", label: "One-on-one instruction" },
  { value: "other", label: "Other" },
];

// Priority Levels
const PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

// Helper function to handle "other" selection logic for single selects
const handleOtherSelectionSingle = (currentValue, newValue, field) => {
  // If "other" is being selected
  if (newValue === "other") {
    return "other";
  }

  // If "other" was previously selected and user selects something else
  if (currentValue === "other" && newValue !== "other") {
    return newValue;
  }

  return newValue;
};

// Helper function to handle "other" selection logic for multi-selects
const handleOtherSelectionMulti = (currentValues, newValue, field) => {
  // If "other" is being selected and it's not already in the array
  if (newValue.includes("other") && !currentValues.includes("other")) {
    // Clear all other values and keep only "other"
    return ["other"];
  }

  // If "other" is already selected and user tries to add another option
  if (
    currentValues.includes("other") &&
    newValue.length > 1 &&
    newValue.some((v) => v !== "other")
  ) {
    // Remove "other" from the array
    const withoutOther = newValue.filter((v) => v !== "other");
    return withoutOther;
  }

  // Normal selection logic
  return newValue;
};

// Yup Validation
const behaviorSchema = Yup.object().shape({
  name: Yup.string().required("Behavior name is required"),
  category: Yup.string().required("Behavior category is required"),
  categoryOther: Yup.string().when("category", {
    is: "other",
    then: (schema) => schema.required("Please specify the behavior category"),
    otherwise: (schema) => schema.nullable(),
  }),
  operationalDefinition: Yup.string().required(
    "Operational definition is required"
  ),
  direction: Yup.string().required("Behavior direction is required"),
  functionOfBehavior: Yup.string().required("Function of behavior is required"),
  functionOther: Yup.string().when("functionOfBehavior", {
    is: "other",
    then: (schema) => schema.required("Please specify the function"),
    otherwise: (schema) => schema.nullable(),
  }),
  antecedentConsequence: Yup.string(),
  baselineDescription: Yup.string(),
  measurementMethod: Yup.string().required("Measurement method is required"),
  measurementMethodOther: Yup.string().when("measurementMethod", {
    is: "other",
    then: (schema) => schema.required("Please specify the measurement method"),
    otherwise: (schema) => schema.nullable(),
  }),
  settingsContext: Yup.array().min(
    1,
    "At least one setting/context is required"
  ),
  settingsContextOther: Yup.string().when("settingsContext", {
    is: (val) => val && val.includes("other"),
    then: (schema) => schema.required("Please specify the setting/context"),
    otherwise: (schema) => schema.nullable(),
  }),
  priority: Yup.string().required("Priority is required"),
});

const TargetBehavioursSection = ({ data = [], onChange, onRemoveSection, isReadOnly = false }) => {
  const [behaviors, setBehaviors] = useState(
    data.length > 0
      ? data
      : [
          {
            id: Date.now(),
            name: "",
            category: "",
            categoryOther: "", // New field for "Other" category input
            operationalDefinition: "",
            direction: "",
            functionOfBehavior: "",
            functionOther: "", // New field for "Other" function input
            antecedentConsequence: "",
            baselineDescription: "",
            measurementMethod: "",
            measurementMethodOther: "", // New field for "Other" measurement method input
            graphReference: [],
            settingsContext: [],
            settingsContextOther: "", // New field for "Other" settings input
            priority: "",
          },
        ]
  );

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const addNewBehavior = () => {
    if (isReadOnly) return;
    const newBehavior = {
      id: Date.now(),
      name: "",
      category: "",
      categoryOther: "",
      operationalDefinition: "",
      direction: "",
      functionOfBehavior: "",
      functionOther: "",
      antecedentConsequence: "",
      baselineDescription: "",
      measurementMethod: "",
      measurementMethodOther: "",
      graphReference: [],
      settingsContext: [],
      settingsContextOther: "",
      priority: "",
    };
    const updated = [...behaviors, newBehavior];
    setBehaviors(updated);
    onChange(updated);
  };

  const removeBehavior = (id) => {
    if (isReadOnly) return;
    if (behaviors.length === 1) {
      showToast("At least one target behavior is required.");
      return;
    }
    const updated = behaviors.filter((b) => b.id !== id);
    setBehaviors(updated);
    onChange(updated);
  };

  const updateBehavior = (id, field, value) => {
    let finalValue = value;

    // Handle "other" selection logic for single select fields
    if (
      field === "category" ||
      field === "functionOfBehavior" ||
      field === "measurementMethod"
    ) {
      const currentBehavior = behaviors.find((b) => b.id === id);
      const currentValue = currentBehavior ? currentBehavior[field] : "";
      finalValue = handleOtherSelectionSingle(currentValue, value, field);

      // Clear the "other" input field if switching away from "other"
      if (currentValue === "other" && value !== "other") {
        const otherField =
          field === "category"
            ? "categoryOther"
            : field === "functionOfBehavior"
            ? "functionOther"
            : "measurementMethodOther";
        const updatedWithClearedOther = behaviors.map((b) =>
          b.id === id ? { ...b, [field]: finalValue, [otherField]: "" } : b
        );
        setBehaviors(updatedWithClearedOther);
        onChange(updatedWithClearedOther);
        return;
      }
    }

    // Handle "other" selection logic for multi-select field
    if (field === "settingsContext") {
      const currentBehavior = behaviors.find((b) => b.id === id);
      const currentValues = currentBehavior ? currentBehavior[field] : [];
      finalValue = handleOtherSelectionMulti(currentValues, value, field);
    }

    const updated = behaviors.map((b) =>
      b.id === id ? { ...b, [field]: finalValue } : b
    );

    setBehaviors(updated);
    onChange(updated);

    // Validate on change if touched
    if (touched[`${id}-${field}`]) {
      validateSingleBehavior(
        id,
        updated.find((b) => b.id === id)
      );
    }
  };

  const validateSingleBehavior = async (id, behavior) => {
    try {
      await behaviorSchema.validate(behavior, { abortEarly: false });
      setErrors((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (key.startsWith(`${id}-`)) delete next[key];
        });
        return next;
      });
    } catch (err) {
      const fieldErrors = {};
      err.inner.forEach((e) => {
        fieldErrors[`${id}-${e.path}`] = e.message;
      });
      setErrors((prev) => ({ ...prev, ...fieldErrors }));
    }
  };

  const handleBlur = (id, field) => {
    setTouched((prev) => ({ ...prev, [`${id}-${field}`]: true }));
    const behavior = behaviors.find((b) => b.id === id);
    if (behavior) validateSingleBehavior(id, behavior);
  };

  return (
    <div className="crb-section-fields">
      {behaviors.map((behavior, index) => {
        const showCategoryOther = behavior.category === "other";
        const showFunctionOther = behavior.functionOfBehavior === "other";
        const showMeasurementMethodOther =
          behavior.measurementMethod === "other";
        const showSettingsContextOther =
          behavior.settingsContext.includes("other");

        return (
          <div key={behavior.id} className="behavior-card">
            {/* Card Header with Delete Button */}
            <div className="behavior-card-header">
              <h5>Target Behavior {index + 1}</h5>
              {!isReadOnly && (
              <button
                className="behavior-delete-btn"
                onClick={() => removeBehavior(behavior.id)}
                type="button"
              >
                <RxCross2 />
                Delete Behavior
              </button>
              )}
            </div>

            <div className="behavior-card-content">
              {/* Behavior Name */}
              <ReportTextInput
                required
                label="Behavior Name"
                placeholder="Type something"
                value={behavior.name}
                onChange={(val) => updateBehavior(behavior.id, "name", val)}
                onBlur={() => handleBlur(behavior.id, "name")}
                readOnly={isReadOnly}
              />
              {touched[`${behavior.id}-name`] &&
                errors[`${behavior.id}-name`] && (
                  <div className="report-builder-error">
                    {errors[`${behavior.id}-name`]}
                  </div>
                )}

              {/* Behavior Category */}
              <div className="select-with-other-container">
                <ReportSelect
                  required
                  label="Behavior Category"
                  placeholder="Select an option"
                  options={BEHAVIOR_CATEGORIES}
                  value={behavior.category}
                  onChange={(val) =>
                    updateBehavior(behavior.id, "category", val)
                  }
                  onBlur={() => handleBlur(behavior.id, "category")}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    menu: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                  readOnly={isReadOnly}
                />
                {touched[`${behavior.id}-category`] &&
                  errors[`${behavior.id}-category`] && (
                    <div className="report-builder-error">
                      {errors[`${behavior.id}-category`]}
                    </div>
                  )}

                {/* Show Other input when "Other" is selected */}
                {showCategoryOther && (
                  <div className="other-input-wrapper">
                    <ReportTextInput
                      required
                      label="Please specify"
                      placeholder="Enter other behavior category"
                      value={behavior.categoryOther}
                      onChange={(val) =>
                        updateBehavior(behavior.id, "categoryOther", val)
                      }
                      onBlur={() => handleBlur(behavior.id, "categoryOther")}
                      readOnly={isReadOnly}
                    />
                    {touched[`${behavior.id}-categoryOther`] &&
                      errors[`${behavior.id}-categoryOther`] && (
                        <div className="report-builder-error">
                          {errors[`${behavior.id}-categoryOther`]}
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Operational Definition */}
              <RichTextEditor
                required
                label="Operational definition"
                placeholder="Enter a description..."
                value={behavior.operationalDefinition}
                onChange={(val) =>
                  updateBehavior(behavior.id, "operationalDefinition", val)
                }
                readOnly={isReadOnly}
              />
              {touched[`${behavior.id}-operationalDefinition`] &&
                errors[`${behavior.id}-operationalDefinition`] && (
                  <div className="report-builder-error">
                    {errors[`${behavior.id}-operationalDefinition`]}
                  </div>
                )}

              {/* Behavior Direction */}
              <ReportRadioGroup
                required
                label="Behavior Direction"
                options={DIRECTION_OPTIONS}
                value={behavior.direction}
                onChange={(val) =>
                  updateBehavior(behavior.id, "direction", val)
                }
                readOnly={isReadOnly}
              />
              {touched[`${behavior.id}-direction`] &&
                errors[`${behavior.id}-direction`] && (
                  <div className="report-builder-error">
                    {errors[`${behavior.id}-direction`]}
                  </div>
                )}

              {/* Function of Behavior */}
              <div className="select-with-other-container">
                <ReportSelect
                  required
                  label="Function of behavior"
                  placeholder="Select an option"
                  options={FUNCTION_OPTIONS}
                  value={behavior.functionOfBehavior}
                  onChange={(val) =>
                    updateBehavior(behavior.id, "functionOfBehavior", val)
                  }
                  onBlur={() => handleBlur(behavior.id, "functionOfBehavior")}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    menu: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                  readOnly={isReadOnly}
                />
                {touched[`${behavior.id}-functionOfBehavior`] &&
                  errors[`${behavior.id}-functionOfBehavior`] && (
                    <div className="report-builder-error">
                      {errors[`${behavior.id}-functionOfBehavior`]}
                    </div>
                  )}

                {/* Show Other input when "Other" is selected */}
                {showFunctionOther && (
                  <div className="other-input-wrapper">
                    <ReportTextInput
                      required
                      label="Please specify"
                      placeholder="Enter other function"
                      value={behavior.functionOther}
                      onChange={(val) =>
                        updateBehavior(behavior.id, "functionOther", val)
                      }
                      onBlur={() => handleBlur(behavior.id, "functionOther")}
                      readOnly={isReadOnly}
                    />
                    {touched[`${behavior.id}-functionOther`] &&
                      errors[`${behavior.id}-functionOther`] && (
                        <div className="report-builder-error">
                          {errors[`${behavior.id}-functionOther`]}
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Antecedent/Consequence Patterns */}
              <RichTextEditor
                label="Antecedent/Consequence patterns"
                placeholder="Enter a description..."
                value={behavior.antecedentConsequence}
                onChange={(val) =>
                  updateBehavior(behavior.id, "antecedentConsequence", val)
                }
                readOnly={isReadOnly}
              />

              {/* Baseline Description */}
              <RichTextEditor
                label="Baseline description"
                placeholder="Enter a description..."
                value={behavior.baselineDescription}
                onChange={(val) =>
                  updateBehavior(behavior.id, "baselineDescription", val)
                }
                readOnly={isReadOnly}
              />

              {/* Measurement Method */}
              <div className="select-with-other-container">
                <ReportSelect
                  required
                  label="Measurement method"
                  placeholder="Select an option"
                  options={MEASUREMENT_METHODS}
                  value={behavior.measurementMethod}
                  onChange={(val) =>
                    updateBehavior(behavior.id, "measurementMethod", val)
                  }
                  onBlur={() => handleBlur(behavior.id, "measurementMethod")}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    menu: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                  readOnly={isReadOnly}
                />
                {touched[`${behavior.id}-measurementMethod`] &&
                  errors[`${behavior.id}-measurementMethod`] && (
                    <div className="report-builder-error">
                      {errors[`${behavior.id}-measurementMethod`]}
                    </div>
                  )}

                {/* Show Other input when "Other" is selected */}
                {showMeasurementMethodOther && (
                  <div className="other-input-wrapper">
                    <ReportTextInput
                      required
                      label="Please specify"
                      placeholder="Enter other measurement method"
                      value={behavior.measurementMethodOther}
                      onChange={(val) =>
                        updateBehavior(
                          behavior.id,
                          "measurementMethodOther",
                          val
                        )
                      }
                      onBlur={() =>
                        handleBlur(behavior.id, "measurementMethodOther")
                      }
                      readOnly={isReadOnly}
                    />
                    {touched[`${behavior.id}-measurementMethodOther`] &&
                      errors[`${behavior.id}-measurementMethodOther`] && (
                        <div className="report-builder-error">
                          {errors[`${behavior.id}-measurementMethodOther`]}
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Graph Reference */}
              <ReportFileUpload
                label="Graph reference"
                value={behavior.graphReference}
                onChange={(files) =>
                  updateBehavior(behavior.id, "graphReference", files)
                }
                acceptedFormats="PDF, DOCX, PNG, JPG"
                multiple
                readOnly={isReadOnly}
              />

              {/* Settings/Context */}
              <div className="select-with-other-container">
                <ReportMultiSelect
                  label="Settings/Context"
                  placeholder="Select an option"
                  options={SETTINGS_OPTIONS}
                  value={behavior.settingsContext}
                  onChange={(val) =>
                    updateBehavior(behavior.id, "settingsContext", val)
                  }
                  onBlur={() => handleBlur(behavior.id, "settingsContext")}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    menu: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                  readOnly={isReadOnly}
                />
                {touched[`${behavior.id}-settingsContext`] &&
                  errors[`${behavior.id}-settingsContext`] && (
                    <div className="report-builder-error">
                      {errors[`${behavior.id}-settingsContext`]}
                    </div>
                  )}

                {/* Show Other input when "Other" is selected */}
                {showSettingsContextOther && (
                  <div className="other-input-wrapper">
                    <ReportTextInput
                      required
                      label="Please specify"
                      placeholder="Enter other settings/context"
                      value={behavior.settingsContextOther}
                      onChange={(val) =>
                        updateBehavior(behavior.id, "settingsContextOther", val)
                      }
                      onBlur={() =>
                        handleBlur(behavior.id, "settingsContextOther")
                      }
                      readOnly={isReadOnly}
                    />
                    {touched[`${behavior.id}-settingsContextOther`] &&
                      errors[`${behavior.id}-settingsContextOther`] && (
                        <div className="report-builder-error">
                          {errors[`${behavior.id}-settingsContextOther`]}
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Priority */}
              <ReportSelect
                required
                label="Priority"
                placeholder="Select an option"
                options={PRIORITY_OPTIONS}
                value={behavior.priority}
                onChange={(val) => updateBehavior(behavior.id, "priority", val)}
                onBlur={() => handleBlur(behavior.id, "priority")}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  menu: (base) => ({ ...base, zIndex: 9999 }),
                }}
                readOnly={isReadOnly}
              />
              {touched[`${behavior.id}-priority`] &&
                errors[`${behavior.id}-priority`] && (
                  <div className="report-builder-error">
                    {errors[`${behavior.id}-priority`]}
                  </div>
                )}
            </div>
          </div>
        );
      })}

      {/* Add New Behavior Button */}
      {!isReadOnly && (
        <div className="behavior-add-wrapper">
        <Button
          label="Add a new target behaviour"
          variant="secondary"
          size="medium"
          width="auto"
          icon={<FaPlus />}
          iconPosition="left"
          iconSize={16}
          onClick={addNewBehavior}
        />
      </div>
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

export default TargetBehavioursSection;

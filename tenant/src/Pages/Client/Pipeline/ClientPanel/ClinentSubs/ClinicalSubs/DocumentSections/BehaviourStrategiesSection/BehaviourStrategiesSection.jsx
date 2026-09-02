import React, { useState } from "react";
import * as Yup from "yup";
import RichTextEditor from "../../../../../../../../Components/Input/RichTextEditor/RichTextEditorInput";
import {
  ReportTextInput,
  ReportSelect,
  ReportMultiSelect,
} from "../../../../../../../../Components/Input/ReportInput/ReportBuilderInputs";
import Button from "../../../../../../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import "./BehaviourStrategiesSection.css";
import { showToast } from "../../../../../../../../Helper/ShowToast";
import { RequiredMark } from "../../../../../../../../Components/Input/Inputs";

// Strategy Types
const STRATEGY_TYPES = [
  { value: "antecedent", label: "Antecedent modification" },
  { value: "teaching", label: "Teaching/skill acquisition" },
  { value: "differential", label: "Differential reinforcement" },
  { value: "extinction", label: "Extinction" },
  { value: "response-interruption", label: "Response interruption/redirection" },
  { value: "prompting", label: "Prompting & fading" },
  { value: "environmental", label: "Environmental arrangement" },
  { value: "visual", label: "Visual supports" },
  { value: "replacement", label: "Replacement behaviour training" },
  { value: "crisis", label: "Crisis intervention" },
  { value: "other", label: "Other" },
];

// Behavior Functions
const FUNCTION_OPTIONS = [
  { value: "attention", label: "Attention" },
  { value: "escape", label: "Escape/avoidance" },
  { value: "tangible", label: "Access to tangible" },
  { value: "sensory", label: "Automatic/sensory" },
  { value: "multiple", label: "Multiple/unclear" },
];

// Responsible Staff
const STAFF_OPTIONS = [
  { value: "rbt", label: "RBT" },
  { value: "bcba", label: "BCBA" },
  { value: "caregiver", label: "Caregiver/Parent" },
  { value: "teacher", label: "Teacher/School staff" },
];

// Fidelity Requirements
const FIDELITY_OPTIONS = [
  { value: "prompt-hierarchy", label: "Follow defined prompt hierarchy" },
  { value: "immediate-reinforcement", label: "Deliver reinforcement immediately" },
  { value: "neutral-affect", label: "Maintain neutral affect" },
  { value: "specified-materials", label: "Use specified materials only" },
  { value: "collect-data", label: "Collect data during implementation" },
  { value: "safety-precautions", label: "Follow safety precautions" },
  { value: "other", label: "Other" },
];

// Data Collected
const DATA_COLLECTED_OPTIONS = [
  { value: "frequency", label: "Frequency" },
  { value: "duration", label: "Duration" },
  { value: "rate", label: "Rate" },
  { value: "latency", label: "Latency" },
  { value: "percentage", label: "Percentage Correct" },
  { value: "trials", label: "Trials/Opportunities" },
  { value: "task-analysis", label: "Task Analysis" },
  { value: "other", label: "Other" },
];

// Helper function to handle "other" selection logic
const handleOtherSelection = (currentValues, newValue) => {
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

// Yup Validation
const strategySchema = Yup.object().shape({
  targetBehaviors: Yup.string().required("Target Behavior(s) is required"),
  strategyName: Yup.string().required("Strategy name is required"),
  strategyType: Yup.array().min(1, "At least one strategy type is required"),
  customStrategyType: Yup.string().when("strategyType", {
    is: (val) => val && val.includes("other"),
    then: (schema) => schema.required("Please specify the strategy type"),
    otherwise: (schema) => schema.nullable(),
  }),
  functionAddressed: Yup.string().required("Behavior function addressed is required"),
  replacementBehavior: Yup.string(),
  strategyDescription: Yup.string(),
  whenToUse: Yup.string(),
  responsibleStaff: Yup.array().min(1, "At least one responsible staff is required"),
  fidelityRequirements: Yup.array().min(1, "At least one fidelity requirement is required"),
  customFidelityRequirement: Yup.string().when("fidelityRequirements", {
    is: (val) => val && val.includes("other"),
    then: (schema) => schema.required("Please specify the fidelity requirement"),
    otherwise: (schema) => schema.nullable(),
  }),
  dataCollected: Yup.array().min(1, "At least one data collection method is required"),
  customDataCollected: Yup.string().when("dataCollected", {
    is: (val) => val && val.includes("other"),
    then: (schema) => schema.required("Please specify the data collection method"),
    otherwise: (schema) => schema.nullable(),
  }),
});

const BehaviourStrategiesSection = ({ data = [], onChange, onRemoveSection, isReadOnly = false }) => {
  const [strategies, setStrategies] = useState(
    data.length > 0
      ? data
      : [
          {
            id: Date.now(),
            targetBehaviors: "",
            strategyName: "",
            strategyType: [],
            customStrategyType: "",
            functionAddressed: "",
            replacementBehavior: "",
            strategyDescription: "",
            whenToUse: "",
            responsibleStaff: [],
            fidelityRequirements: [],
            customFidelityRequirement: "",
            dataCollected: [],
            customDataCollected: "",
          },
        ]
  );

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const addNewStrategy = () => {
    if (isReadOnly) return;
    const newStrategy = {
      id: Date.now(),
      targetBehaviors: "",
      strategyName: "",
      strategyType: [],
      customStrategyType: "",
      functionAddressed: "",
      replacementBehavior: "",
      strategyDescription: "",
      whenToUse: "",
      responsibleStaff: [],
      fidelityRequirements: [],
      customFidelityRequirement: "",
      dataCollected: [],
      customDataCollected: "",
    };
    const updated = [...strategies, newStrategy];
    setStrategies(updated);
    onChange(updated);
  };

  const removeStrategy = (id) => {
    if (isReadOnly) return;
    if (strategies.length === 1) {
      showToast("At least one behaviour strategy is required.");
      return;
    }
    const updated = strategies.filter((s) => s.id !== id);
    setStrategies(updated);
    onChange(updated);
  };

  const updateStrategy = (id, field, value) => {
    let finalValue = value;
    
    // Handle "other" selection logic for multi-select fields
    if (field === "strategyType" || field === "fidelityRequirements" || field === "dataCollected") {
      const currentStrategy = strategies.find(s => s.id === id);
      const currentValues = currentStrategy ? currentStrategy[field] : [];
      finalValue = handleOtherSelection(currentValues, value, field);
    }
    
    const updated = strategies.map((s) =>
      s.id === id ? { ...s, [field]: finalValue } : s
    );

    setStrategies(updated);
    onChange(updated);

    // Validate on change if touched
    if (touched[`${id}-${field}`]) {
      validateSingleStrategy(id, updated.find((s) => s.id === id));
    }
  };

  const validateSingleStrategy = async (id, strategy) => {
    try {
      await strategySchema.validate(strategy, { abortEarly: false });
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
    const strategy = strategies.find((s) => s.id === id);
    if (strategy) validateSingleStrategy(id, strategy);
  };

  return (
    <div className="crb-section-fields">
      {strategies.map((strategy, index) => {
        const showCustomStrategyType = strategy.strategyType.includes("other");
        const showCustomFidelity = strategy.fidelityRequirements.includes("other");
        const showCustomData = strategy.dataCollected.includes("other");

        return (
          <div key={strategy.id} className="strategy-card">
            {/* Card Header with Delete Button */}
            <div className="strategy-card-header">
              <h5>Behaviour Strategy {index + 1}</h5>
              {!isReadOnly && (
              <button
                className="strategy-delete-btn"
                onClick={() => removeStrategy(strategy.id)}
                type="button"
              >
                <RxCross2 />
                Delete Behavior Strategy
              </button>
              )}
            </div>

            <div className="strategy-card-content">
              {/* Target Behaviors */}
              <div className="report-builder-field">
                <label className="report-builder-label">
                  Target Behavior(s)
                  <RequiredMark required />
                </label>
                <div className="target-behaviors-input-wrapper">
                  <input
                    type="text"
                    className="report-builder-input"
                    placeholder="Type something"
                    value={strategy.targetBehaviors}
                    onChange={(e) =>
                      updateStrategy(strategy.id, "targetBehaviors", e.target.value)
                    }
                    onBlur={() => handleBlur(strategy.id, "targetBehaviors")}
                    readOnly={isReadOnly}
                  />
                  <div className="target-behaviors-notes">
                    <p>• Please use the same wording as in the Target Behaviors section</p>
                    <p>• Separate multiple behaviors by a comma (,)</p>
                  </div>
                </div>
              </div>
              {touched[`${strategy.id}-targetBehaviors`] &&
                errors[`${strategy.id}-targetBehaviors`] && (
                  <div className="report-builder-error">
                    {errors[`${strategy.id}-targetBehaviors`]}
                  </div>
                )}

              {/* Strategy Name */}
              <ReportTextInput
                required
                label="Strategy name"
                placeholder="Type something"
                value={strategy.strategyName}
                onChange={(val) => updateStrategy(strategy.id, "strategyName", val)}
                onBlur={() => handleBlur(strategy.id, "strategyName")}
                readOnly={isReadOnly}
              />
              {touched[`${strategy.id}-strategyName`] &&
                errors[`${strategy.id}-strategyName`] && (
                  <div className="report-builder-error">
                    {errors[`${strategy.id}-strategyName`]}
                  </div>
                )}

              {/* Strategy Type - Multi-Select */}
              <ReportMultiSelect
                label="Strategy Type"
                placeholder="Select an option"
                options={STRATEGY_TYPES}
                value={strategy.strategyType}
                onChange={(val) => updateStrategy(strategy.id, "strategyType", val)}
                onBlur={() => handleBlur(strategy.id, "strategyType")}
                readOnly={isReadOnly}
              />
              {touched[`${strategy.id}-strategyType`] &&
                errors[`${strategy.id}-strategyType`] && (
                  <div className="report-builder-error">
                    {errors[`${strategy.id}-strategyType`]}
                  </div>
                )}

              {/* Custom Strategy Type (if "Other" selected) */}
              {showCustomStrategyType && (
                <>
                  <ReportTextInput
                    required
                    label="Custom Strategy Type"
                    placeholder="Type something"
                    value={strategy.customStrategyType}
                    onChange={(val) =>
                      updateStrategy(strategy.id, "customStrategyType", val)
                    }
                    onBlur={() => handleBlur(strategy.id, "customStrategyType")}
                    readOnly={isReadOnly}
                  />
                  {touched[`${strategy.id}-customStrategyType`] &&
                    errors[`${strategy.id}-customStrategyType`] && (
                      <div className="report-builder-error">
                        {errors[`${strategy.id}-customStrategyType`]}
                      </div>
                    )}
                </>
              )}

              {/* Behavior Function Addressed */}
              <ReportSelect
                required
                label="Behavior function addressed"
                placeholder="Select an option"
                options={FUNCTION_OPTIONS}
                value={strategy.functionAddressed}
                onChange={(val) =>
                  updateStrategy(strategy.id, "functionAddressed", val)
                }
                onBlur={() => handleBlur(strategy.id, "functionAddressed")}
                readOnly={isReadOnly}
              />
              {touched[`${strategy.id}-functionAddressed`] &&
                errors[`${strategy.id}-functionAddressed`] && (
                  <div className="report-builder-error">
                    {errors[`${strategy.id}-functionAddressed`]}
                  </div>
                )}

              {/* Replacement / Alternative Behavior */}
              <RichTextEditor
                label="Replacement / Alternative Behavior"
                placeholder="Enter a description..."
                value={strategy.replacementBehavior}
                onChange={(val) =>
                  updateStrategy(strategy.id, "replacementBehavior", val)
                }
                readOnly={isReadOnly}
              />

              {/* Strategy Description */}
              <RichTextEditor
                label="Strategy description"
                placeholder="Enter a description..."
                value={strategy.strategyDescription}
                onChange={(val) =>
                  updateStrategy(strategy.id, "strategyDescription", val)
                }
                readOnly={isReadOnly}
              />

              {/* When to Use */}
              <RichTextEditor
                label="When to use"
                placeholder="Enter a description..."
                value={strategy.whenToUse}
                onChange={(val) => updateStrategy(strategy.id, "whenToUse", val)}
                readOnly={isReadOnly}
              />

              {/* Responsible Staff - Multi-Select */}
              <ReportMultiSelect
                label="Responsible staff"
                placeholder="Select an option"
                options={STAFF_OPTIONS}
                value={strategy.responsibleStaff}
                onChange={(val) =>
                  updateStrategy(strategy.id, "responsibleStaff", val)
                }
                onBlur={() => handleBlur(strategy.id, "responsibleStaff")}
                readOnly={isReadOnly}
              />
              {touched[`${strategy.id}-responsibleStaff`] &&
                errors[`${strategy.id}-responsibleStaff`] && (
                  <div className="report-builder-error">
                    {errors[`${strategy.id}-responsibleStaff`]}
                  </div>
                )}

              {/* Fidelity Requirements - Multi-Select */}
              <ReportMultiSelect
                label="Fidelity requirements"
                placeholder="Select an option"
                options={FIDELITY_OPTIONS}
                value={strategy.fidelityRequirements}
                onChange={(val) =>
                  updateStrategy(strategy.id, "fidelityRequirements", val)
                }
                onBlur={() => handleBlur(strategy.id, "fidelityRequirements")}
                readOnly={isReadOnly}
              />
              {touched[`${strategy.id}-fidelityRequirements`] &&
                errors[`${strategy.id}-fidelityRequirements`] && (
                  <div className="report-builder-error">
                    {errors[`${strategy.id}-fidelityRequirements`]}
                  </div>
                )}

              {/* Custom Fidelity Requirement (if "Other" selected) */}
              {showCustomFidelity && (
                <>
                  <ReportTextInput
                    required
                    label="Custom Fidelity Requirement"
                    placeholder="Type something"
                    value={strategy.customFidelityRequirement}
                    onChange={(val) =>
                      updateStrategy(strategy.id, "customFidelityRequirement", val)
                    }
                    onBlur={() => handleBlur(strategy.id, "customFidelityRequirement")}
                    readOnly={isReadOnly}
                  />
                  {touched[`${strategy.id}-customFidelityRequirement`] &&
                    errors[`${strategy.id}-customFidelityRequirement`] && (
                      <div className="report-builder-error">
                        {errors[`${strategy.id}-customFidelityRequirement`]}
                      </div>
                    )}
                </>
              )}

              {/* Data Collected - Multi-Select */}
              <ReportMultiSelect
                label="Data collected"
                placeholder="Select an option"
                options={DATA_COLLECTED_OPTIONS}
                value={strategy.dataCollected}
                onChange={(val) => updateStrategy(strategy.id, "dataCollected", val)}
                onBlur={() => handleBlur(strategy.id, "dataCollected")}
                readOnly={isReadOnly}
              />
              {touched[`${strategy.id}-dataCollected`] &&
                errors[`${strategy.id}-dataCollected`] && (
                  <div className="report-builder-error">
                    {errors[`${strategy.id}-dataCollected`]}
                  </div>
                )}

              {/* Custom Data Collected (if "Other" selected) */}
              {showCustomData && (
                <>
                  <ReportTextInput
                    required
                    label="Custom Data Collection Method"
                    placeholder="Type something"
                    value={strategy.customDataCollected}
                    onChange={(val) =>
                      updateStrategy(strategy.id, "customDataCollected", val)
                    }
                    onBlur={() => handleBlur(strategy.id, "customDataCollected")}
                    readOnly={isReadOnly}
                  />
                  {touched[`${strategy.id}-customDataCollected`] &&
                    errors[`${strategy.id}-customDataCollected`] && (
                      <div className="report-builder-error">
                        {errors[`${strategy.id}-customDataCollected`]}
                      </div>
                    )}
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* Add New Strategy Button */}
      {!isReadOnly && (
        <div className="strategy-add-wrapper">
        <Button
          label="Add a new behaviour strategy"
          variant="secondary"
          size="medium"
          width="auto"
          icon={<FaPlus />}
          iconPosition="left"
          iconSize={16}
          onClick={addNewStrategy}
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

export default BehaviourStrategiesSection;
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
import "./GoalsTargetsSection.css";
import { showToast } from "../../../../../../../../Helper/ShowToast";
import { RequiredMark } from "../../../../../../../../Components/Input/Inputs";

// Goal Domain Options
const GOAL_DOMAIN_OPTIONS = [
  { value: "communication", label: "Communication" },
  { value: "social-skills", label: "Social skills" },
  { value: "adaptive-daily-living", label: "Adaptive/daily living skills" },
  { value: "academic-learning", label: "Academic/learning skills" },
  { value: "play-leisure", label: "Play and leisure" },
  { value: "motor-skills", label: "Motor skills" },
  { value: "behaviour-reduction", label: "Behaviour reduction" },
  { value: "self-management", label: "Self-management" },
  { value: "safety-skills", label: "Safety skills" },
  { value: "other", label: "Other" },
];

// Goal Timeframe Options
const GOAL_TIMEFRAME_OPTIONS = [
  { value: "short-term", label: "Short term (0-3 months)" },
  { value: "medium-term", label: "Medium term (3-6 months)" },
  { value: "long-term", label: "Long term (6-12 months)" },
  { value: "ongoing", label: "Ongoing" },
];

// Measurement Method Options
const MEASUREMENT_METHOD_OPTIONS = [
  { value: "frequency", label: "Frequency" },
  { value: "duration", label: "Duration" },
  { value: "rate", label: "Rate" },
  { value: "latency", label: "Latency" },
  { value: "percentage-correct", label: "Percentage Correct" },
  { value: "trials-opportunities", label: "Trials/Opportunities" },
  { value: "task-analysis", label: "Task Analysis" },
  { value: "other", label: "Other" },
];

// Target Type Options
const TARGET_TYPE_OPTIONS = [
  { value: "skill-acquisition", label: "Skill acquisition" },
  { value: "behaviour-reduction", label: "Behaviour reduction" },
  { value: "generalization", label: "Generalization" },
  { value: "maintenance", label: "Maintenance" },
];

// Review Timeframe Options
const REVIEW_TIMEFRAME_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

// Target Status Options
const TARGET_STATUS_OPTIONS = [
  { value: "not-introduced", label: "Not Introduced" },
  { value: "in-progress", label: "In Progress" },
  { value: "mastered", label: "Mastered" },
  { value: "maintaining", label: "Maintaining" },
  { value: "discontinued", label: "Discontinued" },
  { value: "on-hold", label: "On Hold" },
];

// Helper function to handle "other" selection logic for single selects
const handleOtherSelectionSingle = (currentValue, newValue) => {
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

// Yup Validation Schemas
const targetSchema = Yup.object().shape({
  targetStatement: Yup.string().required("Target statement is required"),
  targetType: Yup.string().required("Target type is required"),
  baselineLevelReference: Yup.string(),
  masteryCriteria: Yup.string().required("Mastery criteria is required"),
  measurementMethod: Yup.string().required("Measurement method is required"),
  measurementMethodOther: Yup.string().when("measurementMethod", {
    is: "other",
    then: (schema) => schema.required("Please specify the measurement method"),
    otherwise: (schema) => schema.nullable(),
  }),
  reviewTimeframe: Yup.string().required("Review timeframe is required"),
  targetStatus: Yup.string().required("Target status is required"),
  discontinuationCriteria: Yup.string(),
});

const goalSchema = Yup.object().shape({
  targetBehaviors: Yup.string().required("Target Behavior(s) is required"),
  goalStatement: Yup.string().required("Goal statement is required"),
  goalDomain: Yup.string().required("Goal domain is required"),
  goalDomainOther: Yup.string().when("goalDomain", {
    is: "other",
    then: (schema) => schema.required("Please specify the goal domain"),
    otherwise: (schema) => schema.nullable(),
  }),
  baselineLevel: Yup.string(),
  goalTimeframe: Yup.string().required("Goal timeframe is required"),
  measurementMethod: Yup.string().required("Measurement method is required"),
  measurementMethodOther: Yup.string().when("measurementMethod", {
    is: "other",
    then: (schema) => schema.required("Please specify the measurement method"),
    otherwise: (schema) => schema.nullable(),
  }),
  targets: Yup.array()
    .of(targetSchema)
    .min(1, "At least one target is required"),
});

const GoalsTargetsSection = ({ data = [], onChange, onRemoveSection, isReadOnly = false }) => {
  const [goals, setGoals] = useState(
    data.length > 0
      ? data
      : [
          {
            id: Date.now(),
            targetBehaviors: "",
            goalStatement: "",
            goalDomain: "",
            goalDomainOther: "",
            baselineLevel: "",
            goalTimeframe: "",
            measurementMethod: "",
            measurementMethodOther: "",
            targets: [
              {
                id: Date.now() + 1,
                targetStatement: "",
                targetType: "",
                baselineLevelReference: "",
                masteryCriteria: "",
                measurementMethod: "",
                measurementMethodOther: "",
                reviewTimeframe: "",
                targetStatus: "",
                discontinuationCriteria: "",
              },
            ],
          },
        ]
  );

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Goal Management
  const addNewGoal = () => {
    if (isReadOnly) return;
    const newGoal = {
      id: Date.now(),
      targetBehaviors: "",
      goalStatement: "",
      goalDomain: "",
      goalDomainOther: "",
      baselineLevel: "",
      goalTimeframe: "",
      measurementMethod: "",
      measurementMethodOther: "",
      targets: [
        {
          id: Date.now() + 1,
          targetStatement: "",
          targetType: "",
          baselineLevelReference: "",
          masteryCriteria: "",
          measurementMethod: "",
          measurementMethodOther: "",
          reviewTimeframe: "",
          targetStatus: "",
          discontinuationCriteria: "",
        },
      ],
    };
    const updated = [...goals, newGoal];
    setGoals(updated);
    onChange(updated);
  };

  const removeGoal = (goalId) => {
    if (isReadOnly) return;
    if (goals.length === 1) {
      showToast("At least one goal is required.");
      return;
    }
    const updated = goals.filter((g) => g.id !== goalId);
    setGoals(updated);
    onChange(updated);
  };

  const updateGoal = (goalId, field, value) => {
    let finalValue = value;

    // Handle "other" selection logic for single select fields
    if (field === "goalDomain" || field === "measurementMethod") {
      const currentGoal = goals.find((g) => g.id === goalId);
      const currentValue = currentGoal ? currentGoal[field] : "";
      finalValue = handleOtherSelectionSingle(currentValue, value);

      // Clear the "other" input field if switching away from "other"
      if (currentValue === "other" && value !== "other") {
        const otherField =
          field === "goalDomain" ? "goalDomainOther" : "measurementMethodOther";
        const updatedWithClearedOther = goals.map((g) =>
          g.id === goalId ? { ...g, [field]: finalValue, [otherField]: "" } : g
        );
        setGoals(updatedWithClearedOther);
        onChange(updatedWithClearedOther);
        return;
      }
    }

    const updated = goals.map((g) =>
      g.id === goalId ? { ...g, [field]: finalValue } : g
    );

    setGoals(updated);
    onChange(updated);

    // Validate on change if touched
    if (touched[`${goalId}-${field}`]) {
      validateSingleGoal(
        goalId,
        updated.find((g) => g.id === goalId)
      );
    }
  };

  // Target Management
  const addNewTarget = (goalId) => {
    if (isReadOnly) return;
    const newTarget = {
      id: Date.now(),
      targetStatement: "",
      targetType: "",
      baselineLevelReference: "",
      masteryCriteria: "",
      measurementMethod: "",
      measurementMethodOther: "",
      reviewTimeframe: "",
      targetStatus: "",
      discontinuationCriteria: "",
    };

    const updated = goals.map((g) =>
      g.id === goalId ? { ...g, targets: [...g.targets, newTarget] } : g
    );

    setGoals(updated);
    onChange(updated);
  };

  const removeTarget = (goalId, targetId) => {
    if (isReadOnly) return;
    const updated = goals.map((g) => {
      if (g.id === goalId) {
        if (g.targets.length === 1) {
          showToast("At least one target is required per goal.");
          return g;
        }
        return { ...g, targets: g.targets.filter((t) => t.id !== targetId) };
      }
      return g;
    });

    setGoals(updated);
    onChange(updated);
  };

  const updateTarget = (goalId, targetId, field, value) => {
    let finalValue = value;

    // Handle "other" selection logic for measurement method
    if (field === "measurementMethod") {
      const currentGoal = goals.find((g) => g.id === goalId);
      const currentTarget = currentGoal?.targets.find((t) => t.id === targetId);
      const currentValue = currentTarget ? currentTarget[field] : "";
      finalValue = handleOtherSelectionSingle(currentValue, value);

      // Clear the "other" input field if switching away from "other"
      if (currentValue === "other" && value !== "other") {
        const updated = goals.map((g) => {
          if (g.id === goalId) {
            return {
              ...g,
              targets: g.targets.map((t) =>
                t.id === targetId
                  ? { ...t, [field]: finalValue, measurementMethodOther: "" }
                  : t
              ),
            };
          }
          return g;
        });
        setGoals(updated);
        onChange(updated);
        return;
      }
    }

    const updated = goals.map((g) => {
      if (g.id === goalId) {
        return {
          ...g,
          targets: g.targets.map((t) =>
            t.id === targetId ? { ...t, [field]: finalValue } : t
          ),
        };
      }
      return g;
    });

    setGoals(updated);
    onChange(updated);

    // Validate on change if touched
    if (touched[`${targetId}-${field}`]) {
      const goal = updated.find((g) => g.id === goalId);
      const target = goal?.targets.find((t) => t.id === targetId);
      if (target) validateSingleTarget(targetId, target);
    }
  };

  // Validation Functions
  const validateSingleGoal = async (goalId, goal) => {
    try {
      await goalSchema.validate(goal, { abortEarly: false });
      setErrors((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (key.startsWith(`${goalId}-`)) delete next[key];
        });
        return next;
      });
    } catch (err) {
      const fieldErrors = {};
      err.inner.forEach((e) => {
        fieldErrors[`${goalId}-${e.path}`] = e.message;
      });
      setErrors((prev) => ({ ...prev, ...fieldErrors }));
    }
  };

  const validateSingleTarget = async (targetId, target) => {
    try {
      await targetSchema.validate(target, { abortEarly: false });
      setErrors((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (key.startsWith(`${targetId}-`)) delete next[key];
        });
        return next;
      });
    } catch (err) {
      const fieldErrors = {};
      err.inner.forEach((e) => {
        fieldErrors[`${targetId}-${e.path}`] = e.message;
      });
      setErrors((prev) => ({ ...prev, ...fieldErrors }));
    }
  };

  const handleBlur = (id, field, isTarget = false) => {
    setTouched((prev) => ({ ...prev, [`${id}-${field}`]: true }));

    if (isTarget) {
      // Find the target in the goals array
      for (const goal of goals) {
        const target = goal.targets.find((t) => t.id === id);
        if (target) {
          validateSingleTarget(id, target);
          break;
        }
      }
    } else {
      const goal = goals.find((g) => g.id === id);
      if (goal) validateSingleGoal(id, goal);
    }
  };

  return (
    <div className="crb-section-fields">
      {goals.map((goal, goalIndex) => {
        const showGoalDomainOther = goal.goalDomain === "other";
        const showGoalMeasurementOther = goal.measurementMethod === "other";

        return (
          <div key={goal.id} className="goal-card">
            {/* Goal Header */}
            <div className="goal-card-header">
              <h5>Goal {goalIndex + 1}</h5>
              {!isReadOnly && (
              <button
                className="goal-delete-btn"
                onClick={() => removeGoal(goal.id)}
                type="button"
              >
                <RxCross2 />
                Delete Goal
              </button>
              )}
            </div>

            <div className="goal-card-content">
              {/* Target Behaviors for Goal */}
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
                    value={goal.targetBehaviors}
                    onChange={(e) =>
                      updateGoal(goal.id, "targetBehaviors", e.target.value)
                    }
                    onBlur={() => handleBlur(goal.id, "targetBehaviors")}
                    readOnly={isReadOnly}
                  />
                  <div className="target-behaviors-notes">
                    <p>• Select only one Target Behavior per goal</p>
                    <p>
                      • Please use the same wording as in the Target Behaviors
                      section
                    </p>
                    <p>• Separate multiple behaviors by a comma (,)</p>
                  </div>
                </div>
                {touched[`${goal.id}-targetBehaviors`] &&
                  errors[`${goal.id}-targetBehaviors`] && (
                    <div className="report-builder-error">
                      {errors[`${goal.id}-targetBehaviors`]}
                    </div>
                  )}
              </div>

              {/* Goal Statement */}
              <RichTextEditor
                required
                label="Goal Statement"
                placeholder="Enter a description..."
                value={goal.goalStatement}
                onChange={(val) => updateGoal(goal.id, "goalStatement", val)}
                onBlur={() => handleBlur(goal.id, "goalStatement")}
                readOnly={isReadOnly}
              />
              {touched[`${goal.id}-goalStatement`] &&
                errors[`${goal.id}-goalStatement`] && (
                  <div className="report-builder-error">
                    {errors[`${goal.id}-goalStatement`]}
                  </div>
                )}

              {/* Goal Domain */}
              <div className="select-with-other-container">
                <ReportSelect
                  required
                  label="Goal domain"
                  placeholder="Select an option"
                  options={GOAL_DOMAIN_OPTIONS}
                  value={goal.goalDomain}
                  onChange={(val) => updateGoal(goal.id, "goalDomain", val)}
                  onBlur={() => handleBlur(goal.id, "goalDomain")}
                  readOnly={isReadOnly}
                />
                {touched[`${goal.id}-goalDomain`] &&
                  errors[`${goal.id}-goalDomain`] && (
                    <div className="report-builder-error">
                      {errors[`${goal.id}-goalDomain`]}
                    </div>
                  )}

                {/* Show Other input when "Other" is selected */}
                {showGoalDomainOther && (
                  <div className="other-input-wrapper">
                    <ReportTextInput
                      required
                      label="Please specify"
                      placeholder="Enter other goal domain"
                      value={goal.goalDomainOther}
                      onChange={(val) =>
                        updateGoal(goal.id, "goalDomainOther", val)
                      }
                      onBlur={() => handleBlur(goal.id, "goalDomainOther")}
                      readOnly={isReadOnly}
                    />
                    {touched[`${goal.id}-goalDomainOther`] &&
                      errors[`${goal.id}-goalDomainOther`] && (
                        <div className="report-builder-error">
                          {errors[`${goal.id}-goalDomainOther`]}
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Baseline Level */}
              <ReportTextInput
                label="Baseline level"
                placeholder="Type something"
                value={goal.baselineLevel}
                onChange={(val) => updateGoal(goal.id, "baselineLevel", val)}
                readOnly={isReadOnly}
              />

              {/* Goal Timeframe */}
              <ReportSelect
                required
                label="Goal timeframe"
                placeholder="Select an option"
                options={GOAL_TIMEFRAME_OPTIONS}
                value={goal.goalTimeframe}
                onChange={(val) => updateGoal(goal.id, "goalTimeframe", val)}
                onBlur={() => handleBlur(goal.id, "goalTimeframe")}
                readOnly={isReadOnly}
              />
              {touched[`${goal.id}-goalTimeframe`] &&
                errors[`${goal.id}-goalTimeframe`] && (
                  <div className="report-builder-error">
                    {errors[`${goal.id}-goalTimeframe`]}
                  </div>
                )}

              {/* Goal Measurement Method */}
              <div className="select-with-other-container">
                <ReportSelect
                  required
                  label="Measurement method"
                  placeholder="Select an option"
                  options={MEASUREMENT_METHOD_OPTIONS}
                  value={goal.measurementMethod}
                  onChange={(val) =>
                    updateGoal(goal.id, "measurementMethod", val)
                  }
                  onBlur={() => handleBlur(goal.id, "measurementMethod")}
                  readOnly={isReadOnly}
                />
                {touched[`${goal.id}-measurementMethod`] &&
                  errors[`${goal.id}-measurementMethod`] && (
                    <div className="report-builder-error">
                      {errors[`${goal.id}-measurementMethod`]}
                    </div>
                  )}

                {/* Show Other input when "Other" is selected */}
                {showGoalMeasurementOther && (
                  <div className="other-input-wrapper">
                    <ReportTextInput
                      required
                      label="Please specify"
                      placeholder="Enter other measurement method"
                      value={goal.measurementMethodOther}
                      onChange={(val) =>
                        updateGoal(goal.id, "measurementMethodOther", val)
                      }
                      onBlur={() =>
                        handleBlur(goal.id, "measurementMethodOther")
                      }
                      readOnly={isReadOnly}
                    />
                    {touched[`${goal.id}-measurementMethodOther`] &&
                      errors[`${goal.id}-measurementMethodOther`] && (
                        <div className="report-builder-error">
                          {errors[`${goal.id}-measurementMethodOther`]}
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Targets Section */}
              <div className="targets-section">
                <h6 className="targets-section-title">Targets</h6>

                {goal.targets.map((target, targetIndex) => {
                  const showTargetMeasurementOther =
                    target.measurementMethod === "other";

                  return (
                    <div key={target.id} className="target-card">
                      <div className="target-card-header">
                        <h6>Target {targetIndex + 1}</h6>
                        {!isReadOnly && (
                        <button
                          className="target-delete-btn"
                          onClick={() => removeTarget(goal.id, target.id)}
                          type="button"
                        >
                          <RxCross2 size={14} />
                          Delete Target
                        </button>
                        )}
                      </div>

                      <div className="target-card-content">
                        {/* Target Statement */}
                        <RichTextEditor
                          required
                          label="Target Statement"
                          placeholder="Enter a description..."
                          value={target.targetStatement}
                          onChange={(val) =>
                            updateTarget(
                              goal.id,
                              target.id,
                              "targetStatement",
                              val
                            )
                          }
                          onBlur={() =>
                            handleBlur(target.id, "targetStatement", true)
                          }
                          readOnly={isReadOnly}
                        />
                        {touched[`${target.id}-targetStatement`] &&
                          errors[`${target.id}-targetStatement`] && (
                            <div className="report-builder-error">
                              {errors[`${target.id}-targetStatement`]}
                            </div>
                          )}

                        {/* Target Type */}
                        <ReportSelect
                          required
                          label="Target Type"
                          placeholder="Select an option"
                          options={TARGET_TYPE_OPTIONS}
                          value={target.targetType}
                          onChange={(val) =>
                            updateTarget(goal.id, target.id, "targetType", val)
                          }
                          onBlur={() =>
                            handleBlur(target.id, "targetType", true)
                          }
                          readOnly={isReadOnly}
                        />
                        {touched[`${target.id}-targetType`] &&
                          errors[`${target.id}-targetType`] && (
                            <div className="report-builder-error">
                              {errors[`${target.id}-targetType`]}
                            </div>
                          )}

                        {/* Baseline Level Reference */}
                        <RichTextEditor
                          label="Baseline level reference"
                          placeholder="Enter a description..."
                          value={target.baselineLevelReference}
                          onChange={(val) =>
                            updateTarget(
                              goal.id,
                              target.id,
                              "baselineLevelReference",
                              val
                            )
                          }
                          readOnly={isReadOnly}
                        />

                        {/* Mastery Criteria */}
                        <RichTextEditor
                          required
                          label="Mastery Criteria"
                          placeholder="Enter a description..."
                          value={target.masteryCriteria}
                          onChange={(val) =>
                            updateTarget(
                              goal.id,
                              target.id,
                              "masteryCriteria",
                              val
                            )
                          }
                          onBlur={() =>
                            handleBlur(target.id, "masteryCriteria", true)
                          }
                          readOnly={isReadOnly}
                        />
                        {touched[`${target.id}-masteryCriteria`] &&
                          errors[`${target.id}-masteryCriteria`] && (
                            <div className="report-builder-error">
                              {errors[`${target.id}-masteryCriteria`]}
                            </div>
                          )}

                        {/* Target Measurement Method */}
                        <div className="select-with-other-container">
                          <ReportSelect
                            required
                            label="Measurement method"
                            placeholder="Select an option"
                            options={MEASUREMENT_METHOD_OPTIONS}
                            value={target.measurementMethod}
                            onChange={(val) =>
                              updateTarget(
                                goal.id,
                                target.id,
                                "measurementMethod",
                                val
                              )
                            }
                            onBlur={() =>
                              handleBlur(target.id, "measurementMethod", true)
                            }
                            readOnly={isReadOnly}
                          />
                          {touched[`${target.id}-measurementMethod`] &&
                            errors[`${target.id}-measurementMethod`] && (
                              <div className="report-builder-error">
                                {errors[`${target.id}-measurementMethod`]}
                              </div>
                            )}

                          {/* Show Other input when "Other" is selected */}
                          {showTargetMeasurementOther && (
                            <div className="other-input-wrapper">
                              <ReportTextInput
                                required
                                label="Please specify"
                                placeholder="Enter other measurement method"
                                value={target.measurementMethodOther}
                                onChange={(val) =>
                                  updateTarget(
                                    goal.id,
                                    target.id,
                                    "measurementMethodOther",
                                    val
                                  )
                                }
                                onBlur={() =>
                                  handleBlur(
                                    target.id,
                                    "measurementMethodOther",
                                    true
                                  )
                                }
                                readOnly={isReadOnly}
                              />
                              {touched[`${target.id}-measurementMethodOther`] &&
                                errors[
                                  `${target.id}-measurementMethodOther`
                                ] && (
                                  <div className="report-builder-error">
                                    {
                                      errors[
                                        `${target.id}-measurementMethodOther`
                                      ]
                                    }
                                  </div>
                                )}
                            </div>
                          )}
                        </div>

                        {/* Review Timeframe */}
                        <ReportSelect
                          required
                          label="Review timeframe/date"
                          placeholder="Select an option"
                          options={REVIEW_TIMEFRAME_OPTIONS}
                          value={target.reviewTimeframe}
                          onChange={(val) =>
                            updateTarget(
                              goal.id,
                              target.id,
                              "reviewTimeframe",
                              val
                            )
                          }
                          onBlur={() =>
                            handleBlur(target.id, "reviewTimeframe", true)
                          }
                          readOnly={isReadOnly}
                        />
                        {touched[`${target.id}-reviewTimeframe`] &&
                          errors[`${target.id}-reviewTimeframe`] && (
                            <div className="report-builder-error">
                              {errors[`${target.id}-reviewTimeframe`]}
                            </div>
                          )}

                        {/* Target Status */}
                        <ReportSelect
                          required
                          label="Target Status"
                          placeholder="Select an option"
                          options={TARGET_STATUS_OPTIONS}
                          value={target.targetStatus}
                          onChange={(val) =>
                            updateTarget(
                              goal.id,
                              target.id,
                              "targetStatus",
                              val
                            )
                          }
                          onBlur={() =>
                            handleBlur(target.id, "targetStatus", true)
                          }
                          readOnly={isReadOnly}
                        />
                        {touched[`${target.id}-targetStatus`] &&
                          errors[`${target.id}-targetStatus`] && (
                            <div className="report-builder-error">
                              {errors[`${target.id}-targetStatus`]}
                            </div>
                          )}

                        {/* Discontinuation / Modification Criteria */}
                        <RichTextEditor
                          label="Discontinuation / Modification Criteria"
                          placeholder="Enter a description..."
                          value={target.discontinuationCriteria}
                          onChange={(val) =>
                            updateTarget(
                              goal.id,
                              target.id,
                              "discontinuationCriteria",
                              val
                            )
                          }
                          readOnly={isReadOnly}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Add Target Button */}
                {!isReadOnly && (
                  <div className="target-add-wrapper">
                  <Button
                    label="Add a target"
                    variant="secondary"
                    size="small"
                    width="auto"
                    icon={<FaPlus />}
                    iconPosition="left"
                    iconSize={14}
                    onClick={() => addNewTarget(goal.id)}
                  />
                </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Add New Goal Button */}
      {!isReadOnly && (
        <div className="goal-add-wrapper">
        <Button
          label="Add a new goal"
          variant="secondary"
          size="medium"
          width="auto"
          icon={<FaPlus />}
          iconPosition="left"
          iconSize={16}
          onClick={addNewGoal}
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

export default GoalsTargetsSection;

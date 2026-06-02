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
import "./CrisisSafetySection.css";
import { showToast } from "../../../../../../../../Helper/ShowToast";

// Crisis Type Options
const CRISIS_TYPE_OPTIONS = [
  { value: "aggression-toward-others", label: "Aggression toward others" },
  { value: "self-injurious-behavior", label: "Self-injurious behavior" },
  { value: "property-destruction", label: "Property destruction" },
  { value: "elopement-wandering", label: "Elopement/wandering" },
  { value: "severe-emotional-dysregulation", label: "Severe emotional dysregulation" },
  { value: "noncompliance-safety-risk", label: "Noncompliance with safety risk" },
  { value: "medical-emergency-behavior", label: "Medical emergency-related behavior" },
  { value: "other", label: "Other" },
];

// Risk Level Options
const RISK_LEVEL_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
  { value: "severe", label: "Severe" },
];

// De-escalation Techniques Options
const DEESCALATION_TECHNIQUES_OPTIONS = [
  { value: "verbal-redirection", label: "Verbal redirection" },
  { value: "visual-supports", label: "Visual supports" },
  { value: "demand-reduction", label: "Demand reduction" },
  { value: "planned-ignoring", label: "Planned ignoring" },
  { value: "environmental-modification", label: "Environmental modification" },
  { value: "calming-strategies", label: "Calming strategies" },
  { value: "differential-reinforcement", label: "Differential reinforcement" },
  { value: "time-away", label: "Time away (non-seclusion)" },
  { value: "other", label: "Other" },
];

// Physical Intervention Permitted Options
const PHYSICAL_INTERVENTION_OPTIONS = [
  { value: "no", label: "No" },
  { value: "yes-non-restrictive", label: "Yes (non-restrictive only)" },
  { value: "yes-restrictive-approved", label: "Yes (restrictive procedures approved)" },
];

// Staff Authorized to Intervene Options
const STAFF_AUTHORIZED_OPTIONS = [
  { value: "rbt", label: "RBT" },
  { value: "bcba", label: "BCBA" },
  { value: "clinical-supervisor", label: "Clinical supervisor" },
  { value: "caregiver-parent", label: "Caregiver/parent" },
  { value: "school-staff", label: "School staff" },
  { value: "other", label: "Other" },
];

// Emergency Services Involvement Options
const EMERGENCY_SERVICES_OPTIONS = [
  { value: "not-required", label: "Not required" },
  { value: "if-imminent-danger", label: "If imminent danger present" },
  { value: "if-deescalation-fails", label: "If de-escalation fails" },
  { value: "clinically-indicated", label: "As clinically indicated" },
];

// Review Schedule Options
const REVIEW_SCHEDULE_OPTIONS = [
  { value: "after-each-incident", label: "After each incident" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "as-needed", label: "As needed" },
];

// Incident Documentation Required Options
const INCIDENT_DOCUMENTATION_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
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
const crisisPlanSchema = Yup.object().shape({
  crisisType: Yup.array().min(1, "At least one crisis type is required"),
  crisisTypeOther: Yup.string().when("crisisType", {
    is: (val) => val && val.includes("other"),
    then: (schema) => schema.required("Please specify the crisis type"),
    otherwise: (schema) => schema.nullable(),
  }),
  descriptionOfCrisisBehavior: Yup.string(),
  earlyWarningSigns: Yup.string(),
  knownTriggers: Yup.string(),
  riskLevel: Yup.string().required("Risk level is required"),
  riskLevelDescription: Yup.string(),
  crisisActivationCriteria: Yup.string(),
  immediateResponseProcedures: Yup.string(),
  deescalationTechniques: Yup.array().min(1, "At least one de-escalation technique is required"),
  deescalationTechniquesOther: Yup.string().when("deescalationTechniques", {
    is: (val) => val && val.includes("other"),
    then: (schema) => schema.required("Please specify the de-escalation technique"),
    otherwise: (schema) => schema.nullable(),
  }),
  physicalInterventionPermitted: Yup.string().required("Physical intervention permission is required"),
  physicalInterventionDescription: Yup.string(),
  staffAuthorizedToIntervene: Yup.array().min(1, "At least one staff member must be authorized"),
  staffAuthorizedOther: Yup.string().when("staffAuthorizedToIntervene", {
    is: (val) => val && val.includes("other"),
    then: (schema) => schema.required("Please specify the authorized staff"),
    otherwise: (schema) => schema.nullable(),
  }),
  environmentalSafetyActions: Yup.string(),
  emergencyServicesInvolvement: Yup.string().required("Emergency services involvement is required"),
  emergencyContactInstructions: Yup.string(),
  postCrisisProcedure: Yup.string(),
  incidentDocumentationRequired: Yup.string().required("Incident documentation requirement is required"),
  reviewSchedule: Yup.string().required("Review schedule is required"),
  additionalNotes: Yup.string(),
});

const CrisisSafetySection = ({ data = [], onChange, onRemoveSection, isReadOnly = false }) => {
  const [crisisPlans, setCrisisPlans] = useState(
    data.length > 0
      ? data
      : [
          {
            id: Date.now(),
            crisisType: [],
            crisisTypeOther: "",
            descriptionOfCrisisBehavior: "",
            earlyWarningSigns: "",
            knownTriggers: "",
            riskLevel: "",
            riskLevelDescription: "",
            crisisActivationCriteria: "",
            immediateResponseProcedures: "",
            deescalationTechniques: [],
            deescalationTechniquesOther: "",
            physicalInterventionPermitted: "",
            physicalInterventionDescription: "",
            staffAuthorizedToIntervene: [],
            staffAuthorizedOther: "",
            environmentalSafetyActions: "",
            emergencyServicesInvolvement: "",
            emergencyContactInstructions: "",
            postCrisisProcedure: "",
            incidentDocumentationRequired: "",
            reviewSchedule: "",
            additionalNotes: "",
          },
        ]
  );

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Add New Crisis Plan
  const addNewCrisisPlan = () => {
    if (isReadOnly) return;
    const newCrisisPlan = {
      id: Date.now(),
      crisisType: [],
      crisisTypeOther: "",
      descriptionOfCrisisBehavior: "",
      earlyWarningSigns: "",
      knownTriggers: "",
      riskLevel: "",
      riskLevelDescription: "",
      crisisActivationCriteria: "",
      immediateResponseProcedures: "",
      deescalationTechniques: [],
      deescalationTechniquesOther: "",
      physicalInterventionPermitted: "",
      physicalInterventionDescription: "",
      staffAuthorizedToIntervene: [],
      staffAuthorizedOther: "",
      environmentalSafetyActions: "",
      emergencyServicesInvolvement: "",
      emergencyContactInstructions: "",
      postCrisisProcedure: "",
      incidentDocumentationRequired: "",
      reviewSchedule: "",
      additionalNotes: "",
    };
    const updated = [...crisisPlans, newCrisisPlan];
    setCrisisPlans(updated);
    onChange(updated);
  };

  // Remove Crisis Plan
  const removeCrisisPlan = (id) => {
    if (isReadOnly) return;
    if (crisisPlans.length === 1) {
      showToast("At least one crisis plan is required.");
      return;
    }
    const updated = crisisPlans.filter((cp) => cp.id !== id);
    setCrisisPlans(updated);
    onChange(updated);
  };

  // Update Crisis Plan
  const updateCrisisPlan = (id, field, value) => {
    let finalValue = value;
    
    // Handle "other" selection logic for multi-select fields
    if (field === "crisisType" || field === "deescalationTechniques" || field === "staffAuthorizedToIntervene") {
      const currentPlan = crisisPlans.find(cp => cp.id === id);
      const currentValues = currentPlan ? currentPlan[field] : [];
      finalValue = handleOtherSelectionMulti(currentValues, value);
    }
    
    const updated = crisisPlans.map((cp) =>
      cp.id === id ? { ...cp, [field]: finalValue } : cp
    );

    setCrisisPlans(updated);
    onChange(updated);

    // Validate on change if touched
    if (touched[`${id}-${field}`]) {
      validateSingleCrisisPlan(id, updated.find((cp) => cp.id === id));
    }
  };

  // Validate Single Crisis Plan
  const validateSingleCrisisPlan = async (id, crisisPlan) => {
    try {
      await crisisPlanSchema.validate(crisisPlan, { abortEarly: false });
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
    const crisisPlan = crisisPlans.find((cp) => cp.id === id);
    if (crisisPlan) validateSingleCrisisPlan(id, crisisPlan);
  };

  return (
    <div className="crb-section-fields">
      {crisisPlans.map((crisisPlan, index) => {
        const showCrisisTypeOther = crisisPlan.crisisType.includes("other");
        const showDeescalationOther = crisisPlan.deescalationTechniques.includes("other");
        const showStaffAuthorizedOther = crisisPlan.staffAuthorizedToIntervene.includes("other");
        const showPhysicalInterventionDescription = crisisPlan.physicalInterventionPermitted !== "no";

        return (
          <div key={crisisPlan.id} className="crisis-plan-card">
            {/* Card Header with Delete Button */}
            <div className="crisis-plan-card-header">
              <h5>Crisis Plan {index + 1}</h5>
              {!isReadOnly && (
              <button
                className="crisis-plan-delete-btn"
                onClick={() => removeCrisisPlan(crisisPlan.id)}
                type="button"
              >
                <RxCross2 />
                Delete Crisis Plan
              </button>
              )}
            </div>

            <div className="crisis-plan-card-content">
              {/* Crisis Type - Multi-Select */}
              <div className="select-with-other-container">
                <ReportMultiSelect
                  label="Crisis Type"
                  placeholder="Select an option"
                  options={CRISIS_TYPE_OPTIONS}
                  value={crisisPlan.crisisType}
                  onChange={(val) => updateCrisisPlan(crisisPlan.id, "crisisType", val)}
                  onBlur={() => handleBlur(crisisPlan.id, "crisisType")}
                  readOnly={isReadOnly}
                />
                {touched[`${crisisPlan.id}-crisisType`] &&
                  errors[`${crisisPlan.id}-crisisType`] && (
                    <div className="report-builder-error">
                      {errors[`${crisisPlan.id}-crisisType`]}
                    </div>
                  )}
                
                {/* Show Other input when "Other" is selected */}
                {showCrisisTypeOther && (
                  <div className="other-input-wrapper">
                    <ReportTextInput
                      label="Please specify"
                      placeholder="Enter other crisis type"
                      value={crisisPlan.crisisTypeOther}
                      onChange={(val) => updateCrisisPlan(crisisPlan.id, "crisisTypeOther", val)}
                      onBlur={() => handleBlur(crisisPlan.id, "crisisTypeOther")}
                      readOnly={isReadOnly}
                    />
                    {touched[`${crisisPlan.id}-crisisTypeOther`] &&
                      errors[`${crisisPlan.id}-crisisTypeOther`] && (
                        <div className="report-builder-error">
                          {errors[`${crisisPlan.id}-crisisTypeOther`]}
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Description of crisis behavior */}
              <RichTextEditor
                label="Description of crisis behavior"
                placeholder="Enter a description..."
                value={crisisPlan.descriptionOfCrisisBehavior}
                onChange={(val) => updateCrisisPlan(crisisPlan.id, "descriptionOfCrisisBehavior", val)}
                readOnly={isReadOnly}
              />

              {/* Early warning signs */}
              <RichTextEditor
                label="Early warning signs"
                placeholder="Enter a description..."
                value={crisisPlan.earlyWarningSigns}
                onChange={(val) => updateCrisisPlan(crisisPlan.id, "earlyWarningSigns", val)}
                readOnly={isReadOnly}
              />

              {/* Known triggers */}
              <RichTextEditor
                label="Known triggers"
                placeholder="Enter a description..."
                value={crisisPlan.knownTriggers}
                onChange={(val) => updateCrisisPlan(crisisPlan.id, "knownTriggers", val)}
                readOnly={isReadOnly}
              />

              {/* Risk Level */}
              <ReportSelect
                label="Risk level"
                placeholder="Select an option"
                options={RISK_LEVEL_OPTIONS}
                value={crisisPlan.riskLevel}
                onChange={(val) => updateCrisisPlan(crisisPlan.id, "riskLevel", val)}
                onBlur={() => handleBlur(crisisPlan.id, "riskLevel")}
                readOnly={isReadOnly}
              />
              {touched[`${crisisPlan.id}-riskLevel`] &&
                errors[`${crisisPlan.id}-riskLevel`] && (
                  <div className="report-builder-error">
                    {errors[`${crisisPlan.id}-riskLevel`]}
                  </div>
                )}

              {/* Risk Level Description */}
              <ReportTextInput
                label="Risk level description"
                placeholder="Enter a description..."
                value={crisisPlan.riskLevelDescription}
                onChange={(val) => updateCrisisPlan(crisisPlan.id, "riskLevelDescription", val)}
                readOnly={isReadOnly}
              />

              {/* Crisis activation criteria */}
              <RichTextEditor
                label="Crisis activation criteria"
                placeholder="Enter a description..."
                value={crisisPlan.crisisActivationCriteria}
                onChange={(val) => updateCrisisPlan(crisisPlan.id, "crisisActivationCriteria", val)}
                readOnly={isReadOnly}
              />

              {/* Immediate response procedures */}
              <RichTextEditor
                label="Immediate response procedures"
                placeholder="Enter a description..."
                value={crisisPlan.immediateResponseProcedures}
                onChange={(val) => updateCrisisPlan(crisisPlan.id, "immediateResponseProcedures", val)}
                readOnly={isReadOnly}
              />

              {/* De-escalation techniques - Multi-Select */}
              <div className="select-with-other-container">
                <ReportMultiSelect
                  label="De-escalation techniques"
                  placeholder="Select an option"
                  options={DEESCALATION_TECHNIQUES_OPTIONS}
                  value={crisisPlan.deescalationTechniques}
                  onChange={(val) => updateCrisisPlan(crisisPlan.id, "deescalationTechniques", val)}
                  onBlur={() => handleBlur(crisisPlan.id, "deescalationTechniques")}
                  readOnly={isReadOnly}
                />
                {touched[`${crisisPlan.id}-deescalationTechniques`] &&
                  errors[`${crisisPlan.id}-deescalationTechniques`] && (
                    <div className="report-builder-error">
                      {errors[`${crisisPlan.id}-deescalationTechniques`]}
                    </div>
                  )}
                
                {/* Show Other input when "Other" is selected */}
                {showDeescalationOther && (
                  <div className="other-input-wrapper">
                    <ReportTextInput
                      label="Please specify"
                      placeholder="Enter other de-escalation technique"
                      value={crisisPlan.deescalationTechniquesOther}
                      onChange={(val) => updateCrisisPlan(crisisPlan.id, "deescalationTechniquesOther", val)}
                      onBlur={() => handleBlur(crisisPlan.id, "deescalationTechniquesOther")}
                      readOnly={isReadOnly}
                    />
                    {touched[`${crisisPlan.id}-deescalationTechniquesOther`] &&
                      errors[`${crisisPlan.id}-deescalationTechniquesOther`] && (
                        <div className="report-builder-error">
                          {errors[`${crisisPlan.id}-deescalationTechniquesOther`]}
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Physical intervention permitted */}
              <ReportSelect
                label="Physical intervention permitted"
                placeholder="Select an option"
                options={PHYSICAL_INTERVENTION_OPTIONS}
                value={crisisPlan.physicalInterventionPermitted}
                onChange={(val) => updateCrisisPlan(crisisPlan.id, "physicalInterventionPermitted", val)}
                onBlur={() => handleBlur(crisisPlan.id, "physicalInterventionPermitted")}
                readOnly={isReadOnly}
              />
              {touched[`${crisisPlan.id}-physicalInterventionPermitted`] &&
                errors[`${crisisPlan.id}-physicalInterventionPermitted`] && (
                  <div className="report-builder-error">
                    {errors[`${crisisPlan.id}-physicalInterventionPermitted`]}
                  </div>
                )}

              {/* Physical intervention description (conditionally shown) */}
              {showPhysicalInterventionDescription && (
                <RichTextEditor
                  label="Physical intervention description"
                  placeholder="Enter a description..."
                  value={crisisPlan.physicalInterventionDescription}
                  onChange={(val) => updateCrisisPlan(crisisPlan.id, "physicalInterventionDescription", val)}
                  readOnly={isReadOnly}
                />
              )}

              {/* Staff authorized to intervene - Multi-Select */}
              <div className="select-with-other-container">
                <ReportMultiSelect
                  label="Staff authorized to intervene"
                  placeholder="Select an option"
                  options={STAFF_AUTHORIZED_OPTIONS}
                  value={crisisPlan.staffAuthorizedToIntervene}
                  onChange={(val) => updateCrisisPlan(crisisPlan.id, "staffAuthorizedToIntervene", val)}
                  onBlur={() => handleBlur(crisisPlan.id, "staffAuthorizedToIntervene")}
                  readOnly={isReadOnly}
                />
                {touched[`${crisisPlan.id}-staffAuthorizedToIntervene`] &&
                  errors[`${crisisPlan.id}-staffAuthorizedToIntervene`] && (
                    <div className="report-builder-error">
                      {errors[`${crisisPlan.id}-staffAuthorizedToIntervene`]}
                    </div>
                  )}
                
                {/* Show Other input when "Other" is selected */}
                {showStaffAuthorizedOther && (
                  <div className="other-input-wrapper">
                    <ReportTextInput
                      label="Please specify"
                      placeholder="Enter other authorized staff"
                      value={crisisPlan.staffAuthorizedOther}
                      onChange={(val) => updateCrisisPlan(crisisPlan.id, "staffAuthorizedOther", val)}
                      onBlur={() => handleBlur(crisisPlan.id, "staffAuthorizedOther")}
                      readOnly={isReadOnly}
                    />
                    {touched[`${crisisPlan.id}-staffAuthorizedOther`] &&
                      errors[`${crisisPlan.id}-staffAuthorizedOther`] && (
                        <div className="report-builder-error">
                          {errors[`${crisisPlan.id}-staffAuthorizedOther`]}
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Environmental Safety actions */}
              <RichTextEditor
                label="Environmental Safety actions"
                placeholder="Enter a description..."
                value={crisisPlan.environmentalSafetyActions}
                onChange={(val) => updateCrisisPlan(crisisPlan.id, "environmentalSafetyActions", val)}
                readOnly={isReadOnly}
              />

              {/* Emergency services involvement */}
              <ReportSelect
                label="Emergency services involvement"
                placeholder="Select an option"
                options={EMERGENCY_SERVICES_OPTIONS}
                value={crisisPlan.emergencyServicesInvolvement}
                onChange={(val) => updateCrisisPlan(crisisPlan.id, "emergencyServicesInvolvement", val)}
                onBlur={() => handleBlur(crisisPlan.id, "emergencyServicesInvolvement")}
                readOnly={isReadOnly}
              />
              {touched[`${crisisPlan.id}-emergencyServicesInvolvement`] &&
                errors[`${crisisPlan.id}-emergencyServicesInvolvement`] && (
                  <div className="report-builder-error">
                    {errors[`${crisisPlan.id}-emergencyServicesInvolvement`]}
                  </div>
                )}

              {/* Emergency contact instructions */}
              <RichTextEditor
                label="Emergency contact instructions"
                placeholder="Enter a description..."
                value={crisisPlan.emergencyContactInstructions}
                onChange={(val) => updateCrisisPlan(crisisPlan.id, "emergencyContactInstructions", val)}
                readOnly={isReadOnly}
              />

              {/* Post crisis procedure */}
              <RichTextEditor
                label="Post crisis procedure"
                placeholder="Enter a description..."
                value={crisisPlan.postCrisisProcedure}
                onChange={(val) => updateCrisisPlan(crisisPlan.id, "postCrisisProcedure", val)}
                readOnly={isReadOnly}
              />

              {/* Incident documentation required */}
              <ReportSelect
                label="Incident documentation required"
                placeholder="Select an option"
                options={INCIDENT_DOCUMENTATION_OPTIONS}
                value={crisisPlan.incidentDocumentationRequired}
                onChange={(val) => updateCrisisPlan(crisisPlan.id, "incidentDocumentationRequired", val)}
                onBlur={() => handleBlur(crisisPlan.id, "incidentDocumentationRequired")}
                readOnly={isReadOnly}
              />
              {touched[`${crisisPlan.id}-incidentDocumentationRequired`] &&
                errors[`${crisisPlan.id}-incidentDocumentationRequired`] && (
                  <div className="report-builder-error">
                    {errors[`${crisisPlan.id}-incidentDocumentationRequired`]}
                  </div>
                )}

              {/* Review schedule */}
              <ReportSelect
                label="Review schedule"
                placeholder="Select an option"
                options={REVIEW_SCHEDULE_OPTIONS}
                value={crisisPlan.reviewSchedule}
                onChange={(val) => updateCrisisPlan(crisisPlan.id, "reviewSchedule", val)}
                onBlur={() => handleBlur(crisisPlan.id, "reviewSchedule")}
                readOnly={isReadOnly}
              />
              {touched[`${crisisPlan.id}-reviewSchedule`] &&
                errors[`${crisisPlan.id}-reviewSchedule`] && (
                  <div className="report-builder-error">
                    {errors[`${crisisPlan.id}-reviewSchedule`]}
                  </div>
                )}

              {/* Additional notes */}
              <RichTextEditor
                label="Additional notes"
                placeholder="Enter a description..."
                value={crisisPlan.additionalNotes}
                onChange={(val) => updateCrisisPlan(crisisPlan.id, "additionalNotes", val)}
                readOnly={isReadOnly}
              />
            </div>
          </div>
        );
      })}

      {/* Add New Crisis Plan Button */}
      {!isReadOnly && (
        <div className="crisis-plan-add-wrapper">
        <Button
          label="Add a new Crisis Plan"
          variant="secondary"
          size="medium"
          width="auto"
          icon={<FaPlus />}
          iconPosition="left"
          iconSize={16}
          onClick={addNewCrisisPlan}
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

export default CrisisSafetySection;
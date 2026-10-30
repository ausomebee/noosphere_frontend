import React, { useState } from "react";
import * as Yup from "yup";
import RichTextEditor from "../../../../../../../../Components/Input/RichTextEditor/RichTextEditorInput";
import {
  ReportTextInput,
  ReportSelect,
  ReportFileUpload,
} from "../../../../../../../../Components/Input/ReportInput/ReportBuilderInputs";
import Button from "../../../../../../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import "./AssessmentsSections.css";
import { showToast } from "../../../../../../../../Helper/ShowToast";

// Assessment Categories & Dependent Assessment Types
const ASSESSMENT_CATEGORIES = [
  { value: "core-aba", label: "Core ABA/Skill-Based Assessments" },
  { value: "adaptive-daily", label: "Adaptive & Daily Living Skills" },
  { value: "behaviour-emotional", label: "Behaviour & Emotional Functioning" },
  { value: "language-communication", label: "Language & Communication" },
  { value: "sensory-motor", label: "Sensory & Motor" },
  { value: "cognitive-developmental", label: "Cognitive/Developmental (Referenced)" },
  { value: "caregiver-stakeholder", label: "Caregiver/Stakeholder Input" },
  { value: "risk-safety", label: "Risk & Safety" },
  { value: "other", label: "Other" },
];

const ASSESSMENT_TYPES_MAP = {
  "core-aba": [
    { value: "infomt", label: "Infomt" },
    { value: "fa", label: "Functional Analysis (FA)" },
    { value: "vb-mapp", label: "VB-MAPP" },
    { value: "ablls-r", label: "ABLLS-R" },
    { value: "afls", label: "AFLS" },
    { value: "peak", label: "PEAK Relational Training System" },
    { value: "efl", label: "Essential for Living (EFL)" },
    { value: "sbt", label: "Skills-Based Treatment (SBT) Assessment" },
    { value: "esdm", label: "ESDM Curriculum Checklist" },
    { value: "social-savvy", label: "Social Savvy Checklist" },
  ],
  "adaptive-daily": [
    { value: "vineland", label: "Vineland Adaptive Behaviour Scales" },
    { value: "abas", label: "ABAS (Adaptive Behaviour Assessment System)" },
    { value: "sib-r", label: "Scales of Independent Behavior-Revised (SIB-R)" },
    { value: "pedi", label: "Pediatric Evaluation of Disability Inventory (PEDI)" },
    { value: "fls", label: "Functional Living Skills Inventory" },
  ],
  "behaviour-emotional": [
    { value: "abc", label: "Aberrant Behavior Checklist (ABC)" },
    { value: "cbcl", label: "Child Behavior Checklist (CBCL)" },
    { value: "basc", label: "Behavior Assessment System for Children (BASC)" },
    { value: "indirect-fa", label: "Indirect Functional Assessment (Interview-based)" },
    { value: "direct-abc", label: "Direct Observation/ABC Data Review" },
  ],
  "language-communication": [
    { value: "speech-lang", label: "Speech and Language Evaluation" },
    { value: "pragmatic", label: "Pragmatic Language Assessment" },
    { value: "comm-matrix", label: "Communication Matrix" },
    { value: "fcp", label: "Functional Communication Profile" },
  ],
  "sensory-motor": [
    { value: "sensory-profile", label: "Sensory Profile" },
    { value: "spm", label: "Sensory Processing Measure (SPM)" },
    { value: "ot-eval", label: "Occupational Therapy Evaluation" },
    { value: "pt-eval", label: "Physical Therapy Evaluation" },
  ],
  "cognitive-developmental": [
    { value: "psych-eval", label: "Psychological Evaluation" },
    { value: "neuropsych", label: "Neuropsychological Evaluation" },
    { value: "dev-eval", label: "Developmental Evaluation" },
    { value: "iq", label: "IQ Assessment (referenced)" },
    { value: "edu-eval", label: "Educational Evaluation (IEP-based)" },
  ],
  "caregiver-stakeholder": [
    { value: "cg-interview", label: "Caregiver Interview" },
    { value: "parent-interview", label: "Parent Interview" },
    { value: "teacher-interview", label: "Teacher Interview" },
    { value: "cg-questionnaire", label: "Structured Caregiver Questionnaire" },
    { value: "rating-scale", label: "Rating Scale (caregiver-completed)" },
  ],
  "risk-safety": [
    { value: "risk-assess", label: "Risk Assessment" },
    { value: "safety-assess", label: "Safety Assessment" },
    { value: "elopement", label: "Elopement Risk Assessment" },
    { value: "aggression", label: "Aggression Risk Review" },
  ],
};

// Yup Validation
const assessmentSchema = Yup.object().shape({
  category: Yup.string().required("Assessment Category is required"),
  type: Yup.string().when("category", {
    is: (val) => val !== "other",
    then: (schema) => schema.required("Assessment Type is required"),
    otherwise: (schema) => schema.nullable(),
  }),
  customType: Yup.string().when("category", {
    is: "other",
    then: (schema) => schema.required("Please specify the assessment type"),
    otherwise: (schema) => schema.nullable().strip(true),
  }),
  methodsUsed: Yup.string(),
  methodNotes: Yup.string(),
  date: Yup.date().nullable(),
  administeredBy: Yup.string(),
  summaryFindings: Yup.string(),
  strengths: Yup.string(),
  deficits: Yup.string(),
  clinicalInterpretation: Yup.string(),
});

const AssessmentsSection = ({ data = [], onChange, onRemoveSection, isReadOnly = false }) => {
  const [assessments, setAssessments] = useState(
    data.length > 0
      ? data
      : [
          {
            id: Date.now(),
            category: "",
            type: "",
            customType: "",
            methodsUsed: "",
            methodNotes: "",
            date: "",
            administeredBy: "",
            summaryFindings: "",
            strengths: "",
            deficits: "",
            supportingDocuments: [],
            clinicalInterpretation: "",
          },
        ]
  );

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const addNewAssessment = () => {
    if (isReadOnly) return;
    const newAssessment = {
      id: Date.now(),
      category: "",
      type: "",
      customType: "",
      methodsUsed: "",
      methodNotes: "",
      date: "",
      administeredBy: "",
      summaryFindings: "",
      strengths: "",
      deficits: "",
      supportingDocuments: [],
      clinicalInterpretation: "",
    };
    const updated = [...assessments, newAssessment];
    setAssessments(updated);
    onChange(updated);
  };

  const removeAssessment = (id) => {
    if (isReadOnly) return;
    if (assessments.length === 1) {
      showToast("At least one assessment is required.");
      return;
    }
    const updated = assessments.filter((a) => a.id !== id);
    setAssessments(updated);
    onChange(updated);
  };

  const updateAssessment = (id, field, value) => {
    const updated = assessments.map((a) =>
      a.id === id ? { ...a, [field]: value } : a
    );

    // Reset type/customType when category changes
    if (field === "category") {
      updated.forEach((a) => {
        if (a.id === id) {
          a.type = "";
          a.customType = "";
        }
      });
    }

    setAssessments(updated);
    onChange(updated);

    // Validate on change if touched
    if (touched[`${id}-${field}`]) {
      validateSingleAssessment(id, updated.find((a) => a.id === id));
    }
  };

  const validateSingleAssessment = async (id, assessment) => {
    try {
      await assessmentSchema.validate(assessment, { abortEarly: false });
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
    const assessment = assessments.find((a) => a.id === id);
    if (assessment) validateSingleAssessment(id, assessment);
  };

  return (
    <div className="crb-section-fields">
      {assessments.map((assessment, index) => {
        const types = ASSESSMENT_TYPES_MAP[assessment.category] || [];
        const showCustomType = assessment.category === "other";
        const showTypeDropdown = !showCustomType && types.length > 0;

        return (
          <div key={assessment.id} className="assessment-card">
            {/* Card Header with Delete Button */}
            <div className="assessment-card-header">
              <h5>Assessment {index + 1}</h5>
              {!isReadOnly && (
                <button
                  className="assessment-delete-btn"
                  onClick={() => removeAssessment(assessment.id)}
                  type="button"
                >
                  <RxCross2 />
                  Delete assessment
                </button>
              )}
            </div>

            <div className="assessment-card-content">
              {/* Category */}
              <ReportSelect
                required
                label="Assessment Category"
                placeholder="Select an option"
                options={ASSESSMENT_CATEGORIES}
                value={assessment.category}
                onChange={(val) => updateAssessment(assessment.id, "category", val)}
                onBlur={() => handleBlur(assessment.id, "category")}
                readOnly={isReadOnly}
              />
              {touched[`${assessment.id}-category`] &&
                errors[`${assessment.id}-category`] && (
                  <div className="report-builder-error">
                    {errors[`${assessment.id}-category`]}
                  </div>
                )}

              {/* Conditional Type / Custom Input */}
              {showTypeDropdown && (
                <>
                  <ReportSelect
                    required
                    label="Assessment Type"
                    placeholder="Select an option"
                    options={types}
                    value={assessment.type}
                    onChange={(val) => updateAssessment(assessment.id, "type", val)}
                    onBlur={() => handleBlur(assessment.id, "type")}
                    readOnly={isReadOnly}
                  />
                  {touched[`${assessment.id}-type`] &&
                    errors[`${assessment.id}-type`] && (
                      <div className="report-builder-error">
                        {errors[`${assessment.id}-type`]}
                      </div>
                    )}
                </>
              )}

              {showCustomType && (
                <>
                  <ReportTextInput
                    required
                    label="Assessment Type"
                    placeholder="Type the assessment name..."
                    value={assessment.customType}
                    onChange={(val) =>
                      updateAssessment(assessment.id, "customType", val)
                    }
                    onBlur={() => handleBlur(assessment.id, "customType")}
                    readOnly={isReadOnly}
                  />
                  {touched[`${assessment.id}-customType`] &&
                    errors[`${assessment.id}-customType`] && (
                      <div className="report-builder-error">
                        {errors[`${assessment.id}-customType`]}
                      </div>
                    )}
                </>
              )}

              {/* Methods Used */}
              <ReportTextInput
                label="Assessment Methods used"
                placeholder="Enter a description..."
                value={assessment.methodsUsed}
                onChange={(val) =>
                  updateAssessment(assessment.id, "methodsUsed", val)
                }
                readOnly={isReadOnly}
              />

              <RichTextEditor
                label="Assessment method notes"
                placeholder="Enter detailed notes..."
                value={assessment.methodNotes}
                onChange={(val) =>
                  updateAssessment(assessment.id, "methodNotes", val)
                }
                readOnly={isReadOnly}
              />

              <ReportTextInput
                label="Assessment Date"
                type="date"
                value={assessment.date}
                onChange={(val) => updateAssessment(assessment.id, "date", val)}
                readOnly={isReadOnly}
              />

              <ReportTextInput
                label="Administered by"
                placeholder="Type something"
                value={assessment.administeredBy}
                onChange={(val) =>
                  updateAssessment(assessment.id, "administeredBy", val)
                }
                readOnly={isReadOnly}
              />

              <RichTextEditor
                label="Summary of findings"
                placeholder="Enter a description..."
                value={assessment.summaryFindings}
                onChange={(val) =>
                  updateAssessment(assessment.id, "summaryFindings", val)
                }
                readOnly={isReadOnly}
              />

              <RichTextEditor
                label="Strengths identified"
                placeholder="Enter strengths..."
                value={assessment.strengths}
                onChange={(val) =>
                  updateAssessment(assessment.id, "strengths", val)
                }
                readOnly={isReadOnly}
              />

              <RichTextEditor
                label="Deficits identified"
                placeholder="Enter deficits..."
                value={assessment.deficits}
                onChange={(val) =>
                  updateAssessment(assessment.id, "deficits", val)
                }
                readOnly={isReadOnly}
              />

              <ReportFileUpload
                label="Supporting documents"
                value={assessment.supportingDocuments}
                onChange={(files) =>
                  updateAssessment(assessment.id, "supportingDocuments", files)
                }
                acceptedFormats="PDF, DOC, DOCX, PNG, JPG, JPEG"
                multiple
                readOnly={isReadOnly}
              />

              <RichTextEditor
                label="Clinical Interpretation & Implications"
                placeholder="Enter interpretation and implications..."
                value={assessment.clinicalInterpretation}
                onChange={(val) =>
                  updateAssessment(assessment.id, "clinicalInterpretation", val)
                }
                readOnly={isReadOnly}
              />
            </div>
          </div>
        );
      })}

      {/* Add New Assessment Button */}
      {!isReadOnly && (
        <div className="assessment-add-wrapper">
          <Button
            label="Add a new assessment"
            variant="secondary"
            size="medium"
            width="auto"
            icon={<FaPlus />}
            iconPosition="left"
            iconSize={16}
            onClick={addNewAssessment}
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

export default AssessmentsSection;
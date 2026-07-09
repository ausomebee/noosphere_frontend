import React, { useState } from "react";
import * as Yup from "yup";
import RichTextEditor from "../../../../../../../../Components/Input/RichTextEditor/RichTextEditorInput";
import {
  ReportTextInput,
  ReportSelect,
  ReportFileUpload,
} from "../../../../../../../../Components/Input/ReportInput/ReportBuilderInputs";
import Button from "../../../../../../../../Components/Button/Button";
import "./DischargeSection.css";
import { RxCross2 } from "react-icons/rx";

// Discharge Reasons
const DISCHARGE_REASONS = [
  { value: "goals-met", label: "Goals met" },
  { value: "plateau", label: "Plateau reached" },
  { value: "transition", label: "Transition to another service" },
  { value: "family-request", label: "Family request" },
  { value: "insurance", label: "Insurance limitation" },
  { value: "noncompliance", label: "Non-compliance/attendance issues" },
  { value: "not-eligible", label: "Client no longer eligible" },
  { value: "other", label: "Other" },
];

// Yup Validation
const dischargeSchema = Yup.object().shape({
  dischargeReason: Yup.string().required("Discharge reason is required"),
  dischargeDate: Yup.date().required("Discharge date is required"),
  progressCompared: Yup.string(),
  dischargeCriteria: Yup.string(),
  dischargeSummary: Yup.string(),
  postDischargeRecommendations: Yup.string(),
  transitionSupports: Yup.string(),
  supportingDocuments: Yup.array(),
  reviewNotes: Yup.string(),
});

const DischargeSection = ({ data = {}, onChange, onRemoveSection, isReadOnly = false }) => {
  const [formData, setFormData] = useState({
    dischargeReason: data.dischargeReason || "",
    dischargeDate: data.dischargeDate || "",
    progressCompared: data.progressCompared || "",
    dischargeCriteria: data.dischargeCriteria || "",
    dischargeSummary: data.dischargeSummary || "",
    postDischargeRecommendations: data.postDischargeRecommendations || "",
    transitionSupports: data.transitionSupports || "",
    supportingDocuments: data.supportingDocuments || [],
    reviewNotes: data.reviewNotes || "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateForm = async () => {
    try {
      await dischargeSchema.validate(formData, { abortEarly: false });
      setErrors({});
      return true;
    } catch (err) {
      const validationErrors = {};
      err.inner.forEach((error) => {
        validationErrors[error.path] = error.message;
      });
      setErrors(validationErrors);
      return false;
    }
  };

  const validateField = async (fieldName, value) => {
    try {
      await Yup.reach(dischargeSchema, fieldName).validate(value);
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: err.message,
      }));
    }
  };

  const handleFieldChange = (field, value) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onChange(updatedData);

    // Validate field if it's been touched
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleFieldBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  return (
    <div className="crb-section-fields">
      <div className="discharge-content">
        {/* Discharge Reason */}
        <ReportSelect
          required
          label="Discharge reason (if applicable)"
          placeholder="Select an option"
          options={DISCHARGE_REASONS}
          value={formData.dischargeReason}
          onChange={(value) => handleFieldChange("dischargeReason", value)}
          onBlur={() => handleFieldBlur("dischargeReason")}
          readOnly={isReadOnly}
        />
        {touched.dischargeReason && errors.dischargeReason && (
          <div className="report-builder-error">{errors.dischargeReason}</div>
        )}

        {/* Discharge Date */}
        <ReportTextInput
          required
          label="Discharge date"
          placeholder="Choose a date"
          type="date"
          value={formData.dischargeDate}
          onChange={(value) => handleFieldChange("dischargeDate", value)}
          onBlur={() => handleFieldBlur("dischargeDate")}
          readOnly={isReadOnly}
        />
        {touched.dischargeDate && errors.dischargeDate && (
          <div className="report-builder-error">{errors.dischargeDate}</div>
        )}

        {/* Progress Compared to Baseline */}
        <RichTextEditor
          label="Progress compared to baseline"
          placeholder="Enter a description..."
          value={formData.progressCompared}
          onChange={(value) => handleFieldChange("progressCompared", value)}
          readOnly={isReadOnly}
        />

        {/* Discharge Criteria */}
        <RichTextEditor
          label="Discharge criteria"
          placeholder="Enter a description..."
          value={formData.dischargeCriteria}
          onChange={(value) => handleFieldChange("dischargeCriteria", value)}
          readOnly={isReadOnly}
        />

        {/* Discharge Summary */}
        <RichTextEditor
          label="Discharge summary"
          placeholder="Enter a description..."
          value={formData.dischargeSummary}
          onChange={(value) => handleFieldChange("dischargeSummary", value)}
          readOnly={isReadOnly}
        />

        {/* Post-Discharge Recommendations */}
        <RichTextEditor
          label="Post-discharge recommendations"
          placeholder="Enter a description..."
          value={formData.postDischargeRecommendations}
          onChange={(value) =>
            handleFieldChange("postDischargeRecommendations", value)
          }
          readOnly={isReadOnly}
        />

        {/* Transition Supports */}
        <RichTextEditor
          label="Transition supports"
          placeholder="Enter a description..."
          value={formData.transitionSupports}
          onChange={(value) => handleFieldChange("transitionSupports", value)}
          readOnly={isReadOnly}
        />

        {/* Supporting Documents */}
        <ReportFileUpload
          label="Supporting documents"
          value={formData.supportingDocuments}
          onChange={(files) => handleFieldChange("supportingDocuments", files)}
          acceptedFormats="PDF, DOCX, PNG, JPG"
          multiple
          readOnly={isReadOnly}
        />

        {/* Review and Discharge Notes */}
        <RichTextEditor
          label="Review and discharge notes"
          placeholder="Enter a description..."
          value={formData.reviewNotes}
          onChange={(value) => handleFieldChange("reviewNotes", value)}
          readOnly={isReadOnly}
        />
      </div>

      {/* Remove Section Button */}
      {!isReadOnly && onRemoveSection && (
      <div className="section-remove-btn-wrapper">
        <Button
          label="Remove Section"
          variant="action-danger"
          icon={<RxCross2 />}
          size="medium"
          width="auto"
          onClick={onRemoveSection}
        />
      </div>
      )}
    </div>
  );
};

export default DischargeSection;

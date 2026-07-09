import React, { useState } from "react";
import * as Yup from "yup";
import RichTextEditor from "../../../../../../../../Components/Input/RichTextEditor/RichTextEditorInput";
import {
  ReportTextInput,
  ReportSelect,
  ReportMultiSelect,
  ReportFileUpload,
} from "../../../../../../../../Components/Input/ReportInput/ReportBuilderInputs";
import Button from "../../../../../../../../Components/Button/Button";
import { RxCross2 } from "react-icons/rx";
import "./MonitoringDataSection.css";

// Measurement Methods Options
const MEASUREMENT_METHODS_OPTIONS = [
  { value: "frequency", label: "Frequency" },
  { value: "duration", label: "Duration" },
  { value: "rate", label: "Rate" },
  { value: "latency", label: "Latency" },
  { value: "percentage-correct", label: "Percentage Correct" },
  { value: "trials-opportunities", label: "Trials/Opportunities" },
  { value: "task-analysis", label: "Task Analysis" },
  { value: "other", label: "Other" },
];

// Data Collection Frequency Options
const COLLECTION_FREQUENCY_OPTIONS = [
  { value: "every-session", label: "Every session" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "per-opportunity", label: "Per opportunity" },
  { value: "clinically-indicated", label: "As Clinically indicated" },
];

// Who Collects Data Options
const DATA_COLLECTOR_OPTIONS = [
  { value: "rbt", label: "RBT" },
  { value: "bcba", label: "BCBA" },
  { value: "caregiver-parent", label: "Caregiver/Parent" },
  { value: "teacher-school-staff", label: "Teacher/School Staff" },
  { value: "multiple-parties", label: "Multiple parties" },
];

// Data Recording Tools Options
const RECORDING_TOOLS_OPTIONS = [
  { value: "electronic-system", label: "Electronic data collection system" },
  { value: "paper-sheets", label: "Paper data sheets" },
  { value: "session-notes", label: "Session notes" },
  { value: "behavior-logs", label: "Behaviour logs" },
  { value: "tally-counters", label: "Tally counters" },
  { value: "other", label: "Other" },
];

// Data Review Frequency Options
const REVIEW_FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

// Data Storage Location Options
const STORAGE_LOCATION_OPTIONS = [
  { value: "practice-management", label: "Practice Management System" },
  { value: "cloud-storage", label: "Secure cloud storage" },
  { value: "paper-file", label: "Paper file" },
  { value: "school-records", label: "School records" },
  { value: "other", label: "Other" },
];

// Progress Reporting Methods Options
const PROGRESS_REPORTING_OPTIONS = [
  { value: "session-notes", label: "Session notes" },
  { value: "graphs-visual", label: "Graphs/visual summaries" },
  { value: "progress-reports", label: "Progress reports" },
  { value: "caregiver-updates", label: "Caregiver updates" },
  { value: "team-meetings", label: "Team meetings" },
];

// Helper function to handle "other" selection logic for multi-selects
const handleOtherSelectionMulti = (currentValues, newValue) => {
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

// Yup Validation Schema
const monitoringDataSchema = Yup.object().shape({
  dataCollectionOverview: Yup.string(),
  behaviorsTargetsMonitored: Yup.string(),
  measurementMethods: Yup.array().min(
    1,
    "At least one measurement method is required"
  ),
  measurementMethodsOther: Yup.string().when("measurementMethods", {
    is: (val) => val && val.includes("other"),
    then: (schema) => schema.required("Please specify the measurement method"),
    otherwise: (schema) => schema.nullable(),
  }),
  dataCollectionFrequency: Yup.string().required(
    "Data collection frequency is required"
  ),
  whoCollectsData: Yup.array().min(
    1,
    "At least one data collector is required"
  ),
  dataRecordingTools: Yup.array().min(
    1,
    "At least one recording tool is required"
  ),
  dataRecordingToolsOther: Yup.string().when("dataRecordingTools", {
    is: (val) => val && val.includes("other"),
    then: (schema) => schema.required("Please specify the recording tool"),
    otherwise: (schema) => schema.nullable(),
  }),
  dataReviewFrequency: Yup.string().required(
    "Data review frequency is required"
  ),
  dataStorageLocation: Yup.array().min(
    1,
    "At least one storage location is required"
  ),
  dataStorageLocationOther: Yup.string().when("dataStorageLocation", {
    is: (val) => val && val.includes("other"),
    then: (schema) => schema.required("Please specify the storage location"),
    otherwise: (schema) => schema.nullable(),
  }),
  progressReportingMethods: Yup.array().min(
    1,
    "At least one reporting method is required"
  ),
  supportingDataAttachments: Yup.array(),
  supportingDataDescription: Yup.string(),
  dataInterpretation: Yup.string(),
  dataLimitationsNotes: Yup.string(),
});

const MonitoringDataSection = ({ data = {}, onChange, onRemoveSection, isReadOnly = false }) => {
  const [formData, setFormData] = useState({
    dataCollectionOverview: data.dataCollectionOverview || "",
    behaviorsTargetsMonitored: data.behaviorsTargetsMonitored || "",
    measurementMethods: data.measurementMethods || [],
    measurementMethodsOther: data.measurementMethodsOther || "",
    dataCollectionFrequency: data.dataCollectionFrequency || "",
    whoCollectsData: data.whoCollectsData || [],
    dataRecordingTools: data.dataRecordingTools || [],
    dataRecordingToolsOther: data.dataRecordingToolsOther || "",
    dataReviewFrequency: data.dataReviewFrequency || "",
    dataStorageLocation: data.dataStorageLocation || [],
    dataStorageLocationOther: data.dataStorageLocationOther || "",
    progressReportingMethods: data.progressReportingMethods || [],
    supportingDataAttachments: data.supportingDataAttachments || [],
    supportingDataDescription: data.supportingDataDescription || "",
    dataInterpretation: data.dataInterpretation || "",
    dataLimitationsNotes: data.dataLimitationsNotes || "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const updateFormData = (field, value) => {
    let finalValue = value;

    // Handle "other" selection logic for multi-select fields
    if (
      field === "measurementMethods" ||
      field === "dataRecordingTools" ||
      field === "dataStorageLocation"
    ) {
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
      await monitoringDataSchema.validate(dataToValidate, {
        abortEarly: false,
      });
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

  const showMeasurementMethodsOther =
    formData.measurementMethods.includes("other");
  const showRecordingToolsOther = formData.dataRecordingTools.includes("other");
  const showStorageLocationOther =
    formData.dataStorageLocation.includes("other");

  return (
    <div className="crb-section-fields">
      {/* Data Collection Overview */}
      <RichTextEditor
        label="Data collection overview"
        placeholder="Enter a description..."
        value={formData.dataCollectionOverview}
        onChange={(val) => updateFormData("dataCollectionOverview", val)}
        readOnly={isReadOnly}
      />

      {/* Behaviors/Targets Monitored */}
      <RichTextEditor
        label="Behaviors/Targets monitored"
        placeholder="Enter a description..."
        value={formData.behaviorsTargetsMonitored}
        onChange={(val) => updateFormData("behaviorsTargetsMonitored", val)}
        readOnly={isReadOnly}
      />

      {/* Measurement Methods - Multi-Select */}
      <div className="select-with-other-container">
        <ReportMultiSelect
          label="Measurement methods"
          placeholder="Select an option"
          options={MEASUREMENT_METHODS_OPTIONS}
          value={formData.measurementMethods}
          onChange={(val) => updateFormData("measurementMethods", val)}
          onBlur={() => handleBlur("measurementMethods")}
          readOnly={isReadOnly}
        />
        {touched.measurementMethods && errors.measurementMethods && (
          <div className="report-builder-error">
            {errors.measurementMethods}
          </div>
        )}

        {/* Show Other input when "Other" is selected */}
        {showMeasurementMethodsOther && (
          <div className="other-input-wrapper">
            <ReportTextInput
              required
              label="Please specify"
              placeholder="Enter other measurement method"
              value={formData.measurementMethodsOther}
              onChange={(val) => updateFormData("measurementMethodsOther", val)}
              onBlur={() => handleBlur("measurementMethodsOther")}
              readOnly={isReadOnly}
            />
            {touched.measurementMethodsOther &&
              errors.measurementMethodsOther && (
                <div className="report-builder-error">
                  {errors.measurementMethodsOther}
                </div>
              )}
          </div>
        )}
      </div>

      {/* Data Collection Frequency */}
      <ReportSelect
        required
        label="Data collection frequency"
        placeholder="Select an option"
        options={COLLECTION_FREQUENCY_OPTIONS}
        value={formData.dataCollectionFrequency}
        onChange={(val) => updateFormData("dataCollectionFrequency", val)}
        onBlur={() => handleBlur("dataCollectionFrequency")}
        readOnly={isReadOnly}
      />
      {touched.dataCollectionFrequency && errors.dataCollectionFrequency && (
        <div className="report-builder-error">
          {errors.dataCollectionFrequency}
        </div>
      )}

      {/* Who Collects Data - Multi-Select */}
      <ReportMultiSelect
        label="Who collects data"
        placeholder="Select an option"
        options={DATA_COLLECTOR_OPTIONS}
        value={formData.whoCollectsData}
        onChange={(val) => updateFormData("whoCollectsData", val)}
        onBlur={() => handleBlur("whoCollectsData")}
        readOnly={isReadOnly}
      />
      {touched.whoCollectsData && errors.whoCollectsData && (
        <div className="report-builder-error">{errors.whoCollectsData}</div>
      )}

      {/* Data Recording Tools - Multi-Select */}
      <div className="select-with-other-container">
        <ReportMultiSelect
          label="Data recording tools"
          placeholder="Select an option"
          options={RECORDING_TOOLS_OPTIONS}
          value={formData.dataRecordingTools}
          onChange={(val) => updateFormData("dataRecordingTools", val)}
          onBlur={() => handleBlur("dataRecordingTools")}
          readOnly={isReadOnly}
        />
        {touched.dataRecordingTools && errors.dataRecordingTools && (
          <div className="report-builder-error">
            {errors.dataRecordingTools}
          </div>
        )}

        {/* Show Other input when "Other" is selected */}
        {showRecordingToolsOther && (
          <div className="other-input-wrapper">
            <ReportTextInput
              required
              label="Please specify"
              placeholder="Enter other recording tool"
              value={formData.dataRecordingToolsOther}
              onChange={(val) => updateFormData("dataRecordingToolsOther", val)}
              onBlur={() => handleBlur("dataRecordingToolsOther")}
              readOnly={isReadOnly}
            />
            {touched.dataRecordingToolsOther &&
              errors.dataRecordingToolsOther && (
                <div className="report-builder-error">
                  {errors.dataRecordingToolsOther}
                </div>
              )}
          </div>
        )}
      </div>

      {/* Data Review Frequency */}
      <ReportSelect
        required
        label="Data review frequency"
        placeholder="Select an option"
        options={REVIEW_FREQUENCY_OPTIONS}
        value={formData.dataReviewFrequency}
        onChange={(val) => updateFormData("dataReviewFrequency", val)}
        onBlur={() => handleBlur("dataReviewFrequency")}
        readOnly={isReadOnly}
      />
      {touched.dataReviewFrequency && errors.dataReviewFrequency && (
        <div className="report-builder-error">{errors.dataReviewFrequency}</div>
      )}

      {/* Data Storage Location - Multi-Select */}
      <div className="select-with-other-container">
        <ReportMultiSelect
          label="Data Storage location"
          placeholder="Select an option"
          options={STORAGE_LOCATION_OPTIONS}
          value={formData.dataStorageLocation}
          onChange={(val) => updateFormData("dataStorageLocation", val)}
          onBlur={() => handleBlur("dataStorageLocation")}
          readOnly={isReadOnly}
        />
        {touched.dataStorageLocation && errors.dataStorageLocation && (
          <div className="report-builder-error">
            {errors.dataStorageLocation}
          </div>
        )}

        {/* Show Other input when "Other" is selected */}
        {showStorageLocationOther && (
          <div className="other-input-wrapper">
            <ReportTextInput
              required
              label="Please specify"
              placeholder="Enter other storage location"
              value={formData.dataStorageLocationOther}
              onChange={(val) =>
                updateFormData("dataStorageLocationOther", val)
              }
              onBlur={() => handleBlur("dataStorageLocationOther")}
              readOnly={isReadOnly}
            />
            {touched.dataStorageLocationOther &&
              errors.dataStorageLocationOther && (
                <div className="report-builder-error">
                  {errors.dataStorageLocationOther}
                </div>
              )}
          </div>
        )}
      </div>

      {/* Progress Reporting Methods - Multi-Select */}
      <ReportMultiSelect
        label="Progress reporting methods"
        placeholder="Select an option"
        options={PROGRESS_REPORTING_OPTIONS}
        value={formData.progressReportingMethods}
        onChange={(val) => updateFormData("progressReportingMethods", val)}
        onBlur={() => handleBlur("progressReportingMethods")}
        readOnly={isReadOnly}
      />
      {touched.progressReportingMethods && errors.progressReportingMethods && (
        <div className="report-builder-error">
          {errors.progressReportingMethods}
        </div>
      )}

      {/* Supporting Data Attachments */}
      <ReportFileUpload
        label="Supporting data attachments"
        value={formData.supportingDataAttachments}
        onChange={(files) => updateFormData("supportingDataAttachments", files)}
        acceptedFormats="PDF, DOCX, PNG, JPG"
        multiple
        readOnly={isReadOnly}
      />

      <RichTextEditor
        label="Supporting data description"
        placeholder="Enter a description..."
        value={formData.supportingDataDescription}
        onChange={(val) => updateFormData("supportingDataDescription", val)}
        readOnly={isReadOnly}
      />

      {/* Data Interpretation */}
      <RichTextEditor
        label="Data interpretation"
        placeholder="Enter a description..."
        value={formData.dataInterpretation}
        onChange={(val) => updateFormData("dataInterpretation", val)}
        readOnly={isReadOnly}
      />

      {/* Data Limitations or Notes */}
      <RichTextEditor
        label="Data limitations or notes"
        placeholder="Enter a description..."
        value={formData.dataLimitationsNotes}
        onChange={(val) => updateFormData("dataLimitationsNotes", val)}
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

export default MonitoringDataSection;

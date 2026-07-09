import React, { useState, useEffect, useRef } from "react";
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
import { FaPlus, FaTrash } from "react-icons/fa";
import "./ClientInformationSection.css";
import { RxCross2 } from "react-icons/rx";
import { showToast } from "../../../../../../../../Helper/ShowToast";
import { referralSourceOptions, serviceLocationOptions, yesNoOptions } from "../../../../../../../../Data/selectOptions";

// Validation Schema
const diagnosisSchema = Yup.object().shape({
  diagnosisName: Yup.string().required("Diagnosis name is required"),
  diagnosisCode: Yup.string().required("Diagnosis code is required"),
  diagnosisDescription: Yup.string(),
  diagnosisDate: Yup.date().required("Diagnosis date is required"),
  diagnosedBy: Yup.string().required("Diagnosed by is required"),
  primaryDiagnosis: Yup.string().required(
    "Please select if this is primary diagnosis",
  ),
});

const sectionSchema = Yup.object().shape({
  clientFullName: Yup.string(),
  dateOfBirth: Yup.string(),
  gender: Yup.string(),
  clientBackground: Yup.string(),
  diagnoses: Yup.array()
    .of(diagnosisSchema)
    .min(1, "At least one diagnosis is required"),
  intakeDate: Yup.date().required("Intake date is required"),
  referralSource: Yup.string().required("Referral source is required"),
  serviceLocation: Yup.string().required("Service location is required"),
  otherClientInformation: Yup.string(),
});

const ClientInformationSection = ({
  data,
  onChange,
  onRemoveSection,
  isReadOnly = false,
}) => {
  const [formData, setFormData] = useState({
    // Auto-populated fields
    clientFullName: "",
    dateOfBirth: "",
    gender: "",

    // Editable fields
    clientBackground: "",
    diagnoses: [
      {
        id: Date.now(),
        diagnosisName: "",
        diagnosisCode: "",
        diagnosisDescription: "",
        diagnosisDate: "",
        diagnosedBy: "",
        primaryDiagnosis: "",
      },
    ],
    intakeDate: "",
    referralSource: "",
    serviceLocation: "",
    otherClientInformation: "",
  });

  const [errors, setErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

  // Use ref to prevent unnecessary onChange calls when data hasn't changed
  const lastDataRef = useRef(null);
  const lastAutoPopRef = useRef({ clientFullName: "", dateOfBirth: "", gender: "" });

  // Update form data when parent data changes
  useEffect(() => {
    // Check if data has actually changed
    const dataString = JSON.stringify(data);
    if (dataString === lastDataRef.current) {
      return; // Data hasn't changed, skip update
    }

    lastDataRef.current = dataString;

    // Merge incoming data with current form data
    const updatedFormData = {
      // Auto-populated fields from parent
      clientFullName: data.clientFullName || "",
      dateOfBirth: data.dateOfBirth || "",
      gender: data.gender || "",

      // Only override these if they exist in incoming data
      clientBackground:
        data.clientBackground !== undefined
          ? data.clientBackground
          : formData.clientBackground,
      diagnoses:
        data.diagnoses && data.diagnoses.length > 0
          ? data.diagnoses
          : formData.diagnoses,
      intakeDate: data.intakeDate || formData.intakeDate,
      referralSource: data.referralSource || formData.referralSource,
      serviceLocation: data.serviceLocation || formData.serviceLocation,
      otherClientInformation:
        data.otherClientInformation !== undefined
          ? data.otherClientInformation
          : formData.otherClientInformation,
    };

    setFormData(updatedFormData);

    // Always push auto-populated data to Redux when it changes
    // This ensures DOB, gender, and fullName are saved when drafting/publishing
    const prevAuto = lastAutoPopRef.current;
    const autoChanged =
      updatedFormData.clientFullName !== prevAuto.clientFullName ||
      updatedFormData.dateOfBirth !== prevAuto.dateOfBirth ||
      updatedFormData.gender !== prevAuto.gender;

    if (autoChanged && (updatedFormData.clientFullName || updatedFormData.dateOfBirth || updatedFormData.gender)) {
      lastAutoPopRef.current = {
        clientFullName: updatedFormData.clientFullName,
        dateOfBirth: updatedFormData.dateOfBirth,
        gender: updatedFormData.gender,
      };
      onChange(updatedFormData);
    }
  }, [data]); // Only re-run when data prop changes

  // Validate form
  const validateForm = async () => {
    try {
      await sectionSchema.validate(formData, { abortEarly: false });
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

  // Validate single field
  const validateField = async (fieldName, value) => {
    try {
      await Yup.reach(sectionSchema, fieldName).validate(value);
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
    if (touchedFields[field]) {
      validateField(field, value);
    }
  };

  const handleFieldBlur = (field) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  // Diagnosis array handlers
  const handleAddDiagnosis = () => {
    if (isReadOnly) return;

    const newDiagnosis = {
      id: Date.now(),
      diagnosisName: "",
      diagnosisCode: "",
      diagnosisDescription: "",
      diagnosisDate: "",
      diagnosedBy: "",
      primaryDiagnosis: "",
    };
    const updatedDiagnoses = [...formData.diagnoses, newDiagnosis];
    handleFieldChange("diagnoses", updatedDiagnoses);
  };

  const handleRemoveDiagnosis = (id) => {
    if (isReadOnly) return;

    if (formData.diagnoses.length === 1) {
      showToast("You must have at least one diagnosis");
      return;
    }
    const updatedDiagnoses = formData.diagnoses.filter((d) => d.id !== id);
    handleFieldChange("diagnoses", updatedDiagnoses);
  };

  const handleDiagnosisChange = (id, field, value) => {
    if (isReadOnly) return;

    const updatedDiagnoses = formData.diagnoses.map((diagnosis) =>
      diagnosis.id === id ? { ...diagnosis, [field]: value } : diagnosis,
    );
    handleFieldChange("diagnoses", updatedDiagnoses);

    // Validate diagnosis field
    const diagnosisIndex = formData.diagnoses.findIndex((d) => d.id === id);
    if (touchedFields[`diagnoses[${diagnosisIndex}].${field}`]) {
      validateField(`diagnoses[${diagnosisIndex}].${field}`, value);
    }
  };

  const handleDiagnosisFieldBlur = (id, field) => {
    if (isReadOnly) return;

    const diagnosisIndex = formData.diagnoses.findIndex((d) => d.id === id);
    const fieldPath = `diagnoses[${diagnosisIndex}].${field}`;
    setTouchedFields((prev) => ({ ...prev, [fieldPath]: true }));

    const diagnosis = formData.diagnoses[diagnosisIndex];
    validateField(fieldPath, diagnosis[field]);
  };

  return (
    <div className="crb-section-fields">
      {/* Auto-populated fields */}
      <div className="report-builder-field">
        <label className="report-builder-label">Client Full Name</label>
        <div className="report-builder-auto-populated">
          {formData.clientFullName || "(Auto populated from client profile)"}
        </div>
      </div>

      <div className="report-builder-field">
        <label className="report-builder-label">Date of Birth</label>
        <div className="report-builder-auto-populated">
          {formData.dateOfBirth || "(Auto populated from client profile)"}
        </div>
      </div>

      <div className="report-builder-field">
        <label className="report-builder-label">Gender</label>
        <div className="report-builder-auto-populated">
          {formData.gender || "(Auto populated from client profile)"}
        </div>
      </div>

      {/* Client Background - Rich Text Editor */}
      <RichTextEditor
        label="Client Background"
        value={formData.clientBackground}
        onChange={(value) => handleFieldChange("clientBackground", value)}
        readOnly={isReadOnly}
      />

      {/* Diagnosis Array Section */}
      <div className="diagnosis-section">
        <h4 className="diagnosis-section-title">Diagnosis Information</h4>

        {formData.diagnoses.map((diagnosis, index) => (
          <div key={diagnosis.id} className="diagnosis-card">
            <div className="diagnosis-card-header">
              <h5>Diagnosis {index + 1}</h5>
            </div>

            <div className="diagnosis-card-content">
              <ReportTextInput
                required
                label="Diagnosis Name"
                placeholder="Type Something"
                value={diagnosis.diagnosisName}
                onChange={(value) =>
                  handleDiagnosisChange(diagnosis.id, "diagnosisName", value)
                }
                onBlur={() =>
                  handleDiagnosisFieldBlur(diagnosis.id, "diagnosisName")
                }
                readOnly={isReadOnly}
              />
              {touchedFields[`diagnoses[${index}].diagnosisName`] &&
                errors[`diagnoses[${index}].diagnosisName`] && (
                  <div className="report-builder-error">
                    {errors[`diagnoses[${index}].diagnosisName`]}
                  </div>
                )}

              <ReportTextInput
                required
                label="Diagnosis Code"
                placeholder="Enter ICD-10/ICD-CM or other standard code format"
                value={diagnosis.diagnosisCode}
                onChange={(value) =>
                  handleDiagnosisChange(diagnosis.id, "diagnosisCode", value)
                }
                onBlur={() =>
                  handleDiagnosisFieldBlur(diagnosis.id, "diagnosisCode")
                }
                readOnly={isReadOnly}
              />
              {touchedFields[`diagnoses[${index}].diagnosisCode`] &&
                errors[`diagnoses[${index}].diagnosisCode`] && (
                  <div className="report-builder-error">
                    {errors[`diagnoses[${index}].diagnosisCode`]}
                  </div>
                )}

              <RichTextEditor
                label="Diagnosis Description"
                placeholder="Enter a description..."
                value={diagnosis.diagnosisDescription}
                onChange={(value) =>
                  handleDiagnosisChange(
                    diagnosis.id,
                    "diagnosisDescription",
                    value,
                  )
                }
                readOnly={isReadOnly}
              />

              <ReportTextInput
                required
                label="Diagnosis Date"
                placeholder="Choose a date"
                type="date"
                value={diagnosis.diagnosisDate}
                onChange={(value) =>
                  handleDiagnosisChange(diagnosis.id, "diagnosisDate", value)
                }
                onBlur={() =>
                  handleDiagnosisFieldBlur(diagnosis.id, "diagnosisDate")
                }
                readOnly={isReadOnly}
              />
              {touchedFields[`diagnoses[${index}].diagnosisDate`] &&
                errors[`diagnoses[${index}].diagnosisDate`] && (
                  <div className="report-builder-error">
                    {errors[`diagnoses[${index}].diagnosisDate`]}
                  </div>
                )}

              <ReportTextInput
                required
                label="Diagnosed by"
                placeholder="Type Something"
                value={diagnosis.diagnosedBy}
                onChange={(value) =>
                  handleDiagnosisChange(diagnosis.id, "diagnosedBy", value)
                }
                onBlur={() =>
                  handleDiagnosisFieldBlur(diagnosis.id, "diagnosedBy")
                }
                readOnly={isReadOnly}
              />
              {touchedFields[`diagnoses[${index}].diagnosedBy`] &&
                errors[`diagnoses[${index}].diagnosedBy`] && (
                  <div className="report-builder-error">
                    {errors[`diagnoses[${index}].diagnosedBy`]}
                  </div>
                )}

              <ReportRadioGroup
                required
                label="Primary diagnosis"
                options={yesNoOptions}
                value={diagnosis.primaryDiagnosis}
                onChange={(value) =>
                  handleDiagnosisChange(diagnosis.id, "primaryDiagnosis", value)
                }
                readOnly={isReadOnly}
              />
              {touchedFields[`diagnoses[${index}].primaryDiagnosis`] &&
                errors[`diagnoses[${index}].primaryDiagnosis`] && (
                  <div className="report-builder-error">
                    {errors[`diagnoses[${index}].primaryDiagnosis`]}
                  </div>
                )}
            </div>

            {!isReadOnly && (
              <div className="diagnosis-card-footer">
                <Button
                  label="Delete diagnosis"
                  variant="action-danger"
                  size="small"
                  width="auto"
                  icon={<RxCross2 size={16} />}
                  iconPosition="left"
                  iconSize={14}
                  onClick={() => handleRemoveDiagnosis(diagnosis.id)}
                />
              </div>
            )}
          </div>
        ))}

        {!isReadOnly && (
          <div className="diagnosis-add-btn-wrapper">
            <Button
              label="Add a new diagnosis"
              variant="secondary"
              size="medium"
              width="100%"
              icon={<FaPlus />}
              iconPosition="left"
              iconSize={16}
              onClick={handleAddDiagnosis}
            />
          </div>
        )}
      </div>

      {/* Other Fields */}
      <ReportTextInput
        required
        label="Intake Date"
        placeholder="Choose a date"
        type="date"
        value={formData.intakeDate}
        onChange={(value) => handleFieldChange("intakeDate", value)}
        onBlur={() => handleFieldBlur("intakeDate")}
        readOnly={isReadOnly}
      />
      {touchedFields.intakeDate && errors.intakeDate && (
        <div className="report-builder-error">{errors.intakeDate}</div>
      )}

      <ReportSelect
        required
        label="Referral Source"
        placeholder="Select an option"
        options={referralSourceOptions}
        value={formData.referralSource}
        onChange={(value) => handleFieldChange("referralSource", value)}
        readOnly={isReadOnly}
      />
      {touchedFields.referralSource && errors.referralSource && (
        <div className="report-builder-error">{errors.referralSource}</div>
      )}

      <ReportMultiSelect
        required
        label="Service Location"
        placeholder="Select an option"
        options={serviceLocationOptions}
        value={formData.serviceLocation}
        onChange={(value) => handleFieldChange("serviceLocation", value)}
        readOnly={isReadOnly}
      />
      {touchedFields.serviceLocation && errors.serviceLocation && (
        <div className="report-builder-error">{errors.serviceLocation}</div>
      )}

      <RichTextEditor
        label="Other client information"
        placeholder="Enter a description..."
        value={formData.otherClientInformation}
        onChange={(value) => handleFieldChange("otherClientInformation", value)}
        readOnly={isReadOnly}
      />

      {/* Remove Section Button */}
      {!isReadOnly && onRemoveSection && (
        <div className="section-remove-btn-wrapper">
          <Button
            label="Remove Section"
            variant="action-danger"
            size="medium"
            width="100%"
            icon={<RxCross2 size={16} />}
            onClick={onRemoveSection}
          />
        </div>
      )}
    </div>
  );
};

export default ClientInformationSection;

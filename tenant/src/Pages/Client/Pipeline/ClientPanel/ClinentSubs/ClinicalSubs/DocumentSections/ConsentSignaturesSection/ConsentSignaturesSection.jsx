import React, { useState } from "react";
import * as Yup from "yup";
import RichTextEditor from "../../../../../../../../Components/Input/RichTextEditor/RichTextEditorInput";
import {
  ReportTextInput,
  ReportSelect,
} from "../../../../../../../../Components/Input/ReportInput/ReportBuilderInputs";
import Button from "../../../../../../../../Components/Button/Button";
import { FiEdit, FiImage, FiType } from "react-icons/fi";
import "./ConsentSignaturesSection.css";
import { RxCross2 } from "react-icons/rx";

// Relationship to Client Options
const RELATIONSHIP_OPTIONS = [
  { value: "self", label: "Self" },
  { value: "parent", label: "Parent" },
  { value: "legal-guardian", label: "Legal guardian" },
  { value: "caregiver", label: "Caregiver" },
  { value: "foster-parent", label: "Foster parent" },
  { value: "authorized-rep", label: "Authorized representative" },
  { value: "other", label: "Other" },
];

// Clinician Role Options
const CLINICIAN_ROLE_OPTIONS = [
  { value: "bcba", label: "BCBA" },
  { value: "assistant-bcba", label: "Assistant BCBA" },
  { value: "clinical-supervisor", label: "Clinical Supervisor" },
  { value: "other-clinician", label: "Other authorized clinician" },
];

// Signature Types
const SIGNATURE_TYPES = [
  { value: "type", label: "Type", icon: <FiType size={20} /> },
  { value: "draw", label: "Draw", icon: <FiEdit size={20} /> },
  { value: "image", label: "Image", icon: <FiImage size={20} /> },
];

// Yup Validation
const consentSchema = Yup.object().shape({
  consentStatement: Yup.string(),
  servicesConsented: Yup.string(),
  consentLimitations: Yup.string(),
  clientGuardianName: Yup.string().required("Client/guardian name is required"),
  relationshipToClient: Yup.string().required(
    "Relationship to client is required"
  ),
  clientSignature: Yup.string(),
  clientSignatureDate: Yup.string(),
  clinicianName: Yup.string().required("Clinician name is required"),
  clinicianRole: Yup.string().required("Clinician role is required"),
  clinicianSignatureType: Yup.string().required(
    "Please select a signature type"
  ),
  clinicianSignature: Yup.string(),
  clinicianSignatureDate: Yup.string(),
  consentNotes: Yup.string(),
});

const ConsentSignaturesSection = ({ data = {}, onChange, onRemoveSection, isReadOnly = false }) => {
  const [formData, setFormData] = useState({
    consentStatement: data.consentStatement || "",
    servicesConsented: data.servicesConsented || "",
    consentLimitations: data.consentLimitations || "",
    clientGuardianName: data.clientGuardianName || "",
    relationshipToClient: data.relationshipToClient || "",
    clientSignature: data.clientSignature || "",
    clientSignatureDate: data.clientSignatureDate || "",
    clinicianName: data.clinicianName || "",
    clinicianRole: data.clinicianRole || "",
    clinicianSignatureType: data.clinicianSignatureType || "",
    clinicianSignature: data.clinicianSignature || "",
    clinicianSignatureDate: data.clinicianSignatureDate || "",
    consentNotes: data.consentNotes || "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = async (fieldName, value) => {
    try {
      await Yup.reach(consentSchema, fieldName).validate(value);
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

  const handleSignatureTypeSelect = (type) => {
    if (isReadOnly) return;
    handleFieldChange("clinicianSignatureType", type);
  };

  return (
    <div className="crb-section-fields">
      <div className="consent-content">
        {/* Consent Statement */}
        <RichTextEditor
          label="Consent Statement"
          placeholder="Enter a description..."
          value={formData.consentStatement}
          onChange={(value) => handleFieldChange("consentStatement", value)}
          readOnly={isReadOnly}
        />

        {/* Services Consented To */}
        <RichTextEditor
          label="Services consented to"
          placeholder="Enter a description..."
          value={formData.servicesConsented}
          onChange={(value) => handleFieldChange("servicesConsented", value)}
          readOnly={isReadOnly}
        />

        {/* Consent Limitations or Exclusions */}
        <RichTextEditor
          label="Consent limitations or exclusions"
          placeholder="Enter a description..."
          value={formData.consentLimitations}
          onChange={(value) => handleFieldChange("consentLimitations", value)}
          readOnly={isReadOnly}
        />

        {/* Client/Guardian Name */}
        <ReportTextInput
          label="Client/guardian name"
          placeholder="Type something"
          value={formData.clientGuardianName}
          onChange={(value) => handleFieldChange("clientGuardianName", value)}
          onBlur={() => handleFieldBlur("clientGuardianName")}
          readOnly={isReadOnly}
        />
        {touched.clientGuardianName && errors.clientGuardianName && (
          <div className="report-builder-error">
            {errors.clientGuardianName}
          </div>
        )}

        {/* Relationship to Client */}
        <ReportSelect
          label="Relationship to client"
          placeholder="Select an option"
          options={RELATIONSHIP_OPTIONS}
          value={formData.relationshipToClient}
          onChange={(value) => handleFieldChange("relationshipToClient", value)}
          onBlur={() => handleFieldBlur("relationshipToClient")}
          readOnly={isReadOnly}
        />
        {touched.relationshipToClient && errors.relationshipToClient && (
          <div className="report-builder-error">
            {errors.relationshipToClient}
          </div>
        )}

        {/* Client Signature */}
        <div className="report-builder-field">
          <label className="report-builder-label">Signature</label>
          <div className="signature-placeholder">
            <span>Pending client signature</span>
          </div>
        </div>

        {/* Client Signature Date */}
        <div className="report-builder-field">
          <label className="report-builder-label">Signature date</label>
          <div className="signature-placeholder">
            <span>Pending client signature</span>
          </div>
        </div>

        {/* Clinician Name */}
        <ReportTextInput
          label="Clinician name"
          placeholder="Type something"
          value={formData.clinicianName}
          onChange={(value) => handleFieldChange("clinicianName", value)}
          onBlur={() => handleFieldBlur("clinicianName")}
          readOnly={isReadOnly}
        />
        {touched.clinicianName && errors.clinicianName && (
          <div className="report-builder-error">{errors.clinicianName}</div>
        )}

        {/* Clinician Role */}
        <ReportSelect
          label="Clinician role"
          placeholder="Select an option"
          options={CLINICIAN_ROLE_OPTIONS}
          value={formData.clinicianRole}
          onChange={(value) => handleFieldChange("clinicianRole", value)}
          onBlur={() => handleFieldBlur("clinicianRole")}
          readOnly={isReadOnly}
        />
        {touched.clinicianRole && errors.clinicianRole && (
          <div className="report-builder-error">{errors.clinicianRole}</div>
        )}

        {/* Clinician Signature Type Selection */}
        <div className="report-builder-field">
          <label className="report-builder-label">Clinician Signature</label>
          <div className="signature-type-selector">
            {SIGNATURE_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                className={`signature-type-btn ${
                  formData.clinicianSignatureType === type.value ? "active" : ""
                }`}
                onClick={() => handleSignatureTypeSelect(type.value)}
                disabled={isReadOnly}
              >
                <div className="signature-type-icon">{type.icon}</div>
                <span className="signature-type-label">{type.label}</span>
              </button>
            ))}
          </div>
        </div>
        {touched.clinicianSignatureType && errors.clinicianSignatureType && (
          <div className="report-builder-error">
            {errors.clinicianSignatureType}
          </div>
        )}

        {/* Clinician Signature Date - Auto-generated */}
        <div className="report-builder-field">
          <label className="report-builder-label">
            Clinician Signature date
          </label>
          <div className="auto-generated-field">
            <span>Auto-generated</span>
          </div>
        </div>

        {/* Consent Notes */}
        <RichTextEditor
          label="Consent notes"
          placeholder="Enter a description..."
          value={formData.consentNotes}
          onChange={(value) => handleFieldChange("consentNotes", value)}
          readOnly={isReadOnly}
        />
      </div>

      {/* Remove Section Button */}
      {!isReadOnly && onRemoveSection && (
      <div className="section-remove-btn-wrapper">
        <Button
          label="Remove Section"
          variant="action-danger"
          size="medium"
          width="auto"
          icon={< RxCross2 />}
          onClick={onRemoveSection}
        />
      </div>
      )}
    </div>
  );
};

export default ConsentSignaturesSection;

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
import "./ReviewSection.css";
import { showToast } from "../../../../../../../../Helper/ShowToast";

// Review Type Options
const REVIEW_TYPE_OPTIONS = [
  { value: "routine-review", label: "Routine review" },
  { value: "quarterly-review", label: "Quarterly review" },
  { value: "annual-review", label: "Annual review" },
  { value: "reauthorization-review", label: "Reauthorization review" },
  { value: "discharge-review", label: "Discharge review" },
];

// Progress Determination Options
const PROGRESS_DETERMINATION_OPTIONS = [
  { value: "making-expected-progress", label: "Making expected progress" },
  { value: "making-partial-progress", label: "Making partial progress" },
  { value: "minimal-progress", label: "Minimal progress" },
  { value: "no-progress", label: "No progress" },
  { value: "regression-observed", label: "Regression observed" },
];

// Decision Outcome Options
const DECISION_OUTCOME_OPTIONS = [
  { value: "continue-services", label: "Continue services" },
  { value: "modify-treatment-plan", label: "Modify treatment plan" },
  { value: "reduce-service-intensity", label: "Reduce service intensity" },
  { value: "increase-service-intensity", label: "Increase service intensity" },
  { value: "initiate-discharge-planning", label: "Initiate discharge planning" },
  { value: "discontinue-services", label: "Discontinue services" },
];

// Next Review Timeline Options
const NEXT_REVIEW_TIMELINE_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi-annually", label: "Semi-annually" },
  { value: "annually", label: "Annually" },
  { value: "not-applicable", label: "Not applicable" },
];

// Location Options
const LOCATION_OPTIONS = [
  { value: "home", label: "Home" },
  { value: "clinic", label: "Clinic" },
  { value: "school", label: "School" },
  { value: "community", label: "Community" },
  { value: "vocational-setting", label: "Vocational setting" },
  { value: "telehealth", label: "Telehealth" },
  { value: "other", label: "Other" },
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

// Yup Validation Schema for Service Recommendation
const serviceRecommendationSchema = Yup.object().shape({
  serviceRecommendation: Yup.string().required("Service recommendation is required"),
  descriptionOfServices: Yup.string(),
  numberOfHoursRequested: Yup.string(),
  durationOfService: Yup.string(),
  location: Yup.array().min(1, "At least one location is required"),
  locationOther: Yup.string().when("location", {
    is: (val) => val && val.includes("other"),
    then: (schema) => schema.required("Please specify the location"),
    otherwise: (schema) => schema.nullable(),
  }),
});

// Yup Validation Schema for Review
const reviewSchema = Yup.object().shape({
  reviewType: Yup.string().required("Review type is required"),
  reviewDate: Yup.string(),
  reviewedBy: Yup.string(),
  summaryOfProgress: Yup.string(),
  progressDetermination: Yup.string().required("Progress determination is required"),
  decisionOutcome: Yup.string().required("Decision outcome is required"),
  rationaleForDecision: Yup.string(),
  changesRecommended: Yup.string(),
  nextReviewTimeline: Yup.string().required("Next review timeline is required"),
  serviceRecommendations: Yup.array().of(serviceRecommendationSchema).min(1, "At least one service recommendation is required"),
});

const ReviewSection = ({ data = {}, onChange, onRemoveSection, isReadOnly = false }) => {
  const [formData, setFormData] = useState({
    reviewType: data.reviewType || "",
    reviewDate: data.reviewDate || "",
    reviewedBy: data.reviewedBy || "",
    summaryOfProgress: data.summaryOfProgress || "",
    progressDetermination: data.progressDetermination || "",
    decisionOutcome: data.decisionOutcome || "",
    rationaleForDecision: data.rationaleForDecision || "",
    changesRecommended: data.changesRecommended || "",
    nextReviewTimeline: data.nextReviewTimeline || "",
    serviceRecommendations: data.serviceRecommendations || [
      {
        id: Date.now(),
        serviceRecommendation: "",
        descriptionOfServices: "",
        numberOfHoursRequested: "",
        durationOfService: "",
        location: [],
        locationOther: "",
      },
    ],
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [serviceRecommendationErrors, setServiceRecommendationErrors] = useState({});

  // Update Main Form Data
  const updateFormData = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onChange(updated);

    // Validate on change if touched
    if (touched[field]) {
      validateFormData(updated);
    }
  };

  // Add Service Recommendation
  const addServiceRecommendation = () => {
    if (isReadOnly) return;
    const newServiceRecommendation = {
      id: Date.now(),
      serviceRecommendation: "",
      descriptionOfServices: "",
      numberOfHoursRequested: "",
      durationOfService: "",
      location: [],
      locationOther: "",
    };
    const updated = {
      ...formData,
      serviceRecommendations: [...formData.serviceRecommendations, newServiceRecommendation],
    };
    setFormData(updated);
    onChange(updated);
  };

  // Remove Service Recommendation
  const removeServiceRecommendation = (id) => {
    if (isReadOnly) return;
    if (formData.serviceRecommendations.length === 1) {
      showToast("At least one service recommendation is required.");
      return;
    }
    const updated = {
      ...formData,
      serviceRecommendations: formData.serviceRecommendations.filter((sr) => sr.id !== id),
    };
    setFormData(updated);
    onChange(updated);
  };

  // Update Service Recommendation
  const updateServiceRecommendation = (id, field, value) => {
    let finalValue = value;
    
    // Handle "other" selection logic for location
    if (field === "location") {
      const currentService = formData.serviceRecommendations.find(sr => sr.id === id);
      const currentValues = currentService ? currentService[field] : [];
      finalValue = handleOtherSelectionMulti(currentValues, value);
    }
    
    const updated = {
      ...formData,
      serviceRecommendations: formData.serviceRecommendations.map((sr) =>
        sr.id === id ? { ...sr, [field]: finalValue } : sr
      ),
    };
    setFormData(updated);
    onChange(updated);

    // Validate on change if touched
    if (serviceRecommendationErrors[`${id}-${field}`]) {
      validateServiceRecommendation(id, updated.serviceRecommendations.find((sr) => sr.id === id));
    }
  };

  // Validate Main Form Data
  const validateFormData = async (dataToValidate) => {
    try {
      await reviewSchema.validate(dataToValidate, { abortEarly: false });
      setErrors({});
    } catch (err) {
      const fieldErrors = {};
      err.inner.forEach((e) => {
        // Check if error is for serviceRecommendations array itself
        if (e.path === "serviceRecommendations") {
          fieldErrors[e.path] = e.message;
        } else if (!e.path.includes("serviceRecommendations")) {
          fieldErrors[e.path] = e.message;
        }
      });
      setErrors(fieldErrors);
    }
  };

  // Validate Single Service Recommendation
  const validateServiceRecommendation = async (id, serviceRecommendation) => {
    try {
      await serviceRecommendationSchema.validate(serviceRecommendation, { abortEarly: false });
      setServiceRecommendationErrors((prev) => {
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
      setServiceRecommendationErrors((prev) => ({ ...prev, ...fieldErrors }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateFormData(formData);
  };

  const handleServiceRecommendationBlur = (id, field) => {
    setServiceRecommendationErrors((prev) => ({ ...prev, [`${id}-${field}`]: true }));
    const serviceRecommendation = formData.serviceRecommendations.find((sr) => sr.id === id);
    if (serviceRecommendation) validateServiceRecommendation(id, serviceRecommendation);
  };

  return (
    <div className="crb-section-fields">
      {/* Review Type */}
      <ReportSelect
        required
        label="Review Type"
        placeholder="Select an option"
        options={REVIEW_TYPE_OPTIONS}
        value={formData.reviewType}
        onChange={(val) => updateFormData("reviewType", val)}
        onBlur={() => handleBlur("reviewType")}
        readOnly={isReadOnly}
      />
      {touched.reviewType && errors.reviewType && (
        <div className="report-builder-error">{errors.reviewType}</div>
      )}

      {/* Review Date */}
      <ReportTextInput
        label="Review Date"
        type="date"
        value={formData.reviewDate}
        onChange={(val) => updateFormData("reviewDate", val)}
        readOnly={isReadOnly}
      />

      {/* Reviewed by */}
      <ReportTextInput
        label="Reviewed by"
        placeholder="Type something"
        value={formData.reviewedBy}
        onChange={(val) => updateFormData("reviewedBy", val)}
        readOnly={isReadOnly}
      />

      {/* Summary of progress */}
      <RichTextEditor
        label="Summary of progress"
        placeholder="Enter a description..."
        value={formData.summaryOfProgress}
        onChange={(val) => updateFormData("summaryOfProgress", val)}
        readOnly={isReadOnly}
      />

      {/* Progress determination */}
      <ReportSelect
        required
        label="Progress determination"
        placeholder="Select an option"
        options={PROGRESS_DETERMINATION_OPTIONS}
        value={formData.progressDetermination}
        onChange={(val) => updateFormData("progressDetermination", val)}
        onBlur={() => handleBlur("progressDetermination")}
        readOnly={isReadOnly}
      />
      {touched.progressDetermination && errors.progressDetermination && (
        <div className="report-builder-error">{errors.progressDetermination}</div>
      )}

      {/* Decision outcome */}
      <ReportSelect
        required
        label="Decision outcome"
        placeholder="Select an option"
        options={DECISION_OUTCOME_OPTIONS}
        value={formData.decisionOutcome}
        onChange={(val) => updateFormData("decisionOutcome", val)}
        onBlur={() => handleBlur("decisionOutcome")}
        readOnly={isReadOnly}
      />
      {touched.decisionOutcome && errors.decisionOutcome && (
        <div className="report-builder-error">{errors.decisionOutcome}</div>
      )}

      {/* Rationale for decision */}
      <RichTextEditor
        label="Rationale for decision"
        placeholder="Enter a description..."
        value={formData.rationaleForDecision}
        onChange={(val) => updateFormData("rationaleForDecision", val)}
        readOnly={isReadOnly}
      />

      {/* Changes recommended */}
      <RichTextEditor
        label="Changes recommended"
        placeholder="Enter a description..."
        value={formData.changesRecommended}
        onChange={(val) => updateFormData("changesRecommended", val)}
        readOnly={isReadOnly}
      />

      {/* Next review timeline */}
      <ReportSelect
        required
        label="Next review timeline"
        placeholder="Select an option"
        options={NEXT_REVIEW_TIMELINE_OPTIONS}
        value={formData.nextReviewTimeline}
        onChange={(val) => updateFormData("nextReviewTimeline", val)}
        onBlur={() => handleBlur("nextReviewTimeline")}
        readOnly={isReadOnly}
      />
      {touched.nextReviewTimeline && errors.nextReviewTimeline && (
        <div className="report-builder-error">{errors.nextReviewTimeline}</div>
      )}

      {/* Service Recommendations Section */}
      <div className="service-recommendations-section">
        <h5 className="section-title">Service Recommendations</h5>
        {errors.serviceRecommendations && (
          <div className="report-builder-error">{errors.serviceRecommendations}</div>
        )}
        
        {formData.serviceRecommendations.map((serviceRec, index) => {
          const showLocationOther = serviceRec.location.includes("other");

          return (
            <div key={serviceRec.id} className="service-recommendation-card">
              <div className="service-recommendation-header">
                <h6>Service Recommendation {index + 1}</h6>
                {!isReadOnly && (
                <button
                  className="service-recommendation-delete-btn"
                  onClick={() => removeServiceRecommendation(serviceRec.id)}
                  type="button"
                >
                  <RxCross2 size={14} />
                  Delete Service Recommendation
                </button>
                )}
              </div>

              <div className="service-recommendation-content">
                {/* Service Recommendation */}
                <ReportTextInput
                  required
                  label="Service Recommendation"
                  placeholder="Type something"
                  value={serviceRec.serviceRecommendation}
                  onChange={(val) => updateServiceRecommendation(serviceRec.id, "serviceRecommendation", val)}
                  onBlur={() => handleServiceRecommendationBlur(serviceRec.id, "serviceRecommendation")}
                  readOnly={isReadOnly}
                />
                {serviceRecommendationErrors[`${serviceRec.id}-serviceRecommendation`] && (
                  <div className="report-builder-error">
                    {serviceRecommendationErrors[`${serviceRec.id}-serviceRecommendation`]}
                  </div>
                )}

                {/* Description of Services */}
                <RichTextEditor
                  label="Description of Services"
                  placeholder="Enter a description..."
                  value={serviceRec.descriptionOfServices}
                  onChange={(val) => updateServiceRecommendation(serviceRec.id, "descriptionOfServices", val)}
                  readOnly={isReadOnly}
                />

                {/* Number of hours requested */}
                <ReportTextInput
                  label="Number of hours requested"
                  placeholder="Type something"
                  value={serviceRec.numberOfHoursRequested}
                  onChange={(val) => updateServiceRecommendation(serviceRec.id, "numberOfHoursRequested", val)}
                  readOnly={isReadOnly}
                />

                {/* Duration of service */}
                <ReportTextInput
                  label="Duration of service"
                  placeholder="Type something"
                  value={serviceRec.durationOfService}
                  onChange={(val) => updateServiceRecommendation(serviceRec.id, "durationOfService", val)}
                  readOnly={isReadOnly}
                />

                {/* Location - Multi-Select */}
                <div className="select-with-other-container">
                  <ReportMultiSelect
                    label="Location"
                    placeholder="Select an option"
                    options={LOCATION_OPTIONS}
                    value={serviceRec.location}
                    onChange={(val) => updateServiceRecommendation(serviceRec.id, "location", val)}
                    onBlur={() => handleServiceRecommendationBlur(serviceRec.id, "location")}
                    readOnly={isReadOnly}
                  />
                  {serviceRecommendationErrors[`${serviceRec.id}-location`] && (
                    <div className="report-builder-error">
                      {serviceRecommendationErrors[`${serviceRec.id}-location`]}
                    </div>
                  )}
                  
                  {/* Show Other input when "Other" is selected */}
                  {showLocationOther && (
                    <div className="other-input-wrapper">
                      <ReportTextInput
                        required
                        label="Please specify"
                        placeholder="Enter other location"
                        value={serviceRec.locationOther}
                        onChange={(val) => updateServiceRecommendation(serviceRec.id, "locationOther", val)}
                        onBlur={() => handleServiceRecommendationBlur(serviceRec.id, "locationOther")}
                        readOnly={isReadOnly}
                      />
                      {serviceRecommendationErrors[`${serviceRec.id}-locationOther`] && (
                        <div className="report-builder-error">
                          {serviceRecommendationErrors[`${serviceRec.id}-locationOther`]}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Service Recommendation Button */}
        {!isReadOnly && (
          <div className="service-recommendation-add-wrapper">
          <Button
            label="Add Service recommendation"
            variant="secondary"
            size="small"
            width="auto"
            icon={<FaPlus />}
            iconPosition="left"
            iconSize={14}
            onClick={addServiceRecommendation}
          />
        </div>
        )}
      </div>

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

export default ReviewSection;
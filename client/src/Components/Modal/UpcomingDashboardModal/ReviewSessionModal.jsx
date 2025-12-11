import React from "react";
import ReusableModal from "../ReusableModal";
import { TextareaInput } from "../../../Components/Input/Inputs";

// Simple star component
const StarRating = ({ label, rating, onChange }) => {
  return (
    <div style={{ marginBottom: "24px" }}>
      <p style={{ margin: "0 0 12px", fontSize: "15px", color: "#374151" }}>
        {label}
      </p>
      <div style={{ display: "flex", gap: "8px" }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontSize: "32px",
              lineHeight: "1",
            }}
          >
            {star <= rating ? "★" : "☆"}
          </button>
        ))}
      </div>
    </div>
  );
};

const SessionFeedbackModal = ({
  isOpen,
  onClose,
  appointment = {}, // Pass real appointment data here
  onSave, // Your save handler
  isLoading = false,
}) => {
  const [serviceRating, setServiceRating] = React.useState(0);
  const [therapistRating, setTherapistRating] = React.useState(0);
  const [feedback, setFeedback] = React.useState("");
  const [confirmed, setConfirmed] = React.useState(false);

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Session Information"
      size="xl" // Wide enough for signature
      primaryButtonText={isLoading ? "Saving..." : "Save and Close"}
      primaryButtonLoading={isLoading}
      onPrimaryButtonClick={() => {
        onSave({ serviceRating, therapistRating, feedback, confirmed });
      }}
      primaryButtonDisabled={!confirmed || isLoading}
      secondaryButtonText="Cancel"
      onSecondaryButtonClick={onClose}
    >
      <div style={{ padding: "0 24px 24px" }}>
        {/* Session Info Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            padding: "20px",
            background: "#f9fafb",
            borderRadius: "12px",
            marginBottom: "32px",
            fontSize: "14px",
            color: "#4b5563",
          }}
        >
          <div>
            <div><strong>Date</strong>: 12/04/2023</div>
            <div><strong>Client Name</strong>: Philip Harden (Insurance ID: 12378598606)</div>
            <div><strong>Clinician Name(s)</strong>: Joe Bowellie (NPI 12378598606)</div>
            <div><strong>Session Start Time</strong>: 12:00 PM (UTC)</div>
            <div><strong>Session End Time</strong>: 2:00 PM (UTC)</div>
          </div>
          <div>
            <div><strong>Session Type</strong>: In-Home</div>
            <div><strong>Service Type(s)</strong>: 97125</div>
            <div><strong>Location</strong>: 304 Sharaf's Street, Benz, Texas, US, 94562</div>
            <div><strong>Total Session Duration</strong>: 4 hours</div>
          </div>
        </div>

        {/* Documents & Data */}
        <div style={{ marginBottom: "32px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 16px" }}>
            Documents & Data
          </h3>
          <div
            style={{
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "24px",
            }}
          >
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 16px",
                background: "#eff6ff",
                color: "#2563eb",
                border: "1px solid #93c5fd",
                borderRadius: "8px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              SOAP Notes
            </button>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 16px",
                background: "#eff6ff",
                color: "#2563eb",
                border: "1px solid #93c5fd",
                borderRadius: "8px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Session Data
            </button>
          </div>

          {/* Confirmation Checkbox */}
          <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "32px", fontSize: "15px" }}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              style={{ marginTop: "2px" }}
            />
            <span style={{ color: "#374151", lineHeight: "1.5" }}>
              I confirm that the session was delivered as described, and the data collected accurately reflects the service provided.
            </span>
          </label>
        </div>

        {/* General Feedback */}
        <div style={{ marginBottom: "32px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 16px" }}>
            General Feedback
          </h3>

          <StarRating
            label="Please rate the service you received"
            rating={serviceRating}
            onChange={setServiceRating}
          />

          <StarRating
            label="Please rate the therapist(s) who rendered the service"
            rating={therapistRating}
            onChange={setTherapistRating}
          />

          <div style={{ marginTop: "24px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "15px", color: "#374151" }}>
              Any other feedback (optional)
            </label>
            <TextareaInput
              placeholder="Enter a description..."
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
        </div>

        {/* Signature Section */}
        <div
          style={{
            padding: "24px",
            background: "#f8fafc",
            borderRadius: "12px",
            textAlign: "center",
            border: "2px dashed #cbd5e1",
          }}
        >
          <p style={{ margin: "0 0 24px", fontWeight: "600", color: "#1e293b" }}>
            Append your signature to complete
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginBottom: "24px" }}>
            <button style={{ padding: "12px 24px", background: "#f1f5f9", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              Type
            </button>
            <button style={{ padding: "12px 24px", background: "#dbeafe", color: "#3b82f6", borderRadius: "8px", border: "1px solid #93c5fd", fontWeight: "600" }}>
              Draw
            </button>
            <button style={{ padding: "12px 24px", background: "#f1f5f9", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              Image
            </button>
          </div>

          <div
            style={{
              height: "200px",
              border: "2px dashed #cbd5e1",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              fontSize: "16px",
              background: "#fff",
            }}
          >
            Draw Something
          </div>
        </div>
      </div>
    </ReusableModal>
  );
};

export default SessionFeedbackModal;
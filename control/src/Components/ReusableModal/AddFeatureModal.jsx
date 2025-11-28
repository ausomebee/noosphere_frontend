import React, { useState } from "react";
import ReusableModal from "./ReusableModal";
import Button from "../Button/Button";
import { CheckboxInput } from "../Input/Inputs";

const AddFeatureModal = ({ isOpen, onClose, onSave }) => {
  const [selectedFeatures, setSelectedFeatures] = useState([]);

  // Mock list of existing features
  const existingFeatures = [
    { id: 1, name: "Appointment & Scheduling" },
    { id: 2, name: "Client Management" },
    { id: 3, name: "Staff Management" },
    { id: 4, name: "Basic Reporting" },
    { id: 5, name: "Billing & Invoicing" },
    { id: 6, name: "In App Messaging" },
    { id: 7, name: "Custom Forms" },
    { id: 8, name: "Document Request Manager" },
  ];

  const handleSave = () => {
    if (selectedFeatures.length > 0) {
      onSave(selectedFeatures);
    }
  };

  const handleCheckboxChange = (feature) => {
    setSelectedFeatures((prev) =>
      prev.some((f) => f.id === feature.id)
        ? prev.filter((f) => f.id !== feature.id)
        : [...prev, feature]
    );
  };

  return (
    isOpen && (
      <ReusableModal
        isOpen={isOpen}
        onClose={onClose}
        title="Add Feature"
        primaryButtonText="Add"
        secondaryButtonText="Cancel"
        primaryButtonColor="#000000"
        secondaryButtonColor="#ffffff"
        onPrimaryButtonClick={handleSave}
        onSecondaryButtonClick={onClose}
      >
        <div className="modal-content-wrapper" style={{ padding: "20px", borderRadius: "8px" }}>
          <div className="no-scrollbar no-scrollbar::-webkit-scrollbar" style={{ maxHeight: "300px", overflowY: "auto", padding: "10px" }}>
            {existingFeatures.map((feature) => (
              <div
                key={feature.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px",
                  backgroundColor: selectedFeatures.some((f) => f.id === feature.id) ? "#E0F2FE" : "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "6px",
                  marginBottom: "10px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  transition: "all 0.3s ease",
                }}
              >
                <CheckboxInput
                  checked={selectedFeatures.some((f) => f.id === feature.id)}
                  onChange={() => handleCheckboxChange(feature)}
                  style={{ marginRight: "12px", width: "18px", height: "18px" }}
                />
                <span style={{ fontSize: "14px", color: "#1F2937", fontWeight: "500" }}>{feature.name}</span>
              </div>
            ))}
          </div>
        </div>
      </ReusableModal>
    )
  );
};

export default AddFeatureModal;
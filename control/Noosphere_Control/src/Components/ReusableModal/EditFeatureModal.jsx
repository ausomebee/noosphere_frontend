import React, { useState } from "react";
import ReusableModal from "./ReusableModal";
import { TextInput, SelectInput, CheckboxInput, TextareaInput } from "../Input/Inputs";

const EditFeatureModal = ({
  isOpen,
  onClose,
  onSave,
  featureId,
  currentName,
  currentDescription,
  currentManagedBy,
  currentActive,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    featureId: featureId || "",
    name: currentName || "",
    description: currentDescription || "",
    managedBy: currentManagedBy || "",
    active: currentActive ?? true,
  });


  const statusOptions = [
    { value: "true", label: "Active" },
    { value: "false", label: "Disabled" },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handlePlanCheckboxChange = (e) => {
    const { value, checked } = e.target;
    setFormData((prevData) => {
      const updatedPlans = checked
        ? [...prevData.plans, value]
        : prevData.plans.filter((plan) => plan !== value);
      return {
        ...prevData,
        plans: updatedPlans,
      };
    });
  };

  const handleStatusChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value === "true", // Convert string "true"/"false" to boolean
    }));
  };

  const handleSave = () => {
    if (formData.name.trim()) {
      const updatedFeature = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        managedBy: formData.managedBy.trim() || "Admin",
        active: formData.active,
      };
      onSave(updatedFeature);
      setFormData({
        name: "",
        description: "",
        managedBy: "",
        active: true,
      });
    }
  };

  const handleClose = () => {
    setFormData({
      name: currentName || "",
      description: currentDescription || "",
      managedBy: currentManagedBy || "",
      active: currentActive ?? true,
    });
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Feature"
      primaryButtonText={isLoading ? "Saving..." : "Save"}
      secondaryButtonText="Cancel"
      primaryButtonColor="#000000"
      secondaryButtonColor="#ffffff"
      onPrimaryButtonClick={handleSave}
      onSecondaryButtonClick={handleClose}
      isPrimaryButtonDisabled={isLoading || !formData.name.trim() }
    >
      <form className="no-scrollbar::-webkit-scrollbar no-scrollbar">
        <TextInput
          label="Feature Name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Enter feature name"
          disabled={isLoading}
        />
        <TextareaInput
          label="Feature Description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Enter feature description"
          disabled={isLoading}
        />
        <TextInput
          label="Managed By"
          name="managedBy"
          value={formData.managedBy}
          onChange={handleInputChange}
          placeholder="Enter manager name"
          disabled={isLoading}
        />
       
        <div style={{ marginTop: "20px" }}>
          <SelectInput
            label="Set Active or Disabled"
            name="active"
            value={formData.active.toString()} // Convert boolean to string for SelectInput
            onChange={handleStatusChange}
            options={statusOptions}
            placeholder="Select status"
            disabled={isLoading}
          />
        </div>
      </form>
    </ReusableModal>
  );
};

export default EditFeatureModal;
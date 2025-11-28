import React, { useState } from "react";
import { useSelector } from "react-redux";
import ReusableModal from "./ReusableModal";
import { TextInput, SelectInput, CheckboxInput, TextareaInput } from "../Input/Inputs";

const AddNewFeatureModal = ({ isOpen, onClose, onSave, isLoading }) => {
  const featureGroups = useSelector(
    (state) => state.featureManagement.featureGroups
  );
  const [selectedGroup, setSelectedGroup] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    managedBy: "", // Added managedBy field
    active: true,
  });

  const featureGroupOptions = [
    { value: "", label: "Select a feature group", disabled: true },
    ...featureGroups.map((group) => ({
      value: group.title,
      label: group.title,
    })),
  ];


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
    if (selectedGroup && formData.name.trim() ) {
      const newFeature = {
        id: Date.now().toString(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        managedBy: formData.managedBy.trim() || "Current User", // Fallback to "Current User"
        dateAdded: new Date().toLocaleDateString("en-US"),
        active: formData.active,
        selected: false,
      };
      onSave({ groupTitle: selectedGroup, feature: newFeature });
      setSelectedGroup("");
      setFormData({ name: "", description: "", managedBy: "", plans: [], active: true }); // Reset managedBy
    }
  };

  const handleClose = () => {
    setSelectedGroup("");
    setFormData({ name: "", description: "", managedBy: "", plans: [], active: true }); // Reset managedBy
    onClose();
  };

  return (
    <div>
      <ReusableModal
        isOpen={isOpen}
        onClose={handleClose}
        title="Add New Feature"
        primaryButtonText={isLoading ? "Saving..." : "Save"}
        secondaryButtonText="Cancel"
        primaryButtonColor="#000000"
        secondaryButtonColor="#ffffff"
        onPrimaryButtonClick={handleSave}
        onSecondaryButtonClick={handleClose}
        isPrimaryButtonDisabled={isLoading}
      >
        <form className="no-scrollbar::-webkit-scrollbar no-scrollbar">
          <SelectInput
            label="Feature Group"
            name="featureGroup"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            options={featureGroupOptions}
            placeholder="Select a feature group"
            disabled={isLoading}
          />
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
              disabled={isLoading}
            />
          </div>
        </form>
      </ReusableModal>
    </div>
  );
};

export default AddNewFeatureModal;
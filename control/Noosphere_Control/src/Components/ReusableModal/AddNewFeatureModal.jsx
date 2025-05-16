import React, { useState } from "react";
import { useSelector } from "react-redux";
import ReusableModal from "./ReusableModal";
import { TextInput, SelectInput, CheckboxInput } from "../Input/Inputs";

const AddNewFeatureModal = ({ isOpen, onClose, onSave }) => {
  const featureGroups = useSelector(
    (state) => state.featureManagement.featureGroups
  );
  const [selectedGroup, setSelectedGroup] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    plans: [],
    active: true, 
  });

  const featureGroupOptions = [
    { value: "", label: "Select a feature group", disabled: true },
    ...featureGroups.map((group) => ({
      value: group.title,
      label: group.title,
    })),
  ];

  const planOptions = [
    { value: "Basic", label: "Basic" },
    { value: "Standard", label: "Standard" },
    { value: "Pro", label: "Pro" },
    { value: "Enterprise", label: "Enterprise" },
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
    if (selectedGroup && formData.name.trim() && formData.plans.length > 0) {
      const newFeature = {
        id: Date.now().toString(),
        name: formData.name.trim(),
        dateAdded: new Date().toLocaleDateString("en-US"),
        addedBy: "Current User",
        active: formData.active,
        plan: formData.plans,
        selected: false,
      };
      onSave({ groupTitle: selectedGroup, feature: newFeature });
      setSelectedGroup("");
      setFormData({ name: "", plans: [], active: true });
    }
  };

  const handleClose = () => {
    setSelectedGroup("");
    setFormData({ name: "", plans: [], active: true });
    onClose();
  };

  return (
    <div>
      <ReusableModal
        isOpen={isOpen}
        onClose={handleClose}
        title="Add New Feature"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        primaryButtonColor="#000000"
        secondaryButtonColor="#ffffff"
        onPrimaryButtonClick={handleSave}
        onSecondaryButtonClick={handleClose}
      >
        <form className="no-scrollbar::-webkit-scrollbar no-scrollbar">
          <SelectInput
            label="Feature Group"
            name="featureGroup"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            options={featureGroupOptions}
            placeholder="Select a feature group"
          />
          <TextInput
            label="Feature Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter feature name"
          />
          <div>
            <label>
              Applicable Plans
            </label>
            <div className="">
              {planOptions.map((plan) => (
                <CheckboxInput
                  key={plan.value}
                  label={plan.label}
                  name="plans"
                  value={plan.value}
                  checked={formData.plans.includes(plan.value)}
                  onChange={handlePlanCheckboxChange}
                />
              ))}
            </div>
          </div>
          <div style={{ marginTop: "20px" }}>
            <SelectInput
              label="Set Active or Disabled"
              name="active"
              value={formData.active.toString()} // Convert boolean to string for SelectInput
              onChange={handleStatusChange}
              options={statusOptions}
            />
          </div>
        </form>
      </ReusableModal>
    </div>
  );
};

export default AddNewFeatureModal;
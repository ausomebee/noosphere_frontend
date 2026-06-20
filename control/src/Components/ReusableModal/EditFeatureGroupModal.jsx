import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import ReusableModal from "./ReusableModal";
import { TextInput, SelectInput } from "../Input/Inputs";

const EditFeatureGroupModal = ({ isOpen, onClose, onSave, isLoading  }) => {
  const featureGroups = useSelector((state) => state.featureManagement.featureGroups);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [formData, setFormData] = useState({
    title: "",
  });

  // Add a dummy placeholder as the first option
  const featureGroupOptions = [
    { value: "", label: "Select a feature group", disabled: true },
    ...featureGroups.map((group) => ({
      value: group.title,
      label: group.title,
    })),
  ];

  // Update the form when a group is selected
  useEffect(() => {
    if (selectedGroup) {
      setFormData({ title: selectedGroup });
    } else {
      setFormData({ title: "" });
    }
  }, [selectedGroup]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSave = () => {
    if (selectedGroup && formData.title.trim()) {
      onSave({ oldTitle: selectedGroup, newTitle: formData.title.trim() });
      setSelectedGroup("");
      setFormData({ title: "" });
    }
  };

  const handleClose = () => {
    setSelectedGroup("");
    setFormData({ title: "" });
    onClose();
  };

  return (
    <div>
      <ReusableModal
        isOpen={isOpen}
        onClose={handleClose}
        title="Edit Feature Group"
        primaryButtonText={isLoading ? "Saving..." : "Save"}
        secondaryButtonText="Cancel"
        primaryButtonColor="#000000"
        secondaryButtonColor="#ffffff"
        onPrimaryButtonClick={handleSave}
        onSecondaryButtonClick={handleClose}
        primaryButtonDisabled={isLoading || !formData.title.trim() || selectedGroup === formData.title}
        primaryButtonLoading={isLoading}
      >
        <form className="no-scrollbar::-webkit-scrollbar no-scrollbar">
          <SelectInput
            label="Select Feature Group Title to Edit"
            name="featureGroup"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            options={featureGroupOptions}
            placeholder="Select a feature group"
            disabled={isLoading}
            emptyHint="No feature groups found. Create one in Feature Management."
          />
          <TextInput
            label="Feature Group Title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter feature group title"
            disabled={!selectedGroup} // Disable input until a group is selected
          />
        </form>
      </ReusableModal>
    </div>
  );
};

export default EditFeatureGroupModal;
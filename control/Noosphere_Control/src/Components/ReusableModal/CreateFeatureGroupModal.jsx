import React, { useState } from 'react';
import ReusableModal from "./ReusableModal";
import { TextInput } from "../Input/Inputs";

const CreateFeatureGroupModal = ({ isOpen, onClose, onSave, isLoading }) => {
  const [formData, setFormData] = useState({
    title: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSave = () => {
    if (formData.title.trim()) {
      onSave({ title: formData.title.trim() });
      setFormData({ title: "" });
    }
  };

  const handleClose = () => {
    setFormData({ title: "" });
    onClose();
  };

  return (
    <div>
      <ReusableModal
        isOpen={isOpen}
        onClose={handleClose}
        title="Create Feature Group"
        primaryButtonText={isLoading ? "Saving..." : "Save"}
        secondaryButtonText="Cancel"
        primaryButtonColor="#000000"
        secondaryButtonColor="#ffffff"
        onPrimaryButtonClick={handleSave}
        onSecondaryButtonClick={handleClose}
        isPrimaryButtonDisabled={isLoading}
      >
        <form className="no-scrollbar::-webkit-scrollbar no-scrollbar">
          <TextInput
            label="Feature Group Title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter feature group title"
            disabled={isLoading}
          />
        </form>
      </ReusableModal>
    </div>
  );
};

export default CreateFeatureGroupModal;
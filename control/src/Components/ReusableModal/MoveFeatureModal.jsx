import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import ReusableModal from "./ReusableModal";
import { CheckboxInput } from "../Input/Inputs";

const MoveToFeatureGroupModal = ({ isOpen, onClose, onSave, featureId, currentGroupTitle, isLoading }) => {
  const featureGroups = useSelector((state) => state.featureManagement.featureGroups);
  const [selectedGroup, setSelectedGroup] = useState("");

  const handleGroupChange = (e) => {
    const { value } = e.target;
    setSelectedGroup(selectedGroup === value ? "" : value);
  };

  const handleSave = () => {
    if (selectedGroup && selectedGroup !== currentGroupTitle) {
      onSave({
        featureId,
        fromGroupTitle: currentGroupTitle,
        toGroupTitle: selectedGroup,
      });
    } else {
      setSelectedGroup("");
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedGroup("");
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Move to Feature Group"
      primaryButtonText={isLoading ? "Saving..." : "Save"}
      secondaryButtonText="Cancel"
      primaryButtonColor="#000000"
      secondaryButtonColor="#ffffff"
      onPrimaryButtonClick={handleSave}
      onSecondaryButtonClick={handleClose}
      primaryButtonDisabled={isLoading}
      primaryButtonLoading={isLoading}
    >
      <p className="text-sm text-gray-600 mb-4">
        Select the group to move this feature to
      </p>
      <div className="space-y-2">
        {featureGroups.map((group) => (
          <CheckboxInput
            key={group.id}
            label={group.title}
            name="featureGroup"
            value={group.title}
            checked={selectedGroup === group.title}
            onChange={handleGroupChange}
            disabled={isLoading}
          />
        ))}
      </div>
    </ReusableModal>
  );
};

export default MoveToFeatureGroupModal;
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import ReusableModal from "./ReusableModal";
import { CheckboxInput } from "../Input/Inputs";

const MoveToFeatureGroupModal = ({ isOpen, onClose, onSave, featureId, currentGroupTitle }) => {
  const featureGroups = useSelector((state) => state.featureManagement.featureGroups);
  const [selectedGroup, setSelectedGroup] = useState("");

  const handleGroupChange = (e) => {
    const { value } = e.target;
    setSelectedGroup(value);
  };

  const handleSave = () => {
    if (selectedGroup && selectedGroup !== currentGroupTitle) {
      onSave({
        featureId,
        fromGroupTitle: currentGroupTitle,
        toGroupTitle: selectedGroup,
      });
      setSelectedGroup("");
    }
    onClose();
  };

  const handleClose = () => {
    setSelectedGroup("");
    onClose();
  };

  return (
    <div>
      <ReusableModal
        isOpen={isOpen}
        onClose={handleClose}
        title="Move to feature group"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        primaryButtonColor="#000000"
        secondaryButtonColor="#ffffff"
        onPrimaryButtonClick={handleSave}
        onSecondaryButtonClick={handleClose}
      >
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Select the group(s) you want to move this feature to
          </p>
          <div className="space-y-2">
            {featureGroups.map((group) => (
              <CheckboxInput
                key={group.title}
                label={group.title}
                name="featureGroup"
                value={group.title}
                checked={selectedGroup === group.title}
                onChange={handleGroupChange}
              />
            ))}
          </div>
        </div>
      </ReusableModal>
    </div>
  );
};

export default MoveToFeatureGroupModal;
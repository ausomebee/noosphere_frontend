import React, { useState } from 'react';
import ReusableModal from '../ReusableModal';
import { TextInput, CheckboxInput } from '../../Input/Inputs';


const CustomTaskModal = ({ isOpen, onClose, onSave }) => {
  const [taskName, setTaskName] = useState('');
  const [isCompulsory, setIsCompulsory] = useState(false);

  const handleSave = () => {
    if (taskName.trim()) {
      const newTask = {
        id: Date.now(),
        name: taskName.trim(),
        required: isCompulsory
      };
      onSave(newTask);
      setTaskName('');
      setIsCompulsory(false);
      onClose();
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        setTaskName('');
        setIsCompulsory(false);
        onClose();
      }}
      title="Add Custom Task"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      primaryButtonColor="#000000"
      secondaryButtonColor="#ffffff"
      onPrimaryButtonClick={handleSave}
      onSecondaryButtonClick={() => {
        setTaskName('');
        setIsCompulsory(false);
        onClose();
      }}
    >
      <div>
        <TextInput
          label="Task name"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          placeholder="Type something"
        />
        <CheckboxInput
          label="This is a compulsory task"
          checked={isCompulsory}
          onChange={(e) => setIsCompulsory(e.target.checked)}
        />
      </div>
    </ReusableModal>
  );
};

export default CustomTaskModal;
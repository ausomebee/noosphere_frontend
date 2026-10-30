import React, { useState } from 'react';
import ReusableModal from './ReusableModal';
import { TextInput, CheckboxInput } from '../Input/Inputs';
import Button from '../Button/Button';

const CustomTaskModal = ({ isOpen, onClose, onSave, initialValues }) => {
  const [taskName, setTaskName] = useState('');
  const [isCompulsory, setIsCompulsory] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setTaskName(initialValues?.name || '');
      setIsCompulsory(initialValues?.required || false);
    }
  }, [isOpen, initialValues]);

  const handleSave = () => {
    if (!taskName.trim()) return;
    // Returned so the modal holds its buttons disabled for the request, and
    // resolved before clearing: this used to wipe the field and close the
    // moment onSave was called, losing the entry when the save failed.
    return Promise.resolve(
      onSave({ name: taskName.trim(), required: isCompulsory }),
    ).then(() => {
      setTaskName('');
      setIsCompulsory(false);
      onClose();
    });
  };

  const handleClose = () => {
    setTaskName('');
    setIsCompulsory(false);
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title={initialValues ? "Edit Custom Task" : "Add Custom Task"}
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      primaryButtonColor="#000000"
      secondaryButtonColor="#ffffff"
      onPrimaryButtonClick={handleSave}
      onSecondaryButtonClick={handleClose}
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
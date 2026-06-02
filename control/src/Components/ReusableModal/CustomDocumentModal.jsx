import React, { useState } from 'react';
import ReusableModal from './ReusableModal';
import { TextInput, CheckboxInput } from '../Input/Inputs';
import Button from '../Button/Button';

const CustomDocumentModal = ({ isOpen, onClose, onSave, initialValues }) => {
  const [documentName, setDocumentName] = useState('');
  const [isCompulsory, setIsCompulsory] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setDocumentName(initialValues?.name || '');
      setIsCompulsory(initialValues?.required || false);
    }
  }, [isOpen, initialValues]);

  const handleSave = () => {
    if (documentName.trim()) {
      onSave({ name: documentName.trim(), required: isCompulsory });
      setDocumentName('');
      setIsCompulsory(false);
      onClose();
    }
  };

  const handleClose = () => {
    setDocumentName('');
    setIsCompulsory(false);
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title={initialValues ? "Edit Custom Document" : "Custom document request"}
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      primaryButtonColor="#000000"
      secondaryButtonColor="#ffffff"
      onPrimaryButtonClick={handleSave}
      onSecondaryButtonClick={handleClose}
    >
      <div>
        <TextInput
          label="Document name"
          value={documentName}
          onChange={(e) => setDocumentName(e.target.value)}
          placeholder="Type something"
        />
        <CheckboxInput
          label="This is a compulsory document"
          checked={isCompulsory}
          onChange={(e) => setIsCompulsory(e.target.checked)}
        />
      </div>
    </ReusableModal>
  );
};

export default CustomDocumentModal;
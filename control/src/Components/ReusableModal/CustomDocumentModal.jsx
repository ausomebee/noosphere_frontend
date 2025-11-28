import React, { useState } from 'react';
import ReusableModal from './ReusableModal';
import { TextInput, CheckboxInput } from '../Input/Inputs';
import Button from '../Button/Button';

const CustomDocumentModal = ({ isOpen, onClose, onSave }) => {
  const [documentName, setDocumentName] = useState('');
  const [isCompulsory, setIsCompulsory] = useState(false);

  const handleSave = () => {
    if (documentName.trim()) {
      const newDocument = {
        id: Date.now(),
        name: documentName.trim(),
        required: isCompulsory
      };
      onSave(newDocument);
      setDocumentName('');
      setIsCompulsory(false);
      onClose();
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        setDocumentName('');
        setIsCompulsory(false);
        onClose();
      }}
      title="Custom document request"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      primaryButtonColor="#000000"
      secondaryButtonColor="#ffffff"
      onPrimaryButtonClick={handleSave}
      onSecondaryButtonClick={() => {
        setDocumentName('');
        setIsCompulsory(false);
        onClose();
      }}
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
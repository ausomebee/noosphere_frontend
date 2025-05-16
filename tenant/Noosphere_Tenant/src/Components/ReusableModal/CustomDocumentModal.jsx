import React, { useState } from 'react';
import ReusableModal from './ReusableModal';
import { TextInput, CheckboxInput } from  '../Input/Inputs';
import './ReusableModal.css';
import Button from '../Button/Button';

const CustomDocumentModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [documentName, setDocumentName] = useState('');
  const [isCompulsory, setIsCompulsory] = useState(false);

  return (
    <>
      
      <Button
        label="Open Custom Document Modal"
        variant="primary"
        onClick={() => setIsOpen(true)}
      />
      <ReusableModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Custom document request"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        primaryButtonColor="#000000"
        secondaryButtonColor="#ffffff"
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
    </>
  );
};

export default CustomDocumentModal;
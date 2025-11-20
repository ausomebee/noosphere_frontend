// components/modals/NewDocumentRequestModal.jsx
import React, { useState } from "react";
import ReusableModal from "../../ReusableModal/ReusableModal";
import { TextInput, TextareaInput, CheckboxInput } from "../../Input/Inputs";

const NewDocumentRequestModal = ({ isOpen, onClose }) => {
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [dueDate, setDueDate] = useState("");

  const handleSave = (e) => {
    e.preventDefault();
    console.log({
      documentName: e.target.documentName.value,
      description: e.target.description.value,
      allowMultiple,
      dueDate,
    });
    // Here you would send to API / create the request
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="New document request"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSave}
      size="md"
    >
    
        {/* Name of document */}
        <div>
          
          <TextInput
          label=" Name of document"
            name="documentName"
            placeholder="Type something"
            className="w-full"
            required
          />
        </div>

        {/* Description */}
        <div>
          
          <TextareaInput
          label="Description"
            name="description"
            placeholder="Enter a description..."
            rows={4}
            
          />
        </div>

        {/* Allow multiple file upload */}
        <div className="flex items-center gap-3 mb-6">
          <CheckboxInput
            id="multiple-upload"
            checked={allowMultiple}
            onChange={(e) => setAllowMultiple(e.target.checked)}
          />
          <label
            htmlFor="multiple-upload"
            className="text-sm text-gray-700 cursor-pointer select-none"
          >
            Allow multiple file upload
          </label>
        </div>

        {/* Due Date - Now using native date picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Set a due date
          </label>
          <TextInput
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full"
            min={new Date().toISOString().split("T")[0]} // Prevents past dates
            placeholder="Select due date"
          />
          {dueDate && (
            <p className="text-xs text-gray-500 mt-1">
              Selected: {new Date(dueDate).toLocaleDateString("en-GB")}
            </p>
          )}
        </div>
  
    </ReusableModal>
  );
};

export default NewDocumentRequestModal;

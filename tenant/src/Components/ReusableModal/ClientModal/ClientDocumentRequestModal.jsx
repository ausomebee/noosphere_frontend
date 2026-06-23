// src/components/ReusableModal/ClientModal/NewDocumentRequestModal.jsx

import React, { useState } from "react";
import ReusableModal from "../ReusableModal";
import { TextInput, SwitchInput, CheckboxInput, TextareaInput } from "../../Input/Inputs";
import { showToast, showApiError } from "../../../Helper/ShowToast";

const NewDocumentRequestModal = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [dueDate, setDueDate] = useState("");

  const handleSave = async () => {
    if (!name.trim()) {
      showToast("Name of document is required", "error");
      return;
    }

    try {
      // Wait for the API to succeed before clearing/closing — on error keep the
      // modal open and show the message instead of closing on a failed save.
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        allowMultipleFiles: allowMultiple,
        dueDate: dueDate || null,
        status: "Pending upload",
        createdAt: new Date().toISOString(),
      });

      setName("");
      setDescription("");
      setAllowMultiple(false);
      setDueDate("");
      onClose();
    } catch (err) {
      console.error("Document request error:", err);
      showApiError(err, "DOCUMENT_REQUEST");
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setAllowMultiple(false);
    setDueDate("");
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title="New document request"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSave}
      onSecondaryButtonClick={handleClose}
      primaryButtonLoading={loading}
      size="md"
    >
      <div className="py-6 space-y-6">
        {/* Name of document */}
        <TextInput
          label="Name of document"
          required
          placeholder="Type something"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Description */}
        <TextareaInput
          label="Description"
          type="textarea"
          rows={4}
          placeholder="Enter a description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Allow multiple file upload */}
        <div className="flex items-center gap-4">
          <CheckboxInput
            checked={allowMultiple}
            onChange={(e) => setAllowMultiple(e.target.checked)}
            id="allow-multiple"
          />
          <label
            htmlFor="allow-multiple"
            className="text-sm font-medium text-gray-700 cursor-pointer select-none"
          >
            Allow multiple file upload
          </label>
        </div>

        {/* Set a due date */}
        <TextInput
          label="Set a due date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
    </ReusableModal>
  );
};

export default NewDocumentRequestModal;
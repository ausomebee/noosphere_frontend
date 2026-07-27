import React, { useState } from "react";
import ReusableModal from "../../ReusableModal/ReusableModal";
import { TextInput } from "../../Input/Inputs";
import { showToast } from "../../../Helper/ShowToast";

const CreateNewTemplateModal = ({ isOpen, onClose, onStartCreating }) => {
  const [templateName, setTemplateName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmed = templateName.trim();

    if (!trimmed) {
      showToast("Template name is required", "error");
      return;
    }

    if (trimmed.length < 3) {
      showToast("Template name must be at least 3 characters", "warning");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      onStartCreating({ initialTitle: trimmed });
      setIsSubmitting(false);
      onClose();
      setTemplateName("");
    }, 600);
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="New Template"
      primaryButtonText="Start Creating"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit}
      onSecondaryButtonClick={onClose}
      primaryButtonLoading={isSubmitting}
      primaryButtonDisabled={!templateName.trim() || templateName.trim().length < 3}
      size=""
    >
      <div className="space-y-6 p-16">
        <TextInput
          label="Document/Report Title"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="e.g. Behaviour Intervention Plan Template"
          autoFocus
          disabled={isSubmitting}
        />
      </div>
    </ReusableModal>
  );
};

export default CreateNewTemplateModal;
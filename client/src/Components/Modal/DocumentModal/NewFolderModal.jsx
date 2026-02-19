// src/components/Modal/DocumentModal/NewFolderModal.jsx
import { useState, useEffect } from "react";
import ReusableModal from "../ReusableModal";
import { showToast } from "../../../Helper/ShowToast";
import { TextInput } from "../../Input/Inputs";

const NewFolderModal = ({
  isOpen,
  onClose,
  onCreate,           // called when creating new folder
  onRename,           // called when renaming existing folder
  initialName = "",
  isRenameMode = false,
  folderId = null,
}) => {
  const [name, setName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
    }
  }, [isOpen, initialName]);

  const handleSubmit = () => {
    if (!name.trim()) {
      showToast("Folder name is required", "error");
      return;
    }

    const trimmed = name.trim();

    if (isRenameMode) {
      if (trimmed === initialName) {
        onClose();
        return;
      }
      onRename?.(folderId, trimmed);
    } else {
      onCreate?.({ name: trimmed });
    }

    setName("");
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title={isRenameMode ? "Rename Folder" : "Create New Folder"}
      primaryButtonText={isRenameMode ? "Save Changes" : "Create Folder"}
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit}
      onSecondaryButtonClick={onClose}
      size="md"
      primaryButtonDisabled={!name.trim() || (isRenameMode && name.trim() === initialName)}
    >
      <div style={{ padding: "16px 0" }}>
        <TextInput
          label="Folder Name"
          placeholder="e.g. Medical Records 2025"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>
    </ReusableModal>
  );
};

export default NewFolderModal;
import { useState, useEffect } from "react";
import ReusableModal from "../ReusableModal";
import FileUploadArea from "../../FileUpload/FileUploadArea";
import { showToast } from "../../../Helper/ShowToast";
import { RadioInput, SelectInput } from "../../Input/Inputs";

const NewFileModal = ({ isOpen, onClose, onCreate, folders = [] }) => {
  const [locationType, setLocationType] = useState("standalone");
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocationType("standalone");
      setSelectedFolderId("");
      setUploadedFiles([]);
      setIsUploading(false);
    }
  }, [isOpen]);

  // Prepare options for SelectInput
  const selectOptions = folders.map((f) => ({
    label: f.name || "Unnamed Folder",
    value: String(f.id), // ensure value is always string
  }));

  const handleCreate = () => {
    if (isUploading) {
      showToast("Please wait for upload to finish", "info");
      return;
    }

    if (uploadedFiles.length === 0) {
      showToast("Please upload at least one file", "error");
      return;
    }

    if (locationType === "folder" && !selectedFolderId) {
      showToast("Please select a folder", "error");
      return;
    }

    const payloads = uploadedFiles.map((file) => ({
      name: file.filename || "Untitled File",
      url: file.url,
      size: file.size || "Unknown",
      fileType: file.filename?.split(".").pop()?.toLowerCase() || "unknown",
      folderId: locationType === "folder" ? selectedFolderId : null,
    }));

    // Awaited so the buttons stay disabled for the whole request, and closed
    // only once it succeeds — a `finally` here dismissed the modal on failure
    // too, throwing away the uploaded files.
    return Promise.resolve(onCreate(payloads)).then(() => onClose());
  };

  const handleClose = () => {
    if (isUploading) {
      showToast("Upload in progress, please wait", "info");
      return;
    }
    onClose();
  };

  const isCreateDisabled =
    isUploading ||
    uploadedFiles.length === 0 ||
    (locationType === "folder" && !selectedFolderId);

  return (
    <ReusableModal
      key={isOpen ? `file-modal-${Date.now()}` : "closed"}
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload New File"
      primaryButtonText="Create File"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleCreate}
      onSecondaryButtonClick={handleClose}
      primaryButtonDisabled={isCreateDisabled}
      primaryButtonLoading={isUploading}
      size="lg"
    >
      <div className="new-file-modal-body">
        {/* Location choice */}
        <div className="mb-6">
          <div className="flex gap-6 mb-4">
            <RadioInput
              label="Standalone (save at root level)"
              name="location"
              checked={locationType === "standalone"}
              onChange={() => setLocationType("standalone")}
            />
            <RadioInput
              label="Save inside a specific folder"
              name="location"
              checked={locationType === "folder"}
              onChange={() => setLocationType("folder")}
            />
          </div>

          {locationType === "folder" && (
            <div className="mt-2">
              <SelectInput
                label="Select Folder"
                options={selectOptions}
                value={selectedFolderId} // ← FIXED: pass the raw string ID
                onChange={(e) => {
                  const newId = e?.target?.value || "";
                  setSelectedFolderId(newId);
                }}
                placeholder={
                  folders.length === 0
                    ? "No folders available"
                    : "Choose a folder..."
                }
                isClearable // ← make sure SelectInput passes this to react-select
                isDisabled={folders.length === 0}
              />
            </div>
          )}
        </div>

        {/* File upload section */}
        <div className="upload-section">
          <label className="input-label mb-3">Upload File(s)</label>
          <FileUploadArea
            onUploadStart={() => setIsUploading(true)}
            onUploadComplete={(files) => {
              setUploadedFiles(files);
              setIsUploading(false);
            }}
            onUploadError={() => setIsUploading(false)}
            initialFiles={uploadedFiles.map((f) => ({
              filename: f.filename,
              url: f.url,
            }))}
            maxFiles={1} // change to >1 if you want multi-file later
            maxSizeMB={20}
            hint="PDF, DOCX, JPG, PNG, XLSX — Max 20MB per file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx"
          />

        </div>
      </div>
    </ReusableModal>
  );
};

export default NewFileModal;

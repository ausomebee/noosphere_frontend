// src/components/Modal/ClientDocumentUploadModal/UploadDocumentModal.jsx

import { useState, useCallback } from "react";
import ReusableModal from "./ReusableModal"; // adjust path as needed
import FileUploadArea from "../FileUpload/FileUploadArea"; // adjust path
import { showToast } from "../../Helper/ShowToast"; // adjust path

const UploadDocumentModal = ({
  isOpen,
  onClose,
  onFilesReady,           // callback: (string[]) => void   → array of uploaded URLs
  allowMultiple = false,
  loading = false,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState([]); // [{ filename, url }]
  const [uploading, setUploading] = useState(false);

  const handleUploadStart = useCallback(() => setUploading(true), []);

  const handleUploadComplete = useCallback((files) => {
    // files = array from FileUploadArea: [{ filename, url, size?, ... }]
    const newFiles = files.map(f => ({
      filename: f.filename || "Untitled",
      url: f.url,
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
    setUploading(false);
  }, []);

  // FileUploadArea reports this alongside the completion callback, so clearing
  // the flag here too just guarantees the buttons never stay stuck.
  const handleUploadError = useCallback(() => setUploading(false), []);

  // Keep the submit payload in step with the list the user can see — a file
  // removed from the upload area must not still be attached on submit.
  const handleRemoveFile = useCallback((removed) => {
    setUploadedFiles(prev =>
      prev.filter(f => f.url !== (removed?.url ?? removed?.fileUrl))
    );
  }, []);

  const handleSubmit = () => {
    if (uploadedFiles.length === 0) {
      showToast("Please upload at least one file", "error");
      return;
    }

    const urls = uploadedFiles.map(f => f.url);
    onFilesReady(urls);
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title={allowMultiple ? "Upload Multiple Documents" : "Upload Document"}
      primaryButtonText={uploading ? "Uploading..." : "Attach Documents"}
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit}
      onSecondaryButtonClick={onClose}
      // Spinner + both buttons locked while a file is in flight or the parent
      // is saving; the attach button also stays disabled until there's
      // something to attach.
      primaryButtonLoading={loading || uploading}
      primaryButtonDisabled={uploadedFiles.length === 0}
      size="md"
    >
      <div className="py-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {allowMultiple ? "Upload files (multiple allowed)" : "Upload file"}{" "}
            <span className="required-indicator">*</span>
          </label>

          <FileUploadArea
            onUploadStart={handleUploadStart}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            onRemove={handleRemoveFile}
            maxSizeMB={15}
            hint={
              allowMultiple
                ? "PDF, DOCX, JPG, PNG, XLSX — multiple files allowed, max 15MB each"
                : "PDF, DOCX, JPG, PNG, XLSX — max 15MB"
            }
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx"
            multiple={allowMultiple}
            disabled={uploading || loading}
          />
        </div>
      </div>
    </ReusableModal>
  );
};

export default UploadDocumentModal;

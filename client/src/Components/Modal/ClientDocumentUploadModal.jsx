// src/components/Modal/ClientDocumentUploadModal/UploadDocumentModal.jsx

import React, { useState, useCallback } from "react";
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

  const handleUploadComplete = useCallback((files) => {
    // files = array from FileUploadArea: [{ filename, url, size?, ... }]
    const newFiles = files.map(f => ({
      filename: f.filename || "Untitled",
      url: f.url,
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleRemoveFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (uploadedFiles.length === 0) {
      showToast("Please upload at least one file", "error");
      return;
    }

    const urls = uploadedFiles.map(f => f.url);
    onFilesReady(urls);
    // Optional: reset after success (but parent usually closes modal)
    // setUploadedFiles([]);
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title={allowMultiple ? "Upload Multiple Documents" : "Upload Document"}
      primaryButtonText="Attach Documents"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit}
      onSecondaryButtonClick={onClose}
      primaryButtonLoading={loading}
      primaryButtonDisabled={loading || uploadedFiles.length === 0}
      size="md"
    >
      <div className="py-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {allowMultiple ? "Upload files (multiple allowed)" : "Upload file"}{" "}
            <span className="text-red-500">*</span>
          </label>

          <FileUploadArea
            onUploadComplete={handleUploadComplete}
            initialFiles={uploadedFiles.map(f => ({
              filename: f.filename,
              url: f.url,
            }))}
            maxFiles={allowMultiple ? 10 : 1}
            maxSizeMB={15}
            hint={
              allowMultiple
                ? "PDF, DOCX, JPG, PNG, XLSX — multiple files allowed, max 15MB each"
                : "PDF, DOCX, JPG, PNG, XLSX — max 15MB"
            }
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx"
            multiple={allowMultiple}
          />
        </div>

        {uploadedFiles.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-2">
              {uploadedFiles.length} file{uploadedFiles.length !== 1 ? "s" : ""} ready to attach
            </p>
            <ul className="space-y-2 text-sm text-blue-800">
              {uploadedFiles.map((file, index) => (
                <li key={index} className="flex justify-between items-center">
                  <span className="truncate max-w-[280px]">{file.filename}</span>
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="text-red-600 hover:text-red-800 text-xs font-medium ml-3"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ReusableModal>
  );
};

export default UploadDocumentModal;
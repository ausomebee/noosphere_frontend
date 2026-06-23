// src/components/ReusableModal/ClientModal/UploadDocumentModal.jsx

import React, { useState, useCallback } from "react";
import ReusableModal from "../ReusableModal";
import { TextInput } from "../../Input/Inputs";
import FileUploadArea from "../../FileUpload/FileUploadArea";
import { showToast } from "../../../Helper/ShowToast";

const UploadDocumentModal = ({
  isOpen,
  onClose,
  onUpload, // callback: (fileObj, documentName) => {}
  initialFile = null, // optional: pre-fill with existing document
  loading = false,
}) => {
  const [file, setFile] = useState(initialFile || null);
  const [documentName, setDocumentName] = useState(
    initialFile?.name || ""
  );

  const handleFileUpload = useCallback((uploadedFiles) => {
    const uploaded = uploadedFiles[0];
    if (!uploaded) return;

    const fileObj = {
      fileUrl: uploaded.url,
      fileType: uploaded.url.includes(".pdf") ? "application/pdf" : "image/jpeg",
      uploadedAt: new Date().toISOString(),
    };

    setFile(fileObj);

    // Auto-suggest name if empty
    if (!documentName) {
      const cleanName = uploaded.filename
        .split(".")
        .slice(0, -1)
        .join(".")
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setDocumentName(cleanName);
    }
  }, [documentName]);

  const handleSubmit = () => {
    if (!file) {
      showToast("Please upload a file", "error");
      return;
    }
    if (!documentName.trim()) {
      showToast("Please enter a document name", "error");
      return;
    }

    onUpload({
      name: documentName.trim(),
      documentDetails: {
        fileUrl: file.fileUrl,
        fileType: file.fileType,
        uploadedAt: file.uploadedAt,
      },
    });

    // Reset & close
    setFile(null);
    setDocumentName("");
    onClose();
  };

  const handleClose = () => {
    setFile(null);
    setDocumentName("");
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Document"
      primaryButtonText="Upload"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit}
      onSecondaryButtonClick={handleClose}
      primaryButtonLoading={loading}
      size="md"
    >
      <div className="py-6 space-y-6">
        {/* Document Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Name <span className="text-red-500">*</span>
          </label>
          <TextInput
            placeholder="e.g. National ID, Passport, Birth Certificate, Insurance Card"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            This name will appear in the client's document list
          </p>
        </div>

        {/* File Upload Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            File <span className="text-red-500">*</span>
          </label>
          <FileUploadArea
            onUploadComplete={handleFileUpload}
            initialFiles={
              file
                ? [
                    {
                      filename: documentName || "Document",
                      url: file.fileUrl,
                    },
                  ]
                : []
            }
            maxFiles={1}
            maxSizeMB={10}
            hint="PDF, JPG, PNG — Max 10MB"
          />
        </div>
      </div>
    </ReusableModal>
  );
};

export default UploadDocumentModal;
import React, { useState } from "react";
import ReusableModal from "../../ReusableModal";
import { FiFileText } from "react-icons/fi";
import { CiFolderOn } from "react-icons/ci";
import "./CreateAReportDocumentModal.css";
import BuildDocumentModal from "./BuildDocumentModal/BuildDocumentModal";
import TemplateLibraryModal from "./TemplateLibraryModal/TemplateLibraryModal";

const CreateAReportDocumentModal = ({ isOpen, onClose, onStartCreating, clientData }) => {
  const [selectedOption, setSelectedOption] = useState("fresh");
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const handleNext = () => {
    if (selectedOption === "fresh") {
      setShowBuildModal(true);
    } else {
      setShowTemplateModal(true);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setShowTemplateModal(false);
    setShowBuildModal(true);
  };

  const handleBuildModalClose = () => {
    setShowBuildModal(false);
    setSelectedTemplate(null);
  };

  const handleTemplateModalClose = () => {
    setShowTemplateModal(false);
  };

  const handleMainClose = () => {
    setSelectedOption("fresh");
    onClose();
  };

  const handleBuildModalComplete = (data) => {
    handleBuildModalClose();
    if (onStartCreating) {
      onStartCreating(data);
    }
    handleMainClose();
  };

  return (
    <>
      <ReusableModal
        isOpen={isOpen && !showBuildModal && !showTemplateModal}
        onClose={handleMainClose}
        title="Create a document"
        primaryButtonText="Next"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleNext}
        onSecondaryButtonClick={handleMainClose}
        primaryButtonLoading={false}
        size="lg"
      >
        <div className="create-document-content">
          <div className="document-options">
            <button
              className={`document-option-card ${
                selectedOption === "fresh" ? "option-selected" : ""
              }`}
              onClick={() => setSelectedOption("fresh")}
            >
              <div className="option-icon">
                <FiFileText size={24} />
              </div>
              <span className="option-label">Start a fresh document</span>
              {selectedOption === "fresh" && (
                <div className="option-check-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle
                      cx="8"
                      cy="8"
                      r="7"
                      fill="#0066CC"
                      stroke="#0066CC"
                      strokeWidth="2"
                    />
                    <path
                      d="M5 8L7 10L11 6"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </button>

            <button
              className={`document-option-card ${
                selectedOption === "template" ? "option-selected" : ""
              }`}
              onClick={() => setSelectedOption("template")}
            >
              <div className="option-icon">
                <CiFolderOn size={24} />
              </div>
              <span className="option-label">Select from Template Library</span>
              {selectedOption === "template" && (
                <div className="option-check-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle
                      cx="8"
                      cy="8"
                      r="7"
                      fill="#0066CC"
                      stroke="#0066CC"
                      strokeWidth="2"
                    />
                    <path
                      d="M5 8L7 10L11 6"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </button>
          </div>
        </div>
      </ReusableModal>

      <BuildDocumentModal
        isOpen={showBuildModal}
        onClose={handleBuildModalClose}
        templateData={selectedTemplate}
        onStartCreating={handleBuildModalComplete}
        clientData={clientData}
      />

      <TemplateLibraryModal
        isOpen={showTemplateModal}
        onClose={handleTemplateModalClose}
        onSelectTemplate={handleTemplateSelect}
      />
    </>
  );
};

export default CreateAReportDocumentModal;
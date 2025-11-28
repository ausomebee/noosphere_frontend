// src/components/ReusableModal/ClientModal/FormLibraryModal.jsx

import React, { useState, useEffect } from "react";
import ReusableModal from "../ReusableModal";
import { TextInput } from "../../Input/Inputs";
import { showToast } from "../../../Helper/ShowToast";
import Pagination from "../../Table/Pagination";

const ITEMS_PER_PAGE = 8;

const FormLibraryModal = ({
  isOpen,
  onClose,
  onSelectForm, // (formId, formName) => {}
  forms = [], // real data from parent or API
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page & search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setCurrentPage(1);
    }
  }, [isOpen]);

  // Filter forms by search
  const filteredForms = forms.filter((form) =>
    form.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredForms.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentForms = filteredForms.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleUseForm = (form) => {
    onSelectForm(form.id, form.name);
    showToast(`"${form.name}" imported successfully`, "success");
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Import from Form Library"
      secondaryButtonText="Cancel"
      onSecondaryButtonClick={onClose}
      hidePrimaryButton={true}
      size="lg"
    >
      <div className="py-4 space-y-6">
        {/* Search Input — using your TextInput */}
        <TextInput
          label="Search forms"
          placeholder="Type to search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading forms...</p>
          </div>
        ) : currentForms.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm ? "No forms match your search" : "No forms in library"}
            </p>
          </div>
        ) : (
          <>
            {/* Forms List */}
            <div className="space-y-3">
              {currentForms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between p-5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all group border border-gray-200"
                >
                  <div>
                    <h4 className="font-semibold text-gray-900 text-base">
                      {form.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">ID: {form.id}</p>
                  </div>
                  <button
                    onClick={() => handleUseForm(form)}
                    className="px-6 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    Use Form
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}

            {/* Footer Counter */}
            <div className="text-center text-xs text-gray-500 mt-4">
              Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredForms.length)} of{" "}
              {filteredForms.length} form{filteredForms.length !== 1 ? "s" : ""}
            </div>
          </>
        )}
      </div>
    </ReusableModal>
  );
};

export default FormLibraryModal;
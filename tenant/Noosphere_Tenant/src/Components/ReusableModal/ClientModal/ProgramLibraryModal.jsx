// src/components/ReusableModal/ClientModal/ProgramLibraryModal.jsx

import React, { useState, useEffect } from "react";
import ReusableModal from "../ReusableModal";
import { TextInput } from "../../Input/Inputs";
import { showToast } from "../../../Helper/ShowToast";
import Pagination from "../../Table/Pagination";
import Button from "../../Button/Button";

const ITEMS_PER_PAGE = 8;

const mockPrograms = [
  { id: "prog_001", name: "Early Intervention ABA Program" },
  { id: "prog_002", name: "Speech & Language Therapy Plan" },
  { id: "prog_003", name: "Occupational Therapy - Sensory Integration" },
  { id: "prog_004", name: "Social Skills Group Program" },
  { id: "prog_005", name: "Toilet Training Protocol" },
  { id: "prog_006", name: "Feeding Therapy Program" },
  { id: "prog_007", name: "Behavior Reduction Plan - Aggression" },
  { id: "prog_008", name: "Daily Living Skills Training" },
];

const ProgramLibraryModal = ({
  isOpen,
  onClose,
  onSelectProgram, // (programId, programName) => {}
  programs = mockPrograms,
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setCurrentPage(1);
    }
  }, [isOpen]);

  const filtered = programs.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const currentItems = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSelect = (program) => {
    onSelectProgram(program.id, program.name);
    showToast(`"${program.name}" imported`, "success");
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Import from Program Library"
      secondaryButtonText="Cancel"
      onSecondaryButtonClick={onClose}
      hidePrimaryButton={true}
      size="lg"
    >
      <div className="py-4 space-y-6">
        <div className="justify-center flex">
          <TextInput
            label="Search programs"
            width={400}
            placeholder="Type to search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Loading programs...
          </div>
        ) : currentItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? "No programs found" : "No programs in library"}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {currentItems.map((program) => (
                <div
                  key={program.id}
                  className="flex items-center justify-between p-5 bg-gray-50 hover:bg-gray-100 rounded-md transition-all group border border-gray-200"
                >
                  <div>
                    <h4 className="font-semibold text-gray-900 text-base">
                      {program.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {program.description}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    label="Use Program"
                    onClick={() => handleSelect(program)}
                  />
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}

            <div className="text-center text-xs text-gray-500 mt-4">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of{" "}
              {filtered.length} program{filtered.length !== 1 ? "s" : ""}
            </div>
          </>
        )}
      </div>
    </ReusableModal>
  );
};

export default ProgramLibraryModal;

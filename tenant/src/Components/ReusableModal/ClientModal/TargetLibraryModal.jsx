// src/components/ReusableModal/ClientModal/TargetLibraryModal.jsx

import React, { useState, useEffect } from "react";
import ReusableModal from "../ReusableModal";
import { TextInput } from "../../Input/Inputs";

import { showToast } from "../../../Helper/ShowToast";
import Pagination from "../../Table/Pagination";
import Button from "../../Button/Button";

const ITEMS_PER_PAGE = 8;

const mockTargets = [
  { id: "tgt_001", name: "Mand Training - 50 independent mands" },
  { id: "tgt_002", name: "Tact 100 nouns across 5 categories" },
  { id: "tgt_003", name: "Intraverbal - Fill-ins (50 responses)" },
  { id: "tgt_004", name: "Listener Responding - Follow 2-step directions" },
  { id: "tgt_005", name: "Imitation - 20 motor actions with objects" },
  { id: "tgt_006", name: "Toilet Training - Independent initiation" },
  { id: "tgt_007", name: "Reduce Aggression to <1 per week" },
  { id: "tgt_008", name: "Handwashing - Full sequence independently" },
  { id: "tgt_009", name: "Greeting Peers - 80% opportunities" },
  { id: "tgt_010", name: "Waiting - 5 minutes with 1 prompt" },
];

const TargetLibraryModal = ({
  isOpen,
  onClose,
  onSelectTarget, // (targetId, targetName) => {}
  targets = mockTargets,
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

  const filtered = targets.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const currentItems = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSelect = (target) => {
    onSelectTarget(target.id, target.name);
    showToast(`"${target.name}" imported`, "success");
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Import from Target Library"
      secondaryButtonText="Cancel"
      onSecondaryButtonClick={onClose}
      hidePrimaryButton={true}
      size="lg"
    >
      <div className="py-4 space-y-6">
        <div className="justify-center flex">
          <TextInput
            label="Search targets"
            placeholder="Type to search..."
            width={400}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Loading targets...
          </div>
        ) : currentItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? "No targets found" : "No targets in library"}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {currentItems.map((target) => (
                <div
                  key={target.id}
                  className="flex items-center justify-between p-5 bg-gray-50 hover:bg-gray-100 rounded-md transition-all group border border-gray-200 mb-4"
                >
                  <div>
                    <h4 className="font-semibold text-gray-900 text-base">
                      {target.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {target.description || "No description available."}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    label="Use Target"
                    onClick={() => handleSelect(target)}
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
              {filtered.length} target{filtered.length !== 1 ? "s" : ""}
            </div>
          </>
        )}
      </div>
    </ReusableModal>
  );
};

export default TargetLibraryModal;

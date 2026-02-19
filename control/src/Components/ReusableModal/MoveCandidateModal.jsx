import React, { useState } from "react";
import ReusableModal from "./ReusableModal";
import { SelectInput } from "../Input/Inputs";
import { showToast } from "../../Helper/ShowToast";
import { updatePipelineItemActivity } from "../../ReduxStore/features/PipelineSlice";


const MoveCandidateModal = ({
  isOpen,
  onClose,
  onSave,
  columns,
  currentColumnId,
  taskIds,
  accessToken,
  refreshToken,
  dispatch,
}) => {
  const [targetColumnId, setTargetColumnId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const currentColumn = Array.isArray(columns)
    ? columns.find((col) => col.id === currentColumnId)
    : null;

  const columnOptions = Array.isArray(columns)
    ? columns
        .filter((col) => col.id !== currentColumnId)
        .map((col) => ({
          value: col.id,
          label: col.title,
        }))
    : [];

  const handleSave = async () => {
    if (!targetColumnId) return;

    setIsLoading(true);
    try {
      const response = await dispatch(
        updatePipelineItemActivity({
          ids: taskIds,
          pipelineStageId: targetColumnId,
          accessToken,
          refreshToken,
        })
      ).unwrap();


      if (response.data.status === "ok") {
        onSave(targetColumnId);
        showToast(
          `Moved ${taskIds.length} candidate(s) successfully!`,
          "success"
        );
      } else {
        throw new Error(response.message || "Failed to move candidates");
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Move candidate(s) failed:", error);
      showToast(
        error?.message || "Failed to move candidate(s).",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        setTargetColumnId("");
        onClose();
      }}
      title={`Move ${taskIds?.length || 1} Candidate(s)`}
      primaryButtonText={isLoading ? "Moving..." : "Save"}
      secondaryButtonText="Cancel"
      primaryButtonColor="#000000"
      secondaryButtonColor="#ffffff"
      onPrimaryButtonClick={handleSave}
      onSecondaryButtonClick={() => {
        setTargetColumnId("");
        onClose();
      }}
      isPrimaryButtonDisabled={isLoading || !targetColumnId}
    >
      <div className="modal-content-wrapper">
        <SelectInput
          label="Move from"
          value={currentColumnId}
          options={[
            { value: currentColumnId, label: currentColumn?.title || "Unknown" },
          ]}
          disabled
        />
        <SelectInput
          label="Move to"
          value={targetColumnId}
          onChange={(e) => setTargetColumnId(e.target.value)}
          options={[{ value: "", label: "Select a column" }, ...columnOptions]}
        />
      </div>
    </ReusableModal>
  );
};

export default MoveCandidateModal;
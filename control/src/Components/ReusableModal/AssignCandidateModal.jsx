import React, { useState, useEffect, useMemo } from "react";
import ReusableModal from "./ReusableModal";
import { SelectInput } from "../Input/Inputs";

const AssignCandidateModal = ({
  isOpen,
  onClose,
  onSave,
  taskIds,
  tasks,
  staffList = [],
}) => {
  const [selectedStaff, setSelectedStaff] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Determine common staff for selected tasks
  const commonStaff = useMemo(() => {
    if (!taskIds?.length || !tasks) return null;
    const staffIds = taskIds
      .map((taskId) => {
        const staff = tasks[taskId]?.staff;
        // Handle both string staffId and object { staffId, name }
        return typeof staff === "object" && staff !== null ? staff.staffId : staff;
      })
      .filter((staff) => staff);
    const uniqueStaff = [...new Set(staffIds)];
    return uniqueStaff.length === 1 ? uniqueStaff[0] : null;
  }, [taskIds, tasks]);

  useEffect(() => {
    if (isOpen) {
      setSelectedStaff(commonStaff || "");
    }
  }, [isOpen, commonStaff]);

  // Prepare staff options
  const staffOptions = useMemo(() => {
    const options = [{ value: "", label: "Select" }];
    if (Array.isArray(staffList) && staffList.length > 0) {
      options.push(
        ...staffList
          .filter((staff) => staff.active !== false)
          .map((staff) => ({
            value: staff.staffId,
            label: staff.name,
          }))
      );
    }
    return options;
  }, [staffList]);

  // Current staff label
  const currentStaffLabel =
    commonStaff && staffList.length > 0
      ? staffList.find((s) => s.staffId === commonStaff)?.name || "Unknown Staff"
      : taskIds?.length > 1
      ? "Multiple Staff"
      : "Unassigned";

  const handleSave = async () => {
    if (!selectedStaff && taskIds?.length > 1) {
      // Allow unassigning single task, but not multiple for UX clarity
      return;
    }
    setIsLoading(true);
    try {
      // Pass the selected staffId to onSave
      await onSave(selectedStaff);
      setSelectedStaff("");
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to assign staff:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedStaff("");
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Reassign ${taskIds?.length || 1} Candidate(s) to Staff`}
      primaryButtonText={isLoading ? "Saving..." : "Save"}
      secondaryButtonText="Cancel"
      primaryButtonColor="#000000"
      secondaryButtonColor="#ffffff"
      onPrimaryButtonClick={handleSave}
      onSecondaryButtonClick={handleClose}
      primaryButtonDisabled={isLoading || (!selectedStaff && taskIds?.length > 1)}
      primaryButtonLoading={isLoading}
    >
      <div className="modal-content-wrapper">
        <SelectInput
          label="Currently Assigned"
          value={commonStaff || ""}
          options={[
            {
              value: commonStaff || "",
              label: currentStaffLabel,
            },
          ]}
          disabled
        />
        <SelectInput
          label="Assign to"
          value={selectedStaff}
          onChange={(e) => setSelectedStaff(e.target.value)}
          options={staffOptions}
          emptyHint="No staff found. Create one in Settings → Staff."
        />
      </div>
    </ReusableModal>
  );
};

export default AssignCandidateModal;
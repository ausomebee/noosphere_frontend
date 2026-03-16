// src/Components/ReusableModal/StartAppointmentModal/TravelTimeModal.jsx
import React, { useState } from "react";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";
import { TextInput } from "../../Input/Inputs";

const TravelTimeModal = ({ isOpen, onClose, onSave, loading = false }) => {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const handleSave = () => {
    if (!start || !end) {
      alert("Please select both start and end time");
      return;
    }

    // Send plain time strings in HH:mm format
    onSave({ start, end });
    onClose(); // Close modal after save
  };

  const handleClose = () => {
    setStart("");
    setEnd("");
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Log Travel Time"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSave}
      onSecondaryButtonClick={handleClose}
      primaryButtonLoading={loading}
      size="lg"
    >
      <div className=" grid grid-cols-2 gap-4">
        <TextInput
          label="Travel Start Time"
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          required
        />

        <TextInput
          label="Travel End Time"
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          required
        />
      </div>

      
    </ReusableModal>
  );
};

export default TravelTimeModal;
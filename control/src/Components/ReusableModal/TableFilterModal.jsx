import React, { useState, useEffect } from "react";
import ReusableModal from "./ReusableModal";
import { SelectInput } from "../Input/Inputs";

const TableFilterModal = ({ isOpen, onClose, onApply, title, label, options }) => {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (isOpen) setValue("");
  }, [isOpen]);

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      primaryButtonText="Apply filter"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={() => { onApply(value); onClose(); }}
      onSecondaryButtonClick={onClose}
    >
      <SelectInput
        label={label}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        options={options}
      />
    </ReusableModal>
  );
};

export default TableFilterModal;

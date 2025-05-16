import React, { useState } from "react";
import ReusableModal from "./ReusableModal";
import { TextInput, TextareaInput } from "../Input/Inputs";
import "./ReusableModal.css";
import Button from "../Button/Button";

const NewPipelineColumnModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [columnName, setColumnName] = useState("");
  const [description, setDescription] = useState("");

  const tabs = [
    {
      name: "Basic Setup",
      content: (
        <div>
          <TextInput
            label="Column name"
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)}
            placeholder="Type something"
          />
          <TextareaInput
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter a description..."
          />
        </div>
      ),
    },
    {
      name: "Required Tasks",
      content: <p>Content for Required Tasks tab...</p>,
    },
    {
      name: "Required Documents",
      content: <p>Content for Required Documents tab...</p>,
    },
  ];

  return (
    <>
      <Button
        label="Open New Pipeline Modal"
        variant="primary"
        onClick={() => setIsOpen(true)}
      />
      <ReusableModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="New pipeline column"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        primaryButtonColor="#000000"
        secondaryButtonColor="#ffffff"
        tabs={tabs}
        onPrimaryButtonClick={() => {
          console.log("Saving pipeline column...", { columnName, description });
          setIsOpen(false);
        }}
      />
    </>
  );
};

export default NewPipelineColumnModal;

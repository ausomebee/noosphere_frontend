import React, { useState } from "react";
import { FaPlus, FaRegFileAlt } from "react-icons/fa";
import Button from "../Button/Button";
import NewPipelineColumnModal from "../ReusableModal/NewPipelineColumnModal";

const EmptyState = ({ onAddFirstStage }) => {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <div className="empty-state">
      <div className="empty-state-content">
        <div className="icon-container">
          <FaRegFileAlt className="document-icon" />
        </div>
        <h2>Setup your onboarding pipeline</h2>
        <p>
          Set up custom stages to match your organization's unique onboarding
          flow.
        </p>

        <div>
         
          <Button
            label="Add a first stage"
            // icon={<FaPlus />}
            variant="primary"
            onClick={() => setShowDialog(true)}
            iconPosition="left"
            width="200px"
          />
        </div>
      </div>

      <NewPipelineColumnModal
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onSave={onAddFirstStage}
      />
    </div>
  );
};

export default EmptyState;

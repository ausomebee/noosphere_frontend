import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import ReusableModal from "../ReusableModal";
import { TextInput, TextareaInput } from "../../Input/Inputs";
import ColorPicker from "../../ColorPicker";
import { showToast } from "../../../Helper/ShowToast";
import {
  updateDraft,
  resetDraft,
} from "../../../ReduxStore/features/PipelineSlice";

const NewPipelineColumnModal = ({ isOpen, onClose, onSave, loading = false }) => {
  const dispatch = useDispatch();
  const { draft } = useSelector((state) => state.pipeline);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!draft.name?.trim()) newErrors.name = "Column name is required.";
    if (!draft.description?.trim()) newErrors.description = "Description is required.";
    if (!draft.colorCode || !/^#[0-9A-Fa-f]{6}$/.test(draft.colorCode)) {
      newErrors.colorCode = "A valid color code (e.g., #RRGGBB) is required.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenColorPicker = (e) => {
    e.preventDefault();        // prevents any form submit
    e.stopPropagation();       // stops the click from bubbling to modal
    setShowColorPicker(true);
  };

  const handleCloseColorPicker = () => setShowColorPicker(false);

  const handleSave = () => {
    if (!validateForm()) {
      showToast("Please fix the errors before saving.", "error");
      return;
    }

    onSave({
      name: draft.name.trim(),
      description: draft.description.trim(),
      colorCode: draft.colorCode,
    });

    handleCloseModal();
  };

  const handleCloseModal = () => {
    dispatch(resetDraft());
    setErrors({});
    setShowColorPicker(false);
    onClose();
  };

  // This stops clicks inside the color picker from closing the modal or triggering Save
  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleCloseModal}
      title="New pipeline column"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSave}
      onSecondaryButtonClick={handleCloseModal}
      primaryButtonLoading={loading}
      closeOnOverlayClick={!showColorPicker}   // important: don't close modal while picker is open
    >
      <div className="modal-content-wrapper">
        <TextInput
          label="Column name"
          id="columnName"
          value={draft.name || ""}
          onChange={(e) => dispatch(updateDraft({ name: e.target.value }))}
          placeholder="Type something"
          error={errors.name}
        />

        <TextareaInput
          label="Description"
          id="description"
          value={draft.description || ""}
          onChange={(e) => dispatch(updateDraft({ description: e.target.value }))}
          placeholder="Enter a description..."
          error={errors.description}
        />

        <div className="color-picker-container">
          <div
            className="color-picker-row"
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: "20px",
              marginBottom: "10px",
            }}
          >
            <label style={{ marginRight: "10px" }}>Colour code</label>
            <div
              className="color-preview"
              style={{
                backgroundColor: draft.colorCode || "#000000",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                display: "inline-block",
              }}
            ></div>
            <button
              type="button"                     // THIS IS THE KEY FIX
              className="change-button"
              onClick={handleOpenColorPicker}
              style={{
                marginLeft: "auto",
                color: "#0000EE",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Change
            </button>
          </div>

          {errors.colorCode && (
            <div
              className="auth-error-message"
              style={{ color: "red", fontSize: "12px", marginTop: "4px" }}
            >
              {errors.colorCode}
            </div>
          )}
        </div>

        {/* ColorPicker with click trap */}
        {showColorPicker && (
          <div onClick={stopPropagation}>   {/* prevents modal from reacting */}
            <ColorPicker
              color={draft.colorCode || "#000000"}
              onChange={(color) => dispatch(updateDraft({ colorCode: color }))}
              onClose={handleCloseColorPicker}
            />
          </div>
        )}
      </div>
    </ReusableModal>
  );
};

export default NewPipelineColumnModal;
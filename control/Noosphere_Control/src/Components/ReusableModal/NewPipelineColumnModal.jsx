import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AiOutlineDelete } from "react-icons/ai";
import ReusableModal from "./ReusableModal";
import { TextInput, TextareaInput, SwitchInput } from "../Input/Inputs";
import Button from "../Button/Button";
import ColorPicker from "../ColorPicker";
import CustomDocumentModal from "./CustomDocumentModal";
import CustomTaskModal from "./CustomTaskModal";
import { showToast } from "../../Helper/ShowToast";
import {
  updateDraft,
  addTaskToDraft,
  removeTaskFromDraft,
  toggleTaskRequiredInDraft,
  addDocumentToDraft,
  removeDocumentFromDraft,
  toggleDocumentRequiredInDraft,
  resetDraft,
} from "../../ReduxStore/features/PipelineSlice";

const NewPipelineColumnModal = ({ isOpen, onClose, onSave }) => {
  const dispatch = useDispatch();
  const { draft } = useSelector((state) => state.pipeline);
  const [activeTab, setActiveTab] = useState("Basic Setup");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [errors, setErrors] = useState({});

  // Log activeTab and draft changes for debugging
  useEffect(() => {}, [activeTab, draft, errors]);

  // Validate form inputs for the current tab
  const validateForm = (tabName) => {
    const newErrors = {};
    if (tabName === "Basic Setup") {
      if (!draft.name?.trim()) {
        newErrors.name = "Column name is required.";
      }
      if (!draft.description?.trim()) {
        newErrors.description = "Description is required.";
      }
      if (!draft.colorCode || !/^#[0-9A-Fa-f]{6}$/.test(draft.colorCode)) {
        newErrors.colorCode = "A valid color code (e.g., #RRGGBB) is required.";
      }
    }
    // No validation for Tasks or Documents tabs, as they are optional
    console.log("Validation errors for tab", tabName, ":", newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenColorPicker = () => {
    setShowColorPicker(true);
  };

  const handleCloseColorPicker = () => {
    setShowColorPicker(false);
  };

  const handleAddTask = (newTask) => {
    dispatch(addTaskToDraft(newTask));
    setShowTaskModal(false);
  };

  const handleAddDocument = (newDocument) => {
    dispatch(addDocumentToDraft(newDocument));
    setShowDocumentModal(false);
  };

  const handleDeleteTask = (taskId) => {
    dispatch(removeTaskFromDraft(taskId));
  };

  const handleDeleteDocument = (docId) => {
    dispatch(removeDocumentFromDraft(docId));
  };

  const handleSave = () => {
    if (!validateForm(activeTab)) {
      showToast("Please fix the errors before saving.", "error");
      console.log("Save blocked due to validation errors:", errors);
      return;
    }

    const pipelineData = {
      name: draft.name,
      description: draft.description,
      colorCode: draft.colorCode,
      requiredTasks: draft.requiredTasks,
      requiredDocuments: draft.requiredDocuments,
    };
    console.log("Saving pipeline data:", pipelineData);
    dispatch(resetDraft());
    onSave(pipelineData);
    handleClose(); // Close modal and reset state
  };

  const handleClose = () => {
    console.log("Closing modal, resetting state");
    dispatch(resetDraft());
    setActiveTab("Basic Setup");
    setErrors({});
    setShowColorPicker(false);
    setShowDocumentModal(false);
    setShowTaskModal(false);
    onClose();
  };

  const handleNextClick = () => {
    console.log("Next button clicked, current tab:", activeTab);
    // Validate current tab
    if (!validateForm(activeTab)) {
      showToast("Please fill in all required fields.", "error");
      console.log("Validation failed, errors:", errors);
      return;
    }

    const currentIndex = tabs.findIndex((tab) => tab.name === activeTab);
    if (currentIndex < tabs.length - 1) {
      const nextTab = tabs[currentIndex + 1].name;
      setActiveTab(nextTab);
      console.log("Moving to tab:", nextTab);
    } else {
      console.log("On last tab, triggering save");
      handleSave();
    }
  };

  const handlePreviousClick = () => {
    console.log("Previous button clicked, current tab:", activeTab);
    const currentIndex = tabs.findIndex((tab) => tab.name === activeTab);
    if (currentIndex > 0) {
      const prevTab = tabs[currentIndex - 1].name;
      setActiveTab(prevTab);
      console.log("Moving to previous tab:", prevTab);
      setErrors({}); // Clear errors when moving back
    }
  };

  const tabs = [
    {
      name: "Basic Setup",
      content: (
        <div className="modal-content-wrapper">
          <TextInput
            label="Column name"
            id="columnName"
            value={draft.name || ""}
            onChange={(e) => dispatch(updateDraft({ name: e.target.value }))}
            placeholder="Type something"
            error={errors.name}
          />
          {errors.name && (
            <div
              className="error-message"
              style={{ color: "red", fontSize: "12px", marginTop: "4px" }}
            >
              {errors.name}
            </div>
          )}
          <TextareaInput
            label="Description"
            id="description"
            value={draft.description || ""}
            onChange={(e) =>
              dispatch(updateDraft({ description: e.target.value }))
            }
            placeholder="Enter a description..."
            error={errors.description}
          />
          {errors.description && (
            <div
              className="error-message"
              style={{ color: "red", fontSize: "12px", marginTop: "4px" }}
            >
              {errors.description}
            </div>
          )}
          <div className="color-picker-container">
            <div
              className="color-picker-row"
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: "20px",
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
                className="error-message"
                style={{ color: "red", fontSize: "12px", marginTop: "4px" }}
              >
                {errors.colorCode}
              </div>
            )}
          </div>
          {showColorPicker && (
            <ColorPicker
              color={draft.colorCode || "#000000"}
              onChange={(color) => dispatch(updateDraft({ colorCode: color }))}
              onClose={handleCloseColorPicker}
            />
          )}
        </div>
      ),
    },
    {
      name: "Required Tasks",
      content: (
        <div className="modal-content-wrapper">
          <div
            className="tasks-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <span className="tasks-title">Tasks</span>
            <span className="required-title">Required</span>
          </div>
          <div className="tasks-list">
            {draft.requiredTasks.length > 0 ? (
              draft.requiredTasks.map((task) => (
                <div
                  key={task.id}
                  className="task-item"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    className="task-name-container"
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    <span>{task.name}</span>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteTask(task.id)}
                      style={{
                        marginLeft: "8px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "0",
                      }}
                    >
                      <AiOutlineDelete color="red" size={16} />
                    </button>
                  </div>
                  <div className="toggle-switch-container">
                    <SwitchInput
                      checked={task.required}
                      onChange={() =>
                        dispatch(toggleTaskRequiredInDraft(task.id))
                      }
                    />
                  </div>
                </div>
              ))
            ) : (
              <div
                className="no-items-message"
                style={{ textAlign: "center", margin: "20px 0" }}
              >
                No tasks added yet
              </div>
            )}
          </div>
          <div className="add-button-container" style={{ marginTop: "24px" }}>
            <Button
              label="Add a new task"
              variant="outline"
              iconPosition="left"
              onClick={() => setShowTaskModal(true)}
              width="auto"
            />
          </div>
          <CustomTaskModal
            isOpen={showTaskModal}
            onClose={() => setShowTaskModal(false)}
            onSave={handleAddTask}
          />
        </div>
      ),
    },
    {
      name: "Required Documents",
      content: (
        <div className="modal-content-wrapper">
          <div
            className="documents-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <span className="documents-title">Documents</span>
            <span className="required-title">Required</span>
          </div>
          <div className="documents-list">
            {draft.requiredDocuments.length > 0 ? (
              draft.requiredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="document-item"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    className="document-name-container"
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    <span>{doc.name}</span>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteDocument(doc.id)}
                      style={{
                        marginLeft: "8px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "0",
                      }}
                    >
                      <AiOutlineDelete color="red" size={16} />
                    </button>
                  </div>
                  <div className="toggle-switch-container">
                    <SwitchInput
                      checked={doc.required}
                      onChange={() =>
                        dispatch(toggleDocumentRequiredInDraft(doc.id))
                      }
                    />
                  </div>
                </div>
              ))
            ) : (
              <div
                className="no-items-message"
                style={{ textAlign: "center", margin: "20px 0" }}
              >
                No documents added yet
              </div>
            )}
          </div>
          <div className="add-button-container" style={{ marginTop: "24px" }}>
            <Button
              label="Request a new document"
              variant="outline"
              iconPosition="left"
              onClick={() => setShowDocumentModal(true)}
              width="auto"
            />
          </div>
          <CustomDocumentModal
            isOpen={showDocumentModal}
            onClose={() => setShowDocumentModal(false)}
            onSave={handleAddDocument}
          />
        </div>
      ),
    },
  ];

  return (
    isOpen && (
      <ReusableModal
        isOpen={isOpen}
        onClose={handleClose}
        title="New pipeline column"
        primaryButtonText={
          activeTab === tabs[tabs.length - 1].name ? "Save" : "Next"
        }
        secondaryButtonText={activeTab === tabs[0].name ? "Cancel" : "Previous"}
        primaryButtonColor="#000000"
        secondaryButtonColor="#ffffff"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onPrimaryButtonClick={handleNextClick}
        onSecondaryButtonClick={
          activeTab === tabs[0].name ? handleClose : handlePreviousClick
        }
      />
    )
  );
};

export default NewPipelineColumnModal;

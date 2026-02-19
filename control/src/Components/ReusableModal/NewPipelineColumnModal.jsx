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
      return;
    }

    const pipelineData = {
      name: draft.name,
      description: draft.description,
      colorCode: draft.colorCode,
      requiredTasks: draft.requiredTasks,
      requiredDocuments: draft.requiredDocuments,
    };
    dispatch(resetDraft());
    onSave(pipelineData);
    handleClose(); // Close modal and reset state
  };

  const handleClose = () => {
    dispatch(resetDraft());
    setActiveTab("Basic Setup");
    setErrors({});
    setShowColorPicker(false);
    setShowDocumentModal(false);
    setShowTaskModal(false);
    onClose();
  };

  const handleNextClick = () => {
    // Validate current tab
    if (!validateForm(activeTab)) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    const currentIndex = tabs.findIndex((tab) => tab.name === activeTab);
    if (currentIndex < tabs.length - 1) {
      const nextTab = tabs[currentIndex + 1].name;
      setActiveTab(nextTab);
    } else {
      handleSave();
    }
  };

  const handlePreviousClick = () => {
    const currentIndex = tabs.findIndex((tab) => tab.name === activeTab);
    if (currentIndex > 0) {
      const prevTab = tabs[currentIndex - 1].name;
      setActiveTab(prevTab);
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
              className="error-message text-xs mt-1"
              style={{ color: "red" }}
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
              className="error-message text-xs mt-1"
              style={{ color: "red" }}
            >
              {errors.description}
            </div>
          )}
          <div className="color-picker-container">
            <div
              className="color-picker-row flex items-center"
              style={{ marginTop: "20px" }}
            >
              <label style={{ marginRight: "10px" }}>Colour code</label>
              <div
                className="color-preview inline-block rounded-full"
                style={{
                  backgroundColor: draft.colorCode || "#000000",
                  width: "24px",
                  height: "24px",
                }}
              ></div>
              <button
                className="change-button ml-auto border-0 cursor-pointer"
                onClick={handleOpenColorPicker}
                style={{
                  color: "#0000EE",
                  background: "none",
                }}
              >
                Change
              </button>
            </div>
            {errors.colorCode && (
              <div
                className="error-message text-xs mt-1"
                style={{ color: "red" }}
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
            className="tasks-header flex justify-between mb-4"
          >
            <span className="tasks-title">Tasks</span>
            <span className="required-title">Required</span>
          </div>
          <div className="tasks-list">
            {draft.requiredTasks.length > 0 ? (
              draft.requiredTasks.map((task) => (
                <div
                  key={task.id}
                  className="task-item flex justify-between items-center mb-4"
                >
                  <div
                    className="task-name-container flex items-center"
                  >
                    <span>{task.name}</span>
                    <button
                      className="delete-btn ml-2 border-0 cursor-pointer p-0"
                      onClick={() => handleDeleteTask(task.id)}
                      style={{ background: "none" }}
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
                className="no-items-message text-center"
                style={{ margin: "20px 0" }}
              >
                No tasks added yet
              </div>
            )}
          </div>
          <div className="add-button-container mt-6">
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
            className="documents-header flex justify-between mb-4"
          >
            <span className="documents-title">Documents</span>
            <span className="required-title">Required</span>
          </div>
          <div className="documents-list">
            {draft.requiredDocuments.length > 0 ? (
              draft.requiredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="document-item flex justify-between items-center mb-4"
                >
                  <div
                    className="document-name-container flex items-center"
                  >
                    <span>{doc.name}</span>
                    <button
                      className="delete-btn ml-2 border-0 cursor-pointer p-0"
                      onClick={() => handleDeleteDocument(doc.id)}
                      style={{ background: "none" }}
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
                className="no-items-message text-center"
                style={{ margin: "20px 0" }}
              >
                No documents added yet
              </div>
            )}
          </div>
          <div className="add-button-container mt-6">
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

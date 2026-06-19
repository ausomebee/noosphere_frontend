import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FiChevronDown } from "react-icons/fi";
import { Menu } from "@headlessui/react";
import "./DragAndDrop.css";

const Task = ({
  task,
  id,
  onRemoveTask,
  onEditTask,
  onMoveTask,
  onAssignStaff,
  onViewCandidate,
  onEditCandidate,
  columnId,
  columns,
  selected,
  toggleSelection,
 
}) => {
  if (!task) {
    if (import.meta.env.DEV) console.warn(`Task with ID ${id} is undefined`);
    return null;
  }


  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: { type: "Task" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Safe handler for move task
  const handleMoveTask = () => {
    if (typeof onMoveTask === "function") {
      onMoveTask(id, columnId);
    } else {
      if (import.meta.env.DEV) console.warn("onMoveTask function is not available");
      // Optionally show a user-friendly message or implement fallback behavior
    }
  };

  // Safe handler for remove task
  const handleRemoveTask = () => {
    if (typeof onRemoveTask === "function") {
      onRemoveTask(id);
    } else {
      if (import.meta.env.DEV) console.warn("onRemoveTask function is not available");
    }
  };

  // Safe handler for view candidate
  const handleViewCandidate = () => {
    if (typeof onViewCandidate === "function") {
      onViewCandidate(task.clientId, task.tenantClientId);
    } else {
      if (import.meta.env.DEV) console.warn("onViewCandidate function is not available");
    }
  };


  return (
    <div
      ref={setNodeRef}
      style={{ ...style, cursor: "pointer" }}
      className={`task ${isDragging ? "dragging" : ""} ${
        selected ? "selected" : ""
      }`}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          toggleSelection && toggleSelection();
          return;
        }
        // Whole card opens the client profile (not just the chevron menu).
        handleViewCandidate();
      }}
    >
      <div className="task-content">
        <p>{task.fullName || "Unnamed Candidate"}</p>
        <span>{task.email || "No email"}</span>
      </div>
      <Menu
        as="div"
        className="dropdown-container"
        onClick={(e) => e.stopPropagation()}
      >
        <Menu.Button className="dropdown-icon">
          <FiChevronDown />
        </Menu.Button>
        <Menu.Items className="menu-items">
          <div>
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`menu-item ${active ? "menu-item-active" : ""}`}
                  onClick={handleViewCandidate}
                >
                  Edit client information
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`menu-item ${active ? "menu-item-active" : ""}`}
                  onClick={handleMoveTask}
                  disabled={!onMoveTask} // Disable if function not available
                >
                  Move candidate
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`menu-item-delete ${
                    active ? "menu-item-delete-active" : ""
                  }`}
                  onClick={handleRemoveTask}
                >
                  Delete candidate
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Menu>
    </div>
  );
};

export default Task;

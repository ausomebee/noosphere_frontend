import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FiChevronRight } from "react-icons/fi";
import "./DragAndDrop.css";

const Task = ({
  task,
  id,
  onViewCandidate,
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

  // Opens the client profile.
  const handleViewCandidate = () => {
    if (typeof onViewCandidate === "function") {
      onViewCandidate(task.clientId, task.tenantClientId);
    } else if (import.meta.env.DEV) {
      console.warn("onViewCandidate function is not available");
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
        // The whole card opens the client profile.
        handleViewCandidate();
      }}
    >
      <div className="task-content">
        <p>{task.fullName || "Unnamed Candidate"}</p>
        <span>{task.email || "No email"}</span>
      </div>
      <span className="task-open-indicator" aria-hidden="true">
        <FiChevronRight />
      </span>
    </div>
  );
};

export default Task;

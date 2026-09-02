import React, { useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FiChevronRight } from "react-icons/fi";
import usePermissions from "../../hooks/usePermissions";
import "./DragAndDrop.css";

const Task = ({
  task,
  id,
  onViewCandidate,
  selected,
  toggleSelection,
}) => {
  const { hasPermission } = usePermissions();
  const canMoveCandidate = hasPermission("manage_candidate_in_pipeline");

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
    disabled: !canMoveCandidate,
  });

  // Record where the pointer went down so onClick can tell a genuine click from
  // the trailing click that fires at the end of a drag. Capture phase is used so
  // it runs without overriding dnd-kit's own pointer listeners.
  const pointerDownPos = useRef(null);

  // Every hook above this line, without exception. `usePermissions` already ran
  // before this guard, so bailing out any earlier ends the render with fewer
  // hooks than the previous one and React throws "Rendered fewer hooks than
  // expected" -- taking the whole board down with it.
  if (!task) {
    if (import.meta.env.DEV) console.warn(`Task with ID ${id} is undefined`);
    return null;
  }

  // Only attach drag listeners when the user can actually persist a move.
  const dragListeners = canMoveCandidate ? listeners : undefined;

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
      {...dragListeners}
      onPointerDownCapture={(e) => {
        pointerDownPos.current = { x: e.clientX, y: e.clientY };
      }}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          toggleSelection && toggleSelection();
          return;
        }
        // If the pointer moved noticeably between down and up, this was a drag —
        // don't navigate to the profile.
        const start = pointerDownPos.current;
        if (
          start &&
          (Math.abs(e.clientX - start.x) > 6 ||
            Math.abs(e.clientY - start.y) > 6)
        ) {
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

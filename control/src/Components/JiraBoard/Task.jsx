import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiChevronRight } from 'react-icons/fi';
import './DragAndDrop.css';

const Task = React.memo(({
  task,
  id,
  onViewCandidate,
  columnId,
  selected,
  toggleSelection,
}) => {
  if (!task) {
    return null;
  }

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { type: 'Task' },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, cursor: 'pointer' }}
      className={`task ${isDragging ? 'dragging' : ''} ${selected ? 'selected' : ''}`}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          toggleSelection();
          return;
        }
        // The whole card opens the candidate profile.
        onViewCandidate(columnId, id);
      }}
    >
      <div className="task-content">
        <p>{task.company || 'Unnamed Candidate'}</p>
        <span>{task.progress} task done</span>
      </div>
      <span className="task-open-indicator" aria-hidden="true">
        <FiChevronRight />
      </span>
    </div>
  );
});

export default Task;

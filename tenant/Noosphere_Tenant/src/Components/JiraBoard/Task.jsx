import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiChevronDown } from 'react-icons/fi';
import { Menu } from '@headlessui/react';
import './DragAndDrop.css';

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
    console.warn(`Task with ID ${id} is undefined`);
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
      style={style}
      className={`task ${isDragging ? 'dragging' : ''} ${selected ? 'selected' : ''}`}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          toggleSelection();
        }
      }}
    >
      <div className="task-content">
        <p>{task.fullName || 'Unnamed Candidate'}</p>
        <span>{task.progress} task done</span>
      </div>
      <Menu as="div" className="dropdown-container">
        <Menu.Button className="dropdown-icon">
          <FiChevronDown />
        </Menu.Button>
        <Menu.Items className="menu-items">
          <div>
            
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`menu-item ${active ? 'menu-item-active' : ''}`}
                  onClick={() => onViewCandidate(columnId, id)} // Reordered args
                >
                  Edit client information
                </button>
              )}
            </Menu.Item>
            {/* <Menu.Item>
              {({ active }) => (
                <button
                  className={`menu-item ${active ? 'menu-item-active' : ''}`}
                  onClick={() => onAssignStaff(id)}
                >
                  Assign candidate to staff
                </button>
              )}
            </Menu.Item> */}
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`menu-item ${active ? 'menu-item-active' : ''}`}
                  onClick={() => onMoveTask(id, columnId)}
                >
                  Move candidate
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`menu-item-delete ${active ? 'menu-item-delete-active' : ''}`}
                  onClick={() => onRemoveTask(id)}
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
// src/Component/JiraBoard/Task.js
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiChevronDown } from 'react-icons/fi';
import { Menu } from '@headlessui/react';
import './DragAndDrop.css';

const Task = ({ task, id, onRemoveTask, onEditTask, onMoveTask, columnId, columns }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleEdit = () => {
    const newCompany = prompt('Enter new company name:', task.company);
    if (newCompany) {
      onEditTask(task.id, newCompany);
    }
  };

  const handleMove = () => {
    const targetColumn = prompt(
      'Enter the target column ID (' +
        columns.map((col) => `${col.title} (${col.id})`).join(', ') +
        '):',
      columnId
    );
    if (targetColumn && columns.some((col) => col.id === targetColumn)) {
      onMoveTask(task.id, targetColumn);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task ${isDragging ? 'dragging' : ''}`}
    >
      <div className="task-content" {...attributes} {...listeners}>
        <p>{task.company}</p>
        <span>{task.progress}</span>
      </div>
      <Menu as="div" className="dropdown-container">
        <Menu.Button
          className="dropdown-icon"
          onClick={(e) => {
            e.stopPropagation();
            console.log('Dropdown button clicked');
          }}
        >
          <FiChevronDown />
        </Menu.Button>
        <Menu.Items className="menu-items">
          <div className="py-0.25rem">
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`menu-item ${active ? 'menu-item-active' : ''}`}
                  onClick={handleMove}
                >
                  Move prospect
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`menu-item ${active ? 'menu-item-active' : ''}`}
                >
                  Assign prospect to staff
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`menu-item ${active ? 'menu-item-active' : ''}`}
                >
                  View prospect information
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`menu-item ${active ? 'menu-item-active' : ''}`}
                  onClick={handleEdit}
                >
                  Edit prospect
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`menu-item ${active ? 'menu-item-active' : ''}`}
                >
                  Contact prospect
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`menu-item ${active ? 'menu-item-active' : ''}`}
                  onClick={() => onRemoveTask(task.id)}
                >
                  Remove prospect
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
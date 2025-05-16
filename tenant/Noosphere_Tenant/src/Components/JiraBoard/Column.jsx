// src/Component/JiraBoard/Column.js
import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import Task from './Task';
import { FiPlusCircle, FiUserPlus } from 'react-icons/fi';
import { FaEllipsisV } from 'react-icons/fa';
import { Menu } from '@headlessui/react';
import './DragAndDrop.css';

const Column = ({ column, tasks, onAddTask, onRemoveTask, onEditTask, onMoveTask, columns }) => {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
    <div ref={setNodeRef} className="column">
      <div className="column-header">
        <h3>
          {column.title} <span className="task-count">{column.count}</span>
        </h3>
        <Menu as="div" className="dropdown-container">
          <Menu.Button className="dropdown-icon">
           <FaEllipsisV />
          </Menu.Button>
          <Menu.Items className="menu-items">
            <div className="py-0.25rem">
              <Menu.Item>
                {({ active }) => (
                  <button
                    className={`menu-item ${active ? 'menu-item-active' : ''}`}
                    onClick={() => onAddTask(column.id)}
                  >
                    <FiUserPlus className="menu-item-icon" /> Add new prospect
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    className={`menu-item ${active ? 'menu-item-active' : ''}`}
                  >
                    Edit column setting
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    className={`menu-item ${active ? 'menu-item-active' : ''}`}
                  >
                    Move column
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    className={`menu-item ${active ? 'menu-item-active' : ''}`}
                  >
                    Disable column
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Menu>
      </div>
      {tasks.length === 0 ? (
        <div className="empty-column">
          <button className="add-candidate">
            <FiPlusCircle /> Add a candidate
          </button>
        </div>
      ) : (
        <SortableContext items={column.taskIds} strategy={verticalListSortingStrategy}>
          <div className="task-list">
            {tasks.map((task) => (
              <Task
                key={task.id}
                task={task}
                id={task.id}
                onRemoveTask={onRemoveTask}
                onEditTask={onEditTask}
                onMoveTask={onMoveTask}
                columnId={column.id}
                columns={columns}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
};

export default Column;
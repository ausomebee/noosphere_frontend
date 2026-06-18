import React, { useState, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Task from "./Task";
import AddClientModal from "../ReusableModal/ClientModal/AddClientModal";
import { FiPlusCircle, FiUserPlus } from "react-icons/fi";
import { FaEllipsisV } from "react-icons/fa";
import { Menu } from "@headlessui/react";
import "./DragAndDrop.css";
import { useNavigate } from "react-router-dom";
import { getContrastTextColor } from "../../Helper/colorContrast";

const Column = ({
  column,
  tasks,
  onAddTask,
  onRemoveTask,
  onEditTask,
  onMoveTask,
  onAssignStaff,
  onViewCandidate,
  onEditCandidate,
  onDeleteColumn,
  columns,
  pipelineId,
  staffList = [],
  stages = [],
  onOpenAddClientModal, // New prop to handle opening the modal from parent
}) => {
  // Early return if column is invalid
  if (!column || !column.id) {
    if (import.meta.env.DEV) console.warn("Invalid column prop received:", column);
    return null;
  }


  // Safe access to column properties
  const columnId = column.id;
  const columnTitle = column.title || "Unnamed Column";
  const taskIds = Array.isArray(column.taskIds) ? column.taskIds : [];

  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const navigate = useNavigate();

  const { setNodeRef: droppableRef } = useDroppable({
    id: columnId,
  });

  const {
    attributes,
    listeners,
    setNodeRef: sortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: columnId,
    data: { type: "Column" },
  });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
    }),
    [transform, transition]
  );

  const combinedRef = useCallback(
    (node) => {
      droppableRef(node);
      sortableRef(node);
    },
    [droppableRef, sortableRef]
  );

  const candidateCount = useMemo(() => taskIds.length || 0, [taskIds]);

  const validTaskIds = useMemo(
    () =>
      taskIds.filter((taskId) => taskId != null && typeof taskId === "string"),
    [taskIds]
  );

  const columnClassName = useMemo(
    () => `column ${isDragging ? "dragging" : ""}`,
    [isDragging]
  );

  const handleAddClientModalOpen = useCallback(() => {
    // Use the parent handler if provided, otherwise use local state
    if (onOpenAddClientModal) {
      onOpenAddClientModal(columnId);
    } else {
      setShowAddClientModal(true);
    }
  }, [onOpenAddClientModal, columnId]);

  const handleAddClientModalClose = useCallback(() => {
    setShowAddClientModal(false);
  }, []);

  const handleSaveClient = useCallback(
    (clientData) => {
      onAddTask(columnId, clientData);
      setShowAddClientModal(false);
    },
    [onAddTask, columnId]
  );

  const handleManageColumn = useCallback(() => {
    navigate(`/pipeline/column-single/${columnId}`);
  }, [navigate, columnId]);

  const handleDeleteColumn = useCallback(() => {
    onDeleteColumn(columnId);
  }, [onDeleteColumn, columnId]);

  const renderTasks = useMemo(
    () =>
      validTaskIds.map((taskId) => {
        const task = tasks?.[taskId];
        if (!task) {
          return null;
        }
        return (
          <Task
            key={taskId}
            task={task}
            id={taskId}
            onRemoveTask={onRemoveTask}
            onEditTask={onEditTask}
            onMoveTask={onMoveTask}
            onAssignStaff={onAssignStaff}
            onViewCandidate={onViewCandidate}
            onEditCandidate={onEditCandidate}
            columnId={columnId}
            columns={columns}
          />
        );
      }),
    [
      validTaskIds,
      tasks,
      columnId,
      onRemoveTask,
      onEditTask,
      onMoveTask,
      onAssignStaff,
      onViewCandidate,
      onEditCandidate,
      columns,
    ]
  );

  return (
    <div
      ref={combinedRef}
      style={style}
      className={columnClassName}
      {...attributes}
      {...listeners}
    >
      <div className="column-header">
        <h3>
          {columnTitle}{" "}
          <span
            className="task-count"
            style={{
              backgroundColor: column.colorCode || "#000000",
              color: getContrastTextColor(column.colorCode || "#000000"),
            }}
          >
            {candidateCount}
          </span>
        </h3>
        <Menu as="div" className="dropdown-container">
          <Menu.Button className="dropdown-icon">
            <FaEllipsisV />
          </Menu.Button>
          <Menu.Items className="menu-items">
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    className={`menu-item ${active ? "menu-item-active" : ""}`}
                    onClick={handleAddClientModalOpen}
                  >
                    <FiUserPlus className="menu-item-icon" /> Add new candidate
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    className={`menu-item ${active ? "menu-item-active" : ""}`}
                    onClick={handleManageColumn}
                  >
                    Edit Column Setup
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    className={`menu-item-delete ${
                      active ? "menu-item-delete-active" : ""
                    }`}
                    onClick={handleDeleteColumn}
                  >
                    Delete column
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Menu>
      </div>
      {validTaskIds.length === 0 ? (
        <div className="empty-column">
          <button className="add-candidate" onClick={handleAddClientModalOpen}>
            <FiPlusCircle /> Add a candidate
          </button>
        </div>
      ) : (
        <SortableContext
          items={validTaskIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="task-list">{renderTasks}</div>
        </SortableContext>
      )}

      {/* Only show the modal locally if parent handler is not provided */}
      {!onOpenAddClientModal && (
        <AddClientModal
          isOpen={showAddClientModal}
          onClose={handleAddClientModalClose}
          onSubmit={handleSaveClient}
          initialData={null}
        />
      )}
    </div>
  );
};

Column.propTypes = {
  column: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    taskIds: PropTypes.arrayOf(PropTypes.string),
    colorCode: PropTypes.string,
  }).isRequired,
  tasks: PropTypes.object.isRequired,
  onAddTask: PropTypes.func.isRequired,
  onRemoveTask: PropTypes.func.isRequired,
  onEditTask: PropTypes.func.isRequired,
  onMoveTask: PropTypes.func.isRequired,
  onAssignStaff: PropTypes.func.isRequired,
  onViewCandidate: PropTypes.func.isRequired,
  onEditCandidate: PropTypes.func.isRequired,
  onDeleteColumn: PropTypes.func.isRequired,
  columns: PropTypes.object.isRequired,
  pipelineId: PropTypes.string,
  staffList: PropTypes.arrayOf(
    PropTypes.shape({
      staffId: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
  stages: PropTypes.arrayOf(
    PropTypes.shape({
      stageId: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
  onOpenAddClientModal: PropTypes.func, // New prop for parent-controlled modal
};

export default Column;

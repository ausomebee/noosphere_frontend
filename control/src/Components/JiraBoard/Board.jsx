import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import Column from './Column';
import { FaCirclePlus } from 'react-icons/fa6';
import usePermission from '../../hooks/usePermission';
import './DragAndDrop.css';

const Board = ({
  data,
  onAddTask,
  onRemoveTask,
  onEditTask,
  onMoveTask,
  onAssignStaff,
  onViewCandidate,
  onEditCandidate,
  onAddColumn,
  onDeleteColumn,
  pipelineId,
  staffList,
  stages,
  selectedTaskIds,
  setSelectedTaskIds, // Update prop name
  setShowAssignCandidateModal,
}) => {
  const { hasPermission } = usePermission();
  const canCreateStage = hasPermission('create_pipeline_stage');

  const { tasks, columns, columnOrder } = data;
  const columnData = Object.keys(columns).map((colId) => ({
    id: colId,
    title: columns[colId].title,
  }));

  const [hoverIndex, setHoverIndex] = useState(null);

  // Horizontal scroll affordance for boards wider than the viewport.
  const boardRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateScroll = useCallback(() => {
    const el = boardRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    updateScroll();
    el.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll);
    return () => {
      el.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
    };
  }, [updateScroll, columnOrder.length]);

  const scrollByAmount = (dir) => {
    const el = boardRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.max(el.clientWidth * 0.8, 320),
      behavior: 'smooth',
    });
  };

  return (
    <div className="board-viewport">
      {canLeft && (
        <button
          type="button"
          className="board-scroll-btn board-scroll-left"
          onClick={() => scrollByAmount(-1)}
          aria-label="Scroll left"
        >
          <FiChevronLeft />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          className="board-scroll-btn board-scroll-right"
          onClick={() => scrollByAmount(1)}
          aria-label="Scroll right"
        >
          <FiChevronRight />
        </button>
      )}
      <div
        className="board no-scrollbar::-webkit-scrollbar no-scrollbar"
        ref={boardRef}
      >
      <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
        {columnOrder.map((columnId, index) => {
          const column = columns[columnId];
          return (
            <div className="column-wrapper" key={columnId}>
              {/* Render "Add Column" button before the first column */}
              {index === 0 && canCreateStage && (
                <div
                  className="column-insertion-point"
                  onMouseEnter={() => setHoverIndex(0)}
                  onMouseLeave={() => setHoverIndex(null)}
                >
                  {hoverIndex === 0 && (
                    <button
                      className="add-column-button"
                      aria-label="Add column"
                      onClick={() => onAddColumn(0)}
                    >
                      <FaCirclePlus />
                    </button>
                  )}
                </div>
              )}
              <Column
                column={column}
                tasks={tasks}
                onAddTask={onAddTask}
                onRemoveTask={onRemoveTask}
                onEditTask={onEditTask}
                onMoveTask={onMoveTask}
                onAssignStaff={onAssignStaff} // Pass as is, handled in JiraBoard
                onViewCandidate={onViewCandidate}
                onEditCandidate={onEditCandidate}
                onDeleteColumn={onDeleteColumn}
                columns={columnData}
                pipelineId={pipelineId}
                staffList={staffList}
                stages={stages}
                selectedTaskIds={selectedTaskIds}
                setSelectedTaskIds={setSelectedTaskIds} // Pass to Column
                setShowAssignCandidateModal={setShowAssignCandidateModal}
              />
              {/* Render "Add Column" button between columns and after the last column */}
              {canCreateStage && (
              <div
                className="column-insertion-point"
                onMouseEnter={() => setHoverIndex(index + 1)}
                onMouseLeave={() => setHoverIndex(null)}
              >
                {hoverIndex === index + 1 && (
                  <button
                    className="add-column-button"
                    aria-label="Add column"
                    onClick={() => onAddColumn(index + 1)}
                  >
                    <FaCirclePlus />
                  </button>
                )}
              </div>
              )}
            </div>
          );
        })}
      </SortableContext>

      {/* Always-visible affordance: a column-shaped box to add a new stage at
          the end (the hover "+" insertion points still work between columns). */}
      {canCreateStage && (
      <div className="add-column-card">
        <button
          type="button"
          className="add-column-card-button"
          onClick={() => onAddColumn(columnOrder.length)}
          aria-label="Add pipeline stage"
        >
          <FaCirclePlus />
          <span>Add pipeline stage</span>
        </button>
      </div>
      )}
      </div>
    </div>
  );
};

Board.propTypes = {
  data: PropTypes.shape({
    tasks: PropTypes.object.isRequired,
    columns: PropTypes.object.isRequired,
    columnOrder: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  onAddTask: PropTypes.func.isRequired,
  onRemoveTask: PropTypes.func.isRequired,
  onEditTask: PropTypes.func.isRequired,
  onMoveTask: PropTypes.func.isRequired,
  onAssignStaff: PropTypes.func.isRequired,
  onViewCandidate: PropTypes.func.isRequired,
  onEditCandidate: PropTypes.func.isRequired,
  onAddColumn: PropTypes.func.isRequired,
  onDeleteColumn: PropTypes.func.isRequired,
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
  selectedTaskIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelectedTaskIds: PropTypes.func.isRequired, // Update prop type
  setShowAssignCandidateModal: PropTypes.func.isRequired,
};

export default Board;
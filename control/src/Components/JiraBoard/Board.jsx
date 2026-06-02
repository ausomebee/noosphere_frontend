import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import Column from './Column';
import { FaCirclePlus } from 'react-icons/fa6';
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
  const { tasks, columns, columnOrder } = data;
  const columnData = Object.keys(columns).map((colId) => ({
    id: colId,
    title: columns[colId].title,
  }));

  const [hoverIndex, setHoverIndex] = useState(null);

  return (
    <div className="board no-scrollbar::-webkit-scrollbar no-scrollbar">
      <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
        {columnOrder.map((columnId, index) => {
          const column = columns[columnId];
          return (
            <div className="column-wrapper" key={columnId}>
              {/* Render "Add Column" button before the first column */}
              {index === 0 && (
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
            </div>
          );
        })}
      </SortableContext>
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
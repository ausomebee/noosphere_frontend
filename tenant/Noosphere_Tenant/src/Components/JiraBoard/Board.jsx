// src/Component/JiraBoard/Board.js
import React from 'react';
import Column from './Column';
import { FaCirclePlus } from "react-icons/fa6";
import './DragAndDrop.css';

const Board = ({ data, onAddTask, onRemoveTask, onEditTask, onMoveTask }) => {
  const columns = Object.keys(data.columns).map((colId) => ({
    id: colId,
    title: data.columns[colId].title,
  }));

  return (
    <div className="board">
      {data.columnOrder.map((columnId) => {
        const column = data.columns[columnId];
        const tasks = column.taskIds.map((taskId) => data.tasks[taskId]);

        return (
          <Column
            key={column.id}
            column={column}
            tasks={tasks}
            onAddTask={onAddTask}
            onRemoveTask={onRemoveTask}
            onEditTask={onEditTask}
            onMoveTask={onMoveTask}
            columns={columns}
          />
        );
      })}
      {/* Add the button as an absolutely positioned element */}
      {data.columnOrder.length > 1 && (
        <button className="add-column-button">
          <FaCirclePlus style={{backgroundColor: "white", color: "black", borderRadius: "9999px"}} />
        </button>
      )}
    </div>
  );
};

export default Board;
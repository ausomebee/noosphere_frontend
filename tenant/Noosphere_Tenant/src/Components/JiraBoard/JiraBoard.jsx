// src/Component/JiraBoard/JiraBoard.js
import React, { useState } from 'react';
import { DndContext, rectIntersection, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import Board from './Board';
import Task from './Task';
import { initialData, emptyData } from '../../data';
import './DragAndDrop.css';

const JiraBoard = () => {
  const isInitialDataEmpty =
    !initialData || !initialData.columns || Object.keys(initialData.columns).length === 0;

  const isEmptyDataValid =
    emptyData &&
    emptyData.columns &&
    Object.keys(emptyData.columns).length > 0 &&
    emptyData.columnOrder &&
    Array.isArray(emptyData.columnOrder);

  console.log('Using data:', isInitialDataEmpty ? 'emptyData' : 'initialData');
  if (isInitialDataEmpty && !isEmptyDataValid) {
    console.error('Both initialData and emptyData are invalid. Please check your data structure.');
  }

  const [data, setData] = useState(() => {
    if (!isInitialDataEmpty) return initialData;
    if (isEmptyDataValid) return emptyData;
    return {
      tasks: {},
      columns: {
        'column-1': { id: 'column-1', title: 'Default Column', taskIds: [], count: 0 },
      },
      columnOrder: ['column-1'],
    };
  });

  const [draggedTask, setDraggedTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    const { active } = event;
    const taskId = active.id;
    const task = data.tasks[taskId];
    setDraggedTask(task);
    console.log('Drag started for task:', taskId);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    setDraggedTask(null); // Clear the dragged task on drop

    if (!over) {
      console.log('Drag ended with no valid drop target');
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    console.log('Dragging task:', activeId, 'over:', overId);

    const activeColumnId = Object.keys(data.columns).find((columnId) =>
      data.columns[columnId].taskIds.includes(activeId)
    );
    const overColumnId = Object.keys(data.columns).find((columnId) =>
      data.columns[columnId].taskIds.includes(overId)
    );

    const isOverAColumn = data.columnOrder.includes(overId);
    const targetColumnId = isOverAColumn ? overId : overColumnId;

    if (!activeColumnId || (!targetColumnId && !isOverAColumn)) {
      console.log('Invalid drag: Source or target column not found');
      return;
    }

    const activeColumn = data.columns[activeColumnId];
    const targetColumn = data.columns[targetColumnId];

    if (activeColumnId === targetColumnId && !isOverAColumn) {
      const oldIndex = activeColumn.taskIds.indexOf(activeId);
      const newIndex = activeColumn.taskIds.indexOf(overId);

      if (oldIndex === newIndex) {
        console.log('No change in position within the same column');
        return;
      }

      const newTaskIds = arrayMove(activeColumn.taskIds, oldIndex, newIndex);

      console.log(`Reordering within column ${activeColumnId}:`, newTaskIds);

      setData({
        ...data,
        columns: {
          ...data.columns,
          [activeColumnId]: {
            ...activeColumn,
            taskIds: newTaskIds,
          },
        },
      });
    } else {
      const activeTaskIds = [...activeColumn.taskIds];
      const targetTaskIds = [...targetColumn.taskIds];

      const activeIndex = activeTaskIds.indexOf(activeId);
      let newIndex = isOverAColumn ? targetTaskIds.length : targetTaskIds.indexOf(overId);

      if (newIndex === -1) newIndex = targetTaskIds.length;

      activeTaskIds.splice(activeIndex, 1);
      targetTaskIds.splice(newIndex, 0, activeId);

      console.log(`Moving task ${activeId} from column ${activeColumnId} to column ${targetColumnId}`);

      setData({
        ...data,
        columns: {
          ...data.columns,
          [activeColumnId]: {
            ...activeColumn,
            taskIds: activeTaskIds,
            count: activeTaskIds.length,
          },
          [targetColumnId]: {
            ...targetColumn,
            taskIds: targetTaskIds,
            count: targetTaskIds.length,
          },
        },
      });
    }
  };

  const handleAddTask = (columnId) => {
    const newTaskId = `task-${Object.keys(data.tasks).length + 1}`;
    const newTask = {
      id: newTaskId,
      company: `New Candidate ${newTaskId}`,
      progress: '0/3 tasks done',
    };

    setData({
      ...data,
      tasks: {
        ...data.tasks,
        [newTaskId]: newTask,
      },
      columns: {
        ...data.columns,
        [columnId]: {
          ...data.columns[columnId],
          taskIds: [...data.columns[columnId].taskIds, newTaskId],
          count: data.columns[columnId].count + 1,
        },
      },
    });
  };

  const handleRemoveTask = (taskId) => {
    const columnId = Object.keys(data.columns).find((colId) =>
      data.columns[colId].taskIds.includes(taskId)
    );
    if (!columnId) return;

    const newTaskIds = data.columns[columnId].taskIds.filter((id) => id !== taskId);
    const newTasks = { ...data.tasks };
    delete newTasks[taskId];

    setData({
      ...data,
      tasks: newTasks,
      columns: {
        ...data.columns,
        [columnId]: {
          ...data.columns[columnId],
          taskIds: newTaskIds,
          count: data.columns[columnId].count - 1,
        },
      },
    });
  };

  const handleEditTask = (taskId, newCompany) => {
    setData({
      ...data,
      tasks: {
        ...data.tasks,
        [taskId]: {
          ...data.tasks[taskId],
          company: newCompany,
        },
      },
    });
  };

  const handleMoveTask = (taskId, targetColumnId) => {
    const currentColumnId = Object.keys(data.columns).find((colId) =>
      data.columns[colId].taskIds.includes(taskId)
    );
    if (!currentColumnId || currentColumnId === targetColumnId) return;

    const currentTaskIds = data.columns[currentColumnId].taskIds.filter((id) => id !== taskId);
    const targetTaskIds = [...data.columns[targetColumnId].taskIds, taskId];

    setData({
      ...data,
      columns: {
        ...data.columns,
        [currentColumnId]: {
          ...data.columns[currentColumnId],
          taskIds: currentTaskIds,
          count: currentTaskIds.length,
        },
        [targetColumnId]: {
          ...data.columns[targetColumnId],
          taskIds: targetTaskIds,
          count: targetTaskIds.length,
        },
      },
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Board
        data={data}
        onAddTask={handleAddTask}
        onRemoveTask={handleRemoveTask}
        onEditTask={handleEditTask}
        onMoveTask={handleMoveTask}
      />
      <DragOverlay>
        {draggedTask ? (
          <div className="task dragging dragged-overlay">
            <div className="task-content">
              <p>{draggedTask.company}</p>
              <span>{draggedTask.progress}</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default JiraBoard;
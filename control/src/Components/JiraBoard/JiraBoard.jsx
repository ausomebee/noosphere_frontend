import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  DndContext,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import Board from "./Board";
import EmptyState from "./EmptyState";
import Task from "./Task";
import Column from "./Column";
import NewPipelineColumnModal from "../ReusableModal/NewPipelineColumnModal";
import AddProspectModal from "../ReusableModal/AddProspectModal";
import MoveCandidateModal from "../ReusableModal/MoveCandidateModal";
import AssignCandidateModal from "../ReusableModal/AssignCandidateModal";
import DeleteConfirmationModal from "../ReusableModal/DeleteConfirmationModal";
import LoadingSpinner from "../LoadingSpinner";
import "./DragAndDrop.css";
import {
  addColumn,
  updateColumnTaskIds,
  addTaskToColumn,
  removeTaskFromColumn,
  updateColumnOrder,
  deleteColumn,
  fetchPipelineByModule,
  fetchPipelineItems,
  createPipelineStage,
  reorderPipelineStage,
  updatePipelineItemActivity,
  deletePipelineStage,
  deletePipelineItem,
  updateCandidate,
  reassignCandidateToStaff,
  setColumns,
  fetchSinglePipelineItem,
} from "../../ReduxStore/features/PipelineSlice";
import { FaPlus } from "react-icons/fa";
import { IoWarningOutline } from "react-icons/io5";
import Button from "../Button/Button";
import { showToast } from "../../Helper/ShowToast";
import api from "../../api/TenantApis";

const batchPromises = async (items, fn, concurrency = 3) => {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map((item) => fn(item))
    );
    results.push(...batchResults);
  }
  return results;
};

const JiraBoard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pipeline, columns, columnOrder, status, draft, error, pipelineItem } = useSelector(
    (state) => state.pipeline
  );
  const token = useSelector((state) => state.authentication?.user?.token);
  const accessToken = token;
  const refreshToken = token;
  const [loadingCount, setLoadingCount] = useState(0);
  const isLoading = loadingCount > 0;
  const [localTasks, setLocalTasks] = useState({});
  const [draggedTask, setDraggedTask] = useState(null);
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [showAddProspectModal, setShowAddProspectModal] = useState(false);
  const [showMoveCandidateModal, setShowMoveCandidateModal] = useState(false);
  const [showAssignCandidateModal, setShowAssignCandidateModal] = useState(false);
  const [showDeleteCandidateModal, setShowDeleteCandidateModal] = useState(false);
  const [showDeleteColumnModal, setShowDeleteColumnModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [selectedColumnId, setSelectedColumnId] = useState(null);
  const [addColumnIndex, setAddColumnIndex] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [stages, setStages] = useState([]);

  // Selection handling
  const toggleTaskSelection = (taskId) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const clearSelection = () => setSelectedTaskIds([]);

  const startLoading = () => setLoadingCount((prev) => prev + 1);
  const stopLoading = () => setLoadingCount((prev) => Math.max(0, prev - 1));

  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        if (isLoading) {
          setLoadingCount(0);
          showToast("Operation timed out. Please try again.", "error");
        }
      }, 30000);
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  const authTokens = useMemo(
    () => ({
      accessToken,
      refreshToken,
    }),
    [accessToken, refreshToken]
  );

  const fetchStaffAndStages = useCallback(async () => {
    if (!authTokens.accessToken || !authTokens.refreshToken) {
      showToast("Authentication tokens not available.", "error");
      return;
    }

    startLoading();
    try {
      const [adminsResponse, stagesResponse] = await Promise.all([
        api.getAllAdmins({
          accessToken: authTokens.accessToken,
          refreshToken: authTokens.refreshToken,
        }),
        pipeline?.id
          ? api.GetPipelineStage({
              pipelineId: pipeline.id,
              accessToken: authTokens.accessToken,
              refreshToken: authTokens.refreshToken,
            })
          : Promise.resolve({ data: { data: [] } }),
      ]);

      const admins = adminsResponse.data?.data || [];
      setStaffList(
        admins.map((admin) => ({
          staffId: admin.id || `admin-${uuidv4()}`,
          name: admin.fullName || "Unknown Admin",
        }))
      );

      const stagesData = stagesResponse.data?.data || [];
      setStages(
        stagesData.map((stage) => ({
          stageId: stage.id || `stage-${uuidv4()}`,
          name: stage.name || "Unnamed Stage",
        }))
      );
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to fetch staff or stages:", err);
    } finally {
      stopLoading();
    }
  }, [authTokens, pipeline?.id]);

  const fetchPipelineData = useCallback(async () => {
    if (!authTokens.accessToken || !authTokens.refreshToken) {
      showToast("Authentication tokens not available.", "error");
      return;
    }

    if (isDataLoaded) {
      return;
    }

    startLoading();
    try {
      const pipelineResult = await dispatch(
        fetchPipelineByModule(authTokens)
      ).unwrap();
      const pipelineId = pipelineResult.data[0]?.id;

      if (!pipelineId) {
        showToast("No pipeline found.", "warning");
        return;
      }

      await fetchStaffAndStages();

      const stagesResponse = await api.GetPipelineStage({
        pipelineId,
        accessToken: authTokens.accessToken,
        refreshToken: authTokens.refreshToken,
      });
      const stagesData = stagesResponse.data?.data || [];

      if (!stagesData.length) {
        showToast("No stages found for pipeline.", "warning");
        return;
      }

      const newColumns = {};
      const newColumnOrder = [];
      stagesData.forEach((stage) => {
        if (stage.id) {
          newColumns[stage.id] = {
            id: stage.id,
            title: stage.name || "Unnamed Stage",
            taskIds: [],
            count: 0,
            requiredTasks: stage.tasks || [],
            requiredDocuments: stage.documents || [],
            colorCode: stage.colourCode || "#000000",
          };
          newColumnOrder.push(stage.id);
        } else {
        }
      });

      dispatch(setColumns(newColumns));
      dispatch(updateColumnOrder(newColumnOrder));

      const results = await batchPromises(
        newColumnOrder,
        (stageId) =>
          dispatch(fetchPipelineItems({ stageId, ...authTokens }))
            .unwrap()
            .then((response) => {
              return {
                stageId,
                items: response.items || [],
              };
            })
            .catch((err) => {
              if (import.meta.env.DEV) console.error(`Failed to fetch items for stage ${stageId}:`, err);
              throw err;
            }),
        3
      );

      const newTasks = {};
      let taskCount = 0;
      const fetchErrors = [];

      for (const result of results) {
        if (result.status === "fulfilled") {
          const { stageId, items } = result.value;
          if (Array.isArray(items) && items.length) {
            const stage = stagesData.find((s) => s.id === stageId);
            const totalRequiredItems =
              (stage?.tasks?.length || 0) + (stage?.documents?.length || 0);

            for (const item of items) {
              if (!item.id || typeof item.id !== "string") {
                continue;
              }
              taskCount++;

              let doneTasksCount = 0;
              let sentDocumentsCount = 0;
              try {
                const pipelineItemResult = await dispatch(
                  fetchSinglePipelineItem({
                    itemId: item.id,
                    ...authTokens,
                  })
                ).unwrap();
                const pipelineItem = pipelineItemResult.data;

                // Handle doneTasks as an object
                const doneTasks = pipelineItem?.doneTasks || {};
                doneTasksCount = Object.values(doneTasks).filter((value) => value === true).length;

                // Handle sentDocuments as an object
                const sentDocuments = pipelineItem?.sentDocuments || {};
                sentDocumentsCount = Object.values(sentDocuments).filter((value) => value === true).length;
              } catch (err) {
                if (import.meta.env.DEV) console.error(`Failed to fetch pipeline item ${item.id}:`, err);
              }

              const doneCount = doneTasksCount + sentDocumentsCount;
              const progress = `${doneCount}/${totalRequiredItems}`;

              newTasks[item.id] = {
                id: item.id,
                company: item.companyName || `Candidate ${item.id.slice(0, 8)}`,
                progress,
                staff: item.assignToAdmin || null,
                contactPerson: item.contactPerson || "",
                email: item.email || "",
                phone: item.phoneNumber || "",
                companySize: item.companySize || "",
                organizationType: item.organizationType || "",
                location: item.location || "",
                leadSource: item.leadSource || "",
              };
            }
          }
        } else {
          fetchErrors.push(result.reason);
        }
      }

      setLocalTasks(newTasks);
      setIsDataLoaded(true);

     
    } catch (err) {
      if (import.meta.env.DEV) console.error("Fetch error:", err);
    } finally {
      stopLoading();
    }
  }, [dispatch, authTokens, isDataLoaded, fetchStaffAndStages]);

  useEffect(() => {
    let isMounted = true;

    fetchPipelineData().then(() => {
      if (isMounted) setIsDataLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, [fetchPipelineData]);

  useEffect(() => {
    if (!pipelineItem || !pipelineItem.id || !columns[pipelineItem.pipelineStageId]) {
      return;
    }

    const requiredTasks = columns[pipelineItem.pipelineStageId]?.requiredTasks || [];
    const requiredDocuments = columns[pipelineItem.pipelineStageId]?.requiredDocuments || [];
    const totalRequiredItems = requiredTasks.length + requiredDocuments.length;

    // Handle doneTasks as an object
    const doneTasks = pipelineItem.doneTasks || 
      requiredTasks.reduce((acc, task) => ({
        ...acc,
        [task.name]: false,
      }), {});

    // Count the number of completed tasks (true values in the object)
    const doneTasksCount = Object.values(doneTasks).filter((value) => value === true).length;

    // Handle sentDocuments as an object
    const sentDocuments = pipelineItem.sentDocuments || 
      requiredDocuments.reduce((acc, doc) => ({
        ...acc,
        [doc.name]: false,
      }), {});
    const sentDocumentsCount = Object.values(sentDocuments).filter((value) => value === true).length;

    const doneCount = doneTasksCount + sentDocumentsCount;
    const progress = `${doneCount}/${totalRequiredItems}`;

    // Map the doneTasks object to taskStatuses
    const taskStatuses = doneTasks;

    setLocalTasks((prev) => {
      const updatedTasks = {
        ...prev,
        [pipelineItem.id]: {
          ...prev[pipelineItem.id],
          progress,
          taskStatuses,
        },
      };
      return updatedTasks;
    });
  }, [columns, pipelineItem]);

  useEffect(() => {
    Object.keys(columns).forEach((columnId) => {
      const column = columns[columnId];
      const validTaskIds = (column.taskIds || []).filter(
        (taskId) => taskId != null && typeof taskId === "string"
      );
      if (validTaskIds.length !== (column.taskIds?.length || 0)) {
        dispatch(updateColumnTaskIds({ columnId, taskIds: validTaskIds }));
      }
    });
  }, [columns, dispatch]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    const { active } = event;
    if (active.data.current?.type === "Column") {
      setDraggedColumn(columns[active.id]);
      return;
    }
    const taskId = active.id;
    const task = localTasks[taskId];
    setDraggedTask(task);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setDraggedTask(null);
    setDraggedColumn(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (active.data.current?.type === "Column") {
      const activeColumnIndex = columnOrder.indexOf(activeId);
      const overColumnIndex = columnOrder.indexOf(overId);

      if (activeColumnIndex !== overColumnIndex) {
        const newColumnOrder = arrayMove(
          columnOrder,
          activeColumnIndex,
          overColumnIndex
        );
        dispatch(updateColumnOrder(newColumnOrder));

        try {
          await api.ReorderPipelineStage({
            id: activeId,
            order: overColumnIndex + 1,
            accessToken,
            refreshToken,
          });
        } catch (err) {
          if (import.meta.env.DEV) console.error("Failed to reorder column:", err);
          showToast("Failed to update column order.", "error");
        }
      }
      return;
    }

    const activeColumnId = Object.keys(columns).find((columnId) =>
      columns[columnId].taskIds.includes(activeId)
    );
    const overColumnId = Object.keys(columns).find((columnId) =>
      columns[columnId].taskIds.includes(overId)
    );

    const isOverAColumn = columnOrder.includes(overId);
    const targetColumnId = isOverAColumn ? overId : overColumnId;

    if (!activeColumnId || (!targetColumnId && !isOverAColumn)) return;

    const activeColumn = columns[activeColumnId];
    const targetColumn = columns[targetColumnId];

    if (!localTasks[activeId]) return;

    if (activeColumnId === targetColumnId && !isOverAColumn) {
      const oldIndex = activeColumn.taskIds.indexOf(activeId);
      const newIndex = activeColumn.taskIds.indexOf(overId);

      if (oldIndex === newIndex) return;

      const newTaskIds = arrayMove(activeColumn.taskIds, oldIndex, newIndex);
      dispatch(
        updateColumnTaskIds({ columnId: activeColumnId, taskIds: newTaskIds })
      );

      try {
        await api.UpdatePipelineItemActivity({
          ids: [activeId],
          pipelineStageId: activeColumnId,
          accessToken,
          refreshToken,
        });
      } catch (err) {
        if (import.meta.env.DEV) console.error("Failed to update task order:", err);
        showToast("Failed to update task order.", "error");
      }
    } else {
      const activeTaskIds = [...activeColumn.taskIds];
      const targetTaskIds = [...targetColumn.taskIds];

      const activeIndex = activeTaskIds.indexOf(activeId);
      let newIndex = isOverAColumn
        ? targetTaskIds.length
        : targetTaskIds.indexOf(overId);

      if (newIndex === -1) newIndex = targetTaskIds.length;

      activeTaskIds.splice(activeIndex, 1);
      targetTaskIds.splice(newIndex, 0, activeId);

      dispatch(
        updateColumnTaskIds({
          columnId: activeColumnId,
          taskIds: activeTaskIds,
        })
      );
      dispatch(
        updateColumnTaskIds({
          columnId: targetColumnId,
          taskIds: targetTaskIds,
        })
      );

      const totalRequiredItems =
        (targetColumn.requiredTasks?.length || 0) +
        (targetColumn.requiredDocuments?.length || 0);

      setLocalTasks((prev) => ({
        ...prev,
        [activeId]: {
          ...prev[activeId],
          progress: `0/${totalRequiredItems}`,
        },
      }));

      try {
        await api.UpdatePipelineItemActivity({
          ids: [activeId],
          pipelineStageId: targetColumnId,
          accessToken,
          refreshToken,
        });
      } catch (err) {
        if (import.meta.env.DEV) console.error("Failed to move task:", err);
        showToast("Failed to move task.", "error");
      }
    }
  };

  const handleAddTask = (columnId, prospectData) => {
    if (!columns[columnId]) {
      showToast("Invalid column selected.", "error");
      if (import.meta.env.DEV) console.error("Invalid columnId:", columnId);
      return;
    }

    if (!prospectData.id || typeof prospectData.id !== "string") {
      showToast("Invalid prospect ID.", "error");
      if (import.meta.env.DEV) console.error("Invalid prospectData.id:", prospectData.id);
      return;
    }

    startLoading();
    try {
      const newTaskId = prospectData.id;
      dispatch(addTaskToColumn({ columnId, taskId: newTaskId }));
      const totalRequiredItems =
        (columns[columnId]?.requiredTasks?.length || 0) +
        (columns[columnId]?.requiredDocuments?.length || 0);
      setLocalTasks((prev) => {
        const updatedTasks = {
          ...prev,
          [newTaskId]: {
            id: newTaskId,
            company:
              prospectData.company || `New Candidate ${newTaskId.slice(0, 8)}`,
            progress: `0/${totalRequiredItems}`,
            staff: prospectData.assignToAdmin || null,
            contactPerson: prospectData.contactPerson || "",
            email: prospectData.email || "",
            phone: prospectData.phoneNumber || "",
            companySize: prospectData.companySize || "",
            organizationType: prospectData.organizationType || "",
            location: prospectData.location || "",
            leadSource: prospectData.leadSource || "",
          },
        };
        return updatedTasks;
      });
      setIsDataLoaded(false);
      showToast("Candidate added successfully!", "success");
    } catch (error) {
      if (import.meta.env.DEV) console.error("Failed to add candidate:", error);
      showToast("Failed to add candidate.", "error");
    } finally {
      stopLoading();
    }
  };

  const handleRemoveTask = (taskId) => {
    setSelectedTaskIds([taskId]);
    setShowDeleteCandidateModal(true);
  };

  const handleDeleteTask = async () => {
    if (!selectedTaskIds.length) return;

    startLoading();
    try {
      const response = await dispatch(
        deletePipelineItem({
          ids: selectedTaskIds,
          accessToken,
          refreshToken,
        })
      ).unwrap();
      if (response.status === "ok") {
        selectedTaskIds.forEach((taskId) => {
          const columnId = Object.keys(columns).find((colId) =>
            columns[colId].taskIds.includes(taskId)
          );
          if (columnId) {
            dispatch(removeTaskFromColumn({ columnId, taskId }));
          }
          setLocalTasks((prev) => {
            const newTasks = { ...prev };
            delete newTasks[taskId];
            return newTasks;
          });
        });
        setShowDeleteCandidateModal(false);
        setSelectedTaskIds([]);
        setIsDataLoaded(false);
        showToast(
          `Deleted ${selectedTaskIds.length} candidate(s) successfully!`,
          "success"
        );
      } else {
        throw new Error("Failed to delete candidates.");
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Candidate deletion failed:", error);
      showToast(error?.message || "Failed to delete candidate(s).", "error");
      setShowErrorModal(true);
    } finally {
      stopLoading();
    }
  };

  const handleDeleteColumn = async () => {
    const column = columns[selectedColumnId];
    const columnIndex = columnOrder.indexOf(selectedColumnId);
    const isFirstColumn = columnIndex === 0;
    const isLastColumn = columnIndex === columnOrder.length - 1;
    const hasTasks = column.taskIds && column.taskIds.length > 0;

    if (isFirstColumn && hasTasks) {
      setShowDeleteColumnModal(false);
      setShowErrorModal(true);
      return;
    }

    startLoading();
    try {
      if (hasTasks && !isLastColumn) {
        const firstColumnId = columnOrder[0];
        const firstColumn = columns[firstColumnId];
        const updatedFirstColumnTaskIds = [
          ...firstColumn.taskIds,
          ...column.taskIds,
        ];

        const response = await dispatch(
          updatePipelineItemActivity({
            ids: column.taskIds,
            pipelineStageId: firstColumnId,
            accessToken,
            refreshToken,
          })
        ).unwrap();
        if (response.status !== "ok") {
          throw new Error("Failed to move tasks.");
        }
        dispatch(
          updateColumnTaskIds({
            columnId: firstColumnId,
            taskIds: updatedFirstColumnTaskIds,
          })
        );
      }

      if (isLastColumn && hasTasks) {
        const response = await dispatch(
          deletePipelineItem({
            ids: column.taskIds,
            accessToken,
            refreshToken,
          })
        ).unwrap();
        if (response.status !== "ok") {
          throw new Error("Failed to delete tasks.");
        }
        setLocalTasks((prev) => {
          const newTasks = { ...prev };
          column.taskIds.forEach((taskId) => delete newTasks[taskId]);
          return newTasks;
        });
      }

      const response = await dispatch(
        deletePipelineStage({
          id: selectedColumnId,
          accessToken,
          refreshToken,
        })
      ).unwrap();
      if (response.status === "ok") {
        dispatch(deleteColumn(selectedColumnId));
        setShowDeleteColumnModal(false);
        setSelectedColumnId(null);
        showToast("Column deleted successfully!", "success");
      } else {
        throw new Error("Failed to delete column.");
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Column deletion failed:", error);
      showToast(error?.message || "Failed to delete column.", "error");
      setShowErrorModal(true);
    } finally {
      stopLoading();
    }
  };

  const handleEditTask = async (taskId, newCompany) => {
    setLocalTasks((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        company: newCompany,
      },
    }));
    startLoading();
    try {
      const response = await dispatch(
        updateCandidate({
          id: taskId,
          companyName: newCompany,
          accessToken,
          refreshToken,
        })
      ).unwrap();
      if (response.status === "ok") {
        showToast("Candidate updated successfully!", "success");
      } else {
        throw new Error("Failed to update candidate.");
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Candidate update failed:", error);
      showToast(error?.message || "Failed to update candidate.", "error");
      setShowErrorModal(true);
    } finally {
      stopLoading();
    }
  };

  const handleMoveTask = async (taskIds, targetColumnId) => {
    const currentColumnIds = taskIds.map((taskId) =>
      Object.keys(columns).find((colId) =>
        columns[colId].taskIds.includes(taskId)
      )
    );
    if (
      !currentColumnIds.every((id) => id) ||
      currentColumnIds.every((id) => id === targetColumnId)
    )
      return;

    const targetColumn = columns[targetColumnId];
    const totalRequiredItems =
      (targetColumn.requiredTasks?.length || 0) +
      (targetColumn.requiredDocuments?.length || 0);

    const updatedTasks = { ...localTasks };
    for (const taskId of taskIds) {
      let doneCount = 0;
      try {
        const pipelineItemResult = await dispatch(
          fetchSinglePipelineItem({
            itemId: taskId,
            ...authTokens,
          })
        ).unwrap();
        const pipelineItem = pipelineItemResult.data;

        // Handle doneTasks as an object
        const doneTasks = pipelineItem?.doneTasks || {};
        const doneTasksCount = Object.values(doneTasks).filter((value) => value === true).length;

        // Handle sentDocuments as an object
        const sentDocuments = pipelineItem?.sentDocuments || {};
        const sentDocumentsCount = Object.values(sentDocuments).filter((value) => value === true).length;

        doneCount = doneTasksCount + sentDocumentsCount;
      } catch (err) {
        if (import.meta.env.DEV) console.error(`Failed to fetch pipeline item ${taskId}:`, err);
      }

      updatedTasks[taskId] = {
        ...updatedTasks[taskId],
        progress: `${doneCount}/${totalRequiredItems}`,
      };
    }
    setLocalTasks(updatedTasks);

    const columnUpdates = {};
    Object.keys(columns).forEach((colId) => {
      columnUpdates[colId] = [...columns[colId].taskIds];
    });

    taskIds.forEach((taskId, index) => {
      const currentColumnId = currentColumnIds[index];
      if (currentColumnId) {
        columnUpdates[currentColumnId] = columnUpdates[currentColumnId].filter(
          (id) => id !== taskId
        );
        columnUpdates[targetColumnId].push(taskId);
      }
    });

    Object.keys(columnUpdates).forEach((colId) => {
      dispatch(
        updateColumnTaskIds({
          columnId: colId,
          taskIds: columnUpdates[colId],
        })
      );
    });

    startLoading();
    try {
      const response = await dispatch(
        updatePipelineItemActivity({
          ids: taskIds,
          pipelineStageId: targetColumnId,
          accessToken,
          refreshToken,
        })
      ).unwrap();
      if (response.status === "ok") {
        showToast(
          `Moved ${taskIds.length} candidate(s) successfully!`,
          "success"
        );
      } else {
        throw new Error("Failed to move candidates.");
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Task move failed:", error);
      showToast(error?.message || "Failed to move candidate(s).", "error");
      setShowErrorModal(true);
    } finally {
      stopLoading();
      clearSelection();
    }
  };

  const handleAssignStaff = async (taskIds, staff) => {
    setLocalTasks((prev) => {
      const updatedTasks = { ...prev };
      taskIds.forEach((taskId) => {
        updatedTasks[taskId] = {
          ...updatedTasks[taskId],
          staff,
        };
      });
      return updatedTasks;
    });
    startLoading();
    try {
      const response = await dispatch(
        reassignCandidateToStaff({
          ids: taskIds,
          assignToAdmin: staff,
          accessToken,
          refreshToken,
        })
      ).unwrap();
      if (response.status === "ok") {
        showToast(
          `Assigned ${taskIds.length} candidate(s) successfully!`,
          "success"
        );
      } else {
        throw new Error("Failed to assign staff.");
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Staff assignment failed:", error);
      showToast(
        error?.message || "Failed to assign staff to candidate(s).",
        "error"
      );
      setShowErrorModal(true);
    } finally {
      stopLoading();
      clearSelection();
    }
  };

  const handleViewCandidate = (stageId, taskId) => {
    navigate(`/tenants/candidate-single/${stageId}/${taskId}`);
  };

  const handleEditCandidate = (stageId, taskId) => {
    navigate(`/tenants/candidate-single/${stageId}/${taskId}/edit`);
  };

  const handleAddColumn = (index) => {
    setAddColumnIndex(index);
    setShowAddColumnModal(true);
  };

  const handleSaveColumn = async (pipelineData) => {
    startLoading();
    try {
      if (pipeline?.id) {
        const validatedPipelineData = {
          pipelineId: pipeline.id,
          name: pipelineData.name?.trim() || "",
          description: pipelineData.description?.trim() || "",
          colourCode: pipelineData.colorCode || "#000000",
          tasks: Array.isArray(pipelineData.requiredTasks)
            ? pipelineData.requiredTasks
            : [],
          documents: Array.isArray(pipelineData.requiredDocuments)
            ? pipelineData.requiredDocuments
            : [],
          accessToken,
          refreshToken,
        };
        const response = await dispatch(
          createPipelineStage(validatedPipelineData)
        ).unwrap();
        if (response.status === "ok") {
          showToast("Pipeline stage created successfully!", "success");
          setIsDataLoaded(false);
          fetchPipelineData();
        } else {
          throw new Error("Failed to create pipeline stage.");
        }
      } else {
        dispatch(addColumn({ pipelineData, index: addColumnIndex }));
        showToast("Pipeline stage added locally!", "success");
      }
      setShowAddColumnModal(false);
      setAddColumnIndex(null);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Failed to create pipeline stage:", error);
      showToast(error?.message || "Failed to create pipeline stage.", "error");
      setShowErrorModal(true);
    } finally {
      stopLoading();
    }
  };

  const hasColumns = columnOrder.length > 0;

  if (isLoading || status === "loading") {
    return <LoadingSpinner />;
  }

  if (status === "failed") {
    if (import.meta.env.DEV) console.error("Pipeline error:", error);
    return <div>Error: {error}</div>;
  }

  return (
    <div className="jira-board-container">
      <div className="apicall">
        <div className="board-header">
          <div className="board-title">
            <h1>{pipeline?.name || "Client Onboarding"}</h1>
            <p>
              {pipeline?.description ||
                "Manage your client intake process seamlessly"}
            </p>
          </div>
          {hasColumns && (
            <div style={{ display: "flex", gap: "10px" }}>
              <Button
                label="Add new candidate"
                icon={<FaPlus />}
                variant="primary"
                onClick={() => setShowAddProspectModal(true)}
                iconPosition="left"
                width="300px"
                disabled={isLoading}
              />
            </div>
          )}
        </div>
      </div>

      {hasColumns ? (
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <Board
            data={{ tasks: localTasks, columns, columnOrder }}
            onAddTask={handleAddTask}
            onRemoveTask={handleRemoveTask}
            onEditTask={handleEditTask}
            onMoveTask={(taskId, columnId) => {
              setSelectedTaskIds([taskId]);
              setSelectedColumnId(columnId);
              setShowMoveCandidateModal(true);
            }}
            onAssignStaff={(taskId) => {
              setSelectedTaskIds([taskId]);
              setShowAssignCandidateModal(true);
            }}
            onViewCandidate={handleViewCandidate}
            onEditCandidate={handleEditCandidate}
            onAddColumn={handleAddColumn}
            onDeleteColumn={(columnId) => {
              setSelectedColumnId(columnId);
              setShowDeleteColumnModal(true);
            }}
            pipelineId={pipeline?.id}
            staffList={staffList}
            stages={stages}
            selectedTaskIds={selectedTaskIds}
            toggleTaskSelection={toggleTaskSelection}
            setSelectedTaskIds={setSelectedTaskIds}
            setShowAssignCandidateModal={setShowAssignCandidateModal}
          />
          <DragOverlay>
            {draggedTask ? (
              <Task
                task={draggedTask}
                id={draggedTask.id}
                className="task dragging dragged-overlay"
              />
            ) : draggedColumn ? (
              <Column
                column={draggedColumn}
                tasks={[]}
                className="column dragging dragged-overlay"
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <EmptyState onAddFirstStage={handleSaveColumn} />
      )}

      <NewPipelineColumnModal
        isOpen={showAddColumnModal}
        onClose={() => {
          setShowAddColumnModal(false);
          setAddColumnIndex(null);
        }}
        onSave={handleSaveColumn}
      />
      <AddProspectModal
        isOpen={showAddProspectModal}
        onClose={() => setShowAddProspectModal(false)}
        onSave={(prospectData) => {
          const targetColumnId = prospectData.pipelineStageId;
          handleAddTask(targetColumnId, prospectData);
          setShowAddProspectModal(false);
        }}
        pipelineId={pipeline?.id}
        staffList={staffList}
        stages={stages}
      />
      <MoveCandidateModal
        isOpen={showMoveCandidateModal}
        onClose={() => {
          setShowMoveCandidateModal(false);
          setSelectedTaskIds([]);
          setSelectedColumnId(null);
        }}
        onSave={(targetColumnId) => {
          handleMoveTask(selectedTaskIds, targetColumnId);
          setShowMoveCandidateModal(false);
          setSelectedTaskIds([]);
          setSelectedColumnId(null);
        }}
        columns={Object.keys(columns).map((colId) => ({
          id: colId,
          title: columns[colId].title,
        }))}
        currentColumnId={selectedColumnId}
        taskIds={selectedTaskIds}
        accessToken={accessToken}
        refreshToken={refreshToken}
        dispatch={dispatch}
      />
      <AssignCandidateModal
        isOpen={showAssignCandidateModal}
        onClose={() => {
          setShowAssignCandidateModal(false);
          setSelectedTaskIds([]);
        }}
        onSave={(staff) => {
          handleAssignStaff(selectedTaskIds, staff);
          setShowAssignCandidateModal(false);
          setSelectedTaskIds([]);
        }}
        taskIds={selectedTaskIds}
        tasks={localTasks}
        staffList={staffList}
      />
      <DeleteConfirmationModal
        isOpen={showDeleteCandidateModal}
        onClose={() => {
          setShowDeleteCandidateModal(false);
          setSelectedTaskIds([]);
        }}
        onConfirm={handleDeleteTask}
        title={`Are you sure you want to delete ${selectedTaskIds.length} candidate(s)?`}
        message="All information and files related to the selected candidate(s) will be deleted forever. This action cannot be undone."
        confirmButtonText="Delete"
        confirmButtonColor="#D92D20"
      />
      <DeleteConfirmationModal
        isOpen={showDeleteColumnModal}
        onClose={() => {
          setShowDeleteColumnModal(false);
          setSelectedColumnId(null);
        }}
        onConfirm={handleDeleteColumn}
        title="Are you sure you want to delete this column?"
        message="All the candidates within this column will be moved to the first column."
        confirmButtonText="Delete"
        confirmButtonColor="#D92D20"
      />
      <DeleteConfirmationModal
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
          setSelectedColumnId(null);
        }}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <IoWarningOutline size={24} />
            Oops! We can’t do that
          </div>
        }
        message="You cannot delete this column while it still contains candidates. You need to delete the candidates or move them to another column before performing this action."
        confirmButtonText="Cancel"
        confirmButtonColor="#ffffff"
        showConfirmButton={false}
      />
    </div>
  );
};

export default JiraBoard;
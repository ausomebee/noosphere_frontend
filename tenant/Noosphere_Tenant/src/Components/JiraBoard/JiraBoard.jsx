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
import NewPipelineColumnModal from "../ReusableModal/PipelineModal/NewPipelineColumnModal";
import AddProspectModal from "../ReusableModal/PipelineModal/AddProspectModal";
import DeleteConfirmationModal from "../ReusableModal/PipelineModal/DeleteConfirmationModal";
import LoadingSpinner from "../LoadingSpinner";
import "./DragAndDrop.css";
import {
  addColumn,
  updateColumnTaskIds,
  addTaskToColumn,
  removeTaskFromColumn,
  updateColumnOrder,
  deleteColumn,
  fetchPipelineByTenantId,
  fetchPipelineItems,
  createPipelineStage,
  reorderPipelineStage,
  updatePipelineItemActivity,
  deletePipelineStage,
  deletePipelineItem,
  setColumns,
  fetchSinglePipelineItem,
} from "../../ReduxStore/features/PipelineSlice";
import { FaPlus } from "react-icons/fa";
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
  const { pipeline, columns, columnOrder, status, draft, error, pipelineItem } =
    useSelector((state) => state.pipeline);
  const token = useSelector((state) => state.authentication?.user?.token);
  const tenantId = useSelector((state) => state.authentication?.user?.tenantId);
  const accessToken = token;
  const refreshToken = token;
  const [loadingCount, setLoadingCount] = useState(0);
  const isLoading = loadingCount > 0;
  const [localTasks, setLocalTasks] = useState({});
  const [draggedTask, setDraggedTask] = useState(null);
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [showAddProspectModal, setShowAddProspectModal] = useState(false);
  const [showDeleteCandidateModal, setShowDeleteCandidateModal] =
    useState(false);
  const [showDeleteColumnModal, setShowDeleteColumnModal] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [selectedColumnId, setSelectedColumnId] = useState(null);
  const [addColumnIndex, setAddColumnIndex] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
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

  const fetchPipelineData = useCallback(async () => {
    if (!authTokens?.accessToken || !authTokens?.refreshToken) {
      showToast("Authentication tokens not available.", "error");
      return;
    }

    if (!tenantId) {
      showToast("Tenant ID is not available.", "error");
      return;
    }

    if (isDataLoaded) {
      return;
    }

    let isMounted = true;
    startLoading();

    try {
      // Fetch pipeline
      const pipelineResult = await dispatch(
        fetchPipelineByTenantId({
          accessToken: authTokens.accessToken,
          refreshToken: authTokens.refreshToken,
          tenantId,
        })
      ).unwrap();
      if (!pipelineResult?.data?.length) {
        showToast("No pipeline found.", "warning");
        return;
      }
      const pipelineId = pipelineResult.data[0].id;

      // Fetch pipeline stages
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
      const newStages = [];
      stagesData.forEach((stage) => {
        if (stage.id) {
          newColumns[stage.id] = {
            id: stage.id,
            title: stage.name || "Unnamed Stage",
            taskIds: [],
            count: 0,
            colorCode: stage.colourCode || "#000000",
          };
          newColumnOrder.push(stage.id);
          newStages.push({
            stageId: stage.id,
            name: stage.name || "Unnamed Stage",
          });
        } else {
          console.warn("Skipping stage with missing ID:", stage);
        }
      });

      setStages(newStages);

      if (!newColumnOrder.length) {
        showToast("No valid stages found.", "warning");
        return;
      }

      dispatch(setColumns(newColumns));
      dispatch(updateColumnOrder(newColumnOrder));

      // Batch fetch pipeline items
      const results = await batchPromises(
        newColumnOrder,
        (stageId) =>
          dispatch(fetchPipelineItems({ stageId, ...authTokens }))
            .unwrap()
            .then((response) => ({
              stageId,
              items: response.items || [],
            }))
            .catch((err) => {
              console.error(`Failed to fetch items for stage ${stageId}:`, err);
              throw err;
            }),
        3
      );

      const newTasks = {};
      const fetchErrors = [];

      for (const result of results) {
        if (result.status === "fulfilled") {
          const { stageId, items } = result.value;
          if (Array.isArray(items) && items.length) {
            for (const item of items) {
              if (!item.id || typeof item.id !== "string") {
                console.warn(
                  `Item in stage ${stageId} missing or invalid id:`,
                  item
                );
                continue;
              }

              newTasks[item.id] = {
                id: item.id,
                firstName: item.firstName || "",
                lastName: item.lastName || "",
                preferredName: item.preferredName || "",
                fullName: item.fullName || `Candidate ${item.id.slice(0, 8)}`,
                email: item.email || "",
                phoneNumber: item.phoneNumber || "",
                streetAddress: item.streetAddress || "",
                city: item.city || "",
                state: item.state || "",
                country: item.country || "",
                zipCode: item.zipCode || "",
                gender: item.gender || "",
                DOB: item.DOB || "",
                caregiverName: item.caregiverName || "",
                relationshipToCaregiver: item.relationshipToCaregiver || "",
                assignToClinician: item.assignToClinician || "",
                clientPortalAccess: item.clientPortalAccess || false,
                createdBy: item.createdBy || "Unknown Admin",
              };
            }
          }
        } else {
          fetchErrors.push(result.reason);
        }
      }

      if (fetchErrors.length) {
        showToast(
          `Failed to fetch items for ${fetchErrors.length} stage(s).`,
          "error"
        );
      }

      if (isMounted) {
        setLocalTasks(newTasks);
        setIsDataLoaded(true);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      if (isMounted) {
        showToast("Failed to fetch pipeline data.", "error");
      }
    } finally {
      if (isMounted) {
        stopLoading();
      }
    }

    return () => {
      isMounted = false;
    };
  }, [dispatch, authTokens, tenantId, isDataLoaded]);

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
          await dispatch(
            reorderPipelineStage({
              id: activeId,
              order: overColumnIndex + 1,
              accessToken,
              refreshToken,
            })
          ).unwrap();
        } catch (err) {
          console.error("Failed to reorder column:", err);
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
        await dispatch(
          updatePipelineItemActivity({
            ids: [activeId],
            pipelineStageId: activeColumnId,
            accessToken,
            refreshToken,
          })
        ).unwrap();
      } catch (err) {
        console.error("Failed to update task order:", err);
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

      try {
        await dispatch(
          updatePipelineItemActivity({
            ids: [activeId],
            pipelineStageId: targetColumnId,
            accessToken,
            refreshToken,
          })
        ).unwrap();
      } catch (err) {
        console.error("Failed to move task:", err);
        showToast("Failed to move task.", "error");
      }
    }
  };

  const handleAddTask = (columnId, prospectData) => {
    if (!columns[columnId]) {
      showToast("Invalid column selected.", "error");
      console.error("Invalid columnId:", columnId);
      return;
    }

    if (!prospectData.id || typeof prospectData.id !== "string") {
      showToast("Invalid prospect ID.", "error");
      console.error("Invalid prospectData.id:", prospectData.id);
      return;
    }

    startLoading();
    try {
      const newTaskId = prospectData.id;
      dispatch(addTaskToColumn({ columnId, taskId: newTaskId }));
      setLocalTasks((prev) => {
        const updatedTasks = {
          ...prev,
          [newTaskId]: {
            id: newTaskId,
            firstName: prospectData.firstName || "",
            lastName: prospectData.lastName || "",
            preferredName: prospectData.preferredName || "",
            fullName: `${prospectData.firstName || ""} ${prospectData.lastName || ""}`.trim() || `New Candidate ${newTaskId.slice(0, 8)}`,
            email: prospectData.email || "",
            phoneNumber: prospectData.phoneNumber || "",
            gender: prospectData.gender || "",
            DOB: prospectData.DOB || "",
            caregiverName: prospectData.caregiverName || "",
            relationshipToCaregiver: prospectData.relationshipToCaregiver || "",
            streetAddress: prospectData.streetAddress || "",
            city: prospectData.city || "",
            state: prospectData.state || "",
            country: prospectData.country || "",
            zipCode: prospectData.zipCode || "",
            assignToClinician: prospectData.assignToClinician || "",
            clientPortalAccess: prospectData.clientPortalAccess || false,
            createdBy: prospectData.createdBy || "Unknown Admin",
          },
        };
        return updatedTasks;
      });
      setIsDataLoaded(false);
      showToast("Candidate added successfully!", "success");
    } catch (error) {
      console.error("Failed to add candidate:", error);
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
      console.error("Candidate deletion failed:", error);
      showToast(error?.message || "Failed to delete candidate(s).", "error");
    } finally {
      stopLoading();
    }
  };

  const handleDeleteColumn = async () => {
    const column = columns[selectedColumnId];
    const columnIndex = columnOrder.indexOf(selectedColumnId);
    const isFirstColumn = columnIndex === 0;
    const hasTasks = column?.taskIds?.length > 0;

    if (isFirstColumn && hasTasks) {
      showToast(
        "Cannot delete first column with candidates. Move or delete candidates first.",
        "error"
      );
      setShowDeleteColumnModal(false);
      return;
    }

    startLoading();
    try {
      if (hasTasks && columnIndex > 0) {
        const firstColumnId = columnOrder[0];
        const firstColumn = columns[firstColumnId];
        const updatedFirstColumnTaskIds = [
          ...firstColumn.taskIds,
          ...column.taskIds,
        ];

        await dispatch(
          updatePipelineItemActivity({
            ids: column.taskIds,
            pipelineStageId: firstColumnId,
            accessToken,
            refreshToken,
          })
        ).unwrap();
        dispatch(
          updateColumnTaskIds({
            columnId: firstColumnId,
            taskIds: updatedFirstColumnTaskIds,
          })
        );
      }

      await dispatch(
        deletePipelineStage({
          id: selectedColumnId,
          accessToken,
          refreshToken,
        })
      ).unwrap();
      dispatch(deleteColumn(selectedColumnId));
      setShowDeleteColumnModal(false);
      setSelectedColumnId(null);
      showToast("Column deleted successfully!", "success");
      setIsDataLoaded(false);
    } catch (error) {
      console.error("Column deletion failed:", error);
      showToast(error?.message || "Failed to delete column.", "error");
    } finally {
      stopLoading();
    }
  };

  const handleViewCandidate = (stageId, taskId) => {
    navigate(`/client/client-single/${stageId}/${taskId}`);
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
      console.error("Failed to create pipeline stage:", error);
      showToast(error?.message || "Failed to create pipeline stage.", "error");
    } finally {
      stopLoading();
    }
  };

  const hasColumns = columnOrder.length > 0;

  if (isLoading || status === "loading") {
    return <LoadingSpinner />;
  }

  if (status === "failed") {
    console.error("Pipeline error:", error);
    return <div>Error: {error}</div>;
  }

  return (
    <div className="jira-board-container">
      <div className="apicall">
        <div className="board-header">
          <div className="board-title">
            <h1>{pipeline?.name || "Pipeline"}</h1>
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
            onViewCandidate={handleViewCandidate}
            onAddColumn={handleAddColumn}
            onDeleteColumn={(columnId) => {
              setSelectedColumnId(columnId);
              setShowDeleteColumnModal(true);
            }}
            pipelineId={pipeline?.id}
            stages={stages}
            selectedTaskIds={selectedTaskIds}
            toggleTaskSelection={toggleTaskSelection}
            setSelectedTaskIds={setSelectedTaskIds}
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
        stages={stages}
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
        message={
          columnOrder.indexOf(selectedColumnId) > 0
            ? "All candidates within this column will be moved to the first column."
            : "This column can be deleted since it has no candidates."
        }
        confirmButtonText="Delete"
        confirmButtonColor="#D92D20"
      />
    </div>
  );
};

export default JiraBoard;
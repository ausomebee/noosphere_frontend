import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import api from "../../api/TenantApis";

const initialState = {
  draft: {
    name: "",
    description: "",
    colorCode: "#1E40AF",
    requiredTasks: [],
    requiredDocuments: [],
  },
  pipeline: null,
  columns: {},
  columnOrder: [],
  stages: [],
  status: "idle",
  error: null,
  pipelineItem: null,
};

const pipelineSlice = createSlice({
  name: "pipeline",
  initialState,
  reducers: {
    updateDraft: (state, action) => {
      state.draft = { ...state.draft, ...action.payload };
    },
    addTaskToDraft: (state, action) => {
      state.draft.requiredTasks = [
        ...state.draft.requiredTasks,
        {
          id: uuidv4(),
          name: action.payload.name,
          required: action.payload.required,
        },
      ];
    },
    removeTaskFromDraft: (state, action) => {
      state.draft.requiredTasks = state.draft.requiredTasks.filter(
        (task) => task.id !== action.payload
      );
    },
    toggleTaskRequiredInDraft: (state, action) => {
      const task = state.draft.requiredTasks.find((task) => task.id === action.payload);
      if (task) task.required = !task.required;
    },
    addDocumentToDraft: (state, action) => {
      state.draft.requiredDocuments = [
        ...state.draft.requiredDocuments,
        {
          id: uuidv4(),
          name: action.payload.name,
          required: action.payload.required,
        },
      ];
    },
    removeDocumentFromDraft: (state, action) => {
      state.draft.requiredDocuments = state.draft.requiredDocuments.filter(
        (doc) => doc.id !== action.payload
      );
    },
    toggleDocumentRequiredInDraft: (state, action) => {
      const doc = state.draft.requiredDocuments.find((doc) => doc.id === action.payload);
      if (doc) doc.required = !doc.required;
    },
    addColumn: (state, action) => {
      const { pipelineData, index, stageId } = action.payload;
      const newColumnId = stageId || uuidv4();
      state.columns[newColumnId] = {
        id: newColumnId,
        title: pipelineData.name || "New Stage",
        taskIds: [],
        count: 0,
        description: pipelineData.description,
        colorCode: pipelineData.colorCode,
        requiredTasks: pipelineData.requiredTasks || [],
        requiredDocuments: pipelineData.requiredDocuments || [],
        order: pipelineData.order || index || state.columnOrder.length,
      };
      if (index !== undefined && index >= 0 && index <= state.columnOrder.length) {
        state.columnOrder.splice(index, 0, newColumnId);
      } else {
        state.columnOrder.push(newColumnId);
      }
      state.draft = initialState.draft;
    },
    resetDraft: (state) => {
      state.draft = initialState.draft;
    },
    setColumns: (state, action) => {
      state.columns = action.payload;
    },
    updateColumnTaskIds: (state, action) => {
      const { columnId, taskIds } = action.payload;
      if (!state.columns[columnId]) return;
      state.columns[columnId].taskIds = taskIds.filter(
        (taskId) => taskId != null && typeof taskId === "string"
      );
      state.columns[columnId].count = state.columns[columnId].taskIds.length;
    },
    addTaskToColumn: (state, action) => {
      const { columnId, taskId } = action.payload;
      if (!state.columns[columnId] || !taskId) return;
      state.columns[columnId].taskIds.push(taskId);
      state.columns[columnId].count = state.columns[columnId].taskIds.length;
    },
    removeTaskFromColumn: (state, action) => {
      const { columnId, taskId } = action.payload;
      if (!state.columns[columnId]) return;
      state.columns[columnId].taskIds = state.columns[columnId].taskIds.filter(
        (id) => id !== taskId
      );
      state.columns[columnId].count = state.columns[columnId].taskIds.length;
    },
    updateColumnOrder: (state, action) => {
      state.columnOrder = action.payload;
    },
     deleteColumn: (state, action) => {
      const columnId = action.payload;
      if (!state.columns[columnId]) return;
      delete state.columns[columnId];
      state.columnOrder = state.columnOrder.filter((id) => id !== columnId);
      state.stages = state.stages.filter((stage) => stage.stageId !== columnId);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPipelineByTenantId.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchPipelineByTenantId.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.pipeline = action.payload.data?.[0] || null;
      })
      .addCase(fetchPipelineByTenantId.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })
      .addCase(fetchPipelineStages.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchPipelineStages.fulfilled, (state, action) => {
        state.status = "succeeded";
        const stages = action.payload.data || [];
        state.columns = {};
        state.columnOrder = [];
        stages.forEach((stage) => {
          state.columns[stage.id] = {
            id: stage.id,
            title: stage.name,
            taskIds: [],
            count: 0,
            description: stage.description,
            colorCode: stage.colourCode,
            requiredTasks: stage.tasks || [],
            requiredDocuments: stage.documents || [],
            order: stage.order || 0,
          };
          state.columnOrder.push(stage.id);
        });
        state.columnOrder.sort((a, b) => state.columns[a].order - state.columns[b].order);
        state.stages = stages.map((stage) => ({
          stageId: stage.id,
          name: stage.name,
        }));
      })
      .addCase(fetchPipelineStages.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })
      .addCase(fetchSinglePipelineStages.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchSinglePipelineStages.fulfilled, (state, action) => {
        state.status = "succeeded";
        const stage = action.payload.data;
        if (stage) {
          state.draft = {
            id: stage.id,
            name: stage.name || "",
            description: stage.description || "",
            colorCode: stage.colourCode || "#1E40AF",
            requiredTasks: Array.isArray(stage.tasks) ? stage.tasks : [],
            requiredDocuments: Array.isArray(stage.documents) ? stage.documents : [],
          };
        }
      })
      .addCase(fetchSinglePipelineStages.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })
      .addCase(fetchPipelineItems.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchPipelineItems.fulfilled, (state, action) => {
        state.status = "succeeded";
        const { stageId, items = [] } = action.payload;
        if (!state.columns[stageId]) {
          state.columns[stageId] = {
            id: stageId,
            title: `Stage ${stageId.slice(0, 8)}`,
            taskIds: [],
            count: 0,
            requiredTasks: [],
            requiredDocuments: [],
            colorCode: "#000000",
            order: state.columnOrder.length,
          };
          state.columnOrder.push(stageId);
        }
        state.columns[stageId].taskIds = items
          .map((item) => item?.id)
          .filter((id) => id && typeof id === "string");
        state.columns[stageId].count = state.columns[stageId].taskIds.length;
      })
      .addCase(fetchPipelineItems.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })
      .addCase(createPipelineStage.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(createPipelineStage.fulfilled, (state, action) => {
        state.status = "succeeded";
        const stage = action.payload.data;
        if (!stage) return;
        const newColumnId = stage.id;
        state.columns[newColumnId] = {
          id: newColumnId,
          title: stage.name,
          taskIds: [],
          count: 0,
          description: stage.description,
          colorCode: stage.colourCode,
          requiredTasks: stage.tasks || [],
          requiredDocuments: stage.documents || [],
          order: stage.order || state.columnOrder.length,
        };
        state.columnOrder.push(newColumnId);
        state.stages.push({ stageId: stage.id, name: stage.name });
        state.columnOrder.sort((a, b) => state.columns[a].order - state.columns[b].order);
        state.draft = initialState.draft;
      })
      .addCase(createPipelineStage.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })
      .addCase(updateStageTasks.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(updateStageTasks.fulfilled, (state, action) => {
        state.status = "succeeded";
        const { pipelineStageId, tasks } = action.payload;
        if (state.columns[pipelineStageId]) {
          state.columns[pipelineStageId].requiredTasks = tasks;
          state.draft.requiredTasks = tasks;
        }
      })
      .addCase(updateStageTasks.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })
      .addCase(updateStageDocuments.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(updateStageDocuments.fulfilled, (state, action) => {
        state.status = "succeeded";
        const { pipelineStageId, documents } = action.payload;
        if (state.columns[pipelineStageId]) {
          state.columns[pipelineStageId].requiredDocuments = documents;
          state.draft.requiredDocuments = documents;
        }
      })
      .addCase(updateStageDocuments.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })
      .addCase(createCandidate.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(createCandidate.fulfilled, (state, action) => {
        state.status = "succeeded";
        const candidate = action.payload.data;
        const columnId = candidate.pipelineStageId;
        if (state.columns[columnId]) {
          state.columns[columnId].taskIds.push(candidate.id);
          state.columns[columnId].count = state.columns[columnId].taskIds.length;
        }
      })
      .addCase(createCandidate.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })
      .addCase(reorderPipelineStage.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(reorderPipelineStage.fulfilled, (state, action) => {
        state.status = "succeeded";
        const stage = action.payload.data;
        if (state.columns[stage.id]) {
          state.columns[stage.id].order = stage.order;
          state.columnOrder.sort((a, b) => state.columns[a].order - state.columns[b].order);
        }
      })
      .addCase(reorderPipelineStage.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })
      .addCase(updatePipelineItemActivity.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(updatePipelineItemActivity.fulfilled, (state, action) => {
        state.status = "succeeded";
        const { ids, pipelineStageId } = action.payload;
        ids.forEach((id) => {
          Object.keys(state.columns).forEach((columnId) => {
            if (columnId !== pipelineStageId) {
              state.columns[columnId].taskIds = state.columns[columnId].taskIds.filter(
                (taskId) => taskId !== id
              );
              state.columns[columnId].count = state.columns[columnId].taskIds.length;
            }
          });
          if (state.columns[pipelineStageId] && !state.columns[pipelineStageId].taskIds.includes(id)) {
            state.columns[pipelineStageId].taskIds.push(id);
            state.columns[pipelineStageId].count = state.columns[pipelineStageId].taskIds.length;
          }
        });
      })
      .addCase(updatePipelineItemActivity.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })
       .addCase(deletePipelineStage.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(deletePipelineStage.fulfilled, (state, action) => {
        state.status = "succeeded";
        const { id } = action.payload;
        if (state.columns[id]) {
          delete state.columns[id];
          state.columnOrder = state.columnOrder.filter((colId) => colId !== id);
          state.stages = state.stages.filter((stage) => stage.stageId !== id);
        }
      })
      .addCase(deletePipelineStage.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })
      .addCase(deletePipelineItem.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(deletePipelineItem.fulfilled, (state, action) => {
        state.status = "succeeded";
        const { ids } = action.payload;
        ids.forEach((id) => {
          Object.keys(state.columns).forEach((columnId) => {
            state.columns[columnId].taskIds = state.columns[columnId].taskIds.filter(
              (taskId) => taskId !== id
            );
            state.columns[columnId].count = state.columns[columnId].taskIds.length;
          });
        });
      })
      .addCase(deletePipelineItem.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })
      .addCase(fetchSinglePipelineItem.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchSinglePipelineItem.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.pipelineItem = action.payload.data;
      })
      .addCase(fetchSinglePipelineItem.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })
      .addCase(updateCandidate.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(updateCandidate.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(updateCandidate.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })
      .addCase(updatePipelineItemTaskToDone.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(updatePipelineItemTaskToDone.fulfilled, (state, action) => {
        state.status = "succeeded";
        if (state.pipelineItem) {
          state.pipelineItem.doneTasks = action.payload.data.tasks;
        }
      })
      .addCase(updatePipelineItemTaskToDone.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      })
      .addCase(updatePipelineItemDocumentToDone.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(updatePipelineItemDocumentToDone.fulfilled, (state, action) => {
        state.status = "succeeded";
        if (state.pipelineItem) {
          state.pipelineItem.sentDocuments = action.payload.data.documents;
        }
      })
      .addCase(updatePipelineItemDocumentToDone.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      });
  },
});

export const fetchPipelineByTenantId = createAsyncThunk(
  "pipeline/fetchPipelineByTenantId",
  async ({ tenantId, accessToken, refreshToken }, { rejectWithValue }) => {
    try {
      const response = await api.GetPipelineByTenantId({ tenantId, accessToken, refreshToken });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchPipelineStages = createAsyncThunk(
  "pipeline/fetchPipelineStages",
  async ({ pipelineId, accessToken, refreshToken }, { rejectWithValue }) => {
    try {
      const response = await api.GetPipelineStage({ pipelineId, accessToken, refreshToken });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchSinglePipelineItem = createAsyncThunk(
  "pipeline/fetchSinglePipelineItem",
  async ({ itemId, accessToken, refreshToken }, { rejectWithValue }) => {
    try {
      const response = await api.GetSinglePipelineItem({ itemId, accessToken, refreshToken });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchSinglePipelineStages = createAsyncThunk(
  "pipeline/fetchSinglePipelineStages",
  async ({ pipelineStageId, accessToken, refreshToken }, { rejectWithValue }) => {
    try {
      const response = await api.GetSinglePipelineStage({ pipelineStageId, accessToken, refreshToken });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchPipelineItems = createAsyncThunk(
  "pipeline/fetchPipelineItems",
  async ({ stageId, accessToken, refreshToken }, { rejectWithValue }) => {
    try {
      const response = await api.GetPipelineItem({ stageId, accessToken, refreshToken });
      const items = Array.isArray(response.data?.data)
        ? response.data.data.map((item) => ({
            id: item.id,
            fullName: item.client?.fullName || item.fullName || `Candidate ${item.id.slice(0, 8)}`,
            createdBy: item.client?.tenantLinks?.[0]?.tenantStaff?.fullName || item.createdBy || "Unknown Admin",
            email: item.client?.email || item.email || "",
            phoneNumber: item.client?.phoneNumber || item.phoneNumber || "",
            streetAddress: item.client?.streetAddress || item.streetAddress || "",
            city: item.client?.city || item.city || "",
            state: item.client?.state || item.state || "",
            country: item.client?.country || item.country || "",
            zipCode: item.client?.zipCode || item.zipCode || "",
            gender: item.client?.gender || item.gender || "",
            DOB: item.client?.DOB || item.DOB || "",
            pipelineStageId: item.pipelineStageId || stageId,
            assignToTenantStaff: item.assignToTenantStaff || null,
            status: item.status || "pending",
            createdAt: item.createdAt || ""
          }))
        : [];
      return { stageId, items };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const createPipelineStage = createAsyncThunk(
  "pipeline/createPipelineStage",
  async (
    { pipelineId, name, description, colourCode, tasks = [], documents = [], accessToken, refreshToken },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.CreatePipelineStage({
        pipelineId,
        name,
        description,
        colourCode,
        tasks: Array.isArray(tasks) ? tasks : [],
        documents: Array.isArray(documents) ? documents : [],
        accessToken,
        refreshToken,
      });
      if (response.data.status !== "ok") {
        throw new Error(response.data.message || "Failed to create pipeline stage");
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updateStageTasks = createAsyncThunk(
  "pipeline/updateStageTasks",
  async ({ pipelineStageId, tasks, accessToken, refreshToken }, { rejectWithValue }) => {
    try {
      const response = await api.UpdateStageTasks({
        pipelineStageId,
        tasks: tasks.map((task) => ({
          id: task.id || uuidv4(),
          name: task.name,
          required: task.required,
        })),
        accessToken,
        refreshToken,
      });
      return { pipelineStageId, tasks };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updateStageDocuments = createAsyncThunk(
  "pipeline/updateStageDocuments",
  async ({ pipelineStageId, documents, accessToken, refreshToken }, { rejectWithValue }) => {
    try {
      const response = await api.UpdateStageDocuments({
        pipelineStageId,
        documents: documents.map((doc) => ({
          id: doc.id || uuidv4(),
          name: doc.name,
          required: doc.required,
        })),
        accessToken,
        refreshToken,
      });
      return { pipelineStageId, documents };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const createCandidate = createAsyncThunk(
  "pipeline/createCandidate",
  async (
    {
      fullName,
      email,
      streetAddress,
      stage,
      city,
      state,
      country,
      zipCode,
      phoneNumber,
      gender,
      DOB,
      tenantId,
      pipelineStageId,
      assignToTenantStaff,
      accessToken,
      refreshToken,
      dbAccess,
      createdBy
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.CreateCandidate({
        fullName,
        email,
        streetAddress,
        stage,
        city,
        state,
        country,
        zipCode,
        phoneNumber,
        gender,
        DOB,
        tenantId,
        pipelineStageId,
        assignToTenantStaff,
        accessToken,
        refreshToken,
        dbAccess,
        createdBy
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const reorderPipelineStage = createAsyncThunk(
  "pipeline/reorderPipelineStage",
  async ({ id, order, accessToken, refreshToken }, { rejectWithValue }) => {
    try {
      const response = await api.ReorderPipelineStage({ id, order, accessToken, refreshToken });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);


export const updatePipelineItemActivity = createAsyncThunk(
  "pipeline/updatePipelineItemActivity",
  async (
    { ids, pipelineStageId, accessToken, refreshToken },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.UpdatePipelineItemActivity({
        ids: Array.isArray(ids) ? ids : [ids],
        pipelineStageId,
        accessToken,
        refreshToken,
      });
      return {
        ...response,
        ids: Array.isArray(ids) ? ids : [ids],
        pipelineStageId,
      };
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to update pipeline item activity"
      );
    }
  }
);

export const updatePipelineItemTaskToDone = createAsyncThunk(
  "pipeline/updatePipelineItemTaskToDone",
  async (
    { pipelineItemId, doneTasks, accessToken, refreshToken },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.UpdateStageTasksToDone({
        pipelineItemId,
        doneTasks,
        accessToken,
        refreshToken,
      });
      return response.data;
    } catch (error) {
      console.error("THUNK ERROR:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updatePipelineItemDocumentToDone = createAsyncThunk(
  "pipeline/updatePipelineItemDocumentToDone",
  async (
    { pipelineItemId, documents, accessToken, refreshToken },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.UpdateStageDocumentsToDone({
        pipelineItemId,
        documents,
        accessToken,
        refreshToken,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const deletePipelineStage = createAsyncThunk(
  "pipeline/deletePipelineStage",
  async ({ id, accessToken, refreshToken }, { rejectWithValue, dispatch, getState }) => {
    try {
      const state = getState();
      const columns = state.pipeline.columns;
      const columnOrder = state.pipeline.columnOrder;
      const column = columns[id];
      const columnIndex = columnOrder.indexOf(id);
      const isFirstColumn = columnIndex === 0;
      const hasTasks = column?.taskIds?.length > 0;

      if (isFirstColumn && hasTasks) {
        throw new Error("Cannot delete first column with candidates. Move or delete candidates first.");
      }

      if (hasTasks && columnIndex > 0) {
        const firstColumnId = columnOrder[0];
        await dispatch(
          updatePipelineItemActivity({
            ids: column.taskIds,
            pipelineStageId: firstColumnId,
            accessToken,
            refreshToken,
          })
        ).unwrap();
      }

      const response = await api.DeletePipelineStage({ id, accessToken, refreshToken });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const deletePipelineItem = createAsyncThunk(
  "pipeline/deletePipelineItem",
  async ({ ids, accessToken, refreshToken }, { rejectWithValue }) => {
    try {
      const response = await api.DeletePipelineItem({
        ids: Array.isArray(ids) ? ids : [ids],
        accessToken,
        refreshToken,
      });
      return { ...response, ids: Array.isArray(ids) ? ids : [ids] };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to delete pipeline item");
    }
  }
);

export const updateCandidate = createAsyncThunk(
  "pipeline/updateCandidate",
  async (
    {
      id,
      fullName,
      email,
      streetAddress,
      stage,
      city,
      state,
      country,
      zipCode,
      phoneNumber,
      gender,
      DOB,
      tenantId,
      pipelineStageId,
      assignToTenantStaff,
      accessToken,
      refreshToken,
      dbAccess,
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.UpdateCandidate({
        id,
        fullName,
        email,
        streetAddress,
        stage,
        city,
        state,
        country,
        zipCode,
        phoneNumber,
        gender,
        DOB,
        tenantId,
        pipelineStageId,
        assignToTenantStaff,
        accessToken,
        refreshToken,
        dbAccess,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const {
  updateDraft,
  addTaskToDraft,
  removeTaskFromDraft,
  toggleTaskRequiredInDraft,
  addDocumentToDraft,
  removeDocumentFromDraft,
  toggleDocumentRequiredInDraft,
  addColumn,
  resetDraft,
  setColumns,
  updateColumnTaskIds,
  addTaskToColumn,
  removeTaskFromColumn,
  updateColumnOrder,
  deleteColumn,
} = pipelineSlice.actions;



export const selectPipeline = (state) => state.pipeline.pipeline;
export const selectColumns = (state) => state.pipeline.columns;
export const selectColumnOrder = (state) => state.pipeline.columnOrder;
export const selectDraft = (state) => state.pipeline.draft;
export const selectStages = (state) => state.pipeline.stages;
export const selectStatus = (state) => state.pipeline.status;
export const selectError = (state) => state.pipeline.error;
export const selectPipelineItem = (state) => state.pipeline.pipelineItem;

export default pipelineSlice.reducer;
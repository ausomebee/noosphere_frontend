import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import api from "../../api/TenantApis";

const initialState = {
  draft: {
    name: "",
    description: "",
    colorCode: "#1E40AF",
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
      .addCase(createCandidate.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(createCandidate.fulfilled, (state, action) => {
        state.status = "succeeded";
        const candidate = action.payload.data;
        if (candidate && candidate.pipelineStageId) {
          const columnId = candidate.pipelineStageId;
          if (state.columns[columnId]) {
            state.columns[columnId].taskIds.push(candidate.id);
            state.columns[columnId].count = state.columns[columnId].taskIds.length;
          }
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
      });
  },
});

// Export async thunks
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
        ? response.data.data.map((item) => {
            const client = item.client || {};
            const creator = client.tenantLinks?.[0]?.tenantStaff?.fullName || "Unknown Admin";

            return {
              id: item.id,
              firstName: client.firstName || "",
              lastName: client.lastName || "",
              preferredName: client.preferredName || "",
              fullName: `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Unknown Candidate",
              email: client.email || "",
              phoneNumber: client.phoneNumber || "",
              gender: client.gender || "",
              DOB: client.DOB || "",
              caregiverName: client.caregiverName || "",
              relationshipToCaregiver: client.relationshipToCaregiver || "",
              streetAddress: client.streetAddress || "",
              city: client.city || "",
              state: client.state || "",
              country: client.country || "",
              zipCode: client.zipCode || "",
              assignToClinician: item.assignToClinician || null,
              clientPortalAccess: item.clientPortalAccess || false,
              pipelineStageId: item.pipelineStageId || stageId,
              status: item.status || "pending",
              createdAt: item.createdAt || "",
              createdBy: creator, // Fixed: safe access
            };
          })
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
    { pipelineId, name, description, colourCode, accessToken, refreshToken },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.CreatePipelineStage({
        pipelineId,
        name,
        description,
        colourCode,
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

export const createCandidate = createAsyncThunk(
  "pipeline/createCandidate",
  async (
    {
      firstName,
      lastName,
      preferredName,
      email,
      phone,
      gender,
      DOB,
      primaryPayer,
      streetAddress,
      city,
      state,
      country,
      zip,
      tenantId,
      pipelineStageId,
      assignToClinician,
      clientPortalAccess,
      caregiverName,
      caregiverRelationship,
      caregiverPhone,
      caregiverEmail,
      caregiverStreetAddress,
      caregiverCity,
      caregiverState,
      caregiverCountry,
      caregiverZip,
      documents,
      createdBy,
      accessToken,
      refreshToken,
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.CreateCandidate({
        firstName,
        lastName,
        preferredName,
        email,
        phoneNumber: phone, // Map phone to phoneNumber
        gender,
        DOB,
        primaryPayer,
        streetAddress,
        city,
        state,
        country,
        createdBy,
        zipCode: zip, // Map zip to zipCode
        tenantId,
        pipelineStageId,
        assignToClinician,
        clientPortalAccess,
        caregiverName,
        caregiverRelationship,
        caregiverPhone,
        caregiverEmail,
        caregiverStreetAddress,
        caregiverCity,
        caregiverState,
        caregiverCountry,
        caregiverZip,
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
      firstName,
      lastName,
      preferredName,
      email,
      phone,
      gender,
      DOB,
      primaryPayer,
      streetAddress,
      city,
      state,
      country,
      zip,
      tenantId,
      pipelineStageId,
      assignToClinician,
      clientPortalAccess,
      caregiverName,
      caregiverRelationship,
      caregiverPhone,
      caregiverEmail,
      caregiverStreetAddress,
      caregiverCity,
      caregiverState,
      caregiverCountry,
      caregiverZip,
      documents,
      accessToken,
      refreshToken,
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.UpdateCandidate({
        id,
        firstName,
        lastName,
        preferredName,
        email,
        phoneNumber: phone, // Map phone to phoneNumber
        gender,
        DOB,
        primaryPayer,
        streetAddress,
        city,
        state,
        country,
        zipCode: zip, // Map zip to zipCode
        tenantId,
        pipelineStageId,
        assignToClinician,
        clientPortalAccess,
        caregiverName,
        caregiverRelationship,
        caregiverPhone,
        caregiverEmail,
        caregiverStreetAddress,
        caregiverCity,
        caregiverState,
        caregiverCountry,
        caregiverZip,
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

export const {
  updateDraft,
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
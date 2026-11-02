import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/FeatureApis";
import { formatDatePadded } from "../../Helper/Formatters";

const initialState = {
  featureGroups: [],
  loading: false,
  error: null,
};

// Async Thunks for API Calls
export const asyncCreateFeatureGroup = createAsyncThunk(
  "featureManagement/asyncCreateFeatureGroup",
  async ({ name, accessToken, refreshToken }, { rejectWithValue }) => {
    try {
      const response = await api.CreateFeatureGroup({
        name,
        accessToken,
        refreshToken,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const asyncUpdateFeatureGroup = createAsyncThunk(
  "featureManagement/asyncUpdateFeatureGroup",
  async ({ id, name, accessToken, refreshToken }, { rejectWithValue }) => {
    try {
      const response = await api.UpdateFeatureGroup({
        id,
        name,
        accessToken,
        refreshToken,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const asyncDeleteFeatureGroup = createAsyncThunk(
  "featureManagement/asyncDeleteFeatureGroup",
  async (
    { id, administratorPassword, accessToken, refreshToken },
    { rejectWithValue }
  ) => {
    try {
      await api.DeleteFeatureGroup({
        id,
        administratorPassword,
        accessToken,
        refreshToken,
      });
      return { id };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const asyncCreateFeature = createAsyncThunk(
  "featureManagement/asyncCreateFeature",
  async (
    {
      featureGroupId,
      name,
      description,
      active,
      applicablePlans,
      managedBy,
      accessToken,
      refreshToken,
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.CreateFeature({
        featureGroupId,
        name,
        description,
        active,
        applicablePlans,
        managedBy,
        accessToken,
        refreshToken,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const asyncUpdateFeature = createAsyncThunk(
  "featureManagement/asyncUpdateFeature",
  async (
    {
      id,
      name,
      description,
      active,
      applicablePlans,
      managedBy,
      accessToken,
      refreshToken,
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.UpdateFeature({
        id,
        name,
        description,
        active,
        applicablePlans,
        managedBy,
        accessToken,
        refreshToken,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const asyncDeleteFeature = createAsyncThunk(
  "featureManagement/asyncDeleteFeature",
  async (
    { id, administratorPassword, accessToken, refreshToken },
    { rejectWithValue }
  ) => {
    try {
      await api.DeleteFeature({
        id,
        administratorPassword,
        accessToken,
        refreshToken,
      });
      return { id };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const asyncMoveFeatureToAnotherGroup = createAsyncThunk(
  "featureManagement/asyncMoveFeatureToAnotherGroup",
  async (
    { id, featureGroupId, accessToken, refreshToken },
    { rejectWithValue }
  ) => {
    try {
      await api.MoveFeatureToAnotherGroup({
        id,
        featureGroupId,
        accessToken,
        refreshToken,
      });
      return { id, featureGroupId };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const asyncEnableOrDisableFeature = createAsyncThunk(
  "featureManagement/asyncEnableOrDisableFeature",
  async ({ id, active, accessToken, refreshToken }, { rejectWithValue }) => {
    try {
      await api.EnableOrDisableFeature({
        id,
        active,
        accessToken,
        refreshToken,
      });
      return { id, active };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const asyncAssignFeatureToPlan = createAsyncThunk(
  "featureManagement/asyncAssignFeatureToPlan",
  async (
    { id, applicablePlans, accessToken, refreshToken },
    { rejectWithValue }
  ) => {
    try {
      await api.AssignFeatureToPlan({
        id,
        applicablePlans,
        accessToken,
        refreshToken,
      });
      return { id, applicablePlans };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const asyncFetchAllFeatureGroups = createAsyncThunk(
  "featureManagement/asyncFetchAllFeatureGroups",
  async ({ accessToken, refreshToken }, { rejectWithValue }) => {
    try {
      const response = await api.GetAllFeatureGroups({
        accessToken,
        refreshToken,
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const asyncFetchAllFeatures = createAsyncThunk(
  "featureManagement/asyncFetchAllFeatures",
  async ({ accessToken, refreshToken }, { rejectWithValue }) => {
    try {
      const response = await api.GetAllFeatures({ accessToken, refreshToken });
      return response.data.data;
    } catch (error) {
      // The API helper re-throws a plain Error, so the reason is on `message`.
      return rejectWithValue(error.message);
    }
  }
);

const featureManagementSlice = createSlice({
  name: "featureManagement",
  initialState,
  reducers: {
    addFeatureGroup: (state, action) => {
      state.featureGroups.push({
        title: action.payload.title,
        features: [],
        id: action.payload.id,
      });
    },
    editFeatureGroup: (state, action) => {
      const { oldTitle, newTitle } = action.payload;
      const group = state.featureGroups.find((g) => g.title === oldTitle);
      if (group) {
        group.title = newTitle;
      }
    },
    deleteFeatureGroup: (state, action) => {
      const groupTitle = action.payload;
      const groupToDelete = state.featureGroups.find(
        (g) => g.title === groupTitle
      );
      const extraFeaturesGroup = state.featureGroups.find(
        (g) => g.title === "Extra Features"
      );

      if (
        groupToDelete &&
        extraFeaturesGroup &&
        groupTitle !== "Extra Features"
      ) {
        extraFeaturesGroup.features.push(...groupToDelete.features);
        state.featureGroups = state.featureGroups.filter(
          (g) => g.title !== groupTitle
        );
      } else if (groupToDelete) {
        state.featureGroups = state.featureGroups.filter(
          (g) => g.title !== groupTitle
        );
      }
    },
    addFeature: (state, action) => {
      const { groupTitle, feature } = action.payload;
      const group = state.featureGroups.find((g) => g.title === groupTitle);
      if (group) {
        group.features.push({
          ...feature,
          id: Date.now().toString(),
          selected: false,
          description: feature.description || "",
        });
      }
    },
    editFeature: (state, action) => {
      const { groupTitle, featureId, updatedFeature } = action.payload;
      const group = state.featureGroups.find((g) => g.title === groupTitle);
      if (group) {
        const featureIndex = group.features.findIndex(
          (f) => f.id === featureId
        );
        if (featureIndex !== -1) {
          group.features[featureIndex] = {
            ...group.features[featureIndex],
            ...updatedFeature,
            description:
              updatedFeature.description ||
              group.features[featureIndex].description ||
              "",
          };
        }
      }
    },
    deleteFeature: (state, action) => {
      const { groupTitle, featureId } = action.payload;
      const group = state.featureGroups.find((g) => g.title === groupTitle);
      if (group) {
        group.features = group.features.filter((f) => f.id !== featureId);
      }
    },
    moveFeature: (state, action) => {
      const { featureId, fromGroupTitle, toGroupTitle } = action.payload;
      const fromGroup = state.featureGroups.find(
        (g) => g.title === fromGroupTitle
      );
      const toGroup = state.featureGroups.find((g) => g.title === toGroupTitle);
      if (fromGroup && toGroup) {
        const featureIndex = fromGroup.features.findIndex(
          (f) => f.id === featureId
        );
        if (featureIndex !== -1) {
          const [feature] = fromGroup.features.splice(featureIndex, 1);
          toGroup.features.push(feature);
        }
      }
    },
    toggleFeatureActive: (state, action) => {
      const { groupTitle, featureId, active } = action.payload;
      const group = state.featureGroups.find((g) => g.title === groupTitle);
      if (group) {
        const feature = group.features.find((f) => f.id === featureId);
        if (feature) {
          feature.active = active;
        }
      }
    },
    assignFeaturePlan: (state, action) => {
      const { groupTitle, featureId, plans } = action.payload;
      const group = state.featureGroups.find((g) => g.title === groupTitle);
      if (group) {
        const feature = group.features.find((f) => f.id === featureId);
        if (feature) {
          feature.plan = plans;
        }
      }
    },
    toggleSelectFeature: (state, action) => {
      const { groupTitle, featureId } = action.payload;
      const group = state.featureGroups.find((g) => g.title === groupTitle);
      if (group) {
        const feature = group.features.find((f) => f.id === featureId);
        if (feature) {
          feature.selected = !feature.selected;
        }
      }
    },
    toggleSelectAllFeatures: (state, action) => {
      const { groupTitle, select } = action.payload;
      const group = state.featureGroups.find((g) => g.title === groupTitle);
      if (group) {
        group.features.forEach((feature) => {
          feature.selected = select;
        });
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Feature Group
      .addCase(asyncCreateFeatureGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(asyncCreateFeatureGroup.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.name) {
          // Only add if title exists
          state.featureGroups.push({
            id: action.payload.id,
            title: action.payload.name,
            features: [], // Initialize with empty features, to be populated by asyncFetchAllFeatures
          });
        }
      })
      .addCase(asyncCreateFeatureGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Feature Group
      .addCase(asyncUpdateFeatureGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(asyncUpdateFeatureGroup.fulfilled, (state, action) => {
        state.loading = false;
        const group = state.featureGroups.find(
          (g) => g.id === action.payload.id
        );
        if (group) {
          group.title = action.payload.name;
        }
      })
      .addCase(asyncUpdateFeatureGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete Feature Group
      .addCase(asyncDeleteFeatureGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(asyncDeleteFeatureGroup.fulfilled, (state, action) => {
        state.loading = false;
        const groupToDelete = state.featureGroups.find(
          (g) => g.id === action.payload.id
        );
        const extraFeaturesGroup = state.featureGroups.find(
          (g) => g.title === "Extra Features"
        );
        if (
          groupToDelete &&
          extraFeaturesGroup &&
          groupToDelete.title !== "Extra Features"
        ) {
          extraFeaturesGroup.features.push(...groupToDelete.features);
          state.featureGroups = state.featureGroups.filter(
            (g) => g.id !== action.payload.id
          );
        } else if (groupToDelete) {
          state.featureGroups = state.featureGroups.filter(
            (g) => g.id !== action.payload.id
          );
        }
      })
      .addCase(asyncDeleteFeatureGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Feature
      .addCase(asyncCreateFeature.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(asyncCreateFeature.fulfilled, (state, action) => {
        state.loading = false;
        const group = state.featureGroups.find(
          (g) => g.id === action.payload.featureGroupId
        );
        if (group) {
          group.features.push({
            id: action.payload.id,
            name: action.payload.name,
            description: action.payload.description || "",
            dateAdded: formatDatePadded(action.payload.createdAt),
            managedBy: action.payload.managedBy || "Admin",
            active: action.payload.active,
            selected: false,
          });
        }
      })
      .addCase(asyncCreateFeature.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Feature
      .addCase(asyncUpdateFeature.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(asyncUpdateFeature.fulfilled, (state, action) => {
        state.loading = false;
        state.featureGroups.forEach((group) => {
          const featureIndex = group.features.findIndex(
            (f) => f.id === action.payload.id
          );
          if (featureIndex !== -1) {
            group.features[featureIndex] = {
              ...group.features[featureIndex],
              name: action.payload.name,
              description:
                action.payload.description ||
                group.features[featureIndex].description ||
                "",
              active: action.payload.active,
              managedBy:
                action.payload.managedBy ||
                group.features[featureIndex].managedBy,
              dateAdded: formatDatePadded(action.payload.updatedAt),
            };
          }
        });
      })
      .addCase(asyncUpdateFeature.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete Feature
      .addCase(asyncDeleteFeature.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(asyncDeleteFeature.fulfilled, (state, action) => {
        state.loading = false;
        state.featureGroups.forEach((group) => {
          group.features = group.features.filter(
            (f) => f.id !== action.payload.id
          );
        });
      })
      .addCase(asyncDeleteFeature.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Move Feature
      .addCase(asyncMoveFeatureToAnotherGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(asyncMoveFeatureToAnotherGroup.fulfilled, (state, action) => {
        state.loading = false;
        const { id, featureGroupId } = action.payload;
        let featureToMove = null;
        const fromGroup = state.featureGroups.find((g) =>
          g.features.some((f) => f.id === id)
        );
        const toGroup = state.featureGroups.find(
          (g) => g.id === featureGroupId
        );
        if (fromGroup && toGroup) {
          const featureIndex = fromGroup.features.findIndex((f) => f.id === id);
          if (featureIndex !== -1) {
            [featureToMove] = fromGroup.features.splice(featureIndex, 1);
            toGroup.features.push(featureToMove);
          }
        }
      })
      .addCase(asyncMoveFeatureToAnotherGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Enable or Disable Feature
      .addCase(asyncEnableOrDisableFeature.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(asyncEnableOrDisableFeature.fulfilled, (state, action) => {
        state.loading = false;
        state.featureGroups.forEach((group) => {
          const feature = group.features.find(
            (f) => f.id === action.payload.id
          );
          if (feature) {
            feature.active = action.payload.active;
          }
        });
      })
      .addCase(asyncEnableOrDisableFeature.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Assign Feature to Plan
      .addCase(asyncAssignFeatureToPlan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(asyncAssignFeatureToPlan.fulfilled, (state, action) => {
        state.loading = false;
        state.featureGroups.forEach((group) => {
          const feature = group.features.find(
            (f) => f.id === action.payload.id
          );
          if (feature) {
            feature.plan = action.payload.applicablePlans;
          }
        });
      })
      .addCase(asyncAssignFeatureToPlan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch All Feature Groups
      .addCase(asyncFetchAllFeatureGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

  .addCase(asyncFetchAllFeatureGroups.fulfilled, (state, action) => {
  state.loading = false;
  const payload = Array.isArray(action.payload) ? action.payload : [];

  payload.forEach((incomingGroup) => {
    if (incomingGroup.name) { // Only process groups with a title
      const existingGroup = state.featureGroups.find((g) => g.id === incomingGroup.id);
      if (existingGroup) {
        existingGroup.title = incomingGroup.name;
        if (!existingGroup.features || existingGroup.features.length === 0) {
          existingGroup.features = (incomingGroup.features || incomingGroup.Feature || []).map((feature) => ({
            id: feature.id,
            name: feature.name,
            description: feature.description || "",
            dateAdded: formatDatePadded(feature.createdAt),
            managedBy: feature.managedBy || "Admin",
            active: feature.active,
            plans: Array.isArray(feature.plans) ? feature.plans.map((plan) => plan.name) : [],
            selected: false,
          }));
        }
      } else {
        state.featureGroups.push({
          id: incomingGroup.id,
          title: incomingGroup.name,
          features: (incomingGroup.features || incomingGroup.Feature || []).map((feature) => ({
            id: feature.id,
            name: feature.name,
            description: feature.description || "",
            dateAdded: formatDatePadded(feature.createdAt),
            managedBy: feature.managedBy || "Admin",
            active: feature.active,
            plans: Array.isArray(feature.plans) ? feature.plans.map((plan) => plan.name) : [],
            selected: false,
          })),
        });
      }
    }
  });
})

      .addCase(asyncFetchAllFeatureGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch All Features
      .addCase(asyncFetchAllFeatures.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(asyncFetchAllFeatures.fulfilled, (state, action) => {
        state.loading = false;
        const payload = Array.isArray(action.payload) ? action.payload : [];

        payload.forEach((feature) => {
          const group = state.featureGroups.find(
            (g) => g.id === feature.featureGroupId
          );
          if (!group) return;

          const existingFeature = group.features.find(
            (f) => f.id === feature.id
          );

          const mappedFeature = {
            id: feature.id,
            name: feature.name,
            description: feature.description || "",
            dateAdded: formatDatePadded(feature.createdAt),
            managedBy: feature.managedBy || "Admin",
            active: feature.active,
            plans: Array.isArray(feature.plans)
              ? feature.plans.map((plan) => plan.name)
              : [],
            selected: false,
          };

          if (existingFeature) {
            // Update existing feature with new data
            Object.assign(existingFeature, mappedFeature);
          } else {
            // Add new feature
            group.features.push(mappedFeature);
          }
        });
      })

      .addCase(asyncFetchAllFeatures.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  addFeatureGroup,
  editFeatureGroup,
  deleteFeatureGroup,
  addFeature,
  editFeature,
  deleteFeature,
  moveFeature,
  toggleFeatureActive,
  assignFeaturePlan,
  toggleSelectFeature,
  toggleSelectAllFeatures,
} = featureManagementSlice.actions;

export default featureManagementSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";
import { buildBlankPermissions } from "../../Data/permissionsConfig";

const initialState = {
  roleName: "",
  selectedModules: [],
  dataAccessLevel: "",
  permissions: buildBlankPermissions(),
  rawModuleAccesses: [],
};

const roleDraftSlice = createSlice({
  name: "roleDraft",
  initialState,
  reducers: {
    setBasicSettings: (state, { payload }) => {
      state.roleName = payload.roleName;
      state.selectedModules = payload.selectedModules;
      state.dataAccessLevel = payload.dataAccessLevel;
    },
    togglePermission: (state, { payload }) => {
      const { moduleKey, subcatKey, permKey } = payload;
      if (!state.permissions[moduleKey]) state.permissions[moduleKey] = {};
      if (!state.permissions[moduleKey][subcatKey]) state.permissions[moduleKey][subcatKey] = {};
      state.permissions[moduleKey][subcatKey][permKey] =
        !state.permissions[moduleKey][subcatKey][permKey];
    },
    setGrantAll: (state, { payload }) => {
      const { moduleKey, subcatKey, permKeys, value } = payload;
      if (!state.permissions[moduleKey]) state.permissions[moduleKey] = {};
      if (!state.permissions[moduleKey][subcatKey]) state.permissions[moduleKey][subcatKey] = {};
      permKeys.forEach((key) => {
        state.permissions[moduleKey][subcatKey][key] = value;
      });
    },
    loadDraft: (state, { payload }) => {
      return { ...state, ...payload };
    },
    resetDraft: () => ({
      roleName: "",
      selectedModules: [],
      dataAccessLevel: "",
      permissions: buildBlankPermissions(),
      rawModuleAccesses: [],
    }),
  },
});

export const {
  setBasicSettings,
  togglePermission,
  setGrantAll,
  loadDraft,
  resetDraft,
} = roleDraftSlice.actions;

export default roleDraftSlice.reducer;

import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "./features/authentication";
import pipelineReducer from "./features/PipelineSlice";
import addTargetDraftReducer from "./features/AddTargetDraftSlice";
import staffFormDraftReducer from "./features/AddStaffDraftSlice"
const rootReducer = combineReducers({
  authentication: authReducer,
  pipeline: pipelineReducer,
  addTargetDraft: addTargetDraftReducer,
  staffFormDraft: staffFormDraftReducer,
});

export default rootReducer;

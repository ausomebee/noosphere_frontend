import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "./features/authentication";
import pipelineReducer from "./features/PipelineSlice";
import addTargetDraftReducer from "./features/AddTargetDraftSlice";

const rootReducer = combineReducers({
  authentication: authReducer,
  pipeline: pipelineReducer,
  addTargetDraft: addTargetDraftReducer,
});

export default rootReducer;

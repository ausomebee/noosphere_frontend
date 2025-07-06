import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "./features/authentication";
import pipelineReducer from "./features/PipelineSlice";

const rootReducer = combineReducers({
  authentication: authReducer,
  pipeline: pipelineReducer,
});

export default rootReducer;

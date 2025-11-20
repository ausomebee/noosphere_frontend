import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "./features/authentication";
import pipelineReducer from "./features/PipelineSlice";
import addTargetDraftReducer from "./features/AddTargetDraftSlice";
import staffFormDraftReducer from "./features/AddStaffDraftSlice";
import formBuilderReducer from "./features/formBuilderSlice";
import clientDraftReducer from "./features/ClientDraftSlice"




const rootReducer = combineReducers({
  authentication: authReducer,
  pipeline: pipelineReducer,
  addTargetDraft: addTargetDraftReducer,
  staffFormDraft: staffFormDraftReducer,
  formBuilder: formBuilderReducer,
  addClient: clientDraftReducer
});

export default rootReducer;

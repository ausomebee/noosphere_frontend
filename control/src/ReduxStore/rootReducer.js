import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './features/authentication';
import pipelineReducer from './features/PipelineSlice';
import featureManagementReducer from './features/featureManagementSlice';
import formDraftsReducer from './features/formDraftsSlice';


const rootReducer = combineReducers({
  authentication: authReducer,
  pipeline: pipelineReducer,
  featureManagement: featureManagementReducer,
  formDrafts: formDraftsReducer,

});

export default rootReducer;

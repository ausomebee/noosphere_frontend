import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './features/authentication';
import pipelineReducer from './features/PipelineSlice';
import featureManagementReducer from './features/featureManagementSlice';


const rootReducer = combineReducers({
  authentication: authReducer,
  pipeline: pipelineReducer,
  featureManagement: featureManagementReducer,

});

export default rootReducer;

import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "./features/authentication";
import pipelineReducer from "./features/PipelineSlice";
import addTargetDraftReducer from "./features/AddTargetDraftSlice";
import staffFormDraftReducer from "./features/AddStaffDraftSlice";
import formBuilderReducer from "./features/formBuilderSlice";
import clientDraftReducer from "./features/clientDraftSlice";
import tenantSubdomainReducer from "./features/tenantSlice";
import clinicalReportBuilderReducer from "./features/clinicalReportSlice";
import clinicalTemplateBuilderReducer from "./features/clinicalReportTemplateSlice";
import roleDraftReducer from "./features/roleDraftSlice";

const rootReducer = combineReducers({
  authentication: authReducer,
  pipeline: pipelineReducer,
  addTargetDraft: addTargetDraftReducer,
  staffFormDraft: staffFormDraftReducer,
  formBuilder: formBuilderReducer,
  addClient: clientDraftReducer,
  subDomain: tenantSubdomainReducer,
clinicalReportTemplate: clinicalTemplateBuilderReducer,
clinicalReport: clinicalReportBuilderReducer,
roleDraft: roleDraftReducer,
});

export default rootReducer;

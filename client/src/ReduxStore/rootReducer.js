import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "./features/authentication";
import clientSubdomainReducer from "./features/tenantSlice";
import formBuilderReducer from "./features/formBuilderSlice";
import { persistedFormResponseReducer } from "./features/formResponseSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  subDomain: clientSubdomainReducer,
  formBuilder: formBuilderReducer,
    formResponse: persistedFormResponseReducer,
});

export default rootReducer;

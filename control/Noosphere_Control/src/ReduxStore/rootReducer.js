import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './features/authentication';


const rootReducer = combineReducers({
  auth: authReducer,

});

export default rootReducer;

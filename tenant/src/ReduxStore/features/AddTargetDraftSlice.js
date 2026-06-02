import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  programId: '',
  name: '',
  description: '',
  sd: '',
  expectedResponse: '',
  teachingProcedure: '',
  teachingOthers: '',
  promptingStrategy: [],
  promptOthers: '',
  dataCollectionType: '',
  percentageCorrectTrialSession: '',
  trialOrOpportunitiesSession: '',
  taskSteps: [],
  baselineDataRequired: false,
  masteryCriteria: {},          // <-- flexible object
  statusAndAdmin: '',
  note: '',
  attachment: null,
};

const targetDraftSlice = createSlice({
  name: 'targetDraft',
  initialState,
  reducers: {
    setDraftField: (state, { payload }) => {
       return { ...state, ...JSON.parse(JSON.stringify(payload)) };
    },
    resetDraft: () => initialState,
  },
});

export const { setDraftField, resetDraft } = targetDraftSlice.actions;
export default targetDraftSlice.reducer;
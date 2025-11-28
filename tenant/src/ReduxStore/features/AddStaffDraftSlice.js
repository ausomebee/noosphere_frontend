import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  formData: {
    fullName: '',
    email: '',
    DOB: '',
    gender: '',
    practiceNPI: '',
    staffRole: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    licenses: [{ licenseName: '', licenseNumber: '', expiryDate: '', state: '' }],
    paymentSchedule: '',
    ratePerHour: '',
    minimumHours: '',
    otherPays: [],
    deductions: [],
    documents: [],
    staffId: '',
  },
};

const staffDraftSlice = createSlice({
  name: 'staffFormDraft',
  initialState,
  reducers: {
    setDraftField: (state, { payload }) => {
      return { ...state, formData: { ...state.formData, ...JSON.parse(JSON.stringify(payload)) } };
    },
    resetDraft: () => initialState,
  },
});

export const { setDraftField, resetDraft } = staffDraftSlice.actions;
export default staffDraftSlice.reducer;
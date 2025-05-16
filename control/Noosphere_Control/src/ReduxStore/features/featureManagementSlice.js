import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  featureGroups: [
    {
      title: "Core Features",
      features: [
        { id: "1", name: "Appointment & Scheduling", dateAdded: "12/10/2024", addedBy: "Spyware Team", active: true, plan: ["Basic", "Standard", "Pro", "Enterprise"], selected: false },
        { id: "2", name: "Client Management", dateAdded: "12/3/2024", addedBy: "Super Graft", active: true, plan: ["Basic", "Standard", "Pro", "Enterprise"], selected: false },
        { id: "3", name: "Staff Management", dateAdded: "1/10/2024", addedBy: "Core Dev", active: true, plan: ["Basic", "Standard", "Pro", "Enterprise"], selected: false },
        { id: "4", name: "Basic Reporting", dateAdded: "2/1/2024", addedBy: "Fin giants", active: true, plan: ["Basic", "Standard", "Pro", "Enterprise"], selected: false },
        { id: "5", name: "Billing & Invoicing", dateAdded: "2/1/2024", addedBy: "Aces League", active: true, plan: ["Basic", "Standard", "Pro", "Enterprise"], selected: false },
      ],
    },
    {
      title: "Advanced Features",
      features: [
        { id: "6", name: "AI-Powered Mapping", dateAdded: "10/12/2024", addedBy: "Spyros Team", active: true, plan: ["Standard", "Pro", "Enterprise"], selected: false },
        { id: "7", name: "Pipeline Management", dateAdded: "13/02/2024", addedBy: "Super Graft", active: true, plan: ["Pro", "Enterprise"], selected: false },
        { id: "8", name: "Custom Forms", dateAdded: "10/12/2024", addedBy: "Core Dev", active: true, plan: ["Standard", "Pro", "Enterprise"], selected: false },
        { id: "9", name: "Document Request", dateAdded: "21/02/2024", addedBy: "Free Agents", active: true, plan: ["Pro", "Enterprise"], selected: false },
        { id: "10", name: "Advanced Reporting", dateAdded: "21/02/2024", addedBy: "Ace League", active: false, plan: ["Standard", "Pro", "Enterprise"], selected: false },
        { id: "11", name: "Collection & Analysis", dateAdded: "21/02/2024", addedBy: "Ace League", active: true, plan: ["Pro", "Enterprise"], selected: false },
      ],
    },
    {
      title: "Customization & Add-Ons",
      features: [
        { id: "12", name: "Custom Branding", dateAdded: "10/12/2024", addedBy: "Spyros Team", active: true, plan: ["Standard", "Pro", "Enterprise"], selected: false },
        { id: "13", name: "API Access", dateAdded: "12/3/2024", addedBy: "Super Graft", active: true, plan: ["Standard", "Pro", "Enterprise"], selected: false },
        { id: "14", name: "Third Party Integration", dateAdded: "1/10/2024", addedBy: "Core Dev", active: false, plan: ["Standard", "Pro", "Enterprise"], selected: false },
      ],
    },
    {
      title: "Extra Features",
      features: [
        { id: "15", name: "Email Support", dateAdded: "10/12/2024", addedBy: "Spyros Team", active: true, plan: ["Basic", "Standard", "Pro", "Enterprise"], selected: false },
        { id: "16", name: "Priority Support", dateAdded: "12/3/2024", addedBy: "Super Graft", active: true, plan: ["Basic", "Standard", "Pro", "Enterprise"], selected: false },
        { id: "17", name: "Dedicated Account Manager", dateAdded: "1/10/2024", addedBy: "Core Dev", active: true, plan: ["Basic", "Standard", "Pro", "Enterprise"], selected: false },
        { id: "18", name: "SLA Backed Uptime", dateAdded: "1/10/2024", addedBy: "Core Dev", active: true, plan: ["Basic", "Standard", "Pro", "Enterprise"], selected: false },
      ],
    },
  ],
};

const featureManagementSlice = createSlice({
  name: 'featureManagement',
  initialState,
  reducers: {
    addFeatureGroup: (state, action) => {
      state.featureGroups.push({ title: action.payload.title, features: [] });
    },
    editFeatureGroup: (state, action) => {
      const { oldTitle, newTitle } = action.payload;
      const group = state.featureGroups.find((g) => g.title === oldTitle);
      if (group) {
        group.title = newTitle;
      }
    },
    deleteFeatureGroup: (state, action) => {
      const groupTitle = action.payload;
      const groupToDelete = state.featureGroups.find((g) => g.title === groupTitle);
      const extraFeaturesGroup = state.featureGroups.find((g) => g.title === "Extra Features");

      if (groupToDelete && extraFeaturesGroup && groupTitle !== "Extra Features") {
        // Move all features to "Extra Features"
        extraFeaturesGroup.features.push(...groupToDelete.features);
        // Delete the group
        state.featureGroups = state.featureGroups.filter((g) => g.title !== groupTitle);
      }
    },
    addFeature: (state, action) => {
      const { groupTitle, feature } = action.payload;
      const group = state.featureGroups.find((g) => g.title === groupTitle);
      if (group) {
        group.features.push({ ...feature, id: Date.now().toString(), selected: false });
      }
    },
    editFeature: (state, action) => {
      const { groupTitle, featureId, updatedFeature } = action.payload;
      const group = state.featureGroups.find((g) => g.title === groupTitle);
      if (group) {
        const featureIndex = group.features.findIndex((f) => f.id === featureId);
        if (featureIndex !== -1) {
          group.features[featureIndex] = { ...group.features[featureIndex], ...updatedFeature };
        }
      }
    },
    deleteFeature: (state, action) => {
      const { groupTitle, featureId } = action.payload;
      const group = state.featureGroups.find((g) => g.title === groupTitle);
      if (group) {
        group.features = group.features.filter((f) => f.id !== featureId);
      }
    },
    moveFeature: (state, action) => {
      const { featureId, fromGroupTitle, toGroupTitle } = action.payload;
      const fromGroup = state.featureGroups.find((g) => g.title === fromGroupTitle);
      const toGroup = state.featureGroups.find((g) => g.title === toGroupTitle);
      if (fromGroup && toGroup) {
        const featureIndex = fromGroup.features.findIndex((f) => f.id === featureId);
        if (featureIndex !== -1) {
          const [feature] = fromGroup.features.splice(featureIndex, 1);
          toGroup.features.push(feature);
        }
      }
    },
    toggleFeatureActive: (state, action) => {
      const { groupTitle, featureId, active } = action.payload;
      const group = state.featureGroups.find((g) => g.title === groupTitle);
      if (group) {
        const feature = group.features.find((f) => f.id === featureId);
        if (feature) {
          feature.active = active;
        }
      }
    },
    assignFeaturePlan: (state, action) => {
      const { groupTitle, featureId, plans } = action.payload;
      const group = state.featureGroups.find((g) => g.title === groupTitle);
      if (group) {
        const feature = group.features.find((f) => f.id === featureId);
        if (feature) {
          feature.plan = plans;
        }
      }
    },
    toggleSelectFeature: (state, action) => {
      const { groupTitle, featureId } = action.payload;
      const group = state.featureGroups.find((g) => g.title === groupTitle);
      if (group) {
        const feature = group.features.find((f) => f.id === featureId);
        if (feature) {
          feature.selected = !feature.selected;
        }
      }
    },
    toggleSelectAllFeatures: (state, action) => {
      const { groupTitle, select } = action.payload;
      const group = state.featureGroups.find((g) => g.title === groupTitle);
      if (group) {
        group.features.forEach((feature) => {
          feature.selected = select;
        });
      }
    },
  },
});

export const {
  addFeatureGroup,
  editFeatureGroup,
  deleteFeatureGroup,
  addFeature,
  editFeature,
  deleteFeature,
  moveFeature,
  toggleFeatureActive,
  assignFeaturePlan,
  toggleSelectFeature,
  toggleSelectAllFeatures,
} = featureManagementSlice.actions;

export default featureManagementSlice.reducer;
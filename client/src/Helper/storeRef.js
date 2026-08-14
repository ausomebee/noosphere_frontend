let _store = null;
let _persistor = null;

export const injectStore = (store) => {
  _store = store;
};

export const getStore = () => _store;

// The axios interceptor ends sessions too, so it needs the persistor to wipe
// stored state — it can't rely on the layout's logout button having run.
export const injectPersistor = (persistor) => {
  _persistor = persistor;
};

export const getPersistor = () => _persistor;

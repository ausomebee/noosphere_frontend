let _store = null;

export const injectStore = (store) => {
  _store = store;
};

export const getStore = () => _store;

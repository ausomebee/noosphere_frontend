import { configureStore } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import rootReducer from './rootReducer';

// Define your app version
const APP_VERSION = '0.1.0';

const persistConfig = {
  key: 'root',
  storage,
  version: APP_VERSION,
  migrate: (state) => {
    const currentVersion = state?._persist?.version;
    if (currentVersion !== APP_VERSION) {
      storage.removeItem('persist:root');
      return Promise.resolve(undefined);
    }
    return Promise.resolve(state);
  }
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// ✅ Fix non-serializable value warning by ignoring redux-persist actions
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER,],
        ignoredPaths: [],
      },
    }),
});

const persistor = persistStore(store);

export { store, persistor };

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
const APP_VERSION = '1.0.0';

const persistConfig = {
  key: 'root',
  storage,
  version: APP_VERSION,
  // Whitelist the slices you want to persist
  whitelist: ['auth', 'formBuilder', 'formResponse'],
  migrate: (state) => {
    const currentVersion = state?._persist?.version;
    if (currentVersion !== APP_VERSION) {
      // Migration from older version
      // For auth migration, preserve important fields
      if (state.auth) {
        // If old structure had 'token', migrate to 'accessToken'
        if (state.auth.token && !state.auth.accessToken) {
          state.auth.accessToken = state.auth.token;
        }
      }
      return Promise.resolve(state);
    }
    return Promise.resolve(state);
  },
  // Transform to handle serialization of complex objects
  transforms: [],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        ignoredPaths: ['formResponse.files', 'auth.user'], // Add auth.user if needed
      },
    }),
});

const persistor = persistStore(store);

export { store, persistor };
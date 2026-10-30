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


// All three portals are served from one origin (/tenant, /client, /control),
// so a shared 'root' key let one app's persistoid overwrite another's slices
// and trip the version check below — logging everyone out. Namespace per app.
const PERSIST_KEY = 'client-root';
const STORAGE_KEY = `persist:${PERSIST_KEY}`;

// Retire the old shared blob. It holds the other portals' state plus form
// drafts carrying client data, and nothing reads it any more.
// Swallow failures: a browser with storage disabled (Safari private mode)
// makes this reject, and that must not take the app down at boot.
storage.removeItem('persist:root').catch(() => {});

const persistConfig = {
  key: PERSIST_KEY,
  storage,
  version: APP_VERSION,
  // Whitelist the slices you want to persist
  whitelist: ['auth', 'formBuilder', 'formResponse'],
  migrate: (state) => {
    if (!state) return Promise.resolve(state);
    const currentVersion = state._persist?.version;
    if (currentVersion !== APP_VERSION) {
      if (state.auth?.token && !state.auth.accessToken) {
        state.auth.accessToken = state.auth.token;
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
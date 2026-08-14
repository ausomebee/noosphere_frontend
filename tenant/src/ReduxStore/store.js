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
const APP_VERSION = '0.0.0';


// All three portals are served from one origin (/tenant, /client, /control),
// so a shared 'root' key let one app's persistoid overwrite another's slices
// and trip the version check below — logging everyone out. Namespace per app.
const PERSIST_KEY = 'tenant-root';
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
  migrate: (state) => {
    // No stored state is a cold cache, not a version mismatch — fall through
    // to the reducers' initial state rather than purging.
    if (!state) return Promise.resolve(undefined);
    const currentVersion = state?._persist?.version;
    if (currentVersion !== APP_VERSION) {
      storage.removeItem(STORAGE_KEY);
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
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

const persistor = persistStore(store);

export { store, persistor };

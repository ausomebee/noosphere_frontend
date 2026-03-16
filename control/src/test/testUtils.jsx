import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Minimal mock store
const createMockStore = (preloadedState = {}) =>
  configureStore({
    reducer: {
      auth: (state = { accessToken: 'test-token', refreshToken: 'test-refresh', userId: 'test-user-id', user: { email: 'test@test.com' } }, action) => state,
      pipeline: (state = { pipeline: null, pipelineItem: null, draft: null, status: 'idle', stages: [], columns: {} }, action) => state,
      featureManagement: (state = { featureGroups: [], features: [] }, action) => state,
    },
    preloadedState,
  });

// Custom render with providers
export const renderWithProviders = (ui, { store = createMockStore(), ...options } = {}) => {
  const Wrapper = ({ children }) => (
    <Provider store={store}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Provider>
  );

  return { ...render(ui, { wrapper: Wrapper, ...options }), store };
};

// Mock useAuth hook
export const mockUseAuth = (overrides = {}) => ({
  accessToken: 'test-token',
  refreshToken: 'test-refresh',
  userId: 'test-user-id',
  user: { email: 'test@test.com', superAdmin: false },
  ...overrides,
});

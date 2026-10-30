import { describe, it, expect } from "vitest";
import authReducer, { logout, clearError, setTokens, updateUser, ClientLogin } from "../ReduxStore/features/authentication";

const initialState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: false,
  error: null,
};

describe("authentication slice", () => {
  it("returns initial state", () => {
    expect(authReducer(undefined, { type: "unknown" })).toEqual(initialState);
  });

  describe("logout", () => {
    it("resets all auth state", () => {
      const loggedInState = {
        isAuthenticated: true,
        user: { id: "1", name: "Test" },
        accessToken: "token123",
        refreshToken: "refresh123",
        loading: false,
        error: null,
      };
      const state = authReducer(loggedInState, logout());
      expect(state).toEqual(initialState);
    });
  });

  describe("clearError", () => {
    it("clears error", () => {
      const errorState = { ...initialState, error: "Login failed" };
      const state = authReducer(errorState, clearError());
      expect(state.error).toBeNull();
    });
  });

  describe("setTokens", () => {
    it("sets access and refresh tokens", () => {
      const state = authReducer(initialState, setTokens({
        accessToken: "new-access",
        refreshToken: "new-refresh",
      }));
      expect(state.accessToken).toBe("new-access");
      expect(state.refreshToken).toBe("new-refresh");
    });
  });

  describe("updateUser", () => {
    it("merges user data", () => {
      const withUser = { ...initialState, user: { id: "1", name: "Old" } };
      const state = authReducer(withUser, updateUser({ name: "New", email: "new@test.com" }));
      expect(state.user.name).toBe("New");
      expect(state.user.email).toBe("new@test.com");
      expect(state.user.id).toBe("1");
    });
  });

  describe("ClientLogin async thunk", () => {
    it("sets loading on pending", () => {
      const state = authReducer(initialState, { type: ClientLogin.pending.type });
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it("sets user and tokens on fulfilled", () => {
      const state = authReducer(initialState, {
        type: ClientLogin.fulfilled.type,
        payload: {
          data: {
            id: "user1",
            firstName: "John",
            accessToken: "access123",
            refreshToken: "refresh123",
          },
        },
      });
      expect(state.loading).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.user.firstName).toBe("John");
      expect(state.accessToken).toBe("access123");
      expect(state.refreshToken).toBe("refresh123");
    });

    it("sets error on rejected", () => {
      const state = authReducer(initialState, {
        type: ClientLogin.rejected.type,
        payload: "Invalid credentials",
      });
      expect(state.loading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe("Invalid credentials");
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
    });
  });
});

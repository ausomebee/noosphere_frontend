import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

vi.mock("axios", () => {
  const interceptors = {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  };
  return {
    default: {
      create: vi.fn(() => ({
        interceptors,
        get: vi.fn(),
        post: vi.fn(),
      })),
    },
  };
});

vi.mock("../Helper/fingerprint", () => ({
  getFingerprint: () => "fp-test-123",
}));

vi.mock("../api/authApis", () => ({
  default: { refreshAccessToken: vi.fn() },
}));

import AxiosInterceptor from "../Helper/AxiosInterceptor";

describe("AxiosInterceptor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an axios instance with withCredentials", () => {
    AxiosInterceptor("access-tok", "refresh-tok");
    expect(axios.create).toHaveBeenCalledWith({ withCredentials: true, timeout: 30000 });
  });

  it("registers request interceptor", () => {
    const instance = AxiosInterceptor("access-tok", "refresh-tok");
    expect(instance.interceptors.request.use).toHaveBeenCalledTimes(1);
  });

  it("registers response interceptor", () => {
    const instance = AxiosInterceptor("access-tok", "refresh-tok");
    expect(instance.interceptors.response.use).toHaveBeenCalledTimes(1);
  });

  it("request interceptor adds auth header and fingerprint", () => {
    AxiosInterceptor("my-token", "ref-token");
    const requestInterceptor = axios.create().interceptors.request.use.mock.calls[0][0];
    const config = { headers: {} };
    const result = requestInterceptor(config);
    expect(result.headers["Authorization"]).toBe("Bearer my-token");
    expect(result.headers["x-fingerprint"]).toBe("fp-test-123");
  });

  it("request interceptor skips auth header when no token", () => {
    AxiosInterceptor(null, "ref-token");
    const requestInterceptor = axios.create().interceptors.request.use.mock.calls[0][0];
    const config = { headers: {} };
    const result = requestInterceptor(config);
    expect(result.headers["Authorization"]).toBeUndefined();
    expect(result.headers["x-fingerprint"]).toBe("fp-test-123");
  });

  it("response interceptor passes through successful responses", () => {
    AxiosInterceptor("tok", "ref");
    const responseInterceptor = axios.create().interceptors.response.use.mock.calls[0][0];
    const response = { data: { success: true } };
    expect(responseInterceptor(response)).toEqual(response);
  });

  it("returns an object (axios instance)", () => {
    const instance = AxiosInterceptor("tok", "ref");
    expect(instance).toBeDefined();
    expect(typeof instance).toBe("object");
  });

  describe("response error interceptor", () => {
    let errorHandler;

    beforeEach(() => {
      AxiosInterceptor("tok", "ref", vi.fn(), vi.fn());
      errorHandler = axios.create().interceptors.response.use.mock.calls[0][1];
    });

    it("rejects non-401 errors", async () => {
      const error = { response: { status: 500 }, config: {} };
      await expect(errorHandler(error)).rejects.toEqual(error);
    });

    it("rejects errors without response", async () => {
      const error = { config: {} };
      await expect(errorHandler(error)).rejects.toEqual(error);
    });

    it("request error interceptor rejects", async () => {
      AxiosInterceptor("tok", "ref");
      const requestErrorHandler = axios.create().interceptors.request.use.mock.calls[0][1];
      const error = new Error("Request failed");
      await expect(requestErrorHandler(error)).rejects.toEqual(error);
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// The network layer underneath: every request that really goes out lands here.
const send = vi.fn();
const use = vi.fn();
vi.mock("axios", () => ({
  default: {
    getAdapter: () => send,
    defaults: { adapter: "xhr" },
    interceptors: { request: { use: (...a) => use(...a) } },
  },
}));

/**
 * What keeps a request safe when consecutive requests can land on different
 * backend servers: the ID that labels it, the rules for sending it again, the
 * folding of duplicate writes, and the message a gateway failure turns into.
 */

const API = new URL(import.meta.env.VITE_API_URL, window.location.origin).origin;

const load = async () => {
  vi.resetModules();
  return import("../Helper/requestResilience");
};

const config = (over = {}) => ({ method: "get", url: `${API}/api/v1/x`, headers: {}, ...over });

beforeEach(() => {
  send.mockReset();
  use.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("labelling requests", () => {
  it("gives every API request its own ID", async () => {
    const { prepareRequest, REQUEST_ID_HEADER } = await load();
    const get = prepareRequest(config());
    const post = prepareRequest(config({ method: "post", data: "{}" }));
    expect(get.headers[REQUEST_ID_HEADER]).toEqual(expect.any(String));
    expect(post.headers[REQUEST_ID_HEADER]).toEqual(expect.any(String));
    expect(get.headers[REQUEST_ID_HEADER]).not.toBe(post.headers[REQUEST_ID_HEADER]);
  });

  it("keeps the ID a request already has, so a resend is recognisable", async () => {
    const { prepareRequest, REQUEST_ID_HEADER } = await load();
    const c = prepareRequest(config({ headers: { [REQUEST_ID_HEADER]: "abc" } }));
    expect(c.headers[REQUEST_ID_HEADER]).toBe("abc");
  });

  it("never labels requests to other hosts such as S3", async () => {
    const { prepareRequest, REQUEST_ID_HEADER } = await load();
    const c = prepareRequest(config({ url: "https://bucket.s3.amazonaws.com/file.pdf" }));
    expect(c.headers[REQUEST_ID_HEADER]).toBeUndefined();
  });

  it("labels plain fetch calls through requestIdHeader", async () => {
    const { requestIdHeader, REQUEST_ID_HEADER } = await load();
    expect(requestIdHeader()[REQUEST_ID_HEADER]).toEqual(expect.any(String));
  });

  it("labels the shared axios instance once, however often it is installed", async () => {
    const { installRequestIds, REQUEST_ID_HEADER } = await load();
    installRequestIds();
    installRequestIds();
    expect(use).toHaveBeenCalledTimes(1);
    const label = use.mock.calls[0][0];
    expect(label(config()).headers[REQUEST_ID_HEADER]).toEqual(expect.any(String));
  });
});

describe("folding duplicate writes", () => {
  // The interceptor installs an adapter on each write; calling it is what
  // axios does when the request actually goes out.
  const dispatch = (prepared) => prepared.adapter(prepared);

  it("sends one request when the same write is made twice while in flight", async () => {
    const { prepareRequest } = await load();
    let resolve;
    send.mockReturnValue(new Promise((r) => { resolve = r; }));

    const first = dispatch(prepareRequest(config({ method: "post", data: '{"a":1}' })));
    const second = dispatch(prepareRequest(config({ method: "post", data: '{"a":1}' })));
    resolve({ status: 200 });

    expect(send).toHaveBeenCalledTimes(1);
    expect((await second).status).toBe((await first).status);
  });

  it("gives the duplicate the first request's ID, so their resends match", async () => {
    const { prepareRequest, REQUEST_ID_HEADER } = await load();
    send.mockReturnValue(new Promise(() => {}));
    const a = prepareRequest(config({ method: "post", data: "{}" }));
    const b = prepareRequest(config({ method: "post", data: "{}" }));
    dispatch(a);
    dispatch(b);
    expect(b.headers[REQUEST_ID_HEADER]).toBe(a.headers[REQUEST_ID_HEADER]);
  });

  it("answers the duplicate with its own config, so its interceptors act on their own request", async () => {
    const { prepareRequest } = await load();
    let reject;
    send.mockReturnValue(new Promise((_, r) => { reject = r; }));
    const first = prepareRequest(config({ method: "post", data: "{}" }));
    const second = prepareRequest(config({ method: "post", data: "{}" }));
    const p1 = dispatch(first);
    const p2 = dispatch(second);
    const failure = Object.assign(new Error("401"), { config: first, response: { status: 401 } });
    reject(failure);
    await expect(p1).rejects.toBe(failure);
    const copy = await p2.catch((e) => e);
    expect(copy).not.toBe(failure);
    expect(copy.config).toBe(second);
    expect(copy.response.status).toBe(401);
    expect(copy).toBeInstanceOf(Error);
    first._retry = true; // what the first caller's interceptor does
    expect(second._retry).toBeUndefined();
  });

  it("hands the duplicate the shared response under its own config", async () => {
    const { prepareRequest } = await load();
    let resolve;
    send.mockReturnValue(new Promise((r) => { resolve = r; }));
    const first = prepareRequest(config({ method: "post", data: "{}" }));
    const second = prepareRequest(config({ method: "post", data: "{}" }));
    dispatch(first);
    const p2 = dispatch(second);
    resolve({ status: 200, data: { ok: true }, config: first });
    const res = await p2;
    expect(res.data).toEqual({ ok: true });
    expect(res.config).toBe(second);
  });

  it("sends it again once the first has finished", async () => {
    const { prepareRequest } = await load();
    send.mockResolvedValue({ status: 200 });
    await dispatch(prepareRequest(config({ method: "post", data: "{}" })));
    await dispatch(prepareRequest(config({ method: "post", data: "{}" })));
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("sends writes with different bodies separately", async () => {
    const { prepareRequest } = await load();
    send.mockReturnValue(new Promise(() => {}));
    dispatch(prepareRequest(config({ method: "post", data: '{"a":1}' })));
    dispatch(prepareRequest(config({ method: "post", data: '{"a":2}' })));
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("always sends uploads, which have no body to compare", async () => {
    const { prepareRequest } = await load();
    send.mockReturnValue(new Promise(() => {}));
    dispatch(prepareRequest(config({ method: "post", data: new FormData() })));
    dispatch(prepareRequest(config({ method: "post", data: new FormData() })));
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("leaves reads alone", async () => {
    const { prepareRequest } = await load();
    expect(prepareRequest(config()).adapter).toBeUndefined();
  });
});

describe("deciding to send again", () => {
  const failure = (over = {}, response) => ({ config: config(over), response });

  it("resends a read after a dropped connection or a 502/503", async () => {
    const { shouldRetry } = await load();
    expect(shouldRetry({ ...failure(), code: "ERR_NETWORK" })).toBe(true);
    expect(shouldRetry({ ...failure(), code: "ECONNRESET" })).toBe(true);
    expect(shouldRetry(failure({}, { status: 502 }))).toBe(true);
    expect(shouldRetry(failure({}, { status: 503 }))).toBe(true);
  });

  it("doesn't rerun a slow query: a timeout or 504 goes straight to the user", async () => {
    const { shouldRetry } = await load();
    expect(shouldRetry({ ...failure(), code: "ECONNABORTED" })).toBe(false);
    expect(shouldRetry({ ...failure(), code: "ETIMEDOUT" })).toBe(false);
    expect(shouldRetry(failure({}, { status: 504 }))).toBe(false);
  });

  it("doesn't resend errors another server would repeat", async () => {
    const { shouldRetry } = await load();
    expect(shouldRetry(failure({}, { status: 500 }))).toBe(false);
    expect(shouldRetry(failure({}, { status: 404 }))).toBe(false);
    expect(shouldRetry(failure({}, { status: 400 }))).toBe(false);
  });

  it("never resends a write, which the first attempt may already have done", async () => {
    const { shouldRetry, prepareRequest } = await load();
    for (const method of ["post", "put", "patch", "delete"]) {
      expect(shouldRetry({ config: prepareRequest(config({ method })) })).toBe(false);
      expect(shouldRetry({ config: config({ method }), response: { status: 502 } })).toBe(false);
    }
  });

  it("stops after the last attempt", async () => {
    const { shouldRetry, MAX_RETRIES } = await load();
    const dropped = (count) => ({ ...failure({ _retryCount: count }), code: "ERR_NETWORK" });
    expect(shouldRetry(dropped(MAX_RETRIES - 1))).toBe(true);
    expect(shouldRetry(dropped(MAX_RETRIES))).toBe(false);
  });

  it("respects an opt-out, a cancellation, and a request it can't identify", async () => {
    const { shouldRetry } = await load();
    expect(shouldRetry({ ...failure({ retry: false }), code: "ERR_NETWORK" })).toBe(false);
    expect(shouldRetry({ ...failure(), code: "ERR_CANCELED" })).toBe(false);
    expect(shouldRetry(failure({ method: undefined }))).toBe(false);
    expect(shouldRetry({})).toBe(false);
  });
});

describe("pacing the resends", () => {
  it("waits longer each time, with a little randomness", async () => {
    const { retryDelay } = await load();
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(retryDelay({ config: {} })).toBe(1000);
    expect(retryDelay({ config: { _retryCount: 1 } })).toBe(2000);
    expect(retryDelay({ config: { _retryCount: 2 } })).toBe(4000);
    Math.random.mockRestore();
  });

  it("waits as long as the server asks, within reason", async () => {
    const { retryDelay } = await load();
    const asked = (s) => ({ config: {}, response: { headers: { "retry-after": s } } });
    expect(retryDelay(asked("3"))).toBe(3000);
    expect(retryDelay(asked("600"))).toBe(10000);
  });

  it("sends the same request again after the wait and counts the attempt", async () => {
    vi.useFakeTimers();
    const { retryRequest } = await load();
    const again = vi.fn().mockResolvedValue("ok");
    const c = config();
    const pending = retryRequest(again, { config: c });
    expect(again).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(await pending).toBe("ok");
    expect(again).toHaveBeenCalledWith(c);
    expect(c._retryCount).toBe(1);
  });
});

describe("explaining a gateway failure", () => {
  it("replaces nginx's HTML page with a message the app can show", async () => {
    const { explainGatewayError, GATEWAY_MESSAGE } = await load();
    const error = { response: { status: 502, data: "<html>502 Bad Gateway</html>" } };
    explainGatewayError(error);
    expect(error.response.data.message).toBe(GATEWAY_MESSAGE);
  });

  it("keeps a message the backend sent itself", async () => {
    const { explainGatewayError } = await load();
    const error = { response: { status: 503, data: { message: "Down for maintenance" } } };
    explainGatewayError(error);
    expect(error.response.data.message).toBe("Down for maintenance");
  });

  it("leaves other failures alone", async () => {
    const { explainGatewayError } = await load();
    const error = { response: { status: 500, data: "boom" } };
    explainGatewayError(error);
    expect(error.response.data).toBe("boom");
    expect(() => explainGatewayError({})).not.toThrow();
  });
});

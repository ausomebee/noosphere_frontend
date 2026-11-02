import axios from "axios";

/**
 * Keeps API calls safe now that consecutive requests can land on different
 * backend servers.
 *
 * Every request to the API carries an ID (X-Request-Id), kept across resends,
 * so the backend can trace it through the load balancer, nginx and whichever
 * server handled it, and recognise a request it has already seen.
 *
 * A request can fail in transit: the server it reached dies, or its reply is
 * lost on the way back. The browser cannot tell "never arrived" from "done but
 * unanswered". A read is safe to send again either way. A write is not — if the
 * first attempt did the work, a resend would do it twice — so writes are never
 * resent here.
 */

export const REQUEST_ID_HEADER = "X-Request-Id";

export const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
// Spreads resends out so every open tab doesn't hit a struggling server at once.
const MAX_JITTER_MS = 500;
const MAX_RETRY_AFTER_MS = 10000;

const WRITE_METHODS = new Set(["post", "put", "patch", "delete"]);
// Gateway failures: the load balancer or nginx could not get an answer from a
// backend server.
const GATEWAY_STATUSES = new Set([502, 503, 504]);
// Of those, the fast ones: no server took the request, so another attempt may
// well reach a healthy one. A 504 means a server was working on it too slowly,
// and a resend would only run the same slow query again.
const RESEND_STATUSES = new Set([502, 503]);
// The request never left the browser or the connection dropped. A timeout is
// not one of these: the server may still be working on it.
const CONNECTION_ERRORS = new Set(["ERR_NETWORK", "ECONNRESET"]);

export const GATEWAY_MESSAGE =
  "The service is temporarily unavailable. Please try again in a moment.";

const methodOf = (config) => config?.method?.toLowerCase();
const isWrite = (config) => WRITE_METHODS.has(methodOf(config));

const newRequestId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

// Only our API gets the header: sent to S3 or any other host, an unexpected
// header fails that host's CORS check.
const isApiUrl = (url) => {
  try {
    const base = new URL(import.meta.env.VITE_API_URL, window.location.origin);
    return new URL(url, window.location.origin).origin === base.origin;
  } catch {
    return false;
  }
};

/** Headers for a request that doesn't go through axios (plain fetch). */
export const requestIdHeader = () => ({ [REQUEST_ID_HEADER]: newRequestId() });

const labelRequest = (config) => {
  if (config.headers && !config.headers[REQUEST_ID_HEADER] && isApiUrl(config.url)) {
    config.headers[REQUEST_ID_HEADER] = newRequestId();
  }
  return config;
};

let installed = false;

/**
 * Labels requests made with the shared axios instance — login and token refresh
 * use it directly rather than the interceptor's own instance. Call once at boot.
 */
export const installRequestIds = () => {
  if (installed) return;
  installed = true;
  axios.interceptors?.request?.use(labelRequest);
};

// Writes currently on the wire, keyed by what they send. A second identical
// write — a double click, a form submitted twice — rides on the first instead
// of reaching the server as a duplicate.
const inFlight = new Map();

const defaultAdapter = () => {
  try {
    return axios.getAdapter?.(axios.defaults?.adapter) ?? null;
  } catch {
    return null;
  }
};

const shareInFlight = (config) => {
  if (config._shared) return; // a resend passes through the interceptor again
  const send = defaultAdapter();
  if (!send) return;
  config._shared = true;

  config.adapter = (cfg) => {
    // Uploads have no stable body to compare, so they always go out as sent.
    if (cfg.data != null && typeof cfg.data !== "string") return send(cfg);

    const key = `${methodOf(cfg)} ${cfg.url} ${JSON.stringify(cfg.params ?? null)} ${cfg.data ?? ""}`;
    const leader = inFlight.get(key);
    if (leader) {
      // Carry the first request's ID: that is the one request the backend saw.
      if (leader.requestId && cfg.headers) cfg.headers[REQUEST_ID_HEADER] = leader.requestId;
      // Answer as this request, not the first. The response interceptors mark
      // the config they're handed (as already retried after a 401, say), and a
      // shared config made the second caller skip its own token refresh and
      // report a save that had in fact gone through.
      return leader.promise.then(
        (response) => ({ ...response, config: cfg }),
        (error) => {
          throw Object.assign(Object.create(Object.getPrototypeOf(error)), error, { config: cfg });
        }
      );
    }

    const promise = send(cfg);
    inFlight.set(key, { promise, requestId: cfg.headers?.[REQUEST_ID_HEADER] });
    const clear = () => {
      if (inFlight.get(key)?.promise === promise) inFlight.delete(key);
    };
    promise.then(clear, clear);
    return promise;
  };
};

/** Request-interceptor step: label the request and fold duplicate writes together. */
export const prepareRequest = (config) => {
  labelRequest(config);
  if (isWrite(config)) shareInFlight(config);
  return config;
};

/**
 * Whether a failed request should be sent again. Only fast failures another
 * server might not have — a dropped connection, a 502 or 503 — and only for
 * reads, which are safe to repeat. `retry: false` in a call's config opts
 * it out.
 */
export const shouldRetry = (error) => {
  const config = error?.config;
  if (!config || config.retry === false) return false;
  if ((config._retryCount ?? 0) >= MAX_RETRIES) return false;

  const method = methodOf(config);
  if (method !== "get" && method !== "head") return false;

  const status = error.response?.status;
  return status ? RESEND_STATUSES.has(status) : CONNECTION_ERRORS.has(error.code);
};

export const retryDelay = (error) => {
  const retryAfter = Number(error?.response?.headers?.["retry-after"]);
  if (retryAfter > 0) return Math.min(retryAfter * 1000, MAX_RETRY_AFTER_MS);
  const attempt = error?.config?._retryCount ?? 0;
  return BASE_DELAY_MS * 2 ** attempt + Math.random() * MAX_JITTER_MS;
};

/** Waits, then sends the same request again — same request ID included. */
export const retryRequest = async (send, error) => {
  const config = error.config;
  const delay = retryDelay(error);
  config._retryCount = (config._retryCount ?? 0) + 1;
  await new Promise((resolve) => setTimeout(resolve, delay));
  return send(config);
};

/**
 * A gateway error arrives as nginx's HTML page, so the API helpers' usual
 * `error.response.data.message` is empty and the user saw a vague fallback.
 * Give it a message that says what happened. A message the backend sent itself
 * is left alone.
 */
export const explainGatewayError = (error) => {
  const response = error?.response;
  if (!response || !GATEWAY_STATUSES.has(response.status)) return;
  const data = response.data;
  if (data && typeof data === "object" && data.message) return;
  response.data = {
    ...(data && typeof data === "object" ? data : {}),
    message: GATEWAY_MESSAGE,
  };
};

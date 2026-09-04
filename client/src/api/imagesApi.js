import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

// Clients read through the client route, which is scoped to their own records.
// The bucket stays private: the API checks this caller may see this object,
// then signs a link that is good for a few minutes.
const PRESIGNED_URL_PATH = `${PLAIN_API_URL}/images/client/presigned-url`;

// The API defaults to an hour and allows up to a week. We ask for less: the
// session itself logs out after 30 minutes idle, so a link that matches that
// window can never outlive the session that asked for it. Links are resolved
// at the moment they are opened, so there is nothing to gain from a longer one.
const DEFAULT_EXPIRES_IN = 1800;
const MAX_EXPIRES_IN = 604800; // one week, the API's documented ceiling

const clampExpiry = (seconds) => {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_EXPIRES_IN;
  return Math.min(Math.floor(n), MAX_EXPIRES_IN);
};

// The response envelope is not pinned down, so accept the shapes the rest of
// this API uses -- a bare url, { url }, { data: url } or { data: { url } } --
// rather than breaking on a wrapper we did not expect.
const readUrl = (body) => {
  if (typeof body === "string") return body;
  if (typeof body?.data === "string") return body.data;
  return body?.data?.url ?? body?.url ?? body?.data?.presignedUrl ?? body?.presignedUrl ?? null;
};

/**
 * Exchanges a stored object key for a short-lived signed link. Resolves to the
 * url, or null when the response carried none. Throws on a failed request, so
 * the caller can tell "denied" from "no url in the body".
 */
const GetPresignedUrl = async ({
  key,
  expiresIn = DEFAULT_EXPIRES_IN,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  const res = await authFetch.get(PRESIGNED_URL_PATH, {
    params: { key, expiresIn: clampExpiry(expiresIn) },
  });
  return readUrl(res?.data);
};

export default { GetPresignedUrl };

import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

// Control is the admin surface, so it reads through the admin route.
// The bucket stays private: the API checks this caller may see this object,
// then signs a link that is good for a few minutes.
const PRESIGNED_URL_PATH = `${PLAIN_API_URL}/images/admin/presigned-url`;

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

// The documented envelope is { success, data: { key, url, expiresIn } }. A bare
// { url } is still accepted because it costs nothing and an envelope change
// would otherwise take every attachment down at once; anything else yields
// null, which the caller reports rather than passing an undefined url on.
const readUrl = (body) => body?.data?.url ?? body?.url ?? null;

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

// Word documents converted to PDF server-side, so they can be framed rather
// than fetched. An iframe is a navigation, not a script read, so it is not
// subject to CORS -- which is the whole reason this route exists while the
// bucket carries no CORS rule of its own.
//
// PROPOSED CONTRACT, mirroring the presign route above:
//   GET /images/admin/pdf-preview?key=<object key>
//   200 { success, data: { key, url, expiresIn } }   url = the converted PDF
//   404, or a body with no url                       nothing to show yet
// Anything other than a url makes the caller fall back to rendering the .docx
// in the browser, so this ships safely before the route exists.
const PDF_PREVIEW_PATH = `${PLAIN_API_URL}/images/admin/pdf-preview`;

const GetPdfPreviewUrl = async ({ key, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  const res = await authFetch.get(PDF_PREVIEW_PATH, { params: { key } });
  return readUrl(res?.data);
};

export default { GetPresignedUrl, GetPdfPreviewUrl };

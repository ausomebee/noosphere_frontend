/**
 * Opening and downloading a stored document.
 *
 * Files live in a private S3 bucket, so a link only works while it carries the
 * signature the API attaches to it. Two things follow from that, and this
 * module exists to keep both of them out of the components:
 *
 *  - An unsigned link cannot be rescued by the browser. There is no credential
 *    to add, so the request reaches S3 anonymous and comes back Access Denied.
 *    We recognise that shape before spending a round trip and say so, rather
 *    than showing an empty frame or saving S3's XML error body as if it were
 *    the file.
 *
 *  - A signed link can still be refused by `fetch` on its own, because a
 *    cross-origin read needs CORS on the bucket while a plain navigation does
 *    not. There the link itself is good, so handing it to the browser is a real
 *    fallback rather than a guess.
 */

// Parameters a signed link carries its authorisation in. SigV4 is what the
// presigner emits today; SigV2 is still produced by some older tooling.
const SIGNATURE_PARAMS = ["X-Amz-Signature", "Signature"];

// s3.us-west-1.amazonaws.com, bucket.s3.amazonaws.com and the older
// s3-us-west-1.amazonaws.com all count. ec2-*.compute.amazonaws.com does not,
// which is why this looks for an `s3` label rather than a substring.
const isObjectStorageHost = (hostname) =>
  hostname.endsWith(".amazonaws.com") &&
  hostname.split(".").some((label) => label === "s3" || label.startsWith("s3-"));

/**
 * True only for an object-storage link with no signature on it — the shape that
 * cannot work against a private bucket. Our own API's URLs carry the session
 * token in a header and legitimately have no signature, so they are never
 * judged here.
 */
export const isUnsignedStorageUrl = (url) => {
  if (typeof url !== "string" || url.trim() === "") return false;

  let parsed;
  try {
    parsed = new URL(url, window.location.origin);
  } catch {
    return false;
  }

  if (!isObjectStorageHost(parsed.hostname)) return false;

  return !SIGNATURE_PARAMS.some((param) => parsed.searchParams.has(param));
};

/**
 * The object key the API needs in order to sign a link, read back out of a
 * stored URL.
 *
 * Path-style URLs carry the bucket in the first path segment
 * (s3.us-west-1.amazonaws.com/<bucket>/<key>); virtual-hosted URLs carry it in
 * the hostname, so the whole path is the key. Returns null for anything that
 * is not object storage, and for a storage url with no key at all.
 */
export const storageKeyFromUrl = (url) => {
  if (typeof url !== "string" || url.trim() === "") return null;

  let parsed;
  try {
    parsed = new URL(url, window.location.origin);
  } catch {
    return null;
  }

  if (!isObjectStorageHost(parsed.hostname)) return null;

  const firstLabel = parsed.hostname.split(".")[0];
  const isPathStyle = firstLabel === "s3" || firstLabel.startsWith("s3-");

  const segments = parsed.pathname.split("/").filter(Boolean);
  const keySegments = isPathStyle ? segments.slice(1) : segments;
  if (keySegments.length === 0) return null;

  // A url path is percent-encoded and the API wants the key itself; the request
  // layer encodes it again on the way out. A malformed escape is left as-is
  // rather than throwing, so a bad key fails at the API with a clear status
  // instead of taking the click down here.
  const joined = keySegments.join("/");
  try {
    return decodeURIComponent(joined);
  } catch {
    return joined;
  }
};

export const DOCUMENT_UNAVAILABLE =
  "This file can't be opened. Its secure link is missing or has expired — reload the page and try again.";
export const DOCUMENT_GONE = "This file is no longer available.";
// Distinct from UNAVAILABLE on purpose. A link can be perfectly good and still
// be unreadable by the page: the browser discards a storage response that
// carries no CORS header, and reports it identically to being offline. Saying
// "expired" there sends whoever is debugging it at the wrong thing entirely.
export const DOCUMENT_NOT_VIEWABLE =
  "This file couldn't be shown here. You can still download it.";
export const DOCUMENT_FAILED = "This file couldn't be downloaded. Please try again.";

const saveBlob = (blob, fileName) => {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName || "document";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
};

/**
 * Saves the file, or opens it in a tab when only CORS stands in the way.
 * Resolves on success; rejects with an Error whose message is written for the
 * person on the screen, so callers can pass it straight to showToast.
 */
export const downloadDocumentFile = async (fileUrl, fileName) => {
  if (!fileUrl || isUnsignedStorageUrl(fileUrl)) {
    throw new Error(DOCUMENT_UNAVAILABLE);
  }

  let res;
  try {
    res = await fetch(fileUrl);
  } catch {
    // Being offline and being refused by CORS look identical to fetch. The link
    // is signed, so let the browser navigate to it instead of giving up: that
    // is the one case where a new tab genuinely succeeds where fetch could not.
    window.open(fileUrl, "_blank", "noopener");
    return;
  }

  if (!res.ok) {
    if (res.status === 403) throw new Error(DOCUMENT_UNAVAILABLE);
    if (res.status === 404) throw new Error(DOCUMENT_GONE);
    throw new Error(DOCUMENT_FAILED);
  }

  saveBlob(await res.blob(), fileName);
};

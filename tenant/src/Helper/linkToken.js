/**
 * Reset and invite emails carry a single-use secret as `?token=...`. The
 * set-password call must send it back, or the backend refuses the change.
 */
export const MISSING_LINK_TOKEN_MESSAGE =
  "This link is incomplete or out of date. Please request a new one.";

/** The `token` query parameter of the current link, or null. */
export const readLinkToken = (searchParams) => {
  const token = searchParams?.get("token");
  return token && token.trim() ? token.trim() : null;
};

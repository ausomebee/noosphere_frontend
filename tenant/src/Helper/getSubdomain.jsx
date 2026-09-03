const VALID_SUBDOMAIN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

const getSubdomain = () => {
  const hostname = window.location.hostname.toLowerCase();

  // === LOCAL DEVELOPMENT: Special handling for localhost ===
  // Allows you to test subdomains like:
  //   - http://paullo.localhost:5173
  //   - http://mypractice.localhost:3000
  //   - http://localhost:5173 (no subdomain → returns null)
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    const parts = hostname.split(".");

    // Case: tenant.localhost or tenant.localhost:port
    if (parts.length >= 2 && parts[parts.length - 1] === "localhost") {
      const potentialSubdomain = parts[0];

      // Ignore common dev prefixes if you want, or allow everything
      if (potentialSubdomain && potentialSubdomain !== "www" && VALID_SUBDOMAIN.test(potentialSubdomain)) {
        localStorage.setItem("subDomain", potentialSubdomain);
        return potentialSubdomain;
      }
    }

    // Plain localhost → no subdomain
    localStorage.removeItem("subDomain");
    return null;
  }

  // === OUR REGISTERED APEXES ===
  // All three domains we own, plus their www forms. Hitting any of these means
  // "no tenant selected", so it must not be parsed for a subdomain.
  const rootDomains = [
    "noospherehub.com",
    "www.noospherehub.com",
    "noospherehub.net",
    "www.noospherehub.net",
    "noospherehub.org",
    "www.noospherehub.org",
  ];

  if (rootDomains.includes(hostname)) {
    localStorage.removeItem("subDomain");
    return null;
  }

  // Extract subdomain from real domains: tenant.noospherehub.com
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    const potentialSubdomain = parts[0];

    if (potentialSubdomain === "www" || !VALID_SUBDOMAIN.test(potentialSubdomain)) {
      localStorage.removeItem("subDomain");
      return null;
    }

    localStorage.setItem("subDomain", potentialSubdomain);
    return potentialSubdomain;
  }

  // Fallback: no subdomain
  localStorage.removeItem("subDomain");
  return null;
};

export default getSubdomain;
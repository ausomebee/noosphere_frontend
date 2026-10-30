import { describe, it, expect, beforeEach, afterEach } from "vitest";
import getSubdomain from "../Helper/getSubdomain";

describe("getSubdomain", () => {
  const originalLocation = window.location;
  beforeEach(() => { localStorage.clear(); delete window.location; });
  afterEach(() => { window.location = originalLocation; });

  const setHostname = (hostname) => { window.location = { hostname }; };

  it("returns null for plain localhost", () => {
    setHostname("localhost");
    expect(getSubdomain()).toBeNull();
  });
  it("detects subdomain on localhost", () => {
    setHostname("acme.localhost");
    expect(getSubdomain()).toBe("acme");
    expect(localStorage.getItem("subDomain")).toBe("acme");
  });
  it("returns null for root domain", () => {
    setHostname("noospherehub.com");
    expect(getSubdomain()).toBeNull();
  });
  it("returns null for www root domain", () => {
    setHostname("www.noospherehub.com");
    expect(getSubdomain()).toBeNull();
  });
  it("detects subdomain on production", () => {
    setHostname("acme.noospherehub.com");
    expect(getSubdomain()).toBe("acme");
  });
  it("ignores www as subdomain", () => {
    setHostname("www.noospherehub.com");
    expect(getSubdomain()).toBeNull();
    expect(localStorage.getItem("subDomain")).toBeNull();
  });
  it("ignores www on localhost", () => {
    setHostname("www.localhost");
    expect(getSubdomain()).toBeNull();
  });
  it("removes stale subDomain from localStorage", () => {
    localStorage.setItem("subDomain", "old-tenant");
    setHostname("localhost");
    getSubdomain();
    expect(localStorage.getItem("subDomain")).toBeNull();
  });
});

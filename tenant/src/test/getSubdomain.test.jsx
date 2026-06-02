import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import getSubdomain from '../Helper/getSubdomain';

describe('getSubdomain', () => {
  let originalLocation;

  beforeEach(() => {
    originalLocation = window.location;
    delete window.location;
    localStorage.clear();
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  const setHostname = (hostname) => {
    window.location = { hostname };
  };

  it('returns null for plain localhost', () => {
    setHostname('localhost');
    expect(getSubdomain()).toBeNull();
  });

  it('extracts subdomain from tenant.localhost', () => {
    setHostname('mypractice.localhost');
    expect(getSubdomain()).toBe('mypractice');
  });

  it('returns null for root production domain', () => {
    setHostname('nooshere.org');
    expect(getSubdomain()).toBeNull();
  });

  it('returns null for www.nooshere.org', () => {
    setHostname('www.nooshere.org');
    expect(getSubdomain()).toBeNull();
  });

  it('extracts subdomain from tenant.nooshere.org', () => {
    setHostname('clinic1.nooshere.org');
    expect(getSubdomain()).toBe('clinic1');
  });

  it('ignores www subdomain in production', () => {
    setHostname('www.something.nooshere.org');
    expect(getSubdomain()).toBeNull();
  });

  it('stores subdomain in localStorage', () => {
    setHostname('testclinic.localhost');
    getSubdomain();
    expect(localStorage.getItem('subDomain')).toBe('testclinic');
  });

  it('removes subdomain from localStorage for root domain', () => {
    localStorage.setItem('subDomain', 'old');
    setHostname('localhost');
    getSubdomain();
    expect(localStorage.getItem('subDomain')).toBeNull();
  });

  it('rejects invalid subdomain characters', () => {
    setHostname('invalid_sub!.localhost');
    expect(getSubdomain()).toBeNull();
  });
});

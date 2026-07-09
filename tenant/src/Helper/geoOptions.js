import { allCountries } from "country-region-data";

/*
 * Countries and their states/provinces, sourced from `country-region-data`
 * rather than a hand-maintained list.
 *
 * The package ships tuples, not objects:
 *   [countryName, countryShortCode, [[regionName, regionShortCode], ...]]
 *
 * Values are ISO 3166 codes ("US", "GB", "CA"). Note that the United Kingdom's
 * code is "GB", not "UK" — see `normalizeCountryCode` for the legacy values
 * these forms used to store.
 */

export const countryOptions = allCountries.map(([name, code]) => ({
  value: code,
  label: name,
}));

const REGIONS_BY_COUNTRY = new Map(
  allCountries.map(([, code, regions]) => [code, regions]),
);

/** States/provinces for a country code. Empty when the country has none. */
export const getStateOptions = (countryCode) =>
  (REGIONS_BY_COUNTRY.get(countryCode) || []).map(([name, code]) => ({
    // A single region in the dataset has no short code; fall back to its name
    // so the option still round-trips.
    value: code || name,
    label: name,
  }));

export const countryHasStates = (countryCode) =>
  (REGIONS_BY_COUNTRY.get(countryCode) || []).length > 0;

/*
 * Records saved before this switch hold either a full country name (control:
 * "United States") or a non-ISO abbreviation (tenant: "UK"). Map those onto
 * ISO codes so editing an existing record doesn't open with a blank country.
 * "Other" had no ISO equivalent and resolves to "" — the user must re-pick.
 */
const LEGACY_COUNTRY_ALIASES = new Map([["UK", "GB"], ["Other", ""]]);

const CODE_BY_COUNTRY_NAME = new Map(
  allCountries.map(([name, code]) => [name.toLowerCase(), code]),
);

export const normalizeCountryCode = (value) => {
  if (!value) return "";
  if (LEGACY_COUNTRY_ALIASES.has(value)) return LEGACY_COUNTRY_ALIASES.get(value);
  if (REGIONS_BY_COUNTRY.has(value)) return value;
  return CODE_BY_COUNTRY_NAME.get(String(value).toLowerCase()) || "";
};

/** Resolve a stored state to its code within `countryCode`, by code or name. */
export const normalizeStateCode = (value, countryCode) => {
  if (!value) return "";
  const regions = REGIONS_BY_COUNTRY.get(countryCode) || [];
  const byCode = regions.find(([, code]) => code === value);
  if (byCode) return byCode[1];
  const byName = regions.find(([name]) => name.toLowerCase() === String(value).toLowerCase());
  return byName ? byName[1] || byName[0] : "";
};

/** Display name for a stored country value (accepts legacy names/abbrevs). */
export const getCountryLabel = (value) => {
  const code = normalizeCountryCode(value);
  const match = allCountries.find(([, c]) => c === code);
  return match ? match[0] : "";
};

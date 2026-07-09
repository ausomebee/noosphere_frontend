import { allCountries } from "country-region-data";

/*
 * Countries and their states/provinces, sourced from `country-region-data`
 * rather than a hand-maintained list.
 *
 * The package ships tuples, not objects:
 *   [countryName, countryShortCode, [[regionName, regionShortCode], ...]]
 *
 * Option values are the display names ("United States", "California"), because
 * that is what the API stores. The normalisers still accept the ISO codes and
 * abbreviations older records hold, so nothing opens with a blank field.
 *
 * This pulls in every region on earth (~40 kB gzipped), so the pages that use
 * it must be lazily routed — control's entry bundle is eager.
 */

export const countryOptions = allCountries.map(([name]) => ({
  value: name,
  label: name,
}));

const REGIONS_BY_COUNTRY = new Map(allCountries.map(([name, , regions]) => [name, regions]));
const NAME_BY_CODE = new Map(allCountries.map(([name, code]) => [code, name]));
const NAME_BY_LOWER = new Map(allCountries.map(([name]) => [name.toLowerCase(), name]));

/*
 * Records saved earlier hold an ISO code ("US"), a non-ISO abbreviation ("UK" —
 * the ISO code is "GB"), or a full name. "Other" has no country behind it and
 * resolves to "" so the user must re-pick.
 */
const LEGACY_COUNTRY_ALIASES = new Map([["UK", "United Kingdom"], ["Other", ""]]);

/** Resolve any stored country value to its display name. */
export const normalizeCountry = (value) => {
  if (!value) return "";
  if (LEGACY_COUNTRY_ALIASES.has(value)) return LEGACY_COUNTRY_ALIASES.get(value);
  if (REGIONS_BY_COUNTRY.has(value)) return value;
  if (NAME_BY_CODE.has(value)) return NAME_BY_CODE.get(value);
  return NAME_BY_LOWER.get(String(value).toLowerCase()) || "";
};

/** States/provinces for a country, given its name or ISO code. */
export const getStateOptions = (country) =>
  (REGIONS_BY_COUNTRY.get(normalizeCountry(country)) || []).map(([name]) => ({
    value: name,
    label: name,
  }));

/** Resolve a stored state (name or code) to its display name within a country. */
export const normalizeState = (value, country) => {
  if (!value) return "";
  const regions = REGIONS_BY_COUNTRY.get(normalizeCountry(country)) || [];
  const byName = regions.find(
    ([name]) => name.toLowerCase() === String(value).toLowerCase(),
  );
  if (byName) return byName[0];
  const byCode = regions.find(([, code]) => code === value);
  return byCode ? byCode[0] : "";
};

/** Display name for a stored country value (accepts legacy codes/abbrevs). */
export const getCountryLabel = normalizeCountry;

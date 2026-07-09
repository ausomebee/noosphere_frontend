import { countryTuples } from "country-region-data";

/*
 * Countries, sourced from `country-region-data` rather than a hand-maintained
 * list. Control never asks for a state, so this imports `countryTuples`
 * ([countryName, countryShortCode] pairs) instead of `allCountries` — the
 * latter carries every region on earth and would add ~40 kB gzipped to the
 * entry bundle, which this app loads eagerly.
 *
 * Option values are the display names ("United States"), because that is what
 * the API stores. `normalizeCountry` still accepts the ISO codes and
 * abbreviations older records hold, so nothing opens with a blank field.
 */

export const countryOptions = countryTuples.map(([name]) => ({
  value: name,
  label: name,
}));

const NAME_BY_CODE = new Map(countryTuples.map(([name, code]) => [code, name]));
const NAME_BY_LOWER = new Map(countryTuples.map(([name]) => [name.toLowerCase(), name]));

/*
 * Records saved earlier hold a full name ("United States"), an ISO code, or a
 * non-ISO abbreviation ("UK" — the ISO code is "GB"). "Other" has no country
 * behind it and resolves to "" so the user must re-pick.
 */
const LEGACY_COUNTRY_ALIASES = new Map([["UK", "United Kingdom"], ["Other", ""]]);

/** Resolve any stored country value to its display name. */
export const normalizeCountry = (value) => {
  if (!value) return "";
  if (LEGACY_COUNTRY_ALIASES.has(value)) return LEGACY_COUNTRY_ALIASES.get(value);
  if (NAME_BY_LOWER.has(String(value).toLowerCase())) {
    return NAME_BY_LOWER.get(String(value).toLowerCase());
  }
  return NAME_BY_CODE.get(value) || "";
};

/** Display name for a stored country value (accepts legacy codes/abbrevs). */
export const getCountryLabel = normalizeCountry;

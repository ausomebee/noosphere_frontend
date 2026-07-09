import { countryTuples } from "country-region-data";

/*
 * Countries, sourced from `country-region-data` rather than a hand-maintained
 * list. Control never asks for a state, so this imports `countryTuples`
 * ([countryName, countryShortCode] pairs) instead of `allCountries` — the
 * latter carries every region on earth and would add ~40 kB gzipped to the
 * entry bundle, which this app loads eagerly.
 *
 * Values are ISO 3166 codes ("US", "GB", "CA"). Note the United Kingdom is
 * "GB", not "UK" — see `normalizeCountryCode` for the legacy values these
 * forms used to store.
 */

export const countryOptions = countryTuples.map(([name, code]) => ({
  value: code,
  label: name,
}));

const NAME_BY_CODE = new Map(countryTuples.map(([name, code]) => [code, name]));
const CODE_BY_NAME = new Map(
  countryTuples.map(([name, code]) => [name.toLowerCase(), code]),
);

/*
 * Records saved before this switch hold a full country name ("United States")
 * or a non-ISO abbreviation ("UK"). Map those onto ISO codes so editing an
 * existing record doesn't open with a blank country. "Other" had no ISO
 * equivalent and resolves to "" — the user must re-pick.
 */
const LEGACY_COUNTRY_ALIASES = new Map([["UK", "GB"], ["Other", ""]]);

export const normalizeCountryCode = (value) => {
  if (!value) return "";
  if (LEGACY_COUNTRY_ALIASES.has(value)) return LEGACY_COUNTRY_ALIASES.get(value);
  if (NAME_BY_CODE.has(value)) return value;
  return CODE_BY_NAME.get(String(value).toLowerCase()) || "";
};

/** Display name for a stored country value (accepts legacy names/abbrevs). */
export const getCountryLabel = (value) =>
  NAME_BY_CODE.get(normalizeCountryCode(value)) || "";

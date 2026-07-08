import { useState, useEffect } from 'react';

export interface CountryRaw {
  cca2: string;
  name: { common: string };
  translations?: { [key: string]: { common: string; official: string } };
}

/** Option shape expected by DataTableFilter's Autocomplete detection */
export interface CountryOption {
  /** Filter value sent to server: 'Vietnam' for VN, name.common for others */
  value: string;
  /** Vietnamese display name */
  label: string;
  cca2: string;
}

const COUNTRIES_API = 'https://restcountries.com/v3.1/all?fields=name,cca2,translations';

// Module-level cache: shared across all component instances
let _cache: CountryOption[] | null = null;
let _promise: Promise<CountryOption[]> | null = null;

function _fetch(): Promise<CountryOption[]> {
  if (_cache) return Promise.resolve(_cache);
  if (!_promise) {
    _promise = fetch(COUNTRIES_API)
      .then((r) => r.json())
      .then((data: CountryRaw[]) => {
        const sorted = data
          .map((c) => ({
            value: c.cca2 === 'VN' ? 'Vietnam' : c.name.common,
            label: c.translations?.['vie']?.common || c.name.common,
            cca2: c.cca2,
          }))
          .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
        _cache = sorted;
        return sorted;
      })
      .catch((err) => {
        console.error('useCountries: failed to fetch countries', err);
        _promise = null;
        return [];
      });
  }
  return _promise;
}

/**
 * Shared countries list with module-level cache.
 * Multiple components calling this hook share the same single fetch.
 */
export function useCountries() {
  const [options, setOptions] = useState<CountryOption[]>(_cache ?? []);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    if (_cache) {
      setOptions(_cache);
      setLoading(false);
      return;
    }
    setLoading(true);
    _fetch().then((data) => {
      setOptions(data);
      setLoading(false);
    });
  }, []);

  return { options, loading };
}

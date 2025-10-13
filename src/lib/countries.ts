type CountryRecord = { code: string; name: string };

const fallbackCountryList: CountryRecord[] = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AR", name: "Argentina" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "BD", name: "Bangladesh" },
  { code: "BE", name: "Belgium" },
  { code: "BR", name: "Brazil" },
  { code: "BG", name: "Bulgaria" },
  { code: "CA", name: "Canada" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "HR", name: "Croatia" },
  { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" },
  { code: "EG", name: "Egypt" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "KE", name: "Kenya" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  { code: "MY", name: "Malaysia" },
  { code: "MX", name: "Mexico" },
  { code: "MA", name: "Morocco" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NG", name: "Nigeria" },
  { code: "NO", name: "Norway" },
  { code: "PK", name: "Pakistan" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "RS", name: "Serbia" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ZA", name: "South Africa" },
  { code: "KR", name: "South Korea" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "TH", name: "Thailand" },
  { code: "TR", name: "Türkiye" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "VN", name: "Vietnam" },
];

function resolveCodes(): CountryRecord[] {
  if (typeof Intl.DisplayNames !== "function") {
    return fallbackCountryList;
  }

  const intlWithOptionalSupportedValues = Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  };

  if (typeof intlWithOptionalSupportedValues.supportedValuesOf === "function") {
    try {
      const supported =
        intlWithOptionalSupportedValues.supportedValuesOf?.("region") ?? [];
      const valid = supported.filter((code) => /^[A-Z]{2}$/.test(code));
      const names = new Intl.DisplayNames(["en"], { type: "region" });
      return valid
        .map((code) => ({
          code,
          name: names.of(code) ?? code,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.warn(
        "Intl.supportedValuesOf('region') not available; falling back to static country list.",
        error,
      );
      return fallbackCountryList;
    }
  }

  return fallbackCountryList;
}

export const countries: CountryRecord[] = resolveCodes();

export function findCountryByName(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    countries.find((c) => c.name.toLowerCase() === q) ??
    countries.find((c) => c.name.toLowerCase().startsWith(q)) ??
    countries.find((c) => c.code.toLowerCase() === q) ??
    countries.find((c) => c.code.toLowerCase().startsWith(q)) ??
    null
  );
}

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

export const countries: Country[] = [
  { code: "AR", name: "Argentina", dialCode: "+549", flag: "🇦🇷" },
  { code: "BR", name: "Brasil", dialCode: "+55", flag: "🇧🇷" },
  { code: "CL", name: "Chile", dialCode: "+56", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", dialCode: "+57", flag: "🇨🇴" },
  { code: "CR", name: "Costa Rica", dialCode: "+506", flag: "🇨🇷" },
  { code: "EC", name: "Ecuador", dialCode: "+593", flag: "🇪🇨" },
  { code: "SV", name: "El Salvador", dialCode: "+503", flag: "🇸🇻" },
  { code: "GT", name: "Guatemala", dialCode: "+502", flag: "🇬🇹" },
  { code: "HN", name: "Honduras", dialCode: "+504", flag: "🇭🇳" },
  { code: "MX", name: "México", dialCode: "+52", flag: "🇲🇽" },
  { code: "NI", name: "Nicaragua", dialCode: "+505", flag: "🇳🇮" },
  { code: "PA", name: "Panamá", dialCode: "+507", flag: "🇵🇦" },
  { code: "PY", name: "Paraguay", dialCode: "+595", flag: "🇵🇾" },
  { code: "PE", name: "Perú", dialCode: "+51", flag: "🇵🇪" },
  { code: "DO", name: "República Dominicana", dialCode: "+1809", flag: "🇩🇴" },
  { code: "UY", name: "Uruguay", dialCode: "+598", flag: "🇺🇾" },
  { code: "VE", name: "Venezuela", dialCode: "+58", flag: "🇻🇪" },
  { code: "US", name: "Estados Unidos", dialCode: "+1", flag: "🇺🇸" },
  { code: "CA", name: "Canadá", dialCode: "+1", flag: "🇨🇦" },
  { code: "ES", name: "España", dialCode: "+34", flag: "🇪🇸" },
  { code: "FR", name: "Francia", dialCode: "+33", flag: "🇫🇷" },
  { code: "IT", name: "Italia", dialCode: "+39", flag: "🇮🇹" },
  { code: "DE", name: "Alemania", dialCode: "+49", flag: "🇩🇪" },
  { code: "GB", name: "Reino Unido", dialCode: "+44", flag: "🇬🇧" },
  { code: "PT", name: "Portugal", dialCode: "+351", flag: "🇵🇹" },
  { code: "NL", name: "Países Bajos", dialCode: "+31", flag: "🇳🇱" },
  { code: "BE", name: "Bélgica", dialCode: "+32", flag: "🇧🇪" },
  { code: "CH", name: "Suiza", dialCode: "+41", flag: "🇨🇭" },
  { code: "AT", name: "Austria", dialCode: "+43", flag: "🇦🇹" },
  { code: "SE", name: "Suecia", dialCode: "+46", flag: "🇸🇪" },
  { code: "NO", name: "Noruega", dialCode: "+47", flag: "🇳🇴" },
  { code: "DK", name: "Dinamarca", dialCode: "+45", flag: "🇩🇰" },
  { code: "FI", name: "Finlandia", dialCode: "+358", flag: "🇫🇮" },
  { code: "PL", name: "Polonia", dialCode: "+48", flag: "🇵🇱" },
  { code: "CZ", name: "República Checa", dialCode: "+420", flag: "🇨🇿" },
  { code: "HU", name: "Hungría", dialCode: "+36", flag: "🇭🇺" },
  { code: "RO", name: "Rumania", dialCode: "+40", flag: "🇷🇴" },
  { code: "BG", name: "Bulgaria", dialCode: "+359", flag: "🇧🇬" },
  { code: "GR", name: "Grecia", dialCode: "+30", flag: "🇬🇷" },
  { code: "TR", name: "Turquía", dialCode: "+90", flag: "🇹🇷" },
  { code: "RU", name: "Rusia", dialCode: "+7", flag: "🇷🇺" },
  { code: "UA", name: "Ucrania", dialCode: "+380", flag: "🇺🇦" },
  { code: "BY", name: "Bielorrusia", dialCode: "+375", flag: "🇧🇾" },
  { code: "LT", name: "Lituania", dialCode: "+370", flag: "🇱🇹" },
  { code: "LV", name: "Letonia", dialCode: "+371", flag: "🇱🇻" },
  { code: "EE", name: "Estonia", dialCode: "+372", flag: "🇪🇪" },
  { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳" },
  { code: "JP", name: "Japón", dialCode: "+81", flag: "🇯🇵" },
  { code: "KR", name: "Corea del Sur", dialCode: "+82", flag: "🇰🇷" },
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { code: "PK", name: "Pakistán", dialCode: "+92", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", dialCode: "+880", flag: "🇧🇩" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", flag: "🇱🇰" },
  { code: "TH", name: "Tailandia", dialCode: "+66", flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", dialCode: "+84", flag: "🇻🇳" },
  { code: "MY", name: "Malasia", dialCode: "+60", flag: "🇲🇾" },
  { code: "SG", name: "Singapur", dialCode: "+65", flag: "🇸🇬" },
  { code: "ID", name: "Indonesia", dialCode: "+62", flag: "🇮🇩" },
  { code: "PH", name: "Filipinas", dialCode: "+63", flag: "🇵🇭" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { code: "NZ", name: "Nueva Zelanda", dialCode: "+64", flag: "🇳🇿" },
  { code: "ZA", name: "Sudáfrica", dialCode: "+27", flag: "🇿🇦" },
  { code: "EG", name: "Egipto", dialCode: "+20", flag: "🇪🇬" },
  { code: "MA", name: "Marruecos", dialCode: "+212", flag: "🇲🇦" },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬" },
  { code: "KE", name: "Kenia", dialCode: "+254", flag: "🇰🇪" },
  { code: "GH", name: "Ghana", dialCode: "+233", flag: "🇬🇭" },
  { code: "IL", name: "Israel", dialCode: "+972", flag: "🇮🇱" },
  { code: "AE", name: "Emiratos Árabes Unidos", dialCode: "+971", flag: "🇦🇪" },
  { code: "SA", name: "Arabia Saudí", dialCode: "+966", flag: "🇸🇦" },
  { code: "QA", name: "Catar", dialCode: "+974", flag: "🇶🇦" },
  { code: "KW", name: "Kuwait", dialCode: "+965", flag: "🇰🇼" },
  { code: "BH", name: "Baréin", dialCode: "+973", flag: "🇧🇭" },
  { code: "OM", name: "Omán", dialCode: "+968", flag: "🇴🇲" },
  { code: "JO", name: "Jordania", dialCode: "+962", flag: "🇯🇴" },
  { code: "LB", name: "Líbano", dialCode: "+961", flag: "🇱🇧" },
  { code: "SY", name: "Siria", dialCode: "+963", flag: "🇸🇾" },
  { code: "IQ", name: "Irak", dialCode: "+964", flag: "🇮🇶" },
  { code: "IR", name: "Irán", dialCode: "+98", flag: "🇮🇷" },
  { code: "AF", name: "Afganistán", dialCode: "+93", flag: "🇦🇫" },
];

export const getCountryByCode = (code: string): Country | undefined => {
  return countries.find((country) => country.code === code);
};

export const getCountryByDialCode = (dialCode: string): Country | undefined => {
  return countries.find((country) => country.dialCode === dialCode);
};

export const searchCountries = (query: string): Country[] => {
  if (!query) return countries;

  const lowerQuery = query.toLowerCase();
  return countries.filter(
    (country) =>
      country.name.toLowerCase().includes(lowerQuery) ||
      country.dialCode.includes(query) ||
      country.code.toLowerCase().includes(lowerQuery)
  );
};

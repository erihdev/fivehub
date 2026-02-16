// Country name translations for coffee origins
export const countryTranslations: Record<string, { ar: string; en: string }> = {
  // Arabic to English mappings
  "إثيوبيا": { ar: "إثيوبيا", en: "Ethiopia" },
  "كولومبيا": { ar: "كولومبيا", en: "Colombia" },
  "البرازيل": { ar: "البرازيل", en: "Brazil" },
  "كينيا": { ar: "كينيا", en: "Kenya" },
  "غواتيمالا": { ar: "غواتيمالا", en: "Guatemala" },
  "كوستاريكا": { ar: "كوستاريكا", en: "Costa Rica" },
  "بنما": { ar: "بنما", en: "Panama" },
  "هندوراس": { ar: "هندوراس", en: "Honduras" },
  "السلفادور": { ar: "السلفادور", en: "El Salvador" },
  "بيرو": { ar: "بيرو", en: "Peru" },
  "إندونيسيا": { ar: "إندونيسيا", en: "Indonesia" },
  "اليمن": { ar: "اليمن", en: "Yemen" },
  "رواندا": { ar: "رواندا", en: "Rwanda" },
  "بوروندي": { ar: "بوروندي", en: "Burundi" },
  "تنزانيا": { ar: "تنزانيا", en: "Tanzania" },
  "المكسيك": { ar: "المكسيك", en: "Mexico" },
  "نيكاراغوا": { ar: "نيكاراغوا", en: "Nicaragua" },
  "جامايكا": { ar: "جامايكا", en: "Jamaica" },
  "هاواي": { ar: "هاواي", en: "Hawaii" },
  "الهند": { ar: "الهند", en: "India" },
  "فيتنام": { ar: "فيتنام", en: "Vietnam" },
  "بابوا غينيا الجديدة": { ar: "بابوا غينيا الجديدة", en: "Papua New Guinea" },
  "أوغندا": { ar: "أوغندا", en: "Uganda" },
  "الكونغو": { ar: "الكونغو", en: "Congo" },
  "زامبيا": { ar: "زامبيا", en: "Zambia" },
  "ملاوي": { ar: "ملاوي", en: "Malawi" },
  "بوليفيا": { ar: "بوليفيا", en: "Bolivia" },
  "الإكوادور": { ar: "الإكوادور", en: "Ecuador" },
  "فنزويلا": { ar: "فنزويلا", en: "Venezuela" },
  "كوبا": { ar: "كوبا", en: "Cuba" },
  "جمهورية الدومينيكان": { ar: "جمهورية الدومينيكان", en: "Dominican Republic" },
  "هايتي": { ar: "هايتي", en: "Haiti" },
  "بورتوريكو": { ar: "بورتوريكو", en: "Puerto Rico" },
  "الفلبين": { ar: "الفلبين", en: "Philippines" },
  "تايلاند": { ar: "تايلاند", en: "Thailand" },
  "ميانمار": { ar: "ميانمار", en: "Myanmar" },
  "لاوس": { ar: "لاوس", en: "Laos" },
  "الصين": { ar: "الصين", en: "China" },
  "تيمور الشرقية": { ar: "تيمور الشرقية", en: "Timor-Leste" },
  // English to Arabic mappings (reverse)
  "Ethiopia": { ar: "إثيوبيا", en: "Ethiopia" },
  "Colombia": { ar: "كولومبيا", en: "Colombia" },
  "Brazil": { ar: "البرازيل", en: "Brazil" },
  "Kenya": { ar: "كينيا", en: "Kenya" },
  "Guatemala": { ar: "غواتيمالا", en: "Guatemala" },
  "Costa Rica": { ar: "كوستاريكا", en: "Costa Rica" },
  "Panama": { ar: "بنما", en: "Panama" },
  "Honduras": { ar: "هندوراس", en: "Honduras" },
  "El Salvador": { ar: "السلفادور", en: "El Salvador" },
  "Peru": { ar: "بيرو", en: "Peru" },
  "Indonesia": { ar: "إندونيسيا", en: "Indonesia" },
  "Yemen": { ar: "اليمن", en: "Yemen" },
  "Rwanda": { ar: "رواندا", en: "Rwanda" },
  "Burundi": { ar: "بوروندي", en: "Burundi" },
  "Tanzania": { ar: "تنزانيا", en: "Tanzania" },
  "Mexico": { ar: "المكسيك", en: "Mexico" },
  "Nicaragua": { ar: "نيكاراغوا", en: "Nicaragua" },
  "Jamaica": { ar: "جامايكا", en: "Jamaica" },
  "Hawaii": { ar: "هاواي", en: "Hawaii" },
  "India": { ar: "الهند", en: "India" },
  "Vietnam": { ar: "فيتنام", en: "Vietnam" },
  "Papua New Guinea": { ar: "بابوا غينيا الجديدة", en: "Papua New Guinea" },
  "Uganda": { ar: "أوغندا", en: "Uganda" },
  "Congo": { ar: "الكونغو", en: "Congo" },
  "Zambia": { ar: "زامبيا", en: "Zambia" },
  "Malawi": { ar: "ملاوي", en: "Malawi" },
  "Bolivia": { ar: "بوليفيا", en: "Bolivia" },
  "Ecuador": { ar: "الإكوادور", en: "Ecuador" },
  "Venezuela": { ar: "فنزويلا", en: "Venezuela" },
  "Cuba": { ar: "كوبا", en: "Cuba" },
  "Dominican Republic": { ar: "جمهورية الدومينيكان", en: "Dominican Republic" },
  "Haiti": { ar: "هايتي", en: "Haiti" },
  "Puerto Rico": { ar: "بورتوريكو", en: "Puerto Rico" },
  "Philippines": { ar: "الفلبين", en: "Philippines" },
  "Thailand": { ar: "تايلاند", en: "Thailand" },
  "Myanmar": { ar: "ميانمار", en: "Myanmar" },
  "Laos": { ar: "لاوس", en: "Laos" },
  "China": { ar: "الصين", en: "China" },
  "Timor-Leste": { ar: "تيمور الشرقية", en: "Timor-Leste" },
};

/**
 * Translates a country/origin name based on the selected language
 * @param origin - The origin name (can be in Arabic or English)
 * @param language - Target language ('ar' or 'en')
 * @returns Translated country name or original if not found
 */
export const translateOrigin = (origin: string | null | undefined, language: 'ar' | 'en'): string => {
  if (!origin) return language === 'ar' ? 'غير محدد' : 'Unknown';
  
  const translation = countryTranslations[origin.trim()];
  if (translation) {
    return translation[language];
  }
  
  // Return original if no translation found
  return origin;
};

/**
 * Hook-friendly function to get the translation function
 */
export const getOriginTranslator = (language: 'ar' | 'en') => {
  return (origin: string | null | undefined) => translateOrigin(origin, language);
};

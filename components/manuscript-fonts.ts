// Open Font License Arabic-script families; load only those used in the article.
export const MANUSCRIPT_WEB_FONTS: Readonly<Record<string,string>> = {
  "naskh": "Noto Naskh Arabic",
  "amiri": "Amiri",
  "aref-ruqaa": "Aref Ruqaa",
  "aref-ruqaa-ink": "Aref Ruqaa Ink",
  "scheherazade": "Scheherazade New",
  "lateef": "Lateef",
  "harmattan": "Harmattan",
  "noto-sans-arabic": "Noto Sans Arabic",
  "noto-kufi-arabic": "Noto Kufi Arabic",
  "markazi": "Markazi Text",
  "mirza": "Mirza",
  "katibeh": "Katibeh",
  "rakkas": "Rakkas",
  "lalezar": "Lalezar",
  "reem-kufi": "Reem Kufi",
  "reem-kufi-ink": "Reem Kufi Ink",
  "reem-kufi-fun": "Reem Kufi Fun",
  "cairo": "Cairo",
  "tajawal": "Tajawal",
  "ibm-plex-arabic": "IBM Plex Sans Arabic",
  "vazirmatn": "Vazirmatn"
};
export function manuscriptFontLinks(body: string): string[] {
  const keys = new Set(Array.from(body.matchAll(/data-ms-font\s*=\s*["']([a-z0-9-]+)["']/gi), match => match[1]));
  return [...keys].filter(key => Object.prototype.hasOwnProperty.call(MANUSCRIPT_WEB_FONTS,key)).map(key => "https://fonts.googleapis.com/css2?family="+encodeURIComponent(MANUSCRIPT_WEB_FONTS[key]).replace(/%20/g,"+")+"&display=swap");
}

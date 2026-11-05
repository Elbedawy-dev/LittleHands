/**
 * Normalizes Arabic text for flexible search and comparison:
 * 1. Removes diacritics / tashkeel (fatḥah, ḍammah, kasrah, sukūn, shaddah, tanwīn)
 * 2. Removes tatweel / kashida (ـ)
 * 3. Unifies alef forms (أ, إ, آ, ٱ) -> ا
 * 4. Unifies yaa / alef maqsoora (ى) -> ي
 * 5. Unifies taa marbuta (ة) -> ه
 * 6. Collapses redundant whitespace
 *
 * @param {string} text
 * @returns {string} Normalized string
 */
export function arabicNormalize(text) {
  if (!text || typeof text !== 'string') return ''

  return text
    // Remove Arabic diacritics (tashkeel) and Quranic marks
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '')
    // Remove tatweel (kashida)
    .replace(/\u0640/g, '')
    // Unify Alef forms
    .replace(/[أإآٱ]/g, 'ا')
    // Unify Yaa / Alef Maqsura
    .replace(/[ى]/g, 'ي')
    // Unify Taa Marbuta to Haa
    .replace(/ة/g, 'ه')
    // Lowercase for any latin characters and trim extra spaces
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}


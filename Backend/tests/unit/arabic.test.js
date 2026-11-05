import { describe, it, expect } from 'vitest'
import { arabicNormalize } from '../../src/utils/arabic.js'

describe('Arabic Text Normalization', () => {
  it('strips tashkeel (diacritics)', () => {
    const textWithTashkeel = 'أَيْدِي صَغِيرَةٌ لِلتَّعْلِيمِ'
    expect(arabicNormalize(textWithTashkeel)).toBe('ايدي صغيره للتعليم')
  })

  it('strips tatweel (kashida)', () => {
    const textWithTatweel = 'أيـــدي صــغـيـرة'
    expect(arabicNormalize(textWithTatweel)).toBe('ايدي صغيره')
  })

  it('unifies alef variants to bare alef (ا)', () => {
    expect(arabicNormalize('أحمد')).toBe('احمد')
    expect(arabicNormalize('إسلام')).toBe('اسلام')
    expect(arabicNormalize('آمال')).toBe('امال')
  })

  it('unifies yaa variants and taa marbuta', () => {
    expect(arabicNormalize('مستشفى')).toBe('مستشفي')
    expect(arabicNormalize('روضة')).toBe('روضه')
  })
})


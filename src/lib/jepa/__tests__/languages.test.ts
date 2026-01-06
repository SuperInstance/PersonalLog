/**
 * Multi-Language Support Tests
 *
 * Tests for language definitions, detection, and emotion analysis.
 *
 * @module lib/jepa/__tests__/languages.test
 */

import { describe, it, expect } from 'vitest'
import {
  SUPPORTED_LANGUAGES,
  getLanguage,
  getLanguageByName,
  isLanguageSupported,
  isRTL,
  getSupportedLanguageCodes,
  getEmotionKeywords,
  getCulturalAdjustment,
  formatLanguageName,
  getLanguageOptions,
  type Language,
} from '../languages'

describe('Language Definitions', () => {
  describe('SUPPORTED_LANGUAGES', () => {
    it('should have at least 12 languages', () => {
      expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(12)
    })

    it('should include all required languages', () => {
      const requiredCodes = ['en', 'es', 'zh', 'ja', 'fr', 'de', 'it', 'pt', 'ko', 'hi', 'ru', 'ar']
      const codes = SUPPORTED_LANGUAGES.map(lang => lang.code)

      for (const code of requiredCodes) {
        expect(codes).toContain(code)
      }
    })

    it('should have all required fields for each language', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        expect(lang).toHaveProperty('code')
        expect(lang).toHaveProperty('name')
        expect(lang).toHaveProperty('nativeName')
        expect(lang).toHaveProperty('flag')
        expect(lang).toHaveProperty('rtl')
        expect(lang).toHaveProperty('supported')
        expect(lang).toHaveProperty('emotionModelAvailable')

        expect(typeof lang.code).toBe('string')
        expect(typeof lang.name).toBe('string')
        expect(typeof lang.nativeName).toBe('string')
        expect(typeof lang.flag).toBe('string')
        expect(typeof lang.rtl).toBe('boolean')
        expect(typeof lang.supported).toBe('boolean')
        expect(typeof lang.emotionModelAvailable).toBe('boolean')
      }
    })

    it('should have unique language codes', () => {
      const codes = SUPPORTED_LANGUAGES.map(lang => lang.code)
      const uniqueCodes = new Set(codes)

      expect(uniqueCodes.size).toBe(codes.length)
    })

    it('should have Arabic as RTL language', () => {
      const arabic = SUPPORTED_LANGUAGES.find(lang => lang.code === 'ar')

      expect(arabic).toBeDefined()
      expect(arabic?.rtl).toBe(true)
    })

    it('should have all other languages as LTR', () => {
      const rtlLanguages = SUPPORTED_LANGUAGES.filter(lang => lang.rtl)

      expect(rtlLanguages.length).toBe(1)
      expect(rtlLanguages[0].code).toBe('ar')
    })
  })

  describe('getLanguage', () => {
    it('should return language by code', () => {
      const english = getLanguage('en')

      expect(english).toBeDefined()
      expect(english?.code).toBe('en')
      expect(english?.name).toBe('English')
      expect(english?.flag).toBe('🇺🇸')
    })

    it('should return undefined for invalid code', () => {
      const invalid = getLanguage('invalid')

      expect(invalid).toBeUndefined()
    })

    it('should get all supported languages', () => {
      const codes = ['en', 'es', 'zh', 'ja']

      for (const code of codes) {
        const lang = getLanguage(code)
        expect(lang).toBeDefined()
        expect(lang?.supported).toBe(true)
      }
    })
  })

  describe('getLanguageByName', () => {
    it('should find language by English name', () => {
      const english = getLanguageByName('English')

      expect(english).toBeDefined()
      expect(english?.code).toBe('en')
    })

    it('should find language by native name', () => {
      const spanish = getLanguageByName('Español')

      expect(spanish).toBeDefined()
      expect(spanish?.code).toBe('es')
    })

    it('should be case-insensitive', () => {
      const french1 = getLanguageByName('French')
      const french2 = getLanguageByName('FRENCH')
      const french3 = getLanguageByName('french')

      expect(french1).toEqual(french2)
      expect(french2).toEqual(french3)
    })

    it('should return undefined for invalid name', () => {
      const invalid = getLanguageByName('Klingon')

      expect(invalid).toBeUndefined()
    })
  })

  describe('isLanguageSupported', () => {
    it('should return true for supported languages', () => {
      expect(isLanguageSupported('en')).toBe(true)
      expect(isLanguageSupported('es')).toBe(true)
      expect(isLanguageSupported('zh')).toBe(true)
    })

    it('should return false for unsupported languages', () => {
      expect(isLanguageSupported('invalid')).toBe(false)
      expect(isLanguageSupported('xx')).toBe(false)
    })
  })

  describe('isRTL', () => {
    it('should return true for Arabic', () => {
      expect(isRTL('ar')).toBe(true)
    })

    it('should return false for LTR languages', () => {
      expect(isRTL('en')).toBe(false)
      expect(isRTL('es')).toBe(false)
      expect(isRTL('zh')).toBe(false)
    })

    it('should return false for invalid language', () => {
      expect(isRTL('invalid')).toBe(false)
    })
  })

  describe('getSupportedLanguageCodes', () => {
    it('should return array of language codes', () => {
      const codes = getSupportedLanguageCodes()

      expect(Array.isArray(codes)).toBe(true)
      expect(codes.length).toBeGreaterThan(0)
    })

    it('should only include supported languages', () => {
      const codes = getSupportedLanguageCodes()

      for (const code of codes) {
        const lang = getLanguage(code)
        expect(lang?.supported).toBe(true)
      }
    })
  })

  describe('getEmotionKeywords', () => {
    it('should return keywords for English', () => {
      const keywords = getEmotionKeywords('en')

      expect(keywords).toBeDefined()
      expect(keywords?.positive).toBeDefined()
      expect(keywords?.negative).toBeDefined()
      expect(keywords?.highArousal).toBeDefined()
    })

    it('should have positive emotion keywords', () => {
      const keywords = getEmotionKeywords('en')

      expect(keywords?.positive).toContain('happy')
      expect(keywords?.positive).toContain('love')
      expect(keywords?.positive).toContain('excited')
    })

    it('should have negative emotion keywords', () => {
      const keywords = getEmotionKeywords('en')

      expect(keywords?.negative).toContain('sad')
      expect(keywords?.negative).toContain('angry')
      expect(keywords?.negative).toContain('frustrated')
    })

    it('should have high arousal keywords', () => {
      const keywords = getEmotionKeywords('en')

      expect(keywords?.highArousal).toContain('!')
      expect(keywords?.highArousal).toContain('very')
      expect(keywords?.highArousal).toContain('really')
    })

    it('should return English keywords as fallback', () => {
      const keywords = getEmotionKeywords('invalid')

      expect(keywords).toBeDefined()
      expect(keywords?.positive).toContain('happy')
    })
  })

  describe('getCulturalAdjustment', () => {
    it('should return adjustment factors for Japanese', () => {
      const adjustment = getCulturalAdjustment('ja')

      expect(adjustment).toBeDefined()
      expect(adjustment?.valence).toBeLessThan(1.0) // More subtle
      expect(adjustment?.arousal).toBeLessThan(1.0) // Lower intensity
      expect(adjustment?.dominance).toBeLessThan(1.0) // Less assertive
    })

    it('should return adjustment factors for Spanish', () => {
      const adjustment = getCulturalAdjustment('es')

      expect(adjustment).toBeDefined()
      expect(adjustment?.valence).toBeGreaterThan(1.0) // More expressive
      expect(adjustment?.arousal).toBeGreaterThan(1.0) // Higher intensity
    })

    it('should return default adjustment for unknown language', () => {
      const adjustment = getCulturalAdjustment('invalid')

      expect(adjustment).toBeDefined()
      expect(adjustment?.valence).toBe(1.0)
      expect(adjustment?.arousal).toBe(1.0)
      expect(adjustment?.dominance).toBe(1.0)
    })
  })

  describe('formatLanguageName', () => {
    it('should format as flag only', () => {
      const formatted = formatLanguageName('en', 'flag')

      expect(formatted).toBe('🇺🇸')
    })

    it('should format as name only', () => {
      const formatted = formatLanguageName('en', 'name')

      expect(formatted).toBe('English')
    })

    it('should format as native name only', () => {
      const formatted = formatLanguageName('es', 'native')

      expect(formatted).toBe('Español')
    })

    it('should format as full', () => {
      const formatted = formatLanguageName('en', 'full')

      expect(formatted).toBe('🇺🇸 English (English)')
    })

    it('should return code for invalid language', () => {
      const formatted = formatLanguageName('invalid', 'full')

      expect(formatted).toBe('invalid')
    })
  })

  describe('getLanguageOptions', () => {
    it('should return array of options for select component', () => {
      const options = getLanguageOptions()

      expect(Array.isArray(options)).toBe(true)
      expect(options.length).toBeGreaterThan(0)
    })

    it('should have value, label, and flag properties', () => {
      const options = getLanguageOptions()

      for (const option of options) {
        expect(option).toHaveProperty('value')
        expect(option).toHaveProperty('label')
        expect(option).toHaveProperty('flag')

        expect(typeof option.value).toBe('string')
        expect(typeof option.label).toBe('string')
        expect(typeof option.flag).toBe('string')
      }
    })

    it('should include flag in label', () => {
      const options = getLanguageOptions()
      const english = options.find(opt => opt.value === 'en')

      expect(english?.label).toContain('🇺🇸')
      expect(english?.label).toContain('English')
    })
  })
})

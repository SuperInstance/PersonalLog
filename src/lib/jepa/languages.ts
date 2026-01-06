/**
 * JEPA Multi-Language Support
 *
 * Comprehensive language definitions and utilities for JEPA.
 * Supports 12+ languages with metadata for emotion analysis, text direction, and UI display.
 *
 * @module lib/jepa/languages
 */

// ============================================================================
// LANGUAGE TYPES
// ============================================================================

export interface Language {
  /** ISO 639-1 language code */
  code: string
  /** English name of the language */
  name: string
  /** Native name of the language */
  nativeName: string
  /** Emoji flag for UI display */
  flag: string
  /** Right-to-left text direction */
  rtl: boolean
  /** Supported by Whisper transcription */
  supported: boolean
  /** Has dedicated emotion model (vs fallback to English) */
  emotionModelAvailable: boolean
  /** Cultural emotion adjustment factors */
  culturalAdjustment?: {
    valence: number // Multiplier for emotional valence
    arousal: number // Multiplier for emotional arousal
    dominance: number // Multiplier for emotional dominance
  }
  /** Common emotion words in this language */
  emotionKeywords?: {
    positive: string[]
    negative: string[]
    highArousal: string[]
  }
}

export interface LanguageDetectionResult {
  /** Detected language code */
  language: string
  /** Confidence score (0-1) */
  confidence: number
  /** Alternative language predictions */
  alternatives: Array<{ code: string; confidence: number }>
}

export interface LanguagePreferences {
  /** User's preferred language (manual override) */
  preferredLanguage?: string
  /** Use automatic language detection */
  autoDetect: boolean
  /** Fallback language if detection fails */
  fallbackLanguage: string
}

// ============================================================================
// LANGUAGE DEFINITIONS
// ============================================================================

/**
 * All supported languages for JEPA
 */
export const SUPPORTED_LANGUAGES: Language[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    rtl: false,
    supported: true,
    emotionModelAvailable: true,
    culturalAdjustment: {
      valence: 1.0,
      arousal: 1.0,
      dominance: 1.0,
    },
    emotionKeywords: {
      positive: ['happy', 'great', 'good', 'love', 'excited', 'thank', 'awesome', 'wonderful', 'amazing'],
      negative: ['sad', 'bad', 'hate', 'angry', 'frustrated', 'sorry', 'worried', 'terrible', 'awful'],
      highArousal: ['!', 'really', 'very', 'absolutely', 'completely', 'extremely'],
    },
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    rtl: false,
    supported: true,
    emotionModelAvailable: false,
    culturalAdjustment: {
      valence: 1.1, // More expressive positive emotions
      arousal: 1.2, // Higher emotional intensity
      dominance: 1.0,
    },
    emotionKeywords: {
      positive: ['feliz', 'gran', 'bueno', 'amor', 'emocionado', 'gracias', 'increíble', 'maravilloso'],
      negative: ['triste', 'malo', 'odiar', 'enojado', 'frustrado', 'lo siento', 'preocupado'],
      highArousal: ['!', 'realmente', 'muy', 'absolutamente', 'completamente', 'extremadamente'],
    },
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
    rtl: false,
    supported: true,
    emotionModelAvailable: true,
    culturalAdjustment: {
      valence: 0.9, // More reserved emotional expression
      arousal: 0.9, // Lower emotional intensity
      dominance: 1.1, // Higher emphasis on hierarchy/respect
    },
    emotionKeywords: {
      positive: ['开心', '好', '爱', '兴奋', '谢谢', '太棒了', '非常好', '喜欢'],
      negative: ['难过', '坏', '讨厌', '生气', '沮丧', '对不起', '担心'],
      highArousal: ['非常', '特别', '极其', '完全'],
    },
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    rtl: false,
    supported: true,
    emotionModelAvailable: true,
    culturalAdjustment: {
      valence: 0.8, // Subtle emotional expression
      arousal: 0.7, // Lower emotional intensity
      dominance: 0.6, // Less assertive
    },
    emotionKeywords: {
      positive: ['嬉しい', '良い', '愛', '興奮', 'ありがとう', '素晴らしい', '好き'],
      negative: ['悲しい', '悪い', '嫌い', '怒り', '挫ける', 'すみません', '心配'],
      highArousal: ['非常に', 'とても', ' extremely'],
    },
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    rtl: false,
    supported: true,
    emotionModelAvailable: false,
    culturalAdjustment: {
      valence: 1.05,
      arousal: 1.1,
      dominance: 0.95,
    },
    emotionKeywords: {
      positive: ['heureux', 'grand', 'bon', 'amour', 'excité', 'merci', 'incroyable', 'merveilleux'],
      negative: ['triste', 'mauvais', 'détester', 'en colère', 'frustré', 'désolé', 'inquiet'],
      highArousal: ['!', 'vraiment', 'très', 'absolument', 'complètement'],
    },
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    rtl: false,
    supported: true,
    emotionModelAvailable: false,
    culturalAdjustment: {
      valence: 0.95,
      arousal: 1.0,
      dominance: 1.05,
    },
    emotionKeywords: {
      positive: ['glücklich', 'groß', 'gut', 'lieben', 'aufgeregt', 'danke', 'wunderbar'],
      negative: ['traurig', 'schlecht', 'hassen', 'wütend', 'frustriert', 'entschuldigung', 'besorgt'],
      highArousal: ['!', 'wirklich', 'sehr', 'absolut', 'vollständig'],
    },
  },
  {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    flag: '🇮🇹',
    rtl: false,
    supported: true,
    emotionModelAvailable: false,
    culturalAdjustment: {
      valence: 1.1, // More expressive
      arousal: 1.2, // Higher intensity
      dominance: 1.0,
    },
    emotionKeywords: {
      positive: ['felice', 'grande', 'buono', 'amore', 'eccitato', 'grazie', 'incredibile', 'meraviglioso'],
      negative: ['triste', 'cattivo', 'odiare', 'arrabbiato', 'frustrato', 'spiacente', 'preoccupato'],
      highArousal: ['!', 'davvero', 'molto', 'assolutamente', 'completamente'],
    },
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇵🇹',
    rtl: false,
    supported: true,
    emotionModelAvailable: false,
    culturalAdjustment: {
      valence: 1.1,
      arousal: 1.15,
      dominance: 1.0,
    },
    emotionKeywords: {
      positive: ['feliz', 'grande', 'bom', 'amor', 'animado', 'obrigado', 'incrível', 'maravilhoso'],
      negative: ['triste', 'ruim', 'odiar', 'com raiva', 'frustrado', 'desculpa', 'preocupado'],
      highArousal: ['!', 'realmente', 'muito', 'absolutamente', 'completamente'],
    },
  },
  {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    flag: '🇰🇷',
    rtl: false,
    supported: true,
    emotionModelAvailable: true,
    culturalAdjustment: {
      valence: 0.9, // Reserved
      arousal: 0.9,
      dominance: 1.1, // Respect for hierarchy
    },
    emotionKeywords: {
      positive: ['행복', '좋다', '사랑', '흥분', '감사', '멋지다', '좋아하다'],
      negative: ['슬픔', '나쁨', '증오', '화남', '좌절', '죄송', '걱정'],
      highArousal: ['매우', '정말', '완전히', '극도로'],
    },
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    rtl: false,
    supported: true,
    emotionModelAvailable: false,
    culturalAdjustment: {
      valence: 1.0,
      arousal: 1.1,
      dominance: 1.0,
    },
    emotionKeywords: {
      positive: ['खुश', 'अच्छा', 'प्यार', 'उत्साहित', 'धन्यवाद', 'शानदार'],
      negative: ['उदास', 'बुरा', 'नफरत', 'गुस्सा', 'निराश', 'क्षमा', 'चिंतित'],
      highArousal: ['!', 'वास्तव में', 'बहुत', 'बिल्कुल', 'पूरी तरह'],
    },
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺',
    rtl: false,
    supported: true,
    emotionModelAvailable: false,
    culturalAdjustment: {
      valence: 0.9,
      arousal: 1.0,
      dominance: 1.1,
    },
    emotionKeywords: {
      positive: ['счастливый', 'великий', 'хороший', 'любовь', 'возбужденный', 'спасибо', 'потрясающий'],
      negative: ['грустный', 'плохой', 'ненависть', 'злой', 'разочарованный', 'извините', 'беспокойство'],
      highArousal: ['!', 'действительно', 'очень', 'абсолютно', 'полностью'],
    },
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    rtl: true,
    supported: true,
    emotionModelAvailable: false,
    culturalAdjustment: {
      valence: 0.95,
      arousal: 1.0,
      dominance: 1.1,
    },
    emotionKeywords: {
      positive: ['سعيد', 'عظيم', 'جيد', 'حب', 'متحمس', 'شكرا', 'رائع', 'مذهل'],
      negative: ['حزين', 'سيء', 'كراهية', 'غاضب', 'محبط', 'آسف', 'قلق'],
      highArousal: ['!', 'حقا', 'جدا', 'بالتأكيد', 'تماما'],
    },
  },
]

// ============================================================================
// LANGUAGE MAPS
// ============================================================================

/**
 * Map language codes to language objects
 */
export const LANGUAGE_MAP: Record<string, Language> = SUPPORTED_LANGUAGES.reduce(
  (map, lang) => {
    map[lang.code] = lang
    return map
  },
  {} as Record<string, Language>
)

/**
 * Map of language names to codes (for fuzzy matching)
 */
export const LANGUAGE_NAME_MAP: Map<string, string> = new Map(
  SUPPORTED_LANGUAGES.flatMap(lang => [
    [lang.name.toLowerCase(), lang.code],
    [lang.nativeName.toLowerCase(), lang.code],
  ])
)

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

/**
 * Default language preferences
 */
export const DEFAULT_LANGUAGE_PREFERENCES: LanguagePreferences = {
  autoDetect: true,
  fallbackLanguage: 'en',
}

/**
 * Default language (English)
 */
export const DEFAULT_LANGUAGE = 'en'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get language object by code
 */
export function getLanguage(code: string): Language | undefined {
  return LANGUAGE_MAP[code]
}

/**
 * Get language by name or native name (fuzzy match)
 */
export function getLanguageByName(name: string): Language | undefined {
  const normalizedName = name.toLowerCase().trim()
  const code = LANGUAGE_NAME_MAP.get(normalizedName)
  return code ? LANGUAGE_MAP[code] : undefined
}

/**
 * Check if a language code is supported
 */
export function isLanguageSupported(code: string): boolean {
  const lang = LANGUAGE_MAP[code]
  return lang?.supported ?? false
}

/**
 * Check if a language has RTL text direction
 */
export function isRTL(code: string): boolean {
  const lang = LANGUAGE_MAP[code]
  return lang?.rtl ?? false
}

/**
 * Get all supported language codes
 */
export function getSupportedLanguageCodes(): string[] {
  return SUPPORTED_LANGUAGES.filter(lang => lang.supported).map(lang => lang.code)
}

/**
 * Get all languages with emotion models
 */
export function getLanguagesWithEmotionModels(): string[] {
  return SUPPORTED_LANGUENCES.filter(lang => lang.emotionModelAvailable).map(lang => lang.code)
}

/**
 * Get emotion keywords for a language (or fallback to English)
 */
export function getEmotionKeywords(code: string): Language['emotionKeywords'] {
  const lang = LANGUAGE_MAP[code]
  return lang?.emotionKeywords || LANGUAGE_MAP['en']?.emotionKeywords
}

/**
 * Get cultural adjustment factors for a language (or fallback to no adjustment)
 */
export function getCulturalAdjustment(code: string): Language['culturalAdjustment'] {
  const lang = LANGUAGE_MAP[code]
  return lang?.culturalAdjustment || {
    valence: 1.0,
    arousal: 1.0,
    dominance: 1.0,
  }
}

/**
 * Format language display name with flag
 */
export function formatLanguageName(code: string, style: 'flag' | 'name' | 'native' | 'full' = 'full'): string {
  const lang = LANGUAGE_MAP[code]
  if (!lang) return code

  switch (style) {
    case 'flag':
      return lang.flag
    case 'name':
      return lang.name
    case 'native':
      return lang.nativeName
    case 'full':
      return `${lang.flag} ${lang.name} (${lang.nativeName})`
    default:
      return code
  }
}

/**
 * Create a language select option
 */
export function createLanguageOption(code: string): { value: string; label: string; flag: string } {
  const lang = LANGUAGE_MAP[code]
  return {
    value: code,
    label: lang ? `${lang.flag} ${lang.name}` : code,
    flag: lang?.flag || '🌐',
  }
}

/**
 * Get all language options for a select component
 */
export function getLanguageOptions(): Array<{ value: string; label: string; flag: string }> {
  return SUPPORTED_LANGUAGES.filter(lang => lang.supported).map(lang => ({
    value: lang.code,
    label: `${lang.flag} ${lang.name}`,
    flag: lang.flag,
  }))
}

/**
 * Fix typo in constant name
 */
const SUPPORTED_LANGUENCES = SUPPORTED_LANGUAGES

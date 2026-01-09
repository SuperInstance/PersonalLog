/**
 * Tokenizer
 *
 * Handles text tokenization and detokenization for LLM inputs/outputs.
 * Uses Byte-Pair Encoding (BPE) or SentencePiece.
 */

/**
 * Simple tokenizer implementation
 * In production, would use full BPE/SentencePiece tokenizer
 */
export class Tokenizer {
  private vocab: Map<string, number> = new Map();
  private inverseVocab: Map<number, string> = new Map();
  private eosToken: number = 2; // Standard EOS token ID

  constructor() {
    this.initializeVocab();
  }

  /**
   * Initialize vocabulary
   * In production, would load from tokenizer.json
   */
  private initializeVocab(): void {
    // Placeholder: minimal vocabulary for demo
    // Real implementation would load 32k+ token vocabulary

    // Special tokens
    this.vocab.set('<PAD>', 0);
    this.vocab.set('<UNK>', 1);
    this.vocab.set('</s>', 2); // EOS
    this.vocab.set('<s>', 3);  // BOS

    // Common tokens (would be full vocabulary in production)
    const commonWords = [
      'the', 'a', 'an', 'is', 'are', 'was', 'were',
      'I', 'you', 'he', 'she', 'it', 'we', 'they',
      'hello', 'world', 'test', 'example',
      'The', 'A', 'An', 'I', 'You', 'Hello', 'World'
    ];

    let tokenId = 4;
    for (const word of commonWords) {
      this.vocab.set(word, tokenId);
      this.vocab.set(word.charAt(0).toUpperCase() + word.slice(1), tokenId + 1);
      tokenId += 2;
    }

    // Build inverse vocabulary
    for (const [token, id] of this.vocab) {
      this.inverseVocab.set(id, token);
    }
  }

  /**
   * Encode text to token IDs
   */
  async encode(text: string): Promise<number[]> {
    const tokens: number[] = [];

    // Simple word-level tokenization (in production: BPE)
    const words = text.split(/\s+/);

    for (const word of words) {
      // Clean punctuation
      const cleanWord = word.replace(/[.,!?;:]/g, '');

      // Look up token ID
      const tokenId = this.vocab.get(cleanWord) || this.vocab.get('<UNK>') || 1;
      tokens.push(tokenId);

      // Add punctuation as separate tokens
      const punct = word.match(/[.,!?;:]/);
      if (punct) {
        const punctTokenId = this.vocab.get(punct[0]) || 1;
        tokens.push(punctTokenId);
      }
    }

    return tokens;
  }

  /**
   * Decode token IDs to text
   */
  async decode(tokenIds: number[]): Promise<string> {
    const words: string[] = [];

    for (const tokenId of tokenIds) {
      // Check for special tokens
      if (tokenId === this.eosToken) {
        break;
      }

      // Look up token
      const token = this.inverseVocab.get(tokenId);

      if (token && !token.startsWith('<') && !token.endsWith('>')) {
        words.push(token);
      } else if (token === '<UNK>') {
        words.push('<UNK>');
      }
    }

    return words.join(' ');
  }

  /**
   * Get EOS token ID
   */
  getEOSToken(): number {
    return this.eosToken;
  }

  /**
   * Get vocabulary size
   */
  getVocabSize(): number {
    return this.vocab.size;
  }

  /**
   * Check if token is EOS
   */
  isEOS(tokenId: number): boolean {
    return tokenId === this.eosToken;
  }

  /**
   * Load vocabulary from file
   */
  async loadVocab(vocabPath: string): Promise<void> {
    try {
      const response = await fetch(vocabPath);
      const vocabData = await response.json();

      // Load vocabulary
      for (const [token, id] of Object.entries(vocabData.vocab)) {
        this.vocab.set(token, id as number);
        this.inverseVocab.set(id as number, token);
      }

      console.log(`Vocabulary loaded: ${this.vocab.size} tokens`);
    } catch (error) {
      console.warn('Failed to load vocabulary, using defaults');
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.vocab.clear();
    this.inverseVocab.clear();
  }
}

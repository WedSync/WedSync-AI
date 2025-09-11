/**
 * WS-164: Voice Recognition Manager
 * Advanced voice-to-text system for mobile expense entry
 */

import { notificationManager } from './notification-manager';

export interface VoiceCapabilities {
  hasVoiceRecognition: boolean;
  supportsContinuousRecognition: boolean;
  supportsInterimResults: boolean;
  supportedLanguages: string[];
  maxRecordingDuration: number; // in seconds
}

export interface VoiceSettings {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  sensitivity: 'low' | 'medium' | 'high';
}

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  alternatives: Array<{
    transcript: string;
    confidence: number;
  }>;
  isFinal: boolean;
  timestamp: string;
}

export interface ParsedExpense {
  amount?: number;
  vendor?: string;
  category?: string;
  description: string;
  date?: string;
  paymentMethod?: string;
  confidence: number;
  rawTranscript: string;
}

export interface VoiceRecordingSession {
  id: string;
  startTime: string;
  endTime?: string;
  results: VoiceRecognitionResult[];
  finalTranscript: string;
  parsedExpense?: ParsedExpense;
  isActive: boolean;
}

export class MobileVoiceManager {
  private recognition: any = null;
  private capabilities: VoiceCapabilities | null = null;
  private currentSettings: VoiceSettings;
  private isInitialized = false;
  private isListening = false;
  private currentSession: VoiceRecordingSession | null = null;
  private onResultCallback: ((result: VoiceRecognitionResult) => void) | null =
    null;
  private onErrorCallback: ((error: string) => void) | null = null;

  constructor() {
    this.currentSettings = {
      language: 'en-US',
      continuous: false,
      interimResults: true,
      maxAlternatives: 3,
      sensitivity: 'medium',
    };
  }

  // Initialize voice recognition system
  async initialize(): Promise<boolean> {
    try {
      // Check for Web Speech API support
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        throw new Error('Speech Recognition API not supported');
      }

      this.recognition = new SpeechRecognition();

      // Detect capabilities
      this.capabilities = await this.detectCapabilities();

      if (!this.capabilities.hasVoiceRecognition) {
        throw new Error('Voice recognition not available');
      }

      // Configure recognition
      this.setupRecognition();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('[VoiceManager] Initialization failed:', error);
      return false;
    }
  }

  // Detect voice capabilities
  private async detectCapabilities(): Promise<VoiceCapabilities> {
    const capabilities: VoiceCapabilities = {
      hasVoiceRecognition: !!this.recognition,
      supportsContinuousRecognition: true,
      supportsInterimResults: true,
      supportedLanguages: ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE'],
      maxRecordingDuration: 60, // 60 seconds default
    };

    try {
      // Test if speech recognition actually works
      if (this.recognition) {
        // Check for specific features
        capabilities.supportsContinuousRecognition =
          'continuous' in this.recognition;
        capabilities.supportsInterimResults =
          'interimResults' in this.recognition;

        // Get supported languages if available
        if ('getVoices' in speechSynthesis) {
          const voices = speechSynthesis.getVoices();
          if (voices.length > 0) {
            capabilities.supportedLanguages = [
              ...new Set(voices.map((voice) => voice.lang)),
            ];
          }
        }
      }
    } catch (error) {
      console.warn('[VoiceManager] Feature detection failed:', error);
    }

    return capabilities;
  }

  // Set up speech recognition
  private setupRecognition(): void {
    if (!this.recognition) return;

    // Configure recognition settings
    this.recognition.continuous = this.currentSettings.continuous;
    this.recognition.interimResults = this.currentSettings.interimResults;
    this.recognition.lang = this.currentSettings.language;
    this.recognition.maxAlternatives = this.currentSettings.maxAlternatives;

    // Set up event handlers
    this.recognition.onstart = () => {
      console.log('[VoiceManager] Recognition started');
      this.isListening = true;
    };

    this.recognition.onresult = (event: any) => {
      const results = Array.from(event.results);
      const lastResult = results[results.length - 1];

      if (lastResult && this.currentSession) {
        const result: VoiceRecognitionResult = {
          transcript: lastResult[0].transcript,
          confidence: lastResult[0].confidence,
          alternatives: Array.from(lastResult).map((alt: any) => ({
            transcript: alt.transcript,
            confidence: alt.confidence,
          })),
          isFinal: lastResult.isFinal,
          timestamp: new Date().toISOString(),
        };

        // Add to current session
        this.currentSession.results.push(result);

        if (result.isFinal) {
          this.currentSession.finalTranscript += result.transcript + ' ';
        }

        // Call result callback
        if (this.onResultCallback) {
          this.onResultCallback(result);
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('[VoiceManager] Recognition error:', event.error);
      this.isListening = false;

      if (this.onErrorCallback) {
        this.onErrorCallback(event.error);
      }
    };

    this.recognition.onend = () => {
      console.log('[VoiceManager] Recognition ended');
      this.isListening = false;

      if (this.currentSession) {
        this.currentSession.isActive = false;
        this.currentSession.endTime = new Date().toISOString();
      }
    };
  }

  // Start voice recording for expense entry
  async startExpenseRecording(userId: string): Promise<string | null> {
    try {
      if (!this.isInitialized || !this.recognition) {
        throw new Error('Voice manager not initialized');
      }

      if (this.isListening) {
        throw new Error('Already listening');
      }

      // Create new recording session
      const sessionId = `voice_${Date.now()}`;
      this.currentSession = {
        id: sessionId,
        startTime: new Date().toISOString(),
        results: [],
        finalTranscript: '',
        isActive: true,
      };

      // Start recognition
      this.recognition.start();

      // Set up timeout for automatic stop
      setTimeout(
        () => {
          if (this.isListening && this.currentSession?.id === sessionId) {
            this.stopRecording();
          }
        },
        (this.capabilities?.maxRecordingDuration || 60) * 1000,
      );

      return sessionId;
    } catch (error) {
      console.error('[VoiceManager] Failed to start recording:', error);
      return null;
    }
  }

  // Stop voice recording
  async stopRecording(): Promise<ParsedExpense | null> {
    try {
      if (!this.isListening || !this.recognition) {
        return null;
      }

      this.recognition.stop();

      // Wait a moment for final results
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (!this.currentSession) {
        return null;
      }

      const session = this.currentSession;
      this.currentSession = null;

      // Parse the final transcript into expense data
      if (session.finalTranscript.trim()) {
        const parsedExpense = await this.parseExpenseFromTranscript(
          session.finalTranscript.trim(),
        );
        session.parsedExpense = parsedExpense;

        return parsedExpense;
      }

      return null;
    } catch (error) {
      console.error('[VoiceManager] Failed to stop recording:', error);
      return null;
    }
  }

  // Parse expense data from transcript
  private async parseExpenseFromTranscript(
    transcript: string,
  ): Promise<ParsedExpense> {
    const parsedExpense: ParsedExpense = {
      description: transcript,
      rawTranscript: transcript,
      confidence: 0,
    };

    try {
      const lowerTranscript = transcript.toLowerCase();

      // Extract amount (various formats)
      const amountPatterns = [
        /(?:cost|paid|spent|price|total|amount)\s*(?:was|is|of)?\s*\$?(\d+(?:\.\d{2})?)/gi,
        /\$(\d+(?:\.\d{2})?)/g,
        /(\d+)\s*(?:dollars?|bucks?)/gi,
        /(\d+(?:\.\d{2})?)\s*(?:dollar|buck)/gi,
      ];

      for (const pattern of amountPatterns) {
        const match = lowerTranscript.match(pattern);
        if (match) {
          const numericMatch = match[0].match(/\d+(?:\.\d{2})?/);
          if (numericMatch) {
            parsedExpense.amount = parseFloat(numericMatch[0]);
            parsedExpense.confidence += 0.3;
            break;
          }
        }
      }

      // Extract vendor/location
      const vendorPatterns = [
        /(?:at|from|to)\s+([A-Za-z\s]+?)(?:\s+(?:for|cost|paid|spent))/gi,
        /(?:bought|purchased)\s+(?:from|at)\s+([A-Za-z\s]+)/gi,
        /(?:went to|visited)\s+([A-Za-z\s]+)/gi,
      ];

      for (const pattern of vendorPatterns) {
        const match = pattern.exec(lowerTranscript);
        if (match && match[1]) {
          parsedExpense.vendor = match[1].trim();
          parsedExpense.confidence += 0.2;
          break;
        }
      }

      // If no vendor found, try to extract business names
      if (!parsedExpense.vendor) {
        const businessPatterns = [
          /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g, // Capitalized words that might be business names
        ];

        const words = transcript.split(' ');
        const capitalizedWords = words.filter(
          (word) =>
            word.length > 2 &&
            word[0] === word[0].toUpperCase() &&
            ![
              'I',
              'At',
              'For',
              'The',
              'And',
              'Or',
              'But',
              'So',
              'To',
              'From',
            ].includes(word),
        );

        if (capitalizedWords.length > 0) {
          parsedExpense.vendor = capitalizedWords.slice(0, 2).join(' ');
          parsedExpense.confidence += 0.1;
        }
      }

      // Extract category based on context
      parsedExpense.category = this.categorizeFromTranscript(transcript);
      if (parsedExpense.category !== 'Miscellaneous') {
        parsedExpense.confidence += 0.2;
      }

      // Extract payment method
      const paymentPatterns = [
        /(?:with|using|paid\s+with)\s+(cash|card|credit\s*card|debit\s*card|check|venmo|paypal|apple\s*pay|google\s*pay)/gi,
      ];

      for (const pattern of paymentPatterns) {
        const match = pattern.exec(lowerTranscript);
        if (match && match[1]) {
          parsedExpense.paymentMethod = this.normalizePaymentMethod(match[1]);
          parsedExpense.confidence += 0.1;
          break;
        }
      }

      // Extract date (today, yesterday, specific dates)
      const datePatterns = [
        /(?:today|this morning|this afternoon|this evening)/gi,
        /(?:yesterday|last night)/gi,
        /(?:on\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
        /(?:on\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/g,
      ];

      for (const pattern of datePatterns) {
        const match = pattern.exec(lowerTranscript);
        if (match) {
          parsedExpense.date = this.parseDateFromMatch(match[0]);
          parsedExpense.confidence += 0.1;
          break;
        }
      }

      // Default to today if no date found
      if (!parsedExpense.date) {
        parsedExpense.date = new Date().toISOString().split('T')[0];
      }

      // Minimum confidence threshold
      parsedExpense.confidence = Math.max(
        0.1,
        Math.min(1.0, parsedExpense.confidence),
      );
    } catch (error) {
      console.error('[VoiceManager] Transcript parsing failed:', error);
    }

    return parsedExpense;
  }

  // Categorize expense based on transcript content
  private categorizeFromTranscript(transcript: string): string {
    const lowerTranscript = transcript.toLowerCase();

    const categoryKeywords: Record<string, string[]> = {
      'Food & Catering': [
        'restaurant',
        'cafe',
        'coffee',
        'lunch',
        'dinner',
        'breakfast',
        'food',
        'eat',
        'meal',
        'pizza',
        'burger',
        'sandwich',
        'takeout',
        'delivery',
        'catering',
        'bakery',
        'cake',
      ],
      Transportation: [
        'uber',
        'lyft',
        'taxi',
        'gas',
        'fuel',
        'parking',
        'car',
        'rental',
        'flight',
        'train',
        'bus',
        'subway',
        'transport',
        'travel',
        'hotel',
        'motel',
      ],
      'Venue & Decor': [
        'venue',
        'hall',
        'flowers',
        'florist',
        'decoration',
        'decor',
        'centerpiece',
        'bouquet',
        'table',
        'chair',
        'lighting',
        'tent',
        'rental',
      ],
      Photography: [
        'photographer',
        'photo',
        'picture',
        'camera',
        'videographer',
        'video',
        'album',
        'prints',
      ],
      'Music & Entertainment': [
        'dj',
        'music',
        'band',
        'sound',
        'speaker',
        'microphone',
        'entertainment',
        'performer',
      ],
      Attire: [
        'dress',
        'suit',
        'tuxedo',
        'shoes',
        'jewelry',
        'ring',
        'boutique',
        'tailor',
        'alterations',
      ],
      Beauty: [
        'salon',
        'spa',
        'makeup',
        'hair',
        'beauty',
        'nails',
        'facial',
        'massage',
      ],
      Miscellaneous: [],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((keyword) => lowerTranscript.includes(keyword))) {
        return category;
      }
    }

    return 'Miscellaneous';
  }

  // Normalize payment method names
  private normalizePaymentMethod(method: string): string {
    const normalized = method.toLowerCase().replace(/\s+/g, '');

    const methodMap: Record<string, string> = {
      card: 'Credit Card',
      creditcard: 'Credit Card',
      debitcard: 'Debit Card',
      cash: 'Cash',
      check: 'Check',
      venmo: 'Venmo',
      paypal: 'PayPal',
      applepay: 'Apple Pay',
      googlepay: 'Google Pay',
    };

    return methodMap[normalized] || method;
  }

  // Parse date from matched string
  private parseDateFromMatch(dateStr: string): string {
    const today = new Date();
    const lowerDateStr = dateStr.toLowerCase();

    if (lowerDateStr.includes('today') || lowerDateStr.includes('this')) {
      return today.toISOString().split('T')[0];
    }

    if (lowerDateStr.includes('yesterday')) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }

    // Handle day names (assume current week)
    const dayNames = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const dayIndex = dayNames.findIndex((day) => lowerDateStr.includes(day));

    if (dayIndex !== -1) {
      const targetDate = new Date(today);
      const currentDay = today.getDay();
      const diff = dayIndex - currentDay;

      // If the day has passed this week, assume they mean last week
      const daysToAdd = diff <= 0 ? diff - 7 : diff;
      targetDate.setDate(targetDate.getDate() + daysToAdd);

      return targetDate.toISOString().split('T')[0];
    }

    // Handle date patterns like "12/25" or "12/25/2023"
    const dateMatch = dateStr.match(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/);
    if (dateMatch) {
      try {
        const dateParts = dateMatch[0].split('/');
        const month = parseInt(dateParts[0]) - 1; // JS months are 0-indexed
        const day = parseInt(dateParts[1]);
        const year = dateParts[2]
          ? parseInt(dateParts[2])
          : today.getFullYear();

        const parsedDate = new Date(
          year < 100 ? 2000 + year : year,
          month,
          day,
        );
        return parsedDate.toISOString().split('T')[0];
      } catch (error) {
        console.warn('[VoiceManager] Date parsing failed:', error);
      }
    }

    // Default to today
    return today.toISOString().split('T')[0];
  }

  // Set result callback
  setResultCallback(callback: (result: VoiceRecognitionResult) => void): void {
    this.onResultCallback = callback;
  }

  // Set error callback
  setErrorCallback(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  // Get current capabilities
  getCapabilities(): VoiceCapabilities | null {
    return this.capabilities;
  }

  // Update settings
  async updateSettings(newSettings: Partial<VoiceSettings>): Promise<boolean> {
    try {
      this.currentSettings = { ...this.currentSettings, ...newSettings };

      // Reconfigure recognition if initialized
      if (this.recognition) {
        this.setupRecognition();
      }

      return true;
    } catch (error) {
      console.error('[VoiceManager] Settings update failed:', error);
      return false;
    }
  }

  // Get current session
  getCurrentSession(): VoiceRecordingSession | null {
    return this.currentSession;
  }

  // Check if currently listening
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  // Cleanup
  async cleanup(): Promise<void> {
    if (this.isListening && this.recognition) {
      this.recognition.stop();
    }

    this.recognition = null;
    this.capabilities = null;
    this.isInitialized = false;
    this.isListening = false;
    this.currentSession = null;
    this.onResultCallback = null;
    this.onErrorCallback = null;
  }
}

// Singleton instance
export const voiceManager = new MobileVoiceManager();

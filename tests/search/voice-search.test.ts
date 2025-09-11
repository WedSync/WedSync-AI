import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

interface VoiceSearchConfig {
  language?: string;                    // Language code (e.g., 'en-US', 'es-ES')
  continuous?: boolean;                 // Continue listening after first result
  interimResults?: boolean;             // Return partial results while speaking
  maxAlternatives?: number;             // Number of alternative interpretations
  noiseReduction?: boolean;             // Apply noise filtering
  contextualHints?: string[];           // Words/phrases to improve recognition
}

interface VoiceSearchResult {
  transcript: string;                   // What was spoken
  confidence: number;                   // Recognition confidence (0-1)
  alternatives: Array<{
    transcript: string;
    confidence: number;
  }>;
  isFinal: boolean;                    // Whether this is the final result
  processingTime: number;              // Time taken to process
}

interface VoiceCommand {
  command: string;
  intent: 'search' | 'filter' | 'sort' | 'navigate' | 'action';
  parameters: {
    searchTerm?: string;
    vendorType?: string;
    location?: string;
    priceRange?: { min?: number; max?: number };
    sortBy?: string;
    action?: string;
  };
  confidence: number;
}

// Mock SpeechRecognition API
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  maxAlternatives = 1;
  
  onstart: ((event: any) => void) | null = null;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: ((event: any) => void) | null = null;

  private isListening = false;
  private mockResults: Array<{ transcript: string; confidence: number }> = [];

  setMockResults(results: Array<{ transcript: string; confidence: number }>) {
    this.mockResults = results;
  }

  start() {
    if (this.isListening) {
      if (this.onerror) {
        this.onerror({ error: 'already-listening' });
      }
      return;
    }

    this.isListening = true;
    
    setTimeout(() => {
      if (this.onstart) {
        this.onstart({});
      }

      // Simulate processing time
      setTimeout(() => {
        if (this.mockResults.length > 0 && this.onresult) {
          const result = this.mockResults[0];
          const alternatives = this.mockResults.slice(0, this.maxAlternatives);
          
          this.onresult({
            results: [{
              length: alternatives.length,
              item: (index: number) => alternatives[index],
              [0]: result,
              isFinal: true
            }],
            resultIndex: 0
          });
        }

        setTimeout(() => {
          this.stop();
        }, 100);
      }, 200);
    }, 50);
  }

  stop() {
    if (!this.isListening) return;
    
    this.isListening = false;
    
    setTimeout(() => {
      if (this.onend) {
        this.onend({});
      }
    }, 50);
  }

  abort() {
    this.isListening = false;
    if (this.onend) {
      this.onend({});
    }
  }
}

// Voice Search Service Implementation
class VoiceSearchService {
  private recognition: MockSpeechRecognition | null = null;
  private isSupported = false;
  private contextualHints: string[] = [
    'wedding', 'photographer', 'venue', 'florist', 'caterer', 'DJ', 'band',
    'luxury', 'budget', 'affordable', 'expensive', 'cheap',
    'New York', 'Los Angeles', 'Chicago', 'Miami', 'Boston',
    'near me', 'nearby', 'close', 'within', 'miles',
    'show me', 'find', 'search for', 'I want', 'looking for'
  ];

  constructor() {
    // Check if speech recognition is supported
    if (typeof window !== 'undefined') {
      this.isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }
  }

  isVoiceSearchSupported(): boolean {
    return this.isSupported;
  }

  async startVoiceSearch(config: VoiceSearchConfig = {}): Promise<VoiceSearchResult> {
    if (!this.isSupported) {
      throw new Error('Voice search is not supported in this browser');
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      // Use mock recognition for testing
      this.recognition = new MockSpeechRecognition();
      
      this.recognition.continuous = config.continuous || false;
      this.recognition.interimResults = config.interimResults || false;
      this.recognition.lang = config.language || 'en-US';
      this.recognition.maxAlternatives = config.maxAlternatives || 3;

      this.recognition.onstart = () => {
        console.log('Voice recognition started');
      };

      this.recognition.onresult = (event: any) => {
        const result = event.results[event.resultIndex];
        const transcript = result[0].transcript.trim();
        const confidence = result[0].confidence;

        const alternatives = [];
        for (let i = 0; i < result.length && i < this.recognition!.maxAlternatives; i++) {
          alternatives.push({
            transcript: result[i].transcript,
            confidence: result[i].confidence
          });
        }

        const voiceResult: VoiceSearchResult = {
          transcript,
          confidence,
          alternatives,
          isFinal: result.isFinal,
          processingTime: Date.now() - startTime
        };

        resolve(voiceResult);
      };

      this.recognition.onerror = (event: any) => {
        const errorMessage = this.getErrorMessage(event.error);
        reject(new Error(errorMessage));
      };

      this.recognition.onend = () => {
        console.log('Voice recognition ended');
      };

      this.recognition.start();
    });
  }

  stopVoiceSearch(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  abortVoiceSearch(): void {
    if (this.recognition) {
      this.recognition.abort();
    }
  }

  // Parse voice input into structured command
  parseVoiceCommand(transcript: string): VoiceCommand {
    const cleanTranscript = transcript.toLowerCase().trim();
    let intent: VoiceCommand['intent'] = 'search';
    const parameters: VoiceCommand['parameters'] = {};
    let confidence = 0.7; // Base confidence

    // Detect intent
    if (this.containsAny(cleanTranscript, ['find', 'search', 'show me', 'looking for', 'i want'])) {
      intent = 'search';
      confidence += 0.1;
    } else if (this.containsAny(cleanTranscript, ['filter', 'only', 'just'])) {
      intent = 'filter';
      confidence += 0.1;
    } else if (this.containsAny(cleanTranscript, ['sort', 'order', 'arrange'])) {
      intent = 'sort';
      confidence += 0.1;
    } else if (this.containsAny(cleanTranscript, ['go to', 'navigate', 'open'])) {
      intent = 'navigate';
      confidence += 0.1;
    }

    // Extract vendor types
    const vendorTypes = {
      'photographer': ['photographer', 'photography', 'photo', 'photos'],
      'venue': ['venue', 'venues', 'location', 'place', 'hall', 'ballroom'],
      'florist': ['florist', 'flowers', 'floral', 'bouquet'],
      'caterer': ['caterer', 'catering', 'food', 'menu'],
      'dj': ['dj', 'disc jockey', 'music', 'sound'],
      'band': ['band', 'live music', 'musicians'],
      'planner': ['planner', 'coordinator', 'planning']
    };

    for (const [type, keywords] of Object.entries(vendorTypes)) {
      if (this.containsAny(cleanTranscript, keywords)) {
        parameters.vendorType = type;
        confidence += 0.15;
        break;
      }
    }

    // Extract location
    const locationKeywords = ['in', 'at', 'near', 'around', 'close to'];
    for (const keyword of locationKeywords) {
      const keywordIndex = cleanTranscript.indexOf(keyword);
      if (keywordIndex !== -1) {
        const afterKeyword = cleanTranscript.substring(keywordIndex + keyword.length).trim();
        const locationMatch = this.extractLocation(afterKeyword);
        if (locationMatch) {
          parameters.location = locationMatch;
          confidence += 0.1;
          break;
        }
      }
    }

    // Special handling for "near me"
    if (cleanTranscript.includes('near me') || cleanTranscript.includes('nearby')) {
      parameters.location = 'current_location';
      confidence += 0.1;
    }

    // Extract price information
    const pricePatterns = [
      /under (\d+)/,
      /below (\d+)/,
      /less than (\d+)/,
      /above (\d+)/,
      /over (\d+)/,
      /more than (\d+)/,
      /between (\d+) and (\d+)/,
      /from (\d+) to (\d+)/
    ];

    for (const pattern of pricePatterns) {
      const match = cleanTranscript.match(pattern);
      if (match) {
        if (pattern.source.includes('between') || pattern.source.includes('from')) {
          parameters.priceRange = {
            min: parseInt(match[1]),
            max: parseInt(match[2])
          };
        } else if (pattern.source.includes('under') || pattern.source.includes('below') || pattern.source.includes('less')) {
          parameters.priceRange = { max: parseInt(match[1]) };
        } else {
          parameters.priceRange = { min: parseInt(match[1]) };
        }
        confidence += 0.1;
        break;
      }
    }

    // Handle qualitative price terms
    if (this.containsAny(cleanTranscript, ['cheap', 'budget', 'affordable', 'inexpensive'])) {
      parameters.priceRange = { max: 2000 };
      confidence += 0.05;
    } else if (this.containsAny(cleanTranscript, ['luxury', 'premium', 'high-end', 'expensive'])) {
      parameters.priceRange = { min: 5000 };
      confidence += 0.05;
    }

    // Extract sort preferences
    const sortOptions = {
      'price': ['cheapest', 'most expensive', 'price'],
      'rating': ['highest rated', 'best reviewed', 'top rated', 'rating'],
      'distance': ['closest', 'nearest', 'nearby', 'distance']
    };

    for (const [sortType, keywords] of Object.entries(sortOptions)) {
      if (this.containsAny(cleanTranscript, keywords)) {
        parameters.sortBy = sortType;
        confidence += 0.05;
        break;
      }
    }

    // Extract the main search term (remove command words)
    const commandWords = [
      'find', 'search', 'show', 'me', 'looking', 'for', 'i', 'want', 
      'near', 'in', 'at', 'around', 'close', 'to', 'under', 'over',
      'between', 'and', 'from', 'the', 'a', 'an'
    ];
    
    const searchWords = cleanTranscript
      .split(' ')
      .filter(word => !commandWords.includes(word) && 
                     !Object.values(vendorTypes).flat().includes(word))
      .join(' ')
      .trim();

    if (searchWords && !parameters.location?.includes(searchWords)) {
      parameters.searchTerm = searchWords;
    }

    return {
      command: transcript,
      intent,
      parameters,
      confidence: Math.min(confidence, 1.0)
    };
  }

  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  private extractLocation(text: string): string | null {
    // Common city/state patterns
    const locationPatterns = [
      /new york|nyc|manhattan|brooklyn/i,
      /los angeles|la|california/i,
      /chicago|illinois/i,
      /miami|florida/i,
      /boston|massachusetts/i,
      /seattle|washington/i,
      /portland|oregon/i,
      /denver|colorado/i
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }

    // Generic city, state pattern
    const cityStateMatch = text.match(/([a-z\s]+),?\s+([a-z]{2,})/i);
    if (cityStateMatch) {
      return cityStateMatch[0];
    }

    return null;
  }

  private getErrorMessage(errorCode: string): string {
    const errorMessages: { [key: string]: string } = {
      'no-speech': 'No speech was detected. Please try again.',
      'aborted': 'Voice recognition was aborted.',
      'audio-capture': 'Audio capture failed. Please check your microphone.',
      'network': 'Network error occurred during voice recognition.',
      'not-allowed': 'Microphone access was denied. Please allow microphone access.',
      'service-not-allowed': 'Voice recognition service is not allowed.',
      'bad-grammar': 'Grammar error in voice recognition.',
      'language-not-supported': 'Language is not supported for voice recognition.',
      'already-listening': 'Voice recognition is already in progress.'
    };

    return errorMessages[errorCode] || `Unknown voice recognition error: ${errorCode}`;
  }

  // Set mock results for testing
  setMockRecognitionResults(results: Array<{ transcript: string; confidence: number }>) {
    if (this.recognition instanceof MockSpeechRecognition) {
      this.recognition.setMockResults(results);
    }
  }
}

describe('WS-248: Advanced Search System - Voice Search Tests', () => {
  let voiceSearchService: VoiceSearchService;

  beforeEach(() => {
    voiceSearchService = new VoiceSearchService();
    
    // Mock the speech recognition globally for testing
    global.webkitSpeechRecognition = MockSpeechRecognition as any;
    global.SpeechRecognition = MockSpeechRecognition as any;
  });

  afterEach(() => {
    voiceSearchService.abortVoiceSearch();
    vi.clearAllMocks();
  });

  describe('Voice Search Support and Initialization', () => {
    test('should detect voice search support correctly', () => {
      const isSupported = voiceSearchService.isVoiceSearchSupported();
      expect(typeof isSupported).toBe('boolean');
    });

    test('should handle unsupported browsers gracefully', async () => {
      // Temporarily remove speech recognition support
      const originalWebkit = (global as any).webkitSpeechRecognition;
      const originalSpeech = (global as any).SpeechRecognition;
      
      delete (global as any).webkitSpeechRecognition;
      delete (global as any).SpeechRecognition;
      
      const unsupportedService = new VoiceSearchService();
      
      await expect(unsupportedService.startVoiceSearch()).rejects.toThrow(
        'Voice search is not supported in this browser'
      );

      // Restore support
      (global as any).webkitSpeechRecognition = originalWebkit;
      (global as any).SpeechRecognition = originalSpeech;
    });
  });

  describe('Basic Voice Recognition', () => {
    test('should successfully recognize simple search queries', async () => {
      voiceSearchService.setMockRecognitionResults([
        { transcript: 'find wedding photographer', confidence: 0.9 }
      ]);

      const result = await voiceSearchService.startVoiceSearch();

      expect(result.transcript).toBe('find wedding photographer');
      expect(result.confidence).toBe(0.9);
      expect(result.isFinal).toBe(true);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    test('should handle multiple alternatives correctly', async () => {
      voiceSearchService.setMockRecognitionResults([
        { transcript: 'wedding photographer', confidence: 0.9 },
        { transcript: 'wedding photography', confidence: 0.8 },
        { transcript: 'reading photographer', confidence: 0.6 }
      ]);

      const result = await voiceSearchService.startVoiceSearch({
        maxAlternatives: 3
      });

      expect(result.alternatives.length).toBe(3);
      expect(result.alternatives[0].confidence).toBeGreaterThan(result.alternatives[1].confidence);
      expect(result.alternatives[1].confidence).toBeGreaterThan(result.alternatives[2].confidence);
    });

    test('should respect language configuration', async () => {
      voiceSearchService.setMockRecognitionResults([
        { transcript: 'buscar fotógrafo de bodas', confidence: 0.85 }
      ]);

      const result = await voiceSearchService.startVoiceSearch({
        language: 'es-ES'
      });

      expect(result.transcript).toBe('buscar fotógrafo de bodas');
    });

    test('should handle voice recognition errors appropriately', async () => {
      const mockRecognition = new MockSpeechRecognition();
      
      // Override to simulate error
      const originalStart = mockRecognition.start;
      mockRecognition.start = function() {
        setTimeout(() => {
          if (this.onerror) {
            this.onerror({ error: 'no-speech' });
          }
        }, 100);
      };

      await expect(voiceSearchService.startVoiceSearch()).rejects.toThrow(
        'No speech was detected. Please try again.'
      );
    });
  });

  describe('Voice Command Parsing', () => {
    test('should parse simple vendor search commands', () => {
      const commands = [
        'find wedding photographer',
        'show me wedding venues',
        'search for wedding florist',
        'I want a wedding DJ'
      ];

      commands.forEach(command => {
        const parsed = voiceSearchService.parseVoiceCommand(command);
        
        expect(parsed.intent).toBe('search');
        expect(parsed.parameters.vendorType).toBeDefined();
        expect(parsed.confidence).toBeGreaterThan(0.7);
      });
    });

    test('should extract location information correctly', () => {
      const locationCommands = [
        'find wedding photographer in New York',
        'show me venues near Los Angeles',
        'wedding florist close to Chicago',
        'photographers around Miami',
        'find DJ near me'
      ];

      locationCommands.forEach(command => {
        const parsed = voiceSearchService.parseVoiceCommand(command);
        
        expect(parsed.parameters.location).toBeDefined();
        if (command.includes('near me')) {
          expect(parsed.parameters.location).toBe('current_location');
        } else {
          expect(parsed.parameters.location).toBeTruthy();
        }
      });
    });

    test('should parse price constraints accurately', () => {
      const priceCommands = [
        'wedding photographer under 3000',
        'venues below 5000 dollars',
        'florist between 800 and 2000',
        'photographer from 1000 to 4000',
        'cheap wedding venues',
        'luxury wedding photographer',
        'affordable catering services'
      ];

      priceCommands.forEach(command => {
        const parsed = voiceSearchService.parseVoiceCommand(command);
        
        if (command.includes('under') || command.includes('below') || command.includes('cheap') || command.includes('affordable')) {
          expect(parsed.parameters.priceRange?.max).toBeDefined();
        } else if (command.includes('between') || command.includes('from')) {
          expect(parsed.parameters.priceRange?.min).toBeDefined();
          expect(parsed.parameters.priceRange?.max).toBeDefined();
        } else if (command.includes('luxury')) {
          expect(parsed.parameters.priceRange?.min).toBeDefined();
        }
      });
    });

    test('should identify sorting preferences', () => {
      const sortCommands = [
        'show me the cheapest wedding photographers',
        'find highest rated venues',
        'nearest wedding florists',
        'best reviewed catering services',
        'closest wedding planners'
      ];

      sortCommands.forEach(command => {
        const parsed = voiceSearchService.parseVoiceCommand(command);
        
        expect(parsed.parameters.sortBy).toBeDefined();
        expect(['price', 'rating', 'distance']).toContain(parsed.parameters.sortBy);
      });
    });

    test('should handle complex multi-parameter commands', () => {
      const complexCommand = 'find luxury wedding photographer in New York under 5000 highest rated';
      const parsed = voiceSearchService.parseVoiceCommand(complexCommand);

      expect(parsed.parameters.vendorType).toBe('photographer');
      expect(parsed.parameters.location).toContain('new york');
      expect(parsed.parameters.priceRange?.max).toBe(5000);
      expect(parsed.parameters.sortBy).toBe('rating');
      expect(parsed.confidence).toBeGreaterThan(0.8);
    });

    test('should assign appropriate confidence scores', () => {
      const testCases = [
        { command: 'find wedding photographer', expectedConfidence: 0.8 }, // Clear intent + vendor type
        { command: 'photographer', expectedConfidence: 0.7 }, // Just vendor type
        { command: 'something unclear', expectedConfidence: 0.7 }, // Base confidence
        { command: 'find luxury wedding photographer in NYC under 3000', expectedConfidence: 0.9 } // Multiple parameters
      ];

      testCases.forEach(({ command, expectedConfidence }) => {
        const parsed = voiceSearchService.parseVoiceCommand(command);
        expect(parsed.confidence).toBeCloseTo(expectedConfidence, 1);
      });
    });
  });

  describe('Voice Search Performance', () => {
    test('should process voice input within acceptable time limits', async () => {
      voiceSearchService.setMockRecognitionResults([
        { transcript: 'wedding photographer in New York', confidence: 0.9 }
      ]);

      const startTime = Date.now();
      const result = await voiceSearchService.startVoiceSearch();
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.processingTime).toBeLessThan(500); // Processing should be under 500ms
    });

    test('should handle rapid voice commands without interference', async () => {
      const commands = [
        'wedding photographer',
        'wedding venue',
        'wedding florist'
      ];

      for (let i = 0; i < commands.length; i++) {
        voiceSearchService.setMockRecognitionResults([
          { transcript: commands[i], confidence: 0.9 }
        ]);

        const result = await voiceSearchService.startVoiceSearch();
        expect(result.transcript).toBe(commands[i]);
        
        // Small delay between commands
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });

    test('should clean up resources properly when stopped', async () => {
      voiceSearchService.setMockRecognitionResults([
        { transcript: 'wedding photographer', confidence: 0.9 }
      ]);

      // Start voice search
      const searchPromise = voiceSearchService.startVoiceSearch();
      
      // Stop immediately
      voiceSearchService.stopVoiceSearch();
      
      // Should still resolve
      const result = await searchPromise;
      expect(result).toBeDefined();
    });
  });

  describe('Voice Search Configuration', () => {
    test('should support different language configurations', async () => {
      const languages = ['en-US', 'es-ES', 'fr-FR', 'de-DE'];
      
      for (const language of languages) {
        voiceSearchService.setMockRecognitionResults([
          { transcript: 'test query', confidence: 0.9 }
        ]);

        const result = await voiceSearchService.startVoiceSearch({
          language: language
        });

        expect(result.transcript).toBeDefined();
      }
    });

    test('should handle interim results when configured', async () => {
      voiceSearchService.setMockRecognitionResults([
        { transcript: 'wedding photographer New York', confidence: 0.9 }
      ]);

      const result = await voiceSearchService.startVoiceSearch({
        interimResults: true
      });

      expect(result.transcript).toBe('wedding photographer New York');
    });

    test('should respect maximum alternatives setting', async () => {
      voiceSearchService.setMockRecognitionResults([
        { transcript: 'wedding photographer', confidence: 0.9 },
        { transcript: 'wedding photography', confidence: 0.8 },
        { transcript: 'wedding photograph', confidence: 0.7 },
        { transcript: 'reading photographer', confidence: 0.6 },
        { transcript: 'leading photographer', confidence: 0.5 }
      ]);

      const result = await voiceSearchService.startVoiceSearch({
        maxAlternatives: 3
      });

      expect(result.alternatives.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Wedding-Specific Voice Commands', () => {
    test('should recognize wedding-specific vendor types accurately', () => {
      const weddingCommands = [
        'find bridal makeup artist',
        'search for wedding cake designer',
        'show me ceremony musicians',
        'wedding dress alterations',
        'reception decorators near me'
      ];

      weddingCommands.forEach(command => {
        const parsed = voiceSearchService.parseVoiceCommand(command);
        
        expect(parsed.intent).toBe('search');
        expect(parsed.confidence).toBeGreaterThan(0.6);
      });
    });

    test('should understand wedding-specific terminology', () => {
      const weddingTerms = [
        'bridal portraits photographer',
        'engagement photo session',
        'ceremony and reception venue',
        'cocktail hour entertainment',
        'wedding day coordination'
      ];

      weddingTerms.forEach(term => {
        const parsed = voiceSearchService.parseVoiceCommand(term);
        
        expect(parsed.parameters.vendorType || parsed.parameters.searchTerm).toBeDefined();
      });
    });

    test('should handle wedding budget terminology', () => {
      const budgetCommands = [
        'affordable wedding photographer under 2500',
        'budget-friendly wedding venues',
        'premium wedding planning services',
        'high-end bridal makeup',
        'value wedding catering'
      ];

      budgetCommands.forEach(command => {
        const parsed = voiceSearchService.parseVoiceCommand(command);
        
        if (command.includes('under')) {
          expect(parsed.parameters.priceRange?.max).toBe(2500);
        } else if (command.includes('budget') || command.includes('affordable') || command.includes('value')) {
          expect(parsed.parameters.priceRange?.max).toBeDefined();
        } else if (command.includes('premium') || command.includes('high-end')) {
          expect(parsed.parameters.priceRange?.min).toBeDefined();
        }
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle noisy or unclear audio input', async () => {
      voiceSearchService.setMockRecognitionResults([
        { transcript: 'find wedding photo grapher', confidence: 0.4 } // Low confidence
      ]);

      const result = await voiceSearchService.startVoiceSearch();
      
      expect(result.confidence).toBe(0.4);
      expect(result.transcript).toBeDefined();
      
      const parsed = voiceSearchService.parseVoiceCommand(result.transcript);
      expect(parsed.confidence).toBeGreaterThan(0);
    });

    test('should handle empty or very short voice input', () => {
      const shortInputs = ['', 'um', 'uh', 'a', 'the'];

      shortInputs.forEach(input => {
        const parsed = voiceSearchService.parseVoiceCommand(input);
        
        expect(parsed.command).toBe(input);
        expect(parsed.confidence).toBeGreaterThanOrEqual(0);
      });
    });

    test('should handle very long voice commands', () => {
      const longCommand = 'I am looking for a wedding photographer who specializes in luxury destination weddings in the New York metropolitan area with a budget between three thousand and seven thousand dollars and I would prefer someone who has been highly rated by previous clients';
      
      const parsed = voiceSearchService.parseVoiceCommand(longCommand);
      
      expect(parsed.parameters.vendorType).toBe('photographer');
      expect(parsed.parameters.location).toBeTruthy();
      expect(parsed.parameters.priceRange?.min).toBe(3000);
      expect(parsed.parameters.priceRange?.max).toBe(7000);
    });

    test('should gracefully handle ambiguous commands', () => {
      const ambiguousCommands = [
        'find wedding thing',
        'show me something for wedding',
        'I need wedding help',
        'wedding stuff near me'
      ];

      ambiguousCommands.forEach(command => {
        const parsed = voiceSearchService.parseVoiceCommand(command);
        
        expect(parsed.intent).toBeDefined();
        expect(parsed.confidence).toBeGreaterThan(0);
      });
    });

    test('should handle microphone permission errors', async () => {
      const mockRecognition = new MockSpeechRecognition();
      
      // Override to simulate permission error
      mockRecognition.start = function() {
        setTimeout(() => {
          if (this.onerror) {
            this.onerror({ error: 'not-allowed' });
          }
        }, 50);
      };

      await expect(voiceSearchService.startVoiceSearch()).rejects.toThrow(
        'Microphone access was denied'
      );
    });
  });

  describe('Voice Search Integration', () => {
    test('should provide structured output compatible with search service', () => {
      const command = 'find luxury wedding photographer in Manhattan under 4000';
      const parsed = voiceSearchService.parseVoiceCommand(command);

      // Check structure matches what search service expects
      expect(parsed).toHaveProperty('intent');
      expect(parsed).toHaveProperty('parameters');
      expect(parsed).toHaveProperty('confidence');
      
      expect(parsed.parameters).toHaveProperty('vendorType');
      expect(parsed.parameters).toHaveProperty('location');
      expect(parsed.parameters).toHaveProperty('priceRange');
    });

    test('should maintain high accuracy for wedding vendor searches', () => {
      const weddingSearches = [
        'wedding photographer',
        'wedding venue',
        'wedding florist',
        'wedding caterer',
        'wedding DJ'
      ];

      let totalAccuracy = 0;

      weddingSearches.forEach(search => {
        const parsed = voiceSearchService.parseVoiceCommand(`find ${search}`);
        
        // Should correctly identify vendor type
        const correctType = search.split(' ')[1]; // Get vendor type part
        if (parsed.parameters.vendorType === correctType) {
          totalAccuracy++;
        }
      });

      const accuracy = totalAccuracy / weddingSearches.length;
      expect(accuracy).toBeGreaterThanOrEqual(0.9); // 90% accuracy requirement
    });

    test('should handle voice search lifecycle properly', async () => {
      voiceSearchService.setMockRecognitionResults([
        { transcript: 'wedding photographer', confidence: 0.9 }
      ]);

      // Test full lifecycle
      expect(voiceSearchService.isVoiceSearchSupported()).toBe(true);
      
      const result = await voiceSearchService.startVoiceSearch();
      expect(result.transcript).toBe('wedding photographer');
      
      voiceSearchService.stopVoiceSearch();
      // Should complete without errors
    });
  });
});
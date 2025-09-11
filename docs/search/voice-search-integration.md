# Voice Search Integration Guide

## Overview

Voice search integration enables users to search for wedding vendors using natural speech. This guide covers implementation, browser compatibility, natural language processing, and voice interface best practices for the WedSync platform.

## Voice Search Architecture

### Core Components
```
User Speech → Browser API → Speech Recognition → NLP Processing → Search Query → Results
     ↓              ↓               ↓               ↓             ↓           ↓
  Microphone    Web Speech API   Text Processing   Intent Parse   Database   Response
  Permission    Recognition      Language Model    Query Build    Search     Feedback
  Audio Input   Transcription    Sentiment Detect  Validation     Results    Voice Output
```

### Technology Stack
- **Web Speech API**: Browser-native speech recognition
- **Natural Language Processing**: Intent recognition and entity extraction
- **Text-to-Speech**: Optional voice feedback for results
- **Fallback System**: Graceful degradation when voice unavailable

## Implementation

### 1. Browser Compatibility Check

```typescript
interface VoiceSearchCapabilities {
  speechRecognition: boolean;
  speechSynthesis: boolean;
  microphone: boolean;
  browserSupport: string;
}

export function checkVoiceSupport(): VoiceSearchCapabilities {
  const recognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  const synthesis = 'speechSynthesis' in window;
  const microphone = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  
  let browserSupport = 'none';
  if (recognition && synthesis && microphone) {
    browserSupport = 'full';
  } else if (recognition && microphone) {
    browserSupport = 'partial';
  } else if (recognition) {
    browserSupport = 'recognition-only';
  }
  
  return {
    speechRecognition: recognition,
    speechSynthesis: synthesis,
    microphone: microphone,
    browserSupport
  };
}

// Usage
const capabilities = checkVoiceSupport();
console.log('Voice search support:', capabilities.browserSupport);
```

### 2. Speech Recognition Service

```typescript
export interface VoiceSearchConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  timeout: number;
}

export interface VoiceSearchResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  alternatives: string[];
}

export class VoiceSearchService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private config: VoiceSearchConfig;
  
  constructor(config: Partial<VoiceSearchConfig> = {}) {
    this.config = {
      language: 'en-US',
      continuous: false,
      interimResults: true,
      maxAlternatives: 3,
      timeout: 10000,
      ...config
    };
    
    this.initializeRecognition();
  }
  
  private initializeRecognition(): void {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.recognition.lang = this.config.language;
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;
  }
  
  async startListening(): Promise<VoiceSearchResult> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not available'));
        return;
      }
      
      if (this.isListening) {
        reject(new Error('Already listening'));
        return;
      }
      
      this.isListening = true;
      
      // Set up event handlers
      this.recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;
        const alternatives = Array.from(result).map(r => r.transcript);
        
        const voiceResult: VoiceSearchResult = {
          transcript,
          confidence,
          isFinal: result.isFinal,
          alternatives
        };
        
        if (result.isFinal) {
          this.isListening = false;
          resolve(voiceResult);
        }
      };
      
      this.recognition.onerror = (event) => {
        this.isListening = false;
        reject(new Error(`Speech recognition error: ${event.error}`));
      };
      
      this.recognition.onend = () => {
        this.isListening = false;
      };
      
      // Set timeout
      setTimeout(() => {
        if (this.isListening) {
          this.stopListening();
          reject(new Error('Speech recognition timeout'));
        }
      }, this.config.timeout);
      
      // Start recognition
      try {
        this.recognition.start();
      } catch (error) {
        this.isListening = false;
        reject(error);
      }
    });
  }
  
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
  
  isCurrentlyListening(): boolean {
    return this.isListening;
  }
}
```

### 3. Natural Language Processing

```typescript
export interface SearchIntent {
  action: 'search' | 'filter' | 'compare' | 'book';
  vendorType?: string;
  location?: string;
  priceRange?: { min?: number; max?: number };
  date?: string;
  guestCount?: number;
  style?: string;
  confidence: number;
}

export class VoiceNLPProcessor {
  private vendorTypes = [
    'photographer', 'venue', 'catering', 'florist', 'dj', 'band',
    'videographer', 'makeup', 'hair', 'dress', 'suit', 'cake'
  ];
  
  private locationPatterns = [
    /in\s+([\w\s,]+)/i,
    /near\s+([\w\s,]+)/i,
    /around\s+([\w\s,]+)/i,
    /([\w\s]+)\s+area/i
  ];
  
  private pricePatterns = [
    /under\s+(?:£|pounds?)\s*(\d+(?:,\d+)?)/i,
    /below\s+(?:£|pounds?)\s*(\d+(?:,\d+)?)/i,
    /less\s+than\s+(?:£|pounds?)\s*(\d+(?:,\d+)?)/i,
    /between\s+(?:£|pounds?)\s*(\d+(?:,\d+)?)\s+and\s+(?:£|pounds?)\s*(\d+(?:,\d+)?)/i,
    /(\d+(?:,\d+)?)\s+to\s+(\d+(?:,\d+)?)\s+(?:pounds?|£)/i
  ];
  
  private datePatterns = [
    /on\s+([\w\s,]+\d{4})/i,
    /for\s+([\w\s,]+\d{4})/i,
    /in\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i,
    /(next|this)\s+(week|month|year|summer|spring|autumn|winter)/i
  ];
  
  processVoiceInput(transcript: string): SearchIntent {
    const normalizedText = transcript.toLowerCase();
    
    // Extract vendor type
    const vendorType = this.extractVendorType(normalizedText);
    
    // Extract location
    const location = this.extractLocation(normalizedText);
    
    // Extract price range
    const priceRange = this.extractPriceRange(normalizedText);
    
    // Extract date
    const date = this.extractDate(normalizedText);
    
    // Extract guest count
    const guestCount = this.extractGuestCount(normalizedText);
    
    // Extract wedding style
    const style = this.extractStyle(normalizedText);
    
    // Determine intent action
    const action = this.determineAction(normalizedText);
    
    // Calculate confidence based on extracted entities
    const confidence = this.calculateConfidence({
      vendorType, location, priceRange, date, guestCount, style
    });
    
    return {
      action,
      vendorType,
      location,
      priceRange,
      date,
      guestCount,
      style,
      confidence
    };
  }
  
  private extractVendorType(text: string): string | undefined {
    for (const type of this.vendorTypes) {
      if (text.includes(type)) {
        return type;
      }
    }
    
    // Check for synonyms
    const synonyms: Record<string, string> = {
      'photo': 'photographer',
      'pictures': 'photographer',
      'pics': 'photographer',
      'video': 'videographer',
      'music': 'dj',
      'entertainment': 'dj',
      'food': 'catering',
      'flowers': 'florist',
      'beauty': 'makeup'
    };
    
    for (const [synonym, type] of Object.entries(synonyms)) {
      if (text.includes(synonym)) {
        return type;
      }
    }
    
    return undefined;
  }
  
  private extractLocation(text: string): string | undefined {
    for (const pattern of this.locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return undefined;
  }
  
  private extractPriceRange(text: string): { min?: number; max?: number } | undefined {
    for (const pattern of this.pricePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[2]) {
          // Range pattern (between X and Y)
          return {
            min: parseInt(match[1].replace(',', '')),
            max: parseInt(match[2].replace(',', ''))
          };
        } else {
          // Single value pattern (under X)
          return { max: parseInt(match[1].replace(',', '')) };
        }
      }
    }
    return undefined;
  }
  
  private extractDate(text: string): string | undefined {
    for (const pattern of this.datePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }
    return undefined;
  }
  
  private extractGuestCount(text: string): number | undefined {
    const guestPatterns = [
      /(\d+)\s+guests?/i,
      /(\d+)\s+people/i,
      /party\s+of\s+(\d+)/i
    ];
    
    for (const pattern of guestPatterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return undefined;
  }
  
  private extractStyle(text: string): string | undefined {
    const styles = [
      'rustic', 'modern', 'vintage', 'classic', 'bohemian', 'elegant',
      'casual', 'formal', 'outdoor', 'indoor', 'beach', 'garden',
      'traditional', 'contemporary', 'romantic', 'minimalist'
    ];
    
    for (const style of styles) {
      if (text.includes(style)) {
        return style;
      }
    }
    return undefined;
  }
  
  private determineAction(text: string): 'search' | 'filter' | 'compare' | 'book' {
    if (text.includes('find') || text.includes('search') || text.includes('looking for')) {
      return 'search';
    } else if (text.includes('filter') || text.includes('show me') || text.includes('narrow down')) {
      return 'filter';
    } else if (text.includes('compare') || text.includes('difference')) {
      return 'compare';
    } else if (text.includes('book') || text.includes('reserve') || text.includes('hire')) {
      return 'book';
    }
    return 'search'; // default
  }
  
  private calculateConfidence(entities: Partial<SearchIntent>): number {
    let score = 0;
    let total = 0;
    
    // Weight different entities based on importance
    if (entities.vendorType) { score += 0.3; total += 0.3; }
    if (entities.location) { score += 0.25; total += 0.25; }
    if (entities.priceRange) { score += 0.2; total += 0.2; }
    if (entities.date) { score += 0.15; total += 0.15; }
    if (entities.guestCount) { score += 0.05; total += 0.05; }
    if (entities.style) { score += 0.05; total += 0.05; }
    
    return total > 0 ? score / total : 0;
  }
}
```

### 4. Voice Search Component Integration

```typescript
import React, { useState, useCallback } from 'react';
import { VoiceSearchService } from './VoiceSearchService';
import { VoiceNLPProcessor } from './VoiceNLPProcessor';
import { searchVendors } from '@/lib/search/api';

interface VoiceSearchProps {
  onResults: (results: any[]) => void;
  onError: (error: string) => void;
  className?: string;
}

export function VoiceSearch({ onResults, onError, className }: VoiceSearchProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceService] = useState(() => new VoiceSearchService());
  const [nlpProcessor] = useState(() => new VoiceNLPProcessor());
  
  const handleVoiceSearch = useCallback(async () => {
    if (!voiceService) {
      onError('Voice search not supported');
      return;
    }
    
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
      return;
    }
    
    try {
      setIsListening(true);
      setTranscript('');
      
      const result = await voiceService.startListening();
      setTranscript(result.transcript);
      
      if (result.confidence < 0.7) {
        onError('Could not understand speech clearly. Please try again.');
        return;
      }
      
      setIsProcessing(true);
      
      // Process natural language
      const intent = nlpProcessor.processVoiceInput(result.transcript);
      
      if (intent.confidence < 0.5) {
        onError('Could not understand the search request. Please try again.');
        return;
      }
      
      // Convert intent to search query
      const searchQuery = convertIntentToQuery(intent);
      
      // Execute search
      const searchResults = await searchVendors(searchQuery);
      onResults(searchResults.vendors);
      
      // Optional: Provide voice feedback
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(
          `Found ${searchResults.vendors.length} ${intent.vendorType || 'vendor'}${searchResults.vendors.length !== 1 ? 's' : ''} ${intent.location ? `in ${intent.location}` : ''}`
        );
        speechSynthesis.speak(utterance);
      }
      
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Voice search failed');
    } finally {
      setIsListening(false);
      setIsProcessing(false);
    }
  }, [isListening, voiceService, nlpProcessor, onResults, onError]);
  
  return (
    <div className={`voice-search-container ${className}`}>
      <button
        onClick={handleVoiceSearch}
        disabled={isProcessing}
        className={`voice-search-button ${isListening ? 'listening' : ''} ${isProcessing ? 'processing' : ''}`}
        aria-label={isListening ? 'Stop listening' : 'Start voice search'}
      >
        {isListening ? (
          <div className="listening-animation">
            <div className="pulse-ring"></div>
            <div className="pulse-ring delay-1"></div>
            <div className="pulse-ring delay-2"></div>
            🎤
          </div>
        ) : isProcessing ? (
          <div className="processing-animation">
            ⏳
          </div>
        ) : (
          🎤
        )}
      </button>
      
      {transcript && (
        <div className="voice-transcript">
          <p>"{transcript}"</p>
        </div>
      )}
      
      {isListening && (
        <div className="voice-instructions">
          <p>Listening... Try saying:</p>
          <ul>
            <li>"Find a wedding photographer in London"</li>
            <li>"Show me venues under £5000"</li>
            <li>"Wedding florist near me"</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function convertIntentToQuery(intent: SearchIntent): any {
  const query: any = {};
  
  if (intent.vendorType) {
    query.filters = { ...query.filters, vendorType: intent.vendorType };
  }
  
  if (intent.location) {
    query.location = { address: intent.location };
  }
  
  if (intent.priceRange) {
    query.filters = { ...query.filters, priceRange: intent.priceRange };
  }
  
  if (intent.date) {
    query.filters = { 
      ...query.filters, 
      availability: { startDate: intent.date, endDate: intent.date }
    };
  }
  
  if (intent.guestCount) {
    query.filters = { ...query.filters, capacity: { min: intent.guestCount } };
  }
  
  if (intent.style) {
    query.filters = { ...query.filters, style: intent.style };
  }
  
  // Build text query from intent
  const queryParts = [];
  if (intent.vendorType) queryParts.push(`wedding ${intent.vendorType}`);
  if (intent.style) queryParts.push(intent.style);
  query.query = queryParts.join(' ');
  
  return query;
}
```

### 5. Voice Search Styling

```css
.voice-search-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.voice-search-button {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: white;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: relative;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
}

.voice-search-button:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(124, 58, 237, 0.4);
}

.voice-search-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.voice-search-button.listening {
  background: linear-gradient(135deg, #ef4444, #f87171);
  animation: pulse 1.5s ease-in-out infinite;
}

.voice-search-button.processing {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
}

.listening-animation {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-ring {
  position: absolute;
  width: 64px;
  height: 64px;
  border: 2px solid rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  animation: pulse-ring 1.5s ease-out infinite;
}

.pulse-ring.delay-1 {
  animation-delay: 0.5s;
}

.pulse-ring.delay-2 {
  animation-delay: 1s;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(1.8);
    opacity: 0;
  }
}

.processing-animation {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.voice-transcript {
  background: #f3f4f6;
  padding: 1rem;
  border-radius: 8px;
  max-width: 300px;
  text-align: center;
}

.voice-transcript p {
  margin: 0;
  font-style: italic;
  color: #374151;
}

.voice-instructions {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 1rem;
  border-radius: 8px;
  max-width: 300px;
}

.voice-instructions p {
  margin: 0 0 0.5rem;
  font-weight: 600;
  color: #1e40af;
}

.voice-instructions ul {
  margin: 0;
  padding-left: 1rem;
  list-style-type: disc;
}

.voice-instructions li {
  margin-bottom: 0.25rem;
  color: #3730a3;
  font-size: 14px;
}
```

## Testing Voice Search

### Unit Tests for Voice Components

```typescript
// voice-search.test.ts
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { VoiceSearchService } from './VoiceSearchService';
import { VoiceNLPProcessor } from './VoiceNLPProcessor';

// Mock Web Speech API
const mockSpeechRecognition = {
  start: vi.fn(),
  stop: vi.fn(),
  onresult: null,
  onerror: null,
  onend: null,
  lang: 'en-US',
  continuous: false,
  interimResults: true
};

global.webkitSpeechRecognition = vi.fn(() => mockSpeechRecognition);

describe('VoiceSearchService', () => {
  let voiceService: VoiceSearchService;

  beforeEach(() => {
    voiceService = new VoiceSearchService();
    vi.clearAllMocks();
  });

  test('should initialize with default configuration', () => {
    expect(voiceService).toBeDefined();
    expect(voiceService.isCurrentlyListening()).toBe(false);
  });

  test('should start listening and resolve with result', async () => {
    const resultPromise = voiceService.startListening();

    // Simulate speech recognition result
    setTimeout(() => {
      if (mockSpeechRecognition.onresult) {
        mockSpeechRecognition.onresult({
          results: [{
            0: { transcript: 'wedding photographer london', confidence: 0.9 },
            isFinal: true,
            length: 1
          }],
          resultIndex: 0
        });
      }
    }, 100);

    const result = await resultPromise;
    expect(result.transcript).toBe('wedding photographer london');
    expect(result.confidence).toBe(0.9);
    expect(result.isFinal).toBe(true);
  });

  test('should handle speech recognition errors', async () => {
    const resultPromise = voiceService.startListening();

    // Simulate error
    setTimeout(() => {
      if (mockSpeechRecognition.onerror) {
        mockSpeechRecognition.onerror({ error: 'no-speech' });
      }
    }, 100);

    await expect(resultPromise).rejects.toThrow('Speech recognition error: no-speech');
  });
});

describe('VoiceNLPProcessor', () => {
  let nlpProcessor: VoiceNLPProcessor;

  beforeEach(() => {
    nlpProcessor = new VoiceNLPProcessor();
  });

  test('should extract vendor type from transcript', () => {
    const intent = nlpProcessor.processVoiceInput('Find a wedding photographer in London');
    
    expect(intent.vendorType).toBe('photographer');
    expect(intent.location).toBe('London');
    expect(intent.action).toBe('search');
    expect(intent.confidence).toBeGreaterThan(0.5);
  });

  test('should extract price range from transcript', () => {
    const intent = nlpProcessor.processVoiceInput('Show me venues under £5000');
    
    expect(intent.vendorType).toBe('venue');
    expect(intent.priceRange).toEqual({ max: 5000 });
    expect(intent.action).toBe('filter');
  });

  test('should handle complex queries', () => {
    const intent = nlpProcessor.processVoiceInput(
      'Find a rustic wedding venue in Surrey for 100 guests between £2000 and £8000'
    );
    
    expect(intent.vendorType).toBe('venue');
    expect(intent.location).toBe('Surrey');
    expect(intent.style).toBe('rustic');
    expect(intent.guestCount).toBe(100);
    expect(intent.priceRange).toEqual({ min: 2000, max: 8000 });
  });

  test('should handle synonyms and variations', () => {
    const intent1 = nlpProcessor.processVoiceInput('I need a photo person');
    expect(intent1.vendorType).toBe('photographer');
    
    const intent2 = nlpProcessor.processVoiceInput('Looking for music for my wedding');
    expect(intent2.vendorType).toBe('dj');
    
    const intent3 = nlpProcessor.processVoiceInput('Find flowers for the ceremony');
    expect(intent3.vendorType).toBe('florist');
  });
});
```

### End-to-End Testing

```typescript
// voice-search.e2e.ts - Playwright test
import { test, expect } from '@playwright/test';

test.describe('Voice Search Integration', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant microphone permissions
    await context.grantPermissions(['microphone']);
    
    // Mock Speech Recognition API
    await page.addInitScript(() => {
      window.webkitSpeechRecognition = class MockSpeechRecognition {
        onresult: ((event: any) => void) | null = null;
        onerror: ((event: any) => void) | null = null;
        onend: (() => void) | null = null;
        
        start() {
          // Simulate successful recognition after delay
          setTimeout(() => {
            if (this.onresult) {
              this.onresult({
                results: [{
                  0: { 
                    transcript: 'wedding photographer london',
                    confidence: 0.9 
                  },
                  isFinal: true,
                  length: 1
                }],
                resultIndex: 0
              });
            }
          }, 1000);
        }
        
        stop() {
          if (this.onend) this.onend();
        }
      };
    });
    
    await page.goto('/search');
  });

  test('should perform voice search successfully', async ({ page }) => {
    // Click voice search button
    await page.click('[data-testid="voice-search-button"]');
    
    // Verify listening state
    await expect(page.locator('.voice-search-button')).toHaveClass(/listening/);
    
    // Wait for transcript to appear
    await expect(page.locator('.voice-transcript')).toBeVisible();
    await expect(page.locator('.voice-transcript p')).toContainText('wedding photographer london');
    
    // Wait for search results
    await expect(page.locator('.search-results')).toBeVisible();
    await expect(page.locator('[data-testid="vendor-card"]')).toHaveCount.greaterThan(0);
    
    // Verify filters were applied correctly
    await expect(page.locator('[data-testid="active-filter-vendor-type"]')).toContainText('photographer');
    await expect(page.locator('[data-testid="active-filter-location"]')).toContainText('london');
  });

  test('should handle voice search errors gracefully', async ({ page }) => {
    // Mock recognition error
    await page.addInitScript(() => {
      window.webkitSpeechRecognition = class ErrorSpeechRecognition {
        start() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror({ error: 'no-speech' });
            }
          }, 500);
        }
      };
    });
    
    await page.click('[data-testid="voice-search-button"]');
    
    // Verify error message appears
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Could not understand');
  });

  test('should provide voice feedback on results', async ({ page }) => {
    // Enable speech synthesis mock
    await page.addInitScript(() => {
      window.speechSynthesis = {
        speak: (utterance) => {
          console.log('Speaking:', utterance.text);
        }
      };
    });
    
    await page.click('[data-testid="voice-search-button"]');
    
    // Wait for search completion
    await expect(page.locator('.search-results')).toBeVisible();
    
    // Check console for speech output
    const logs = await page.evaluate(() => {
      return window.console.log.calls?.map(call => call[1]) || [];
    });
    
    expect(logs.some(log => 
      typeof log === 'string' && log.includes('Found')
    )).toBe(true);
  });
});
```

## Browser Compatibility

### Supported Browsers
- **Chrome/Edge**: Full support (webkitSpeechRecognition)
- **Firefox**: Partial support (requires flag in about:config)
- **Safari**: Full support on macOS/iOS (webkitSpeechRecognition)
- **Mobile Chrome**: Full support
- **Mobile Safari**: Full support with user gesture requirement

### Feature Detection and Fallbacks

```typescript
export function getVoiceSearchCapability(): 'full' | 'partial' | 'none' {
  // Check for speech recognition
  const hasRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  
  // Check for speech synthesis
  const hasSynthesis = 'speechSynthesis' in window;
  
  // Check for microphone access
  const hasMicrophone = navigator.mediaDevices && 'getUserMedia' in navigator.mediaDevices;
  
  if (hasRecognition && hasSynthesis && hasMicrophone) {
    return 'full';
  } else if (hasRecognition && hasMicrophone) {
    return 'partial';
  } else {
    return 'none';
  }
}

// Graceful fallback component
export function VoiceSearchWithFallback(props: VoiceSearchProps) {
  const capability = getVoiceSearchCapability();
  
  switch (capability) {
    case 'full':
      return <VoiceSearch {...props} />;
    case 'partial':
      return <VoiceSearch {...props} enableSpeechFeedback={false} />;
    case 'none':
      return (
        <div className="voice-search-fallback">
          <p>Voice search is not supported in your browser.</p>
          <p>Try using Chrome, Safari, or Edge for voice search functionality.</p>
        </div>
      );
  }
}
```

## Performance Optimization

### Lazy Loading Voice Features
```typescript
// Lazy load voice search components
const VoiceSearch = lazy(() => import('./VoiceSearch'));

export function SearchInterface() {
  const [showVoiceSearch, setShowVoiceSearch] = useState(false);
  const capability = getVoiceSearchCapability();
  
  return (
    <div className="search-interface">
      <SearchInput />
      
      {capability !== 'none' && (
        <button 
          onClick={() => setShowVoiceSearch(true)}
          className="voice-search-toggle"
        >
          Enable Voice Search
        </button>
      )}
      
      {showVoiceSearch && (
        <Suspense fallback={<div>Loading voice search...</div>}>
          <VoiceSearch />
        </Suspense>
      )}
    </div>
  );
}
```

### Memory Management
```typescript
export class VoiceSearchService {
  private cleanup() {
    if (this.recognition) {
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onend = null;
      this.recognition = null;
    }
  }
  
  destroy() {
    this.stopListening();
    this.cleanup();
  }
}
```

## Security and Privacy

### Permission Handling
```typescript
async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the stream immediately
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Microphone permission denied:', error);
    return false;
  }
}
```

### Privacy Considerations
- **Local Processing**: All speech recognition happens locally in the browser
- **No Audio Storage**: Audio data is not transmitted or stored on servers
- **Transcript Privacy**: Search transcripts can be optionally excluded from analytics
- **User Control**: Users can disable voice search features completely

## Troubleshooting

### Common Issues and Solutions

1. **"Speech recognition not supported"**
   - Check browser compatibility
   - Ensure HTTPS connection
   - Verify browser flags are enabled

2. **"Permission denied for microphone"**
   - Check browser permission settings
   - Ensure user gesture triggered the request
   - Clear browser permissions and retry

3. **"No speech detected"**
   - Check microphone hardware
   - Adjust browser audio input settings
   - Reduce background noise

4. **Poor recognition accuracy**
   - Speak clearly and at moderate pace
   - Use wedding-specific vocabulary
   - Check microphone quality and positioning

### Debug Mode
```typescript
export function enableVoiceSearchDebug() {
  window.voiceSearchDebug = true;
  
  // Log all speech recognition events
  const originalConsoleLog = console.log;
  console.log = function(...args) {
    if (window.voiceSearchDebug && args[0]?.includes?.('Voice:')) {
      originalConsoleLog.apply(console, args);
    }
  };
}
```

---

## Best Practices

1. **User Experience**
   - Provide clear visual feedback during listening
   - Show example voice commands
   - Handle errors gracefully with helpful messages

2. **Performance**
   - Use debouncing for interim results
   - Implement timeout handling
   - Clean up resources properly

3. **Accessibility**
   - Provide keyboard alternatives
   - Include ARIA labels
   - Support screen readers

4. **Testing**
   - Test across multiple browsers and devices
   - Include error scenarios in testing
   - Verify privacy compliance

**Last Updated**: January 2025  
**Version**: 1.0.0
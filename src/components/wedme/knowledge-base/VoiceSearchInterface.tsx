'use client';

import { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceSearchResult {
  query: string;
  articles: any[];
  suggestions: string[];
  voiceResponse?: string;
}

interface VoiceSearchInterfaceProps {
  onResults: (results: VoiceSearchResult) => void;
  onClose: () => void;
  isListening: boolean;
  transcript: string;
  error: string | null;
}

const sampleQuestions = [
  'How do I choose a venue?',
  "What's a good wedding budget?",
  'When should I book my photographer?',
  'How many guests should I invite?',
  'What questions should I ask my caterer?',
  'How far in advance should I book vendors?',
];

const weddingTermsMap: Record<string, string[]> = {
  venue: ['place', 'location', 'hall', 'church', 'where'],
  budget: ['money', 'cost', 'price', 'expensive', 'cheap', 'afford'],
  photography: ['photo', 'picture', 'camera', 'photographer', 'shots'],
  catering: ['food', 'eat', 'dinner', 'menu', 'catering', 'meal'],
  music: ['music', 'DJ', 'band', 'song', 'dance', 'party'],
  flowers: ['flower', 'bouquet', 'floral', 'centerpiece', 'bloom'],
  dress: ['dress', 'gown', 'outfit', 'attire', 'wear', 'clothing'],
  timeline: ['when', 'schedule', 'time', 'plan', 'order', 'timeline'],
};

export function VoiceSearchInterface({
  onResults,
  onClose,
  isListening,
  transcript,
  error,
}: VoiceSearchInterfaceProps) {
  const [processingResults, setProcessingResults] = useState(false);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(0);
  const [enhancedTranscript, setEnhancedTranscript] = useState<string>('');
  const [voiceResponse, setVoiceResponse] = useState<string>('');

  useEffect(() => {
    if (transcript) {
      // Enhance transcript with wedding-specific context
      const enhanced = enhanceWeddingQuery(transcript);
      setEnhancedTranscript(enhanced);

      // If we have a final transcript, process it
      if (!isListening && transcript.length > 3) {
        handleVoiceSearch(enhanced);
      }
    }
  }, [transcript, isListening]);

  const enhanceWeddingQuery = (query: string): string => {
    let enhancedQuery = query.toLowerCase();

    // Map common spoken terms to wedding terminology
    for (const [weddingTerm, spokenTerms] of Object.entries(weddingTermsMap)) {
      for (const spokenTerm of spokenTerms) {
        if (
          enhancedQuery.includes(spokenTerm) &&
          !enhancedQuery.includes(weddingTerm)
        ) {
          enhancedQuery = enhancedQuery.replace(
            new RegExp(`\\b${spokenTerm}\\b`, 'gi'),
            `${spokenTerm} ${weddingTerm}`,
          );
        }
      }
    }

    // Add wedding context if not present
    if (
      !enhancedQuery.includes('wedding') &&
      !enhancedQuery.includes('marriage')
    ) {
      enhancedQuery = `wedding ${enhancedQuery}`;
    }

    return enhancedQuery;
  };

  const handleVoiceSearch = async (query: string) => {
    setProcessingResults(true);

    try {
      const response = await fetch('/api/wedme/knowledge/voice-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          originalQuery: transcript,
        }),
      });

      if (!response.ok) throw new Error('Voice search failed');

      const results = await response.json();

      // Set confidence level based on result quality
      const confidence = Math.min(
        0.95,
        0.6 + (results.articles?.length || 0) * 0.1,
      );
      setConfidenceLevel(confidence);

      // Generate voice response
      const voiceResp = generateVoiceResponse(
        transcript,
        results.articles || [],
      );
      setVoiceResponse(voiceResp);

      // Speak the response if speech synthesis is available
      if ('speechSynthesis' in window && results.articles?.length > 0) {
        speakResponse(voiceResp);
      }

      // Return results to parent
      onResults({
        query: transcript,
        articles: results.articles || [],
        suggestions: results.suggestions || [],
        voiceResponse: voiceResp,
      });
    } catch (error) {
      console.error('Voice search error:', error);

      // Fallback response
      const fallbackResponse = `I couldn't find specific information about "${transcript}", but I'd be happy to help with other wedding questions.`;
      setVoiceResponse(fallbackResponse);
      speakResponse(fallbackResponse);

      onResults({
        query: transcript,
        articles: [],
        suggestions: sampleQuestions.slice(0, 3),
      });
    } finally {
      setProcessingResults(false);
    }
  };

  const generateVoiceResponse = (
    originalQuery: string,
    articles: any[],
  ): string => {
    if (articles.length === 0) {
      return `I couldn't find specific articles about "${originalQuery}", but I can help you with other wedding planning questions. Try asking about venues, photography, or budget planning.`;
    }

    const topArticle = articles[0];
    const articleCount = articles.length;

    if (articleCount === 1) {
      return `I found an article that should help: "${topArticle.title}". This covers exactly what you're looking for.`;
    }

    return `I found ${articleCount} helpful articles about "${originalQuery}". The top result is "${topArticle.title}". These should give you great guidance for your wedding planning.`;
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;

      // Use a pleasant voice if available
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (voice) =>
          voice.name.includes('Female') ||
          voice.name.includes('Samantha') ||
          voice.name.includes('Karen'),
      );

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      speechSynthesis.speak(utterance);
    }
  };

  const handleSampleQuestion = (question: string) => {
    // Simulate voice input with sample question
    setEnhancedTranscript(question);
    handleVoiceSearch(enhanceWeddingQuery(question));
  };

  const getStatusMessage = () => {
    if (error) return error;
    if (processingResults) return 'Finding the perfect answer for you...';
    if (isListening) return "I'm listening... speak naturally";
    if (transcript) return `Processing: "${transcript}"`;
    return 'Tap the microphone to start';
  };

  const getStatusColor = () => {
    if (error) return 'text-red-600';
    if (processingResults) return 'text-blue-600';
    if (isListening) return 'text-green-600';
    if (transcript) return 'text-purple-600';
    return 'text-rose-600';
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-rose-900">Voice Search</h2>
            <p className="text-rose-600 text-sm">
              Ask me anything about your wedding
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-rose-100 transition-colors"
            style={{ minWidth: '40px', minHeight: '40px' }}
          >
            <X className="w-5 h-5 text-rose-600" />
          </button>
        </div>

        {/* Voice Animation & Status */}
        <div className="text-center mb-6">
          <div className="relative mb-4">
            <motion.div
              className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
                isListening
                  ? 'bg-green-500'
                  : processingResults
                    ? 'bg-blue-500'
                    : error
                      ? 'bg-red-500'
                      : 'bg-rose-500'
              }`}
              animate={
                isListening
                  ? {
                      scale: [1, 1.1, 1],
                      boxShadow: [
                        '0 0 0 0 rgba(34, 197, 94, 0.7)',
                        '0 0 0 20px rgba(34, 197, 94, 0)',
                        '0 0 0 0 rgba(34, 197, 94, 0)',
                      ],
                    }
                  : processingResults
                    ? {
                        rotate: [0, 360],
                      }
                    : {}
              }
              transition={
                isListening
                  ? {
                      duration: 1.5,
                      repeat: Infinity,
                    }
                  : processingResults
                    ? {
                        duration: 2,
                        repeat: Infinity,
                        ease: 'linear',
                      }
                    : {}
              }
            >
              {processingResults ? (
                <Sparkles className="w-8 h-8 text-white" />
              ) : error ? (
                <MicOff className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </motion.div>

            {/* Confidence Indicator */}
            {confidenceLevel > 0 && (
              <motion.div
                className="absolute -bottom-2 left-1/2 transform -translate-x-1/2"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="bg-white rounded-full px-2 py-1 shadow-md border">
                  <span className="text-xs text-green-600 font-medium">
                    {Math.round(confidenceLevel * 100)}% confident
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Status Message */}
          <p className={`font-medium mb-2 ${getStatusColor()}`}>
            {getStatusMessage()}
          </p>

          {/* Live Transcript */}
          <AnimatePresence>
            {transcript && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 bg-rose-50 rounded-2xl mb-4"
              >
                <p className="text-rose-900 text-center font-medium">
                  "{transcript}"
                </p>
                {enhancedTranscript !== transcript && (
                  <p className="text-rose-600 text-sm text-center mt-1">
                    Enhanced: "{enhancedTranscript}"
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Voice Response */}
          <AnimatePresence>
            {voiceResponse && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 bg-blue-50 rounded-2xl mb-4"
              >
                <div className="flex items-center justify-center mb-2">
                  <Volume2 className="w-4 h-4 text-blue-600 mr-2" />
                  <span className="text-sm text-blue-700 font-medium">
                    Voice Response
                  </span>
                </div>
                <p className="text-blue-900 text-sm text-center">
                  {voiceResponse}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-red-50 rounded-2xl mb-4"
          >
            <p className="text-red-600 text-center text-sm">{error}</p>
          </motion.div>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            disabled={processingResults}
            onClick={onClose}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ minHeight: '48px' }}
          >
            Close
          </button>

          <button
            disabled={processingResults}
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-rose-500 text-white rounded-2xl font-medium hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ minHeight: '48px' }}
          >
            Try Again
          </button>
        </div>

        {/* Sample Questions */}
        {!transcript && !isListening && !processingResults && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="border-t border-rose-100 pt-6"
          >
            <p className="text-sm text-rose-600 mb-3 text-center font-medium">
              Try asking:
            </p>
            <div className="grid grid-cols-1 gap-2">
              {sampleQuestions.slice(0, 4).map((question, index) => (
                <motion.button
                  key={question}
                  onClick={() => handleSampleQuestion(question)}
                  className="text-left p-3 bg-rose-50 text-rose-700 rounded-xl text-sm hover:bg-rose-100 transition-colors"
                  style={{ minHeight: '48px' }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="font-medium">"{question}"</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4 p-3 bg-blue-50 rounded-xl"
        >
          <h4 className="text-sm font-semibold text-blue-900 mb-2">
            💡 Voice Search Tips
          </h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Speak clearly and naturally</li>
            <li>
              • Ask specific questions like "How much should I budget for
              flowers?"
            </li>
            <li>• Include "wedding" in your question for better results</li>
            <li>• I understand wedding terminology and common phrases</li>
          </ul>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

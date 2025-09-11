/**
 * WS-155: Voice Message Integration with Voice-to-Text
 * Mobile voice message recording and transcription for quick message composition
 */

import { z } from 'zod';
import { supabase } from '@/lib/supabase/client';

// Voice message request schema
const VoiceMessageRequest = z.object({
  audioBlob: z.instanceof(Blob),
  duration: z.number().min(0.5).max(300), // 0.5 to 300 seconds
  mimeType: z.string(),
  userId: z.string(),
  guestId: z.string(),
  weddingId: z.string(),
  language: z.string().default('en-US'),
});

// Transcription result
interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
  alternatives?: string[];
}

// Voice processing options
interface VoiceProcessingOptions {
  enhanceAudio?: boolean;
  removeBackground?: boolean;
  normalizeVolume?: boolean;
  detectLanguage?: boolean;
}

export class VoiceMessageIntegration {
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private recordingStartTime: number = 0;

  constructor() {
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    if (typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new AudioContext();
    }
  }

  /**
   * Start recording voice message
   */
  async startRecording(options?: {
    maxDuration?: number;
    onDataAvailable?: (chunk: Blob) => void;
    onStop?: () => void;
  }): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording already in progress');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.getPreferredMimeType(),
      });

      this.audioChunks = [];
      this.isRecording = true;
      this.recordingStartTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          options?.onDataAvailable?.(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        options?.onStop?.();

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      this.mediaRecorder.start(100); // Collect data every 100ms

      // Auto-stop after max duration
      if (options?.maxDuration) {
        setTimeout(() => {
          if (this.isRecording) {
            this.stopRecording();
          }
        }, options.maxDuration * 1000);
      }
    } catch (error) {
      console.error('Error starting voice recording:', error);
      throw new Error(
        'Failed to start voice recording. Please check microphone permissions.',
      );
    }
  }

  /**
   * Stop recording and return audio blob
   */
  async stopRecording(): Promise<{
    audioBlob: Blob;
    duration: number;
    mimeType: string;
  }> {
    if (!this.isRecording || !this.mediaRecorder) {
      throw new Error('No recording in progress');
    }

    return new Promise((resolve) => {
      const duration = (Date.now() - this.recordingStartTime) / 1000;

      this.mediaRecorder!.onstop = () => {
        const mimeType = this.mediaRecorder!.mimeType;
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });

        this.audioChunks = [];
        this.isRecording = false;

        resolve({ audioBlob, duration, mimeType });
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Process voice message and convert to text
   */
  async processVoiceMessage(
    request: z.infer<typeof VoiceMessageRequest>,
    options?: VoiceProcessingOptions,
  ): Promise<TranscriptionResult> {
    const validatedRequest = VoiceMessageRequest.parse(request);

    try {
      // Process audio if needed
      let processedAudio = validatedRequest.audioBlob;
      if (
        options?.enhanceAudio ||
        options?.removeBackground ||
        options?.normalizeVolume
      ) {
        processedAudio = await this.processAudio(
          validatedRequest.audioBlob,
          options,
        );
      }

      // Upload audio to storage
      const audioUrl = await this.uploadAudio(processedAudio, validatedRequest);

      // Transcribe using speech-to-text service
      const transcription = await this.transcribeAudio(
        audioUrl,
        validatedRequest.language,
        options,
      );

      // Save transcription record
      await this.saveTranscriptionRecord({
        ...validatedRequest,
        ...transcription,
        audioUrl,
      });

      return transcription;
    } catch (error) {
      console.error('Error processing voice message:', error);
      throw new Error('Failed to process voice message');
    }
  }

  /**
   * Process and enhance audio
   */
  private async processAudio(
    audioBlob: Blob,
    options: VoiceProcessingOptions,
  ): Promise<Blob> {
    if (!this.audioContext) {
      return audioBlob;
    }

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Apply audio processing
      const processedBuffer = await this.applyAudioProcessing(
        audioBuffer,
        options,
      );

      // Convert back to blob
      return await this.audioBufferToBlob(processedBuffer);
    } catch (error) {
      console.error('Error processing audio:', error);
      return audioBlob; // Return original if processing fails
    }
  }

  /**
   * Apply audio processing filters
   */
  private async applyAudioProcessing(
    audioBuffer: AudioBuffer,
    options: VoiceProcessingOptions,
  ): Promise<AudioBuffer> {
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate,
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    // Apply volume normalization
    if (options.normalizeVolume) {
      const gainNode = offlineContext.createGain();
      const maxAmplitude = this.getMaxAmplitude(audioBuffer);
      gainNode.gain.value = 0.95 / maxAmplitude;
      source.connect(gainNode);
      gainNode.connect(offlineContext.destination);
    } else {
      source.connect(offlineContext.destination);
    }

    source.start();
    return await offlineContext.startRendering();
  }

  /**
   * Get maximum amplitude from audio buffer
   */
  private getMaxAmplitude(audioBuffer: AudioBuffer): number {
    let maxAmplitude = 0;

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        const amplitude = Math.abs(channelData[i]);
        if (amplitude > maxAmplitude) {
          maxAmplitude = amplitude;
        }
      }
    }

    return maxAmplitude || 1;
  }

  /**
   * Convert AudioBuffer to Blob
   */
  private async audioBufferToBlob(audioBuffer: AudioBuffer): Promise<Blob> {
    const length = audioBuffer.length * audioBuffer.numberOfChannels * 2;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);

    let offset = 0;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const sample = audioBuffer.getChannelData(channel)[i];
        const value = Math.max(-1, Math.min(1, sample));
        view.setInt16(offset, value * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Upload audio to Supabase storage
   */
  private async uploadAudio(
    audioBlob: Blob,
    request: z.infer<typeof VoiceMessageRequest>,
  ): Promise<string> {
    const fileName = `voice_${request.userId}_${Date.now()}.webm`;
    const filePath = `voice-messages/${request.weddingId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('audio-messages')
      .upload(filePath, audioBlob, {
        contentType: request.mimeType,
        upsert: false,
      });

    if (error) {
      throw new Error('Failed to upload audio: ' + error.message);
    }

    const { data: urlData } = supabase.storage
      .from('audio-messages')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }

  /**
   * Transcribe audio using speech-to-text service
   */
  private async transcribeAudio(
    audioUrl: string,
    language: string,
    options?: VoiceProcessingOptions,
  ): Promise<TranscriptionResult> {
    // This would integrate with a speech-to-text service like:
    // - OpenAI Whisper API
    // - Google Cloud Speech-to-Text
    // - Azure Speech Services
    // - Web Speech API (for browser-based transcription)

    // For now, using Web Speech API as fallback
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      return await this.transcribeWithWebSpeechAPI(audioUrl, language);
    }

    // Server-side transcription with OpenAI Whisper
    return await this.transcribeWithWhisper(audioUrl, language, options);
  }

  /**
   * Transcribe using OpenAI Whisper API
   */
  private async transcribeWithWhisper(
    audioUrl: string,
    language: string,
    options?: VoiceProcessingOptions,
  ): Promise<TranscriptionResult> {
    try {
      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioUrl,
          language: language.split('-')[0], // Extract language code
          detectLanguage: options?.detectLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const result = await response.json();

      return {
        text: result.text,
        confidence: result.confidence || 0.9,
        language: result.language || language,
        duration: result.duration || 0,
        alternatives: result.alternatives,
      };
    } catch (error) {
      console.error('Whisper transcription error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  /**
   * Fallback: Transcribe using Web Speech API
   */
  private async transcribeWithWebSpeechAPI(
    audioUrl: string,
    language: string,
  ): Promise<TranscriptionResult> {
    return new Promise((resolve, reject) => {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;

      if (!SpeechRecognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      recognition.onresult = (event: any) => {
        const result = event.results[0];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence || 0.8;

        const alternatives = [];
        for (let i = 1; i < result.length; i++) {
          alternatives.push(result[i].transcript);
        }

        resolve({
          text: transcript,
          confidence,
          language,
          duration: 0,
          alternatives,
        });
      };

      recognition.onerror = (event: any) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      // Note: Web Speech API typically works with microphone input
      // For audio file transcription, server-side processing is recommended
      recognition.start();
    });
  }

  /**
   * Save transcription record to database
   */
  private async saveTranscriptionRecord(record: any): Promise<void> {
    try {
      await supabase.from('voice_transcriptions').insert({
        user_id: record.userId,
        guest_id: record.guestId,
        wedding_id: record.weddingId,
        audio_url: record.audioUrl,
        text: record.text,
        confidence: record.confidence,
        language: record.language,
        duration: record.duration,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error saving transcription record:', error);
    }
  }

  /**
   * Get preferred mime type for recording
   */
  private getPreferredMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // Default fallback
  }

  /**
   * Check if voice recording is supported
   */
  static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'mediaDevices' in navigator &&
      'getUserMedia' in navigator.mediaDevices &&
      'MediaRecorder' in window
    );
  }

  /**
   * Request microphone permission
   */
  static async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  /**
   * Get recent transcriptions for user
   */
  async getRecentTranscriptions(
    userId: string,
    limit: number = 10,
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from('voice_transcriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching transcriptions:', error);
      return [];
    }

    return data || [];
  }
}

export const voiceMessageIntegration = new VoiceMessageIntegration();

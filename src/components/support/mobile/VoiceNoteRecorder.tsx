'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Trash2,
  Volume2,
} from 'lucide-react';
import { toast } from 'sonner';

interface VoiceNoteRecorderProps {
  onRecordingComplete: (audioBlob: Blob | null) => void;
  maxDurationSeconds?: number;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onRecordingComplete,
  maxDurationSeconds = 300, // 5 minutes max
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Check microphone permission on mount
  useEffect(() => {
    checkMicrophonePermission();
    return () => {
      cleanup();
    };
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      setHasPermission(false);
      console.error('Microphone permission denied:', error);
    }
  };

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        setAudioBlob(blob);

        // Create audio URL for playback
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Notify parent component
        onRecordingComplete(blob);

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      intervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const newDuration = prev + 1;

          // Auto-stop at max duration
          if (newDuration >= maxDurationSeconds) {
            stopRecording();
            toast.warning(
              `Recording stopped automatically after ${maxDurationSeconds / 60} minutes`,
            );
          }

          return newDuration;
        });
      }, 1000);

      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone. Please check permissions.');
      setHasPermission(false);
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      toast.success(
        `Voice note recorded (${formatDuration(recordingDuration)})`,
      );
    }
  }, [isRecording, recordingDuration]);

  const playRecording = useCallback(() => {
    if (audioUrl && !isPlaying) {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => setIsPlaying(false);
      }

      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [audioUrl, isPlaying]);

  const pauseRecording = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isPlaying]);

  const deleteRecording = useCallback(() => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingDuration(0);
    setIsPlaying(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    onRecordingComplete(null);
    toast.success('Voice note deleted');
  }, [audioUrl, onRecordingComplete]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRecordingProgress = (): number => {
    return (recordingDuration / maxDurationSeconds) * 100;
  };

  // Don't render if no microphone permission
  if (hasPermission === false) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <MicOff className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Microphone access required
              </p>
              <p className="text-xs text-yellow-700">
                Please enable microphone permissions to record voice notes
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={checkMicrophonePermission}
              className="ml-auto"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Voice Note
              </span>
            </div>
            {audioBlob && (
              <span className="text-xs text-blue-700">
                {formatDuration(recordingDuration)}
              </span>
            )}
          </div>

          {/* Recording Controls */}
          {!audioBlob ? (
            <div className="space-y-3">
              {/* Recording Progress */}
              {isRecording && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-blue-700">
                    <span>
                      Recording... {formatDuration(recordingDuration)}
                    </span>
                    <span>Max: {formatDuration(maxDurationSeconds)}</span>
                  </div>
                  <Progress value={getRecordingProgress()} className="h-2" />
                </div>
              )}

              {/* Record Button */}
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant={isRecording ? 'destructive' : 'default'}
                  size="lg"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={hasPermission === null}
                  className="h-12 px-8"
                >
                  {isRecording ? (
                    <>
                      <Square className="h-4 w-4 mr-2" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-2" />
                      Start Recording
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Playback Controls */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={isPlaying ? pauseRecording : playRecording}
                >
                  {isPlaying ? (
                    <Pause className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>

                <div className="flex-1 text-sm text-blue-700">
                  Voice note recorded ({formatDuration(recordingDuration)})
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={deleteRecording}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              <div className="text-xs text-blue-600 text-center">
                Voice note will be attached to your support ticket
              </div>
            </div>
          )}

          {/* Help Text */}
          {!isRecording && !audioBlob && (
            <p className="text-xs text-blue-600 text-center">
              Record a voice message to provide additional context for your
              support request. Maximum duration:{' '}
              {Math.floor(maxDurationSeconds / 60)} minutes.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

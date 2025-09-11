'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Eye,
  Brain,
  CheckSquare,
  Shield,
  AlertTriangle,
  Download,
  Sparkles,
} from 'lucide-react';
import {
  ProgressRing,
  ProgressBar,
  StepIndicator,
  AnalysisMetrics,
} from './ProgressComponents';

export interface AnalysisStage {
  id:
    | 'upload'
    | 'pdf_parsing'
    | 'vision_analysis'
    | 'field_extraction'
    | 'validation';
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  progress: number;
  estimatedDuration?: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export interface AnalysisResult {
  id: string;
  fileName: string;
  status: 'processing' | 'completed' | 'failed';
  stages: AnalysisStage[];
  overallProgress: number;
  metrics?: {
    fieldsExtracted: number;
    confidenceScore: number;
    processingTime: number;
    dataQuality: 'high' | 'medium' | 'low';
  };
  extractedData?: {
    clientName: string;
    weddingDate?: string;
    venue?: string;
    fields: Array<{
      name: string;
      type: string;
      value: string;
      confidence: number;
    }>;
  };
  downloadUrl?: string;
}

interface AIAnalysisProgressProps {
  analysisId: string;
  fileName: string;
  onAnalysisComplete?: (result: AnalysisResult) => void;
  onAnalysisError?: (error: string) => void;
}

export function AIAnalysisProgress({
  analysisId,
  fileName,
  onAnalysisComplete,
  onAnalysisError,
}: AIAnalysisProgressProps) {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>({
    id: analysisId,
    fileName,
    status: 'processing',
    overallProgress: 0,
    stages: [
      {
        id: 'upload',
        title: 'File Upload',
        description: 'Uploading your wedding form to secure servers',
        status: 'completed',
        progress: 100,
      },
      {
        id: 'pdf_parsing',
        title: 'PDF Analysis',
        description: 'Reading and analyzing the document structure',
        status: 'in-progress',
        progress: 0,
        estimatedDuration: 30,
      },
      {
        id: 'vision_analysis',
        title: 'Visual Recognition',
        description: 'Using AI to identify form layouts and visual elements',
        status: 'pending',
        progress: 0,
        estimatedDuration: 45,
      },
      {
        id: 'field_extraction',
        title: 'Data Extraction',
        description: 'Extracting client details and wedding preferences',
        status: 'pending',
        progress: 0,
        estimatedDuration: 60,
      },
      {
        id: 'validation',
        title: 'Quality Check',
        description: 'Validating extracted data for accuracy',
        status: 'pending',
        progress: 0,
        estimatedDuration: 15,
      },
    ],
  });

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      const wsUrl = `ws://localhost:3000/api/pdf-analysis/${analysisId}/progress`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected for analysis:', analysisId);
        setIsConnected(true);
        setConnectionError(null);
      };

      ws.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);

          setAnalysisResult((prev) => {
            const updatedStages = prev.stages.map((stage) => {
              if (stage.id === update.stage) {
                return {
                  ...stage,
                  status: update.status,
                  progress: update.progress,
                  startTime: update.startTime
                    ? new Date(update.startTime)
                    : stage.startTime,
                  endTime: update.endTime
                    ? new Date(update.endTime)
                    : stage.endTime,
                  error: update.error,
                };
              }
              return stage;
            });

            const overallProgress = updatedStages.reduce(
              (sum, stage) => sum + stage.progress / updatedStages.length,
              0,
            );

            const newResult = {
              ...prev,
              stages: updatedStages,
              overallProgress,
              status: update.analysisStatus || prev.status,
              metrics: update.metrics || prev.metrics,
              extractedData: update.extractedData || prev.extractedData,
              downloadUrl: update.downloadUrl || prev.downloadUrl,
            };

            // Check if analysis is complete
            if (newResult.status === 'completed' && onAnalysisComplete) {
              onAnalysisComplete(newResult);
            } else if (newResult.status === 'failed' && onAnalysisError) {
              onAnalysisError(update.error || 'Analysis failed');
            }

            return newResult;
          });
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection to analysis service lost');
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);

        // Attempt to reconnect if analysis is still in progress
        if (analysisResult.status === 'processing') {
          setTimeout(connectWebSocket, 3000);
        }
      };

      wsRef.current = ws;
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [analysisId]);

  const getCurrentStage = () => {
    return (
      analysisResult.stages.find((stage) => stage.status === 'in-progress') ||
      analysisResult.stages[0]
    );
  };

  const getStageIcon = (stageId: string) => {
    const icons = {
      upload: FileText,
      pdf_parsing: FileText,
      vision_analysis: Eye,
      field_extraction: Brain,
      validation: CheckSquare,
    };
    return icons[stageId as keyof typeof icons] || FileText;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const currentStage = getCurrentStage();
  const StageIcon = getStageIcon(currentStage.id);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <span>AI Analysis in Progress</span>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Analyzing "{fileName}" to extract wedding form data
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <Badge variant={isConnected ? 'default' : 'secondary'}>
                {isConnected ? 'Connected' : 'Connecting...'}
              </Badge>

              <ProgressRing
                progress={analysisResult.overallProgress}
                size="lg"
                color={analysisResult.status === 'failed' ? 'red' : 'blue'}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Overall Progress */}
            <ProgressBar
              progress={analysisResult.overallProgress}
              label="Overall Progress"
              color={analysisResult.status === 'failed' ? 'red' : 'blue'}
            />

            {/* Current Stage Info */}
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex-shrink-0">
                <StageIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-blue-900">
                  {currentStage.title}
                </p>
                <p className="text-sm text-blue-700">
                  {currentStage.description}
                </p>
                {currentStage.estimatedDuration && (
                  <p className="text-xs text-blue-600 mt-1">
                    Estimated: {formatDuration(currentStage.estimatedDuration)}
                  </p>
                )}
              </div>
              {currentStage.status === 'in-progress' && (
                <ProgressRing
                  progress={currentStage.progress}
                  size="sm"
                  color="blue"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Error */}
      {connectionError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {connectionError}. Progress updates may be delayed.
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <StepIndicator
            currentStep={
              analysisResult.stages.findIndex(
                (s) => s.status === 'in-progress',
              ) + 1 ||
              analysisResult.stages.filter((s) => s.status === 'completed')
                .length + 1
            }
            totalSteps={analysisResult.stages.length}
            steps={analysisResult.stages}
          />
        </CardContent>
      </Card>

      {/* Analysis Metrics (shown when available) */}
      {analysisResult.metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalysisMetrics metrics={analysisResult.metrics} />
          </CardContent>
        </Card>
      )}

      {/* Extracted Data Preview (shown when available) */}
      {analysisResult.extractedData && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Wedding Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Client</p>
                <p className="text-lg font-semibold">
                  {analysisResult.extractedData.clientName}
                </p>
              </div>

              {analysisResult.extractedData.weddingDate && (
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Wedding Date
                  </p>
                  <p className="text-lg font-semibold">
                    {analysisResult.extractedData.weddingDate}
                  </p>
                </div>
              )}

              {analysisResult.extractedData.venue && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Venue</p>
                  <p className="text-lg font-semibold">
                    {analysisResult.extractedData.venue}
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">
                Form Fields Detected (
                {analysisResult.extractedData.fields.length})
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {analysisResult.extractedData.fields
                  .slice(0, 6)
                  .map((field, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <span className="text-sm font-medium">{field.name}</span>
                      <Badge variant="secondary" size="sm">
                        {field.confidence}% confident
                      </Badge>
                    </div>
                  ))}
              </div>
              {analysisResult.extractedData.fields.length > 6 && (
                <p className="text-xs text-gray-500 mt-2">
                  +{analysisResult.extractedData.fields.length - 6} more fields
                  detected
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Download Results */}
      {analysisResult.status === 'completed' && analysisResult.downloadUrl && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">
                  Analysis Complete!
                </h3>
                <p className="text-sm text-gray-600">
                  Your wedding form has been converted to a digital format.
                </p>
              </div>

              <Button asChild>
                <a href={analysisResult.downloadUrl} download>
                  <Download className="mr-2 h-4 w-4" />
                  Download Form
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {analysisResult.status === 'failed' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Analysis failed. Please try uploading your wedding form again, or
            contact support if the issue persists.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

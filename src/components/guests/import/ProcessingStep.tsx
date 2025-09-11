import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface ProcessingStepProps {
  isProcessing: boolean;
  processingProgress: number;
  processingError?: string;
  processedData?: any[];
  onComplete?: () => void;
}

export function ProcessingStep({
  isProcessing,
  processingProgress,
  processingError,
  processedData,
  onComplete,
}: ProcessingStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Processing Import</h3>
        <p className="text-gray-600">
          Please wait while we process your guest data...
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            {isProcessing ? (
              <Loader className="h-5 w-5 animate-spin text-blue-500" />
            ) : processingError ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            <span className="font-medium">
              {isProcessing
                ? 'Processing...'
                : processingError
                  ? 'Error'
                  : 'Complete'}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={processingProgress} className="w-full" />
              <p className="text-sm text-gray-600">
                {processingProgress}% complete
              </p>
            </div>
          )}

          {processingError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-700">{processingError}</p>
            </div>
          )}

          {processedData && !isProcessing && !processingError && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-green-700">
                Successfully processed {processedData.length} guest records
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

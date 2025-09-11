import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, FileText, Users } from 'lucide-react';

interface CompletionStepProps {
  importResults?: {
    successful: number;
    failed: number;
    duplicates: number;
    totalProcessed: number;
  };
  errors?: string[];
  onViewGuests?: () => void;
  onStartOver?: () => void;
  onClose?: () => void;
}

export function CompletionStep({
  importResults,
  errors = [],
  onViewGuests,
  onStartOver,
  onClose,
}: CompletionStepProps) {
  const hasErrors =
    errors.length > 0 || (importResults && importResults.failed > 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          {hasErrors ? (
            <AlertTriangle className="h-16 w-16 text-yellow-500" />
          ) : (
            <CheckCircle className="h-16 w-16 text-green-500" />
          )}
        </div>
        <h3 className="text-xl font-semibold mb-2">
          {hasErrors
            ? 'Import Completed with Issues'
            : 'Import Completed Successfully'}
        </h3>
        <p className="text-gray-600">
          {hasErrors
            ? 'Your import has finished, but there were some issues that need attention.'
            : 'All guest data has been successfully imported into your system.'}
        </p>
      </div>

      {importResults && (
        <Card>
          <CardHeader>
            <h4 className="text-lg font-medium">Import Summary</h4>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {importResults.successful}
                </div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {importResults.failed}
                </div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {importResults.duplicates}
                </div>
                <div className="text-sm text-gray-600">Duplicates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {importResults.totalProcessed}
                </div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {errors.length > 0 && (
        <Card>
          <CardHeader>
            <h4 className="text-lg font-medium text-red-700">
              Errors Encountered
            </h4>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-red-700 text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onViewGuests && (
          <Button
            onClick={onViewGuests}
            className="flex items-center space-x-2"
          >
            <Users className="h-4 w-4" />
            <span>View Guest List</span>
          </Button>
        )}

        {onStartOver && (
          <Button
            variant="outline"
            onClick={onStartOver}
            className="flex items-center space-x-2"
          >
            <FileText className="h-4 w-4" />
            <span>Import More Guests</span>
          </Button>
        )}

        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
}

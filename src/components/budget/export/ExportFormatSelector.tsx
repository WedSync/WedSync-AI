'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Sheet, Table, Check, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ExportFormat, FORMAT_PREVIEWS } from '@/types/budget-export';

interface ExportFormatSelectorProps {
  selectedFormat: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  isDisabled?: boolean;
}

const formatIcons = {
  pdf: FileText,
  csv: Sheet,
  excel: Table,
};

/**
 * ExportFormatSelector - Visual format selection with preview cards
 * Shows format features, file sizes, and compatibility information
 */
export function ExportFormatSelector({
  selectedFormat,
  onFormatChange,
  isDisabled = false,
}: ExportFormatSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Object.values(FORMAT_PREVIEWS).map((preview) => {
        const Icon = formatIcons[preview.format];
        const isSelected = selectedFormat === preview.format;

        return (
          <Card
            key={preview.format}
            className={`cursor-pointer transition-all duration-200 ${
              isSelected
                ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50'
                : 'hover:border-gray-300 hover:shadow-md'
            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !isDisabled && onFormatChange(preview.format)}
            role="radio"
            aria-checked={isSelected}
            tabIndex={isDisabled ? -1 : 0}
            onKeyDown={(e) => {
              if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onFormatChange(preview.format);
              }
            }}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon
                    className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}
                  />
                  {preview.title}
                </div>
                {isSelected && (
                  <Check
                    className="h-5 w-5 text-blue-600"
                    aria-label="Selected format"
                  />
                )}
              </CardTitle>
              <CardDescription className="text-sm">
                {preview.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-0">
              {/* File Size and Compatibility */}
              <div className="flex items-center justify-between mb-3">
                <Badge variant="secondary" className="text-xs">
                  {preview.fileSize}
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-2">
                        <p className="font-medium">Compatible with:</p>
                        <ul className="text-sm list-disc list-inside">
                          {preview.compatibility.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Key Features */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Features:
                </h4>
                <div className="flex flex-wrap gap-1">
                  {preview.features.slice(0, 3).map((feature, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                  {preview.features.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{preview.features.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>

              {/* Best For */}
              <div className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                <span className="font-medium">Best for:</span> {preview.bestFor}
              </div>

              {/* Expanded details for selected format */}
              {isSelected && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  <div>
                    <h5 className="text-sm font-medium text-green-700 mb-1">
                      Advantages:
                    </h5>
                    <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                      {preview.pros.map((pro, idx) => (
                        <li key={idx}>{pro}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-orange-700 mb-1">
                      Considerations:
                    </h5>
                    <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                      {preview.cons.map((con, idx) => (
                        <li key={idx}>{con}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default ExportFormatSelector;

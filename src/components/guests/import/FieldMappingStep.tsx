'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ColumnMapping } from '@/types/guest-management';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Cog6ToothIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ArrowPathIcon,
  EyeIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';

interface FieldMappingStepProps {
  rawData: any[];
  columnMappings: ColumnMapping[];
  onMappingUpdate: (mappings: ColumnMapping[]) => void;
  onNext: () => void;
  loading: boolean;
}

const TARGET_FIELDS = [
  { value: '', label: 'Skip this column', required: false },
  { value: 'first_name', label: 'First Name', required: true },
  { value: 'last_name', label: 'Last Name', required: true },
  { value: 'email', label: 'Email', required: false },
  { value: 'phone', label: 'Phone', required: false },
  {
    value: 'category',
    label: 'Category (family/friends/work)',
    required: false,
  },
  {
    value: 'side',
    label: 'Wedding Side (partner1/partner2/mutual)',
    required: false,
  },
  { value: 'plus_one', label: 'Plus One (yes/no)', required: false },
  { value: 'plus_one_name', label: 'Plus One Name', required: false },
  {
    value: 'age_group',
    label: 'Age Group (adult/child/infant)',
    required: false,
  },
  {
    value: 'dietary_restrictions',
    label: 'Dietary Restrictions',
    required: false,
  },
  { value: 'special_needs', label: 'Special Needs', required: false },
  { value: 'helper_role', label: 'Helper Role', required: false },
  { value: 'notes', label: 'Notes', required: false },
];

export function FieldMappingStep({
  rawData,
  columnMappings,
  onMappingUpdate,
  onNext,
  loading,
}: FieldMappingStepProps) {
  const [mappings, setMappings] = useState<ColumnMapping[]>(columnMappings);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [autoMappingLoading, setAutoMappingLoading] = useState(false);

  // Update parent when mappings change
  useEffect(() => {
    onMappingUpdate(mappings);
  }, [mappings, onMappingUpdate]);

  // Generate preview data when mappings change
  useEffect(() => {
    generatePreviewData();
  }, [mappings, rawData]);

  const generatePreviewData = useCallback(() => {
    if (rawData.length === 0) return;

    const mapped = rawData.slice(0, 3).map((row) => {
      const mappedRow: any = {};
      mappings.forEach((mapping) => {
        if (mapping.target && mapping.target !== '') {
          let value = row[mapping.source];

          // Apply basic transformations based on target field
          if (mapping.target === 'plus_one' && value) {
            value = ['yes', 'true', '1', 'y', 'on'].includes(
              value.toString().toLowerCase(),
            )
              ? 'Yes'
              : 'No';
          } else if (mapping.target === 'category' && value) {
            value = value.toString().toLowerCase();
          } else if (mapping.target === 'side' && value) {
            value = value.toString().toLowerCase();
          }

          mappedRow[mapping.target] = value || '';
        }
      });
      return mappedRow;
    });

    setPreviewData(mapped);
  }, [mappings, rawData]);

  const handleMappingChange = useCallback(
    (sourceColumn: string, targetField: string) => {
      setMappings((prev) =>
        prev.map((mapping) => {
          if (mapping.source === sourceColumn) {
            return {
              ...mapping,
              target: targetField as any,
              confidence: targetField ? mapping.confidence || 50 : 0,
            };
          }
          // Clear any other mappings to the same target
          if (
            targetField &&
            mapping.target === targetField &&
            mapping.source !== sourceColumn
          ) {
            return {
              ...mapping,
              target: '',
              confidence: 0,
            };
          }
          return mapping;
        }),
      );
    },
    [],
  );

  const handleAutoMapping = useCallback(async () => {
    setAutoMappingLoading(true);

    try {
      // Simulate AI-powered field mapping
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const improvedMappings = mappings.map((mapping) => {
        const source = mapping.source.toLowerCase().replace(/[^a-z0-9]/g, '');
        let bestMatch = '';
        let confidence = mapping.confidence || 0;

        // Enhanced fuzzy matching with more sophisticated logic
        const matchingRules = [
          {
            pattern: /^(first|fname|given)/,
            target: 'first_name',
            confidence: 95,
          },
          {
            pattern: /^(last|lname|surname|family)/,
            target: 'last_name',
            confidence: 95,
          },
          { pattern: /^(email|mail|e_mail)/, target: 'email', confidence: 95 },
          {
            pattern: /^(phone|tel|mobile|cell)/,
            target: 'phone',
            confidence: 90,
          },
          {
            pattern: /^(cat|category|type|group)/,
            target: 'category',
            confidence: 85,
          },
          {
            pattern: /^(side|party|bride|groom)/,
            target: 'side',
            confidence: 80,
          },
          {
            pattern: /^(plus|guest|companion)/,
            target: 'plus_one',
            confidence: 85,
          },
          {
            pattern: /^(diet|allerg|restrict)/,
            target: 'dietary_restrictions',
            confidence: 85,
          },
          {
            pattern: /^(special|need|access)/,
            target: 'special_needs',
            confidence: 80,
          },
          {
            pattern: /^(role|job|help|duty)/,
            target: 'helper_role',
            confidence: 75,
          },
          {
            pattern: /^(note|comment|remark)/,
            target: 'notes',
            confidence: 70,
          },
          {
            pattern: /^(age|adult|child|infant)/,
            target: 'age_group',
            confidence: 75,
          },
        ];

        for (const rule of matchingRules) {
          if (rule.pattern.test(source)) {
            bestMatch = rule.target;
            confidence = rule.confidence;
            break;
          }
        }

        return {
          ...mapping,
          target: bestMatch as any,
          confidence,
        };
      });

      setMappings(improvedMappings);
    } finally {
      setAutoMappingLoading(false);
    }
  }, [mappings]);

  const resetMappings = useCallback(() => {
    setMappings((prev) =>
      prev.map((mapping) => ({
        ...mapping,
        target: '',
        confidence: 0,
      })),
    );
  }, []);

  const getValidationIssues = useCallback(() => {
    const issues = [];
    const requiredFields = ['first_name', 'last_name'];
    const mappedTargets = mappings.filter((m) => m.target).map((m) => m.target);

    // Check for required fields
    for (const required of requiredFields) {
      if (!mappedTargets.includes(required)) {
        issues.push(`${required.replace('_', ' ')} is required but not mapped`);
      }
    }

    // Check for duplicate mappings
    const duplicates = mappedTargets.filter(
      (target, index) => target && mappedTargets.indexOf(target) !== index,
    );
    for (const duplicate of [...new Set(duplicates)]) {
      issues.push(`${duplicate.replace('_', ' ')} is mapped multiple times`);
    }

    return issues;
  }, [mappings]);

  const validationIssues = getValidationIssues();
  const canProceed = validationIssues.length === 0;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    if (confidence > 0) return 'text-orange-600 bg-orange-100';
    return 'text-gray-600 bg-gray-100';
  };

  if (loading) {
    return (
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Generating preview...
          </h3>
          <p className="text-gray-600">
            Please wait while we process your field mappings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Map Your Columns
          </h3>
          <p className="text-gray-600">
            Tell us which columns contain which guest information
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoMapping}
            disabled={autoMappingLoading}
            className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200"
          >
            {autoMappingLoading ? (
              <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <SparklesIcon className="w-4 h-4 mr-2 text-purple-600" />
            )}
            AI Auto-Map
          </Button>

          <Button variant="ghost" size="sm" onClick={resetMappings}>
            Reset All
          </Button>
        </div>
      </div>

      {/* Mapping Interface */}
      <Card className="p-6">
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Column Mappings</h4>

          <div className="grid gap-4">
            {mappings.map((mapping, index) => (
              <div
                key={mapping.source}
                className="flex items-center gap-4 p-4 border rounded-lg"
              >
                {/* Source Column */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {mapping.source}
                    </span>
                    {mapping.confidence > 0 && (
                      <Badge
                        className={cn(
                          'text-xs',
                          getConfidenceColor(mapping.confidence),
                        )}
                        title={`${mapping.confidence}% confidence`}
                      >
                        {mapping.confidence}%
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Sample: {rawData[0]?.[mapping.source] || 'No data'}
                  </div>
                </div>

                {/* Mapping Arrow */}
                <div className="text-gray-400">→</div>

                {/* Target Field */}
                <div className="flex-1">
                  <Select
                    value={mapping.target || ''}
                    onValueChange={(value) =>
                      handleMappingChange(mapping.source, value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target field..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_FIELDS.map((field) => (
                        <SelectItem
                          key={field.value}
                          value={field.value}
                          className={field.required ? 'font-medium' : ''}
                        >
                          {field.label}
                          {field.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Validation Issues */}
      {validationIssues.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
          <AlertDescription>
            <div className="font-medium text-red-800 mb-1">
              Please fix these issues:
            </div>
            <ul className="text-red-700 space-y-1">
              {validationIssues.map((issue, index) => (
                <li key={index}>• {issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Preview */}
      {previewData.length > 0 && canProceed && (
        <Card className="p-6">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <EyeIcon className="w-5 h-5" />
            Preview Mapped Data
          </h4>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(previewData[0] || {}).map((field) => (
                    <th
                      key={field}
                      className="px-3 py-2 text-left font-medium text-gray-700 border"
                    >
                      {field
                        .replace('_', ' ')
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, index) => (
                  <tr key={index} className="border-b">
                    {Object.values(row).map((value: any, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-3 py-2 border text-gray-900"
                      >
                        {value || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Showing preview of first 3 rows with your mappings applied
          </p>
        </Card>
      )}

      {/* Field Requirements */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">Field Requirements</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <div className="font-medium mb-1">Required Fields:</div>
            <ul className="space-y-1">
              <li>• First Name</li>
              <li>• Last Name</li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-1">Recommended Fields:</div>
            <ul className="space-y-1">
              <li>• Email (for RSVP tracking)</li>
              <li>• Phone (for quick contact)</li>
              <li>• Category (for organization)</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canProceed} size="lg">
          Continue to Preview
          <CheckCircleIcon className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}

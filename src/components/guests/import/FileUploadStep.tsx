'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  TableCellsIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';

interface FileUploadStepProps {
  onFileUpload: (file: File, fileType: 'csv' | 'excel') => void;
  loading: boolean;
  error?: string;
}

interface FileAnalysis {
  name: string;
  size: number;
  type: 'csv' | 'excel';
  estimatedRows: number;
  preview: string[][];
}

export function FileUploadStep({
  onFileUpload,
  loading,
  error,
}: FileUploadStepProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileAnalysis, setFileAnalysis] = useState<FileAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      analyzeFile(files[0]);
    }
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files[0]) {
        analyzeFile(files[0]);
      }
    },
    [],
  );

  const analyzeFile = useCallback(async (file: File) => {
    setSelectedFile(file);
    setAnalyzing(true);
    setFileAnalysis(null);

    try {
      const fileType = getFileType(file);
      if (!fileType) {
        throw new Error(
          'Unsupported file type. Please upload a CSV or Excel file.',
        );
      }

      let preview: string[][] = [];
      let estimatedRows = 0;

      if (fileType === 'csv') {
        const result = await analyzeCSV(file);
        preview = result.preview;
        estimatedRows = result.estimatedRows;
      } else if (fileType === 'excel') {
        const result = await analyzeExcel(file);
        preview = result.preview;
        estimatedRows = result.estimatedRows;
      }

      setFileAnalysis({
        name: file.name,
        size: file.size,
        type: fileType,
        estimatedRows,
        preview,
      });
    } catch (err) {
      console.error('File analysis error:', err);
      // Don't throw error - let user proceed with basic info
      setFileAnalysis({
        name: file.name,
        size: file.size,
        type: getFileType(file) || 'csv',
        estimatedRows: 0,
        preview: [],
      });
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleConfirmUpload = useCallback(() => {
    if (selectedFile && fileAnalysis) {
      onFileUpload(selectedFile, fileAnalysis.type);
    }
  }, [selectedFile, fileAnalysis, onFileUpload]);

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setFileAnalysis(null);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileType = (file: File): 'csv' | 'excel' | null => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'csv') return 'csv';
    if (['xlsx', 'xls'].includes(extension || '')) return 'excel';
    return null;
  };

  if (loading) {
    return (
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Processing file...
          </h3>
          <p className="text-gray-600">
            Please wait while we parse your guest list.
          </p>
        </div>
        <Progress value={75} className="w-full max-w-md mx-auto" />
      </div>
    );
  }

  if (fileAnalysis) {
    return (
      <div className="space-y-6">
        {/* File Analysis Card */}
        <Card className="p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              {fileAnalysis.type === 'csv' ? (
                <DocumentTextIcon className="w-8 h-8 text-green-600" />
              ) : (
                <TableCellsIcon className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {fileAnalysis.name}
              </h3>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <div>Size: {formatFileSize(fileAnalysis.size)}</div>
                <div>Type: {fileAnalysis.type.toUpperCase()}</div>
                {fileAnalysis.estimatedRows > 0 && (
                  <div>Estimated guests: {fileAnalysis.estimatedRows}</div>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        {/* Preview */}
        {fileAnalysis.preview.length > 0 && (
          <Card className="p-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Preview</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {fileAnalysis.preview[0]?.map((header, index) => (
                      <th
                        key={index}
                        className="px-3 py-2 text-left font-medium text-gray-700 border"
                      >
                        {header || `Column ${index + 1}`}
                      </th>
                    )) || []}
                  </tr>
                </thead>
                <tbody>
                  {fileAnalysis.preview.slice(1, 4).map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b">
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-3 py-2 border text-gray-900"
                        >
                          {cell || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {fileAnalysis.estimatedRows > 3 && (
              <p className="text-xs text-gray-500 mt-2">
                Showing first 3 rows of {fileAnalysis.estimatedRows} total
              </p>
            )}
          </Card>
        )}

        {/* Format Requirements */}
        <Alert>
          <ExclamationTriangleIcon className="w-4 h-4" />
          <AlertDescription>
            <strong>File Format Requirements:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• First row must contain column headers</li>
              <li>• At minimum, include First Name and Last Name columns</li>
              <li>• Email and Phone columns are recommended</li>
              <li>• Avoid special characters in column headers</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={clearSelection}>
            Choose Different File
          </Button>
          <Button onClick={handleConfirmUpload}>Continue with This File</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-12 text-center transition-colors',
          dragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400',
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={analyzing}
        />

        <div className="space-y-4">
          <CloudArrowUpIcon className="mx-auto h-16 w-16 text-gray-400" />

          {analyzing ? (
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Analyzing file...
              </h3>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mt-2"></div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Drop your guest list here
              </h3>
              <p className="text-gray-600">or click to browse for a file</p>
            </div>
          )}

          <div className="text-sm text-gray-500">
            Supports CSV and Excel files (up to 10MB)
          </div>
        </div>
      </div>

      {/* Supported Formats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <DocumentTextIcon className="w-6 h-6 text-green-600" />
            <div>
              <h4 className="font-medium text-gray-900">CSV Files</h4>
              <p className="text-sm text-gray-600">
                Comma-separated values (.csv)
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <TableCellsIcon className="w-6 h-6 text-blue-600" />
            <div>
              <h4 className="font-medium text-gray-900">Excel Files</h4>
              <p className="text-sm text-gray-600">
                Spreadsheets (.xlsx, .xls)
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Tips */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">💡 Pro Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Export from Google Sheets, Excel, or your contact manager</li>
          <li>
            • Include columns for category (family/friends/work) to
            auto-categorize
          </li>
          <li>
            • Add dietary restrictions and special needs columns for complete
            profiles
          </li>
          <li>• Group households by using the same last name and address</li>
        </ul>
      </Card>
    </div>
  );
}

// Helper functions for file analysis
async function analyzeCSV(
  file: File,
): Promise<{ preview: string[][]; estimatedRows: number }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter((line) => line.trim());
      const preview = lines
        .slice(0, 5)
        .map((line) =>
          line
            .split(',')
            .map((cell) => cell.replace(/^["']|["']$/g, '').trim()),
        );
      resolve({ preview, estimatedRows: Math.max(0, lines.length - 1) });
    };
    reader.readAsText(file);
  });
}

async function analyzeExcel(
  file: File,
): Promise<{ preview: string[][]; estimatedRows: number }> {
  try {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
    }) as any[][];
    const preview = jsonData
      .slice(0, 5)
      .map((row) => row.map((cell) => cell?.toString() || ''));

    return {
      preview,
      estimatedRows: Math.max(0, jsonData.length - 1),
    };
  } catch (error) {
    return { preview: [], estimatedRows: 0 };
  }
}

import React, { useState, useCallback } from 'react';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
  Eye,
} from 'lucide-react';

export interface UploadedDocument {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  validationResults?: ValidationResult[];
}

interface ValidationResult {
  field: string;
  extracted: string;
  confidence: number;
  status: 'valid' | 'invalid' | 'needs_review';
}

interface DocumentUploaderProps {
  documentType: 'insurance' | 'license' | 'certification';
  onUploadComplete: (document: UploadedDocument) => void;
  maxFileSize?: number;
  acceptedFormats?: string[];
  onUploadError?: (error: string) => void;
}

const getDocumentTypeInfo = (type: string) => {
  const info = {
    insurance: {
      title: 'Insurance Certificate',
      requirements: [
        'Current certificate of liability insurance',
        'General liability minimum $1,000,000',
        'Professional liability minimum $500,000',
        'Policy holder name must match business name',
        'Certificate must show current effective dates',
      ],
      tips: [
        'Scan or photograph in good lighting',
        'Ensure all text is clearly readable',
        'Include complete certificate (no cropped edges)',
        'Make sure coverage amounts are visible',
      ],
    },
    license: {
      title: 'Business License',
      requirements: [
        'Current business license or registration certificate',
        'Tax identification number clearly visible',
        'Business name must match your profile',
        'Document must not be expired',
        'Issuing authority information included',
      ],
      tips: [
        'Use scanner for best quality',
        'Ensure official seals/stamps are visible',
        'Check that expiration dates are readable',
        'Include all pages if multi-page document',
      ],
    },
    certification: {
      title: 'Professional Certification',
      requirements: [
        'Current industry certifications',
        'Educational credentials (if applicable)',
        'Professional association memberships',
        'Continuing education certificates',
        'Certificate numbers when available',
      ],
      tips: [
        'Upload multiple certifications separately',
        'Ensure issuing organization is clearly visible',
        'Include certificate numbers when available',
        'Check expiration dates before uploading',
      ],
    },
  };

  return info[type as keyof typeof info];
};

export function DocumentUploader({
  documentType,
  onUploadComplete,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedFormats = ['image/jpeg', 'image/png', 'application/pdf'],
  onUploadError,
}: DocumentUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<
    UploadedDocument[]
  >([]);
  const [errors, setErrors] = useState<string[]>([]);

  const documentInfo = getDocumentTypeInfo(documentType);

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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFiles = async (files: File[]) => {
    setErrors([]);

    for (const file of files) {
      // Validate file
      if (file.size > maxFileSize) {
        setErrors((prev) => [
          ...prev,
          `${file.name}: File size exceeds ${maxFileSize / (1024 * 1024)}MB limit`,
        ]);
        continue;
      }

      if (!acceptedFormats.includes(file.type)) {
        setErrors((prev) => [
          ...prev,
          `${file.name}: File type not supported. Use PDF, PNG, or JPG.`,
        ]);
        continue;
      }

      await uploadDocument(file);
    }
  };

  const uploadDocument = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + Math.random() * 20;
        });
      }, 200);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      clearInterval(interval);
      setUploadProgress(100);

      const uploadedDoc: UploadedDocument = {
        id: Math.random().toString(36).substr(2, 9),
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        processingStatus: 'pending',
      };

      setUploadedDocuments((prev) => [...prev, uploadedDoc]);
      onUploadComplete(uploadedDoc);

      // Simulate processing status updates
      setTimeout(() => {
        setUploadedDocuments((prev) =>
          prev.map((doc) =>
            doc.id === uploadedDoc.id
              ? { ...doc, processingStatus: 'processing' }
              : doc,
          ),
        );
      }, 1000);

      setTimeout(() => {
        setUploadedDocuments((prev) =>
          prev.map((doc) =>
            doc.id === uploadedDoc.id
              ? {
                  ...doc,
                  processingStatus: 'completed',
                  validationResults: [
                    {
                      field: 'business_name',
                      extracted: 'WedSync Photography LLC',
                      confidence: 0.95,
                      status: 'valid',
                    },
                    {
                      field: 'license_number',
                      extracted: 'BL-2024-001234',
                      confidence: 0.88,
                      status: 'needs_review',
                    },
                  ],
                }
              : doc,
          ),
        );
      }, 5000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Upload failed';
      setErrors((prev) => [...prev, errorMessage]);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removeDocument = (documentId: string) => {
    setUploadedDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
        );
      case 'processing':
        return (
          <div className="animate-pulse h-4 w-4 bg-yellow-500 rounded-full" />
        );
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Queued for processing';
      case 'processing':
        return 'Extracting information...';
      case 'completed':
        return 'Processing complete';
      case 'failed':
        return 'Processing failed';
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className="space-y-6">
      {/* Document Requirements */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-4">
          📋 {documentInfo.title} Requirements
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              Required Information:
            </h4>
            <ul className="space-y-1">
              {documentInfo.requirements.map((req, index) => (
                <li
                  key={index}
                  className="flex items-start text-sm text-blue-700"
                >
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  {req}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              Upload Tips:
            </h4>
            <ul className="space-y-1">
              {documentInfo.tips.map((tip, index) => (
                <li
                  key={index}
                  className="flex items-start text-sm text-blue-700"
                >
                  <span className="text-blue-600 mr-2 mt-0.5">💡</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-red-800 font-medium mb-1">Upload Errors</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setErrors([])}
              className="text-red-600 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() =>
          !isUploading && document.getElementById('file-input')?.click()
        }
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept={acceptedFormats.join(',')}
          onChange={(e) =>
            e.target.files && handleFiles(Array.from(e.target.files))
          }
          className="hidden"
        />

        <Upload
          className={`mx-auto h-12 w-12 mb-4 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`}
        />

        {isUploading ? (
          <div className="space-y-4">
            <p className="text-lg text-gray-700">Uploading document...</p>
            <div className="max-w-xs mx-auto">
              <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {uploadProgress.toFixed(0)}% complete
              </p>
            </div>
          </div>
        ) : dragActive ? (
          <div className="space-y-2">
            <p className="text-lg text-blue-600 font-medium">
              Drop files here...
            </p>
            <p className="text-sm text-blue-500">
              Release to upload your documents
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-lg text-gray-700 font-medium">
                Drag & drop your {documentInfo.title.toLowerCase()} here
              </p>
              <p className="text-gray-500 mt-1">or click to browse files</p>
            </div>
            <div className="text-sm text-gray-500">
              <p>Supported formats: PDF, PNG, JPG</p>
              <p>Maximum file size: {maxFileSize / (1024 * 1024)}MB</p>
            </div>
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Files
            </button>
          </div>
        )}
      </div>

      {/* Uploaded Documents */}
      {uploadedDocuments.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Uploaded Documents
          </h3>
          <div className="space-y-3">
            {uploadedDocuments.map((document) => (
              <div
                key={document.id}
                className="bg-white border rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-6 w-6 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {document.fileName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(document.fileSize / 1024).toFixed(1)} KB • Uploaded{' '}
                        {new Date(document.uploadedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(document.processingStatus)}
                      <span className="text-sm text-gray-600">
                        {getStatusText(document.processingStatus)}
                      </span>
                    </div>
                    <button
                      onClick={() => removeDocument(document.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Validation Results */}
                {document.validationResults &&
                  document.validationResults.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">
                        Extracted Information:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {document.validationResults.map((result, index) => (
                          <div
                            key={index}
                            className="bg-gray-50 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700 capitalize">
                                {result.field.replace('_', ' ')}:
                              </span>
                              <span
                                className={`
                              text-xs px-2 py-1 rounded-full font-medium
                              ${
                                result.status === 'valid'
                                  ? 'bg-green-100 text-green-700'
                                  : result.status === 'invalid'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-yellow-100 text-yellow-700'
                              }
                            `}
                              >
                                {result.status === 'needs_review'
                                  ? 'Review Required'
                                  : result.status}
                              </span>
                            </div>
                            <div className="text-sm text-gray-900 font-mono bg-white px-2 py-1 rounded border">
                              {result.extracted || 'Not detected'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Confidence: {(result.confidence * 100).toFixed(0)}
                              %
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentUploader;

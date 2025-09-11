'use client';

/**
 * Document Manager Component
 * Extends Round 1 PDFUploader patterns for business document management
 * WS-068: Wedding Business Compliance Hub
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Share2,
  Edit3,
  Trash2,
  Filter,
  Grid3X3,
  List,
  Download,
  Shield,
  Calendar,
  Tag,
  Search,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { format, parseISO } from 'date-fns';
import { documentStorageService } from '@/lib/services/documentStorageService';
import type {
  DocumentWithCategory,
  DocumentCategory,
  DocumentUploadRequest,
  DocumentUploadProgress,
  DocumentLibraryFilters,
  DocumentLibraryResponse,
  ComplianceStatus,
  SecurityLevel,
  DEFAULT_DOCUMENT_CATEGORIES,
  COMPLIANCE_STATUS_INFO,
  SECURITY_LEVELS,
} from '@/types/documents';

interface DocumentManagerProps {
  userId: string;
  onDocumentSelect?: (document: DocumentWithCategory) => void;
  allowUpload?: boolean;
  allowDelete?: boolean;
  allowShare?: boolean;
  compact?: boolean;
  className?: string;
}

export function DocumentManager({
  userId,
  onDocumentSelect,
  allowUpload = true,
  allowDelete = true,
  allowShare = true,
  compact = false,
  className = '',
}: DocumentManagerProps) {
  // State management
  const [documents, setDocuments] = useState<DocumentWithCategory[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>(
    DEFAULT_DOCUMENT_CATEGORIES,
  );
  const [uploads, setUploads] = useState<DocumentUploadProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');

  // Filters and search
  const [filters, setFilters] = useState<DocumentLibraryFilters>({
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState<Partial<DocumentUploadRequest>>({
    expiry_warning_days: 30,
    is_compliance_required: false,
    security_level: 'standard',
  });

  // Statistics
  const [statistics, setStatistics] = useState({
    total_documents: 0,
    expired_documents: 0,
    expiring_documents: 0,
    total_storage_used: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial data
  useEffect(() => {
    loadDocuments();
  }, [filters]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        setFilters((prev) => ({ ...prev, search: searchTerm, page: 1 }));
      } else {
        setFilters((prev) => ({ ...prev, search: undefined, page: 1 }));
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentStorageService.getDocumentLibrary(
        userId,
        filters,
      );
      setDocuments(response.documents);
      setCategories(response.categories);
      setStatistics(response.statistics);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file || !uploadForm.category_id) return;

      const request: DocumentUploadRequest = {
        file,
        category_id: uploadForm.category_id,
        title: uploadForm.title,
        description: uploadForm.description,
        tags: uploadForm.tags,
        issued_date: uploadForm.issued_date,
        expiry_date: uploadForm.expiry_date,
        expiry_warning_days: uploadForm.expiry_warning_days || 30,
        is_compliance_required: uploadForm.is_compliance_required || false,
        security_level: uploadForm.security_level || 'standard',
      };

      try {
        setUploading(true);
        await documentStorageService.uploadDocument(
          request,
          userId,
          (progress) => {
            setUploads((prev) => {
              const existing = prev.find(
                (u) => u.uploadId === progress.uploadId,
              );
              if (existing) {
                return prev.map((u) =>
                  u.uploadId === progress.uploadId ? progress : u,
                );
              }
              return [...prev, progress];
            });
          },
        );

        // Refresh documents list
        await loadDocuments();
        setShowUploadDialog(false);
        setUploadForm({
          expiry_warning_days: 30,
          is_compliance_required: false,
          security_level: 'standard',
        });
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setUploading(false);
      }
    },
    [uploadForm, userId],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileUpload,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['.docx'],
    },
    maxFiles: 1,
    disabled: !allowUpload || uploading,
    multiple: false,
    noClick: true, // We'll handle clicks manually
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getComplianceStatusBadge = (status: ComplianceStatus) => {
    const info = COMPLIANCE_STATUS_INFO[status];
    return (
      <Badge
        variant="outline"
        className={`border-current`}
        style={{ color: info.color, borderColor: info.color }}
      >
        {info.label}
      </Badge>
    );
  };

  const getSecurityLevelBadge = (level: SecurityLevel) => {
    const info = SECURITY_LEVELS[level];
    return (
      <Badge
        variant="outline"
        className={`border-current`}
        style={{ color: info.color, borderColor: info.color }}
      >
        <Shield className="w-3 h-3 mr-1" />
        {info.label}
      </Badge>
    );
  };

  const getCategoryIcon = (iconName?: string) => {
    const iconMap: Record<string, any> = {
      Shield,
      FileText,
      Upload,
      Calendar,
      Tag,
    };
    const IconComponent = iconName ? iconMap[iconName] || FileText : FileText;
    return <IconComponent className="w-4 h-4" />;
  };

  const handleDocumentAction = async (action: string, documentId: string) => {
    switch (action) {
      case 'view':
        const document = documents.find((d) => d.id === documentId);
        if (document) {
          onDocumentSelect?.(document);
        }
        break;

      case 'delete':
        if (confirm('Are you sure you want to delete this document?')) {
          try {
            await documentStorageService.deleteDocument(documentId, userId);
            await loadDocuments();
          } catch (error) {
            console.error('Failed to delete document:', error);
          }
        }
        break;

      case 'share':
        // TODO: Implement sharing modal
        console.log('Share document:', documentId);
        break;
    }
  };

  const DocumentCard = ({ document }: { document: DocumentWithCategory }) => (
    <Card
      className={`group hover:shadow-md transition-all duration-200 ${
        selectedDocuments.includes(document.id) ? 'ring-2 ring-primary-500' : ''
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getCategoryIcon(document.category_icon)}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate">
                {document.title || document.original_filename}
              </h3>
              <p className="text-xs text-gray-500 truncate">
                {document.category_name}
              </p>
            </div>
          </div>
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDocumentAction('view', document.id)}
              className="p-1 h-6 w-6"
            >
              <Eye className="h-3 w-3" />
            </Button>
            {allowShare && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDocumentAction('share', document.id)}
                className="p-1 h-6 w-6"
              >
                <Share2 className="h-3 w-3" />
              </Button>
            )}
            {allowDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDocumentAction('delete', document.id)}
                className="p-1 h-6 w-6 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            {getComplianceStatusBadge(document.compliance_status)}
            {getSecurityLevelBadge(document.security_level)}
          </div>

          {/* File info */}
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Size:</span>
              <span>{formatFileSize(document.file_size)}</span>
            </div>
            {document.expiry_date && (
              <div className="flex justify-between">
                <span>Expires:</span>
                <span>
                  {format(parseISO(document.expiry_date), 'MMM dd, yyyy')}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Uploaded:</span>
              <span>
                {format(parseISO(document.created_at), 'MMM dd, yyyy')}
              </span>
            </div>
          </div>

          {/* Tags */}
          {document.tags && document.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {document.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {document.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{document.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const DocumentListItem = ({
    document,
  }: {
    document: DocumentWithCategory;
  }) => (
    <div
      className={`flex items-center p-4 border-b hover:bg-gray-50 transition-colors ${
        selectedDocuments.includes(document.id) ? 'bg-blue-50' : ''
      }`}
    >
      <Checkbox
        checked={selectedDocuments.includes(document.id)}
        onCheckedChange={(checked) => {
          if (checked) {
            setSelectedDocuments((prev) => [...prev, document.id]);
          } else {
            setSelectedDocuments((prev) =>
              prev.filter((id) => id !== document.id),
            );
          }
        }}
        className="mr-3"
      />

      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {getCategoryIcon(document.category_icon)}
        <div className="min-w-0 flex-1">
          <h3 className="font-medium truncate">
            {document.title || document.original_filename}
          </h3>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{document.category_name}</span>
            <span>{formatFileSize(document.file_size)}</span>
            <span>{format(parseISO(document.created_at), 'MMM dd, yyyy')}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {getComplianceStatusBadge(document.compliance_status)}
        {getSecurityLevelBadge(document.security_level)}

        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDocumentAction('view', document.id)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {allowShare && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDocumentAction('share', document.id)}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
          {allowDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDocumentAction('delete', document.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Manager</h2>
          <p className="text-gray-600">
            {statistics.total_documents} documents •{' '}
            {formatFileSize(statistics.total_storage_used)} used
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={view === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('grid')}
              className="p-2"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
              className="p-2"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {allowUpload && (
            <Button onClick={() => setShowUploadDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          )}
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={filters.category_ids?.[0] || ''}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      category_ids: value ? [value] : undefined,
                      page: 1,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Compliance Status</Label>
                <Select
                  value={filters.compliance_status?.[0] || ''}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      compliance_status: value
                        ? [value as ComplianceStatus]
                        : undefined,
                      page: 1,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="valid">Valid</SelectItem>
                    <SelectItem value="expiring">Expiring</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="invalid">Invalid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Security Level</Label>
                <Select
                  value={filters.security_level?.[0] || ''}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      security_level: value
                        ? [value as SecurityLevel]
                        : undefined,
                      page: 1,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All levels</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload progress */}
      {uploads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploads.map((upload) => (
              <div key={upload.uploadId} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium truncate">
                    {upload.filename}
                  </span>
                  <div className="flex items-center space-x-2">
                    {upload.status === 'completed' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {upload.status === 'failed' && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    {upload.status !== 'completed' &&
                      upload.status !== 'failed' && (
                        <Clock className="h-4 w-4 text-blue-500 animate-spin" />
                      )}
                    <span className="text-sm text-gray-500">
                      {upload.progress}%
                    </span>
                  </div>
                </div>
                <Progress value={upload.progress} className="h-2" />
                {upload.error && (
                  <p className="text-sm text-red-600">{upload.error}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Document grid/list */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center space-x-2">
            <Clock className="h-4 w-4 animate-spin" />
            <span>Loading documents...</span>
          </div>
        </div>
      ) : documents.length === 0 ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200
            ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
          `}
        >
          <input {...getInputProps()} />
          <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {isDragActive ? 'Drop your document here!' : 'No documents yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {isDragActive
              ? 'Release to start uploading'
              : allowUpload
                ? 'Drag & drop documents here, or click to upload'
                : 'No documents have been uploaded yet'}
          </p>
          {allowUpload && !isDragActive && (
            <Button onClick={() => setShowUploadDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Your First Document
            </Button>
          )}
        </div>
      ) : (
        <div>
          {view === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {documents.map((document) => (
                <DocumentCard key={document.id} document={document} />
              ))}
            </div>
          ) : (
            <Card>
              <div>
                {documents.map((document) => (
                  <DocumentListItem key={document.id} document={document} />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Business Document</DialogTitle>
            <DialogDescription>
              Upload and organize your business documents with compliance
              tracking
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Document Details</TabsTrigger>
              <TabsTrigger value="compliance">
                Compliance & Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label>Category *</Label>
                <Select
                  value={uploadForm.category_id || ''}
                  onValueChange={(value) =>
                    setUploadForm((prev) => ({ ...prev, category_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Document Title</Label>
                <Input
                  value={uploadForm.title || ''}
                  onChange={(e) =>
                    setUploadForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="Enter document title"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={uploadForm.description || ''}
                  onChange={(e) =>
                    setUploadForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div>
                <Label>Tags</Label>
                <Input
                  value={uploadForm.tags?.join(', ') || ''}
                  onChange={(e) =>
                    setUploadForm((prev) => ({
                      ...prev,
                      tags: e.target.value
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    }))
                  }
                  placeholder="Enter tags separated by commas"
                />
              </div>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Issue Date</Label>
                  <Input
                    type="date"
                    value={uploadForm.issued_date || ''}
                    onChange={(e) =>
                      setUploadForm((prev) => ({
                        ...prev,
                        issued_date: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    value={uploadForm.expiry_date || ''}
                    onChange={(e) =>
                      setUploadForm((prev) => ({
                        ...prev,
                        expiry_date: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Warning Days Before Expiry</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={uploadForm.expiry_warning_days || 30}
                  onChange={(e) =>
                    setUploadForm((prev) => ({
                      ...prev,
                      expiry_warning_days: parseInt(e.target.value),
                    }))
                  }
                />
              </div>

              <div>
                <Label>Security Level</Label>
                <Select
                  value={uploadForm.security_level || 'standard'}
                  onValueChange={(value) =>
                    setUploadForm((prev) => ({
                      ...prev,
                      security_level: value as SecurityLevel,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Basic protection</SelectItem>
                    <SelectItem value="standard">
                      Standard - Normal protection
                    </SelectItem>
                    <SelectItem value="high">
                      High - Enhanced protection
                    </SelectItem>
                    <SelectItem value="critical">
                      Critical - Maximum protection
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="compliance-required"
                  checked={uploadForm.is_compliance_required || false}
                  onCheckedChange={(checked) =>
                    setUploadForm((prev) => ({
                      ...prev,
                      is_compliance_required: checked as boolean,
                    }))
                  }
                />
                <Label htmlFor="compliance-required">
                  This document is required for regulatory compliance
                </Label>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between pt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) {
                  handleFileUpload(files);
                }
              }}
              className="hidden"
            />

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={!uploadForm.category_id || uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose File
            </Button>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowUploadDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

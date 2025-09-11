'use client';

/**
 * Document Library Component
 * Provides advanced organization, search, and filtering capabilities
 * WS-068: Wedding Business Compliance Hub
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Calendar,
  Tag,
  Shield,
  FileText,
  Image,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Share2,
  Download,
  Edit3,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Star,
  Archive,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO, differenceInDays } from 'date-fns';
import { documentStorageService } from '@/lib/services/documentStorageService';
import type {
  DocumentWithCategory,
  DocumentCategory,
  DocumentLibraryFilters,
  ComplianceStatus,
  SecurityLevel,
  DocumentStatistics,
  COMPLIANCE_STATUS_INFO,
  SECURITY_LEVELS,
} from '@/types/documents';

interface DocumentLibraryProps {
  userId: string;
  onDocumentSelect?: (document: DocumentWithCategory) => void;
  onDocumentShare?: (document: DocumentWithCategory) => void;
  onDocumentEdit?: (document: DocumentWithCategory) => void;
  onDocumentDelete?: (document: DocumentWithCategory) => void;
  allowActions?: boolean;
  compact?: boolean;
  className?: string;
}

export function DocumentLibrary({
  userId,
  onDocumentSelect,
  onDocumentShare,
  onDocumentEdit,
  onDocumentDelete,
  allowActions = true,
  compact = false,
  className = '',
}: DocumentLibraryProps) {
  // State management
  const [documents, setDocuments] = useState<DocumentWithCategory[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [statistics, setStatistics] = useState<DocumentStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // View and selection
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<
    'created_at' | 'updated_at' | 'expiry_date' | 'title' | 'file_size'
  >('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filtering and search
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<DocumentLibraryFilters>({
    page: 1,
    limit: 20,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState<
    'all' | 'expiring' | 'expired' | 'recent'
  >('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Load documents with current filters
  const loadDocuments = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const filters: DocumentLibraryFilters = {
        ...activeFilters,
        search: searchTerm || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page: currentPage,
        limit: 20,
      };

      // Apply quick filters
      switch (quickFilter) {
        case 'expiring':
          filters.compliance_status = ['expiring'];
          break;
        case 'expired':
          filters.compliance_status = ['expired'];
          break;
        case 'recent':
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          filters.created_at_from = weekAgo.toISOString().split('T')[0];
          break;
      }

      const response = await documentStorageService.getDocumentLibrary(
        userId,
        filters,
      );

      setDocuments(response.documents);
      setCategories(response.categories);
      setStatistics(response.statistics);
      setTotalPages(Math.ceil(response.total / 20));
      setHasMore(response.has_more);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load initial data
  useEffect(() => {
    loadDocuments();
  }, [
    userId,
    activeFilters,
    searchTerm,
    sortBy,
    sortOrder,
    currentPage,
    quickFilter,
  ]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        loadDocuments();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getComplianceStatusBadge = (
    status: ComplianceStatus,
    expiryDate?: string,
  ) => {
    const info = COMPLIANCE_STATUS_INFO[status];
    let daysUntilExpiry = null;

    if (expiryDate && status === 'expiring') {
      daysUntilExpiry = differenceInDays(parseISO(expiryDate), new Date());
    }

    return (
      <Badge
        variant="outline"
        className="border-current text-xs"
        style={{ color: info.color, borderColor: info.color }}
      >
        {React.createElement(
          info.icon === 'CheckCircle'
            ? CheckCircle
            : info.icon === 'Clock'
              ? Clock
              : info.icon === 'XCircle'
                ? XCircle
                : AlertTriangle,
          { className: 'w-3 h-3 mr-1' },
        )}
        {info.label}
        {daysUntilExpiry !== null && ` (${daysUntilExpiry}d)`}
      </Badge>
    );
  };

  const getSecurityLevelBadge = (level: SecurityLevel) => {
    const info = SECURITY_LEVELS[level];
    return (
      <Badge
        variant="outline"
        className="border-current text-xs"
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
      Image,
      Calendar,
      Tag,
    };
    const IconComponent = iconName ? iconMap[iconName] || FileText : FileText;
    return IconComponent;
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          doc.title?.toLowerCase().includes(searchLower) ||
          doc.description?.toLowerCase().includes(searchLower) ||
          doc.original_filename.toLowerCase().includes(searchLower) ||
          doc.category_name.toLowerCase().includes(searchLower) ||
          doc.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
        );
      }
      return true;
    });
  }, [documents, searchTerm]);

  const DocumentCard = ({ document }: { document: DocumentWithCategory }) => {
    const IconComponent = getCategoryIcon(document.category_icon);

    return (
      <Card
        className={`group hover:shadow-lg transition-all duration-200 cursor-pointer ${
          selectedDocuments.includes(document.id)
            ? 'ring-2 ring-primary-500 bg-primary-50'
            : ''
        }`}
        onClick={() => onDocumentSelect?.(document)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${document.category_color}20` }}
              >
                <IconComponent
                  className="w-5 h-5"
                  style={{ color: document.category_color }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  className="font-semibold text-sm truncate"
                  title={document.title || document.original_filename}
                >
                  {document.title || document.original_filename}
                </h3>
                <p className="text-xs text-gray-500 truncate">
                  {document.category_name}
                </p>
              </div>
            </div>

            {allowActions && (
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDocumentSelect?.(document);
                  }}
                  className="p-1 h-6 w-6"
                >
                  <Eye className="h-3 w-3" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 h-6 w-6"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onDocumentSelect?.(document)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDocumentShare?.(document)}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDocumentEdit?.(document)}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDocumentDelete?.(document)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Status badges */}
            <div className="flex flex-wrap gap-1">
              {getComplianceStatusBadge(
                document.compliance_status,
                document.expiry_date,
              )}
              {getSecurityLevelBadge(document.security_level)}
            </div>

            {/* Document info */}
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Size:</span>
                <span>{formatFileSize(document.file_size)}</span>
              </div>
              {document.expiry_date && (
                <div className="flex justify-between">
                  <span>Expires:</span>
                  <span
                    className={
                      document.compliance_status === 'expired'
                        ? 'text-red-600'
                        : document.compliance_status === 'expiring'
                          ? 'text-yellow-600'
                          : 'text-gray-500'
                    }
                  >
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

            {/* Description */}
            {document.description && (
              <p className="text-xs text-gray-600 line-clamp-2">
                {document.description}
              </p>
            )}

            {/* Tags */}
            {document.tags && document.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {document.tags.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs px-1.5 py-0.5"
                  >
                    {tag}
                  </Badge>
                ))}
                {document.tags.length > 2 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                    +{document.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const DocumentListItem = ({
    document,
  }: {
    document: DocumentWithCategory;
  }) => {
    const IconComponent = getCategoryIcon(document.category_icon);

    return (
      <div
        className={`flex items-center p-4 border-b hover:bg-gray-50 transition-colors cursor-pointer ${
          selectedDocuments.includes(document.id) ? 'bg-blue-50' : ''
        }`}
        onClick={() => onDocumentSelect?.(document)}
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
          onClick={(e) => e.stopPropagation()}
          className="mr-3"
        />

        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${document.category_color}20` }}
          >
            <IconComponent
              className="w-4 h-4"
              style={{ color: document.category_color }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-medium truncate">
              {document.title || document.original_filename}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>{document.category_name}</span>
              <span>{formatFileSize(document.file_size)}</span>
              <span>
                {format(parseISO(document.created_at), 'MMM dd, yyyy')}
              </span>
              {document.expiry_date && (
                <span
                  className={
                    document.compliance_status === 'expired'
                      ? 'text-red-600'
                      : document.compliance_status === 'expiring'
                        ? 'text-yellow-600'
                        : 'text-gray-500'
                  }
                >
                  Expires:{' '}
                  {format(parseISO(document.expiry_date), 'MMM dd, yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {getComplianceStatusBadge(
            document.compliance_status,
            document.expiry_date,
          )}
          {getSecurityLevelBadge(document.security_level)}

          {allowActions && (
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDocumentSelect?.(document);
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onDocumentShare?.(document)}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDocumentEdit?.(document)}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDocumentDelete?.(document)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with statistics */}
      {!compact && statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Documents</p>
                  <p className="text-2xl font-bold">
                    {statistics.total_documents}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Expiring Soon</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {statistics.expiring_documents}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Expired</p>
                  <p className="text-2xl font-bold text-red-600">
                    {statistics.expired_documents}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Storage Used</p>
                  <p className="text-2xl font-bold">
                    {formatFileSize(statistics.total_storage_used)}
                  </p>
                </div>
                <Archive className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Quick filters */}
          <Tabs
            value={quickFilter}
            onValueChange={(value) => setQuickFilter(value as any)}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="expiring" className="text-yellow-600">
                Expiring
              </TabsTrigger>
              <TabsTrigger value="expired" className="text-red-600">
                Expired
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center space-x-2">
          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadDocuments(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
          </Button>

          {/* Advanced filters */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {showFilters ? (
              <ChevronUp className="h-4 w-4 ml-2" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-2" />
            )}
          </Button>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {sortOrder === 'asc' ? (
                  <SortAsc className="h-4 w-4 mr-2" />
                ) : (
                  <SortDesc className="h-4 w-4 mr-2" />
                )}
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy('created_at')}>
                Date Created
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('updated_at')}>
                Date Modified
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('expiry_date')}>
                Expiry Date
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('title')}>
                Name
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('file_size')}>
                File Size
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={sortOrder === 'asc'}
                onCheckedChange={() =>
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                }
              >
                Ascending
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View toggle */}
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
        </div>
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <Label className="text-sm font-medium">Category</Label>
                <Select
                  value={activeFilters.category_ids?.[0] || ''}
                  onValueChange={(value) =>
                    setActiveFilters((prev) => ({
                      ...prev,
                      category_ids: value ? [value] : undefined,
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
                <Label className="text-sm font-medium">Compliance Status</Label>
                <Select
                  value={activeFilters.compliance_status?.[0] || ''}
                  onValueChange={(value) =>
                    setActiveFilters((prev) => ({
                      ...prev,
                      compliance_status: value
                        ? [value as ComplianceStatus]
                        : undefined,
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
                <Label className="text-sm font-medium">Security Level</Label>
                <Select
                  value={activeFilters.security_level?.[0] || ''}
                  onValueChange={(value) =>
                    setActiveFilters((prev) => ({
                      ...prev,
                      security_level: value
                        ? [value as SecurityLevel]
                        : undefined,
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

              <div>
                <Label className="text-sm font-medium">Expiry From</Label>
                <Input
                  type="date"
                  value={activeFilters.expiry_date_from || ''}
                  onChange={(e) =>
                    setActiveFilters((prev) => ({
                      ...prev,
                      expiry_date_from: e.target.value || undefined,
                    }))
                  }
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Expiry To</Label>
                <Input
                  type="date"
                  value={activeFilters.expiry_date_to || ''}
                  onChange={(e) =>
                    setActiveFilters((prev) => ({
                      ...prev,
                      expiry_date_to: e.target.value || undefined,
                    }))
                  }
                />
              </div>
            </div>

            {/* Clear filters */}
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setActiveFilters({ page: 1, limit: 20 })}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document display */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Loading documents...</p>
            </div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No documents found
            </h3>
            <p className="text-gray-500">
              {searchTerm || Object.keys(activeFilters).length > 2
                ? 'Try adjusting your search or filters'
                : 'Upload your first document to get started'}
            </p>
          </div>
        ) : (
          <>
            {view === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDocuments.map((document) => (
                  <DocumentCard key={document.id} document={document} />
                ))}
              </div>
            ) : (
              <Card>
                <div>
                  {filteredDocuments.map((document) => (
                    <DocumentListItem key={document.id} document={document} />
                  ))}
                </div>
              </Card>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!hasMore}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

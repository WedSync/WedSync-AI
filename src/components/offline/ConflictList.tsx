/**
 * WedSync Conflict List Component
 * Feature: WS-172 - Offline Functionality - Conflict Resolution
 * Team: C - Batch 21 - Round 3
 *
 * List view for displaying multiple conflicts with filtering and actions.
 */

'use client';

import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  Filter,
  Search,
  Calendar,
  User,
  FileText,
  ArrowUpDown,
  MoreHorizontal,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

import type {
  DataConflict,
  WeddingDataType,
  UserContext,
} from '@/lib/offline/conflict-resolution';

interface ConflictListProps {
  conflicts: DataConflict<any>[];
  onResolveConflict: (conflict: DataConflict<any>) => void;
  onBulkResolve: (
    conflicts: DataConflict<any>[],
    action: 'auto' | 'escalate',
  ) => Promise<void>;
  currentUser: UserContext;
  isLoading?: boolean;
}

type SortField = 'severity' | 'detectedAt' | 'dataType' | 'user';
type SortDirection = 'asc' | 'desc';

interface ConflictFilters {
  severity: string[];
  dataType: string[];
  autoResolvable: boolean | null;
  searchQuery: string;
}

/**
 * Individual conflict row component
 */
function ConflictTableRow({
  conflict,
  isSelected,
  onSelect,
  onResolve,
}: {
  conflict: DataConflict<any>;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onResolve: () => void;
}) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case 'medium':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-success" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatDataType = (dataType: WeddingDataType): string => {
    return dataType
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <TableRow className={isSelected ? 'bg-muted/50' : ''}>
      <TableCell className="w-[50px]">
        <Checkbox checked={isSelected} onCheckedChange={onSelect} />
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          {getSeverityIcon(conflict.metadata.severity)}
          <Badge variant={getSeverityVariant(conflict.metadata.severity)}>
            {conflict.metadata.severity}
          </Badge>
        </div>
      </TableCell>

      <TableCell>
        <div className="space-y-1">
          <div className="font-medium">{formatDataType(conflict.dataType)}</div>
          <div className="text-xs text-muted-foreground">
            ID: {conflict.metadata.conflictId.slice(0, 8)}...
          </div>
        </div>
      </TableCell>

      <TableCell>
        <div className="flex flex-wrap gap-1">
          {conflict.metadata.affectedFields.slice(0, 3).map((field) => (
            <Badge key={field} variant="outline" className="text-xs">
              {field}
            </Badge>
          ))}
          {conflict.metadata.affectedFields.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{conflict.metadata.affectedFields.length - 3} more
            </Badge>
          )}
        </div>
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2 text-sm">
          <User className="w-3 h-3" />
          <span className="capitalize">
            {conflict.localVersion.modifiedBy.role}
          </span>
        </div>
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-3 h-3" />
          <span>
            {new Date(
              conflict.metadata.detectedAt.timestamp,
            ).toLocaleDateString()}
          </span>
        </div>
      </TableCell>

      <TableCell>
        {conflict.metadata.autoResolvable && (
          <Badge
            variant="outline"
            className="text-xs bg-green-50 text-green-700 border-green-200"
          >
            Auto-resolvable
          </Badge>
        )}
      </TableCell>

      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={onResolve}>
              <FileText className="w-4 h-4 mr-2" />
              Resolve Conflict
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuItem>View Audit Trail</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

/**
 * Main conflict list component
 */
export function ConflictList({
  conflicts,
  onResolveConflict,
  onBulkResolve,
  currentUser,
  isLoading = false,
}: ConflictListProps) {
  const [selectedConflicts, setSelectedConflicts] = useState<Set<string>>(
    new Set(),
  );
  const [sortField, setSortField] = useState<SortField>('severity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filters, setFilters] = useState<ConflictFilters>({
    severity: [],
    dataType: [],
    autoResolvable: null,
    searchQuery: '',
  });

  // Filtered and sorted conflicts
  const processedConflicts = useMemo(() => {
    let filtered = conflicts;

    // Apply filters
    if (filters.severity.length > 0) {
      filtered = filtered.filter((c) =>
        filters.severity.includes(c.metadata.severity),
      );
    }

    if (filters.dataType.length > 0) {
      filtered = filtered.filter((c) => filters.dataType.includes(c.dataType));
    }

    if (filters.autoResolvable !== null) {
      filtered = filtered.filter(
        (c) => c.metadata.autoResolvable === filters.autoResolvable,
      );
    }

    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.metadata.conflictId.toLowerCase().includes(query) ||
          c.dataType.toLowerCase().includes(query) ||
          c.metadata.affectedFields.some((field) =>
            field.toLowerCase().includes(query),
          ),
      );
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'severity':
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          aValue =
            severityOrder[a.metadata.severity as keyof typeof severityOrder];
          bValue =
            severityOrder[b.metadata.severity as keyof typeof severityOrder];
          break;
        case 'detectedAt':
          aValue = a.metadata.detectedAt.timestamp;
          bValue = b.metadata.detectedAt.timestamp;
          break;
        case 'dataType':
          aValue = a.dataType;
          bValue = b.dataType;
          break;
        case 'user':
          aValue = a.localVersion.modifiedBy.role;
          bValue = b.localVersion.modifiedBy.role;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [conflicts, filters, sortField, sortDirection]);

  const selectedConflictsArray = useMemo(() => {
    return processedConflicts.filter((c) =>
      selectedConflicts.has(c.metadata.conflictId),
    );
  }, [processedConflicts, selectedConflicts]);

  const autoResolvableSelected = selectedConflictsArray.filter(
    (c) => c.metadata.autoResolvable,
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedConflicts(
        new Set(processedConflicts.map((c) => c.metadata.conflictId)),
      );
    } else {
      setSelectedConflicts(new Set());
    }
  };

  const handleSelectConflict = (conflictId: string, selected: boolean) => {
    const newSelected = new Set(selectedConflicts);
    if (selected) {
      newSelected.add(conflictId);
    } else {
      newSelected.delete(conflictId);
    }
    setSelectedConflicts(newSelected);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleBulkAutoResolve = async () => {
    if (autoResolvableSelected.length > 0) {
      await onBulkResolve(autoResolvableSelected, 'auto');
      setSelectedConflicts(new Set());
    }
  };

  const handleBulkEscalate = async () => {
    if (selectedConflictsArray.length > 0) {
      await onBulkResolve(selectedConflictsArray, 'escalate');
      setSelectedConflicts(new Set());
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
            Loading conflicts...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </div>
            <Badge variant="secondary">
              {processedConflicts.length} conflicts
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conflicts by ID, type, or field..."
                  className="pl-10"
                  value={filters.searchQuery}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      searchQuery: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <Select
              value={filters.severity[0] || 'all'}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  severity: value === 'all' ? [] : [value],
                }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={
                filters.autoResolvable === null
                  ? 'all'
                  : filters.autoResolvable.toString()
              }
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  autoResolvable: value === 'all' ? null : value === 'true',
                }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conflicts</SelectItem>
                <SelectItem value="true">Auto-resolvable</SelectItem>
                <SelectItem value="false">Manual Review</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedConflicts.size > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedConflicts.size} conflicts selected
                </span>
                {autoResolvableSelected.length > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200"
                  >
                    {autoResolvableSelected.length} auto-resolvable
                  </Badge>
                )}
              </div>

              <div className="flex gap-2">
                {autoResolvableSelected.length > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleBulkAutoResolve}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Auto-resolve ({autoResolvableSelected.length})
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkEscalate}
                >
                  Escalate All
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConflicts(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conflicts Table */}
      {processedConflicts.length === 0 ? (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            {conflicts.length === 0
              ? 'No conflicts detected. All your data is synchronized.'
              : 'No conflicts match your current filters.'}
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        selectedConflicts.size === processedConflicts.length
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('severity')}
                      className="h-auto p-0 font-medium"
                    >
                      Severity
                      <ArrowUpDown className="w-3 h-3 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('dataType')}
                      className="h-auto p-0 font-medium"
                    >
                      Data Type
                      <ArrowUpDown className="w-3 h-3 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>Affected Fields</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('user')}
                      className="h-auto p-0 font-medium"
                    >
                      Modified By
                      <ArrowUpDown className="w-3 h-3 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('detectedAt')}
                      className="h-auto p-0 font-medium"
                    >
                      Detected
                      <ArrowUpDown className="w-3 h-3 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>Resolution</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedConflicts.map((conflict) => (
                  <ConflictTableRow
                    key={conflict.metadata.conflictId}
                    conflict={conflict}
                    isSelected={selectedConflicts.has(
                      conflict.metadata.conflictId,
                    )}
                    onSelect={(selected) =>
                      handleSelectConflict(
                        conflict.metadata.conflictId,
                        selected,
                      )
                    }
                    onResolve={() => onResolveConflict(conflict)}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

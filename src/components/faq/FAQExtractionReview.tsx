'use client';

// FAQ Extraction Review Component - Manual review interface for extracted FAQs
// Feature ID: WS-125 - Automated FAQ Extraction from Documents
// Team: C - Batch 9 Round 3
// Component: Manual Review Interface

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  XCircle,
  Edit3,
  Eye,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Clock,
  Star,
  Filter,
  Search,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  faqExtractionService,
  type ReviewableExtraction,
  type ExtractedFAQ,
} from '@/lib/services/faq-extraction-service';
import { faqCategorizationService } from '@/lib/services/faq-categorization-service';
import { WEDDING_FAQ_CATEGORIES } from '@/types/faq';

interface FAQExtractionReviewProps {
  supplier_id: string;
  onReviewComplete?: (approvedCount: number, rejectedCount: number) => void;
  className?: string;
}

interface ReviewFilters {
  status: 'all' | 'pending' | 'approved' | 'rejected' | 'needs_editing';
  confidence: 'all' | 'high' | 'medium' | 'low';
  category: 'all' | string;
  search: string;
}

interface ReviewStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  high_confidence: number;
  medium_confidence: number;
  low_confidence: number;
}

export default function FAQExtractionReview({
  supplier_id,
  onReviewComplete,
  className,
}: FAQExtractionReviewProps) {
  const [extractions, setExtractions] = useState<ReviewableExtraction[]>([]);
  const [filteredExtractions, setFilteredExtractions] = useState<
    ReviewableExtraction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedExtraction, setSelectedExtraction] =
    useState<ReviewableExtraction | null>(null);
  const [editingExtraction, setEditingExtraction] =
    useState<ReviewableExtraction | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<ReviewFilters>({
    status: 'pending',
    confidence: 'all',
    category: 'all',
    search: '',
  });

  const [stats, setStats] = useState<ReviewStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    high_confidence: 0,
    medium_confidence: 0,
    low_confidence: 0,
  });

  // Load extractions from backend
  useEffect(() => {
    loadExtractions();
  }, [supplier_id]);

  // Apply filters when filters or extractions change
  useEffect(() => {
    applyFilters();
  }, [filters, extractions]);

  const loadExtractions = async () => {
    try {
      setLoading(true);
      const data = await faqExtractionService.getPendingReviews(supplier_id);
      setExtractions(data);
      calculateStats(data);
    } catch (error) {
      console.error('Failed to load extractions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: ReviewableExtraction[]) => {
    const newStats: ReviewStats = {
      total: data.length,
      pending: data.filter((e) => e.review_status === 'pending').length,
      approved: data.filter((e) => e.review_status === 'approved').length,
      rejected: data.filter((e) => e.review_status === 'rejected').length,
      high_confidence: data.filter((e) => e.extracted_faq.confidence >= 0.85)
        .length,
      medium_confidence: data.filter(
        (e) =>
          e.extracted_faq.confidence >= 0.65 &&
          e.extracted_faq.confidence < 0.85,
      ).length,
      low_confidence: data.filter((e) => e.extracted_faq.confidence < 0.65)
        .length,
    };
    setStats(newStats);
  };

  const applyFilters = () => {
    let filtered = [...extractions];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((e) => e.review_status === filters.status);
    }

    // Confidence filter
    if (filters.confidence !== 'all') {
      filtered = filtered.filter((e) => {
        const confidence = e.extracted_faq.confidence;
        switch (filters.confidence) {
          case 'high':
            return confidence >= 0.85;
          case 'medium':
            return confidence >= 0.65 && confidence < 0.85;
          case 'low':
            return confidence < 0.65;
          default:
            return true;
        }
      });
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(
        (e) => e.extracted_faq.category === filters.category,
      );
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.extracted_faq.question.toLowerCase().includes(searchLower) ||
          e.extracted_faq.answer.toLowerCase().includes(searchLower) ||
          e.extracted_faq.tags.some((tag) =>
            tag.toLowerCase().includes(searchLower),
          ),
      );
    }

    setFilteredExtractions(filtered);
  };

  const handleApprove = async (extractionId: string) => {
    try {
      const result =
        await faqExtractionService.approveFaqExtraction(extractionId);
      if (result) {
        setExtractions((prev) =>
          prev.map((e) =>
            e.id === extractionId
              ? {
                  ...e,
                  review_status: 'approved',
                  reviewed_at: new Date().toISOString(),
                }
              : e,
          ),
        );
        onReviewComplete?.(1, 0);
      }
    } catch (error) {
      console.error('Failed to approve extraction:', error);
    }
  };

  const handleReject = async (extractionId: string, notes?: string) => {
    try {
      // Would need to implement reject functionality in service
      setExtractions((prev) =>
        prev.map((e) =>
          e.id === extractionId
            ? {
                ...e,
                review_status: 'rejected',
                reviewed_at: new Date().toISOString(),
                reviewer_notes: notes,
              }
            : e,
        ),
      );
      onReviewComplete?.(0, 1);
    } catch (error) {
      console.error('Failed to reject extraction:', error);
    }
  };

  const handleEdit = async (
    extractionId: string,
    editedFaq: Partial<ExtractedFAQ>,
  ) => {
    try {
      setExtractions((prev) =>
        prev.map((e) =>
          e.id === extractionId
            ? {
                ...e,
                extracted_faq: { ...e.extracted_faq, ...editedFaq },
                review_status: 'needs_editing',
              }
            : e,
        ),
      );
    } catch (error) {
      console.error('Failed to edit extraction:', error);
    }
  };

  const handleBulkApprove = async () => {
    try {
      const selectedExtractions = Array.from(selectedItems);
      await Promise.all(selectedExtractions.map((id) => handleApprove(id)));
      setSelectedItems(new Set());
      setBulkMode(false);
    } catch (error) {
      console.error('Failed to bulk approve:', error);
    }
  };

  const handleBulkReject = async () => {
    try {
      const selectedExtractions = Array.from(selectedItems);
      await Promise.all(
        selectedExtractions.map((id) => handleReject(id, 'Bulk rejected')),
      );
      setSelectedItems(new Set());
      setBulkMode(false);
    } catch (error) {
      console.error('Failed to bulk reject:', error);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return 'text-green-600';
    if (confidence >= 0.65) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.85)
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          High
        </Badge>
      );
    if (confidence >= 0.65) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="destructive">Low</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'needs_editing':
        return (
          <Badge variant="secondary">
            <Edit3 className="w-3 h-3 mr-1" />
            Needs Editing
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading extractions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Stats Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>FAQ Extraction Review</span>
            <div className="flex gap-2">
              <Button
                variant={bulkMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBulkMode(!bulkMode)}
              >
                Bulk Actions
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {stats.pending}
              </div>
              <div className="text-sm text-muted-foreground">
                Pending Review
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.approved}
              </div>
              <div className="text-sm text-muted-foreground">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats.rejected}
              </div>
              <div className="text-sm text-muted-foreground">Rejected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.high_confidence}
              </div>
              <div className="text-sm text-muted-foreground">
                High Confidence
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value as any }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="needs_editing">Needs Editing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="confidence-filter">Confidence</Label>
              <Select
                value={filters.confidence}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, confidence: value as any }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Confidence</SelectItem>
                  <SelectItem value="high">High (85%+)</SelectItem>
                  <SelectItem value="medium">Medium (65-84%)</SelectItem>
                  <SelectItem value="low">Low (&lt;65%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category-filter">Category</Label>
              <Select
                value={filters.category}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {WEDDING_FAQ_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.slug} value={cat.slug}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="search-filter">Search</Label>
              <Input
                placeholder="Search questions..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Bulk Actions */}
          {bulkMode && selectedItems.size > 0 && (
            <div className="flex gap-2 p-4 bg-muted rounded-lg mb-4">
              <span className="text-sm text-muted-foreground">
                {selectedItems.size} items selected
              </span>
              <Button size="sm" onClick={handleBulkApprove}>
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve Selected
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkReject}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject Selected
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extractions List */}
      <div className="space-y-4">
        {filteredExtractions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No extractions found</h3>
              <p className="text-muted-foreground">
                No FAQ extractions match your current filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredExtractions.map((extraction) => (
            <Card
              key={extraction.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      {bulkMode && (
                        <input
                          type="checkbox"
                          checked={selectedItems.has(extraction.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedItems);
                            if (e.target.checked) {
                              newSelected.add(extraction.id);
                            } else {
                              newSelected.delete(extraction.id);
                            }
                            setSelectedItems(newSelected);
                          }}
                          className="mr-2"
                        />
                      )}
                      {getStatusBadge(extraction.review_status)}
                      {getConfidenceBadge(extraction.extracted_faq.confidence)}
                      <Badge variant="outline">
                        {extraction.extracted_faq.category}
                      </Badge>
                      {extraction.auto_approved && (
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700"
                        >
                          <Star className="w-3 h-3 mr-1" />
                          Auto-approved
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold mb-2">
                      {extraction.extracted_faq.question}
                    </h3>

                    <p className="text-muted-foreground mb-3 line-clamp-3">
                      {extraction.extracted_faq.answer}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Confidence:{' '}
                        <span
                          className={cn(
                            'font-medium',
                            getConfidenceColor(
                              extraction.extracted_faq.confidence,
                            ),
                          )}
                        >
                          {Math.round(
                            extraction.extracted_faq.confidence * 100,
                          )}
                          %
                        </span>
                      </span>
                      <span>
                        Source: {extraction.extracted_faq.source_document}
                      </span>
                      {extraction.extracted_faq.source_page && (
                        <span>
                          Page: {extraction.extracted_faq.source_page}
                        </span>
                      )}
                    </div>

                    {extraction.extracted_faq.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {extraction.extracted_faq.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedExtraction(extraction)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>

                    {extraction.review_status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingExtraction(extraction)}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(extraction.id)}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(extraction.id)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Detail View Dialog */}
      {selectedExtraction && (
        <Dialog
          open={!!selectedExtraction}
          onOpenChange={() => setSelectedExtraction(null)}
        >
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>FAQ Extraction Details</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Question</h3>
                  <p className="text-muted-foreground">
                    {selectedExtraction.extracted_faq.question}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Answer</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {selectedExtraction.extracted_faq.answer}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Summary</h3>
                  <p className="text-muted-foreground">
                    {selectedExtraction.extracted_faq.summary}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Category</h3>
                    <Badge>{selectedExtraction.extracted_faq.category}</Badge>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Confidence</h3>
                    <span
                      className={cn(
                        'font-medium',
                        getConfidenceColor(
                          selectedExtraction.extracted_faq.confidence,
                        ),
                      )}
                    >
                      {Math.round(
                        selectedExtraction.extracted_faq.confidence * 100,
                      )}
                      %
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-1">
                    {selectedExtraction.extracted_faq.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Source Information
                  </h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>
                      Document:{' '}
                      {selectedExtraction.extracted_faq.source_document}
                    </div>
                    {selectedExtraction.extracted_faq.source_page && (
                      <div>
                        Page: {selectedExtraction.extracted_faq.source_page}
                      </div>
                    )}
                    {selectedExtraction.extracted_faq.context && (
                      <div>
                        Context: {selectedExtraction.extracted_faq.context}
                      </div>
                    )}
                  </div>
                </div>

                {selectedExtraction.reviewer_notes && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      Reviewer Notes
                    </h3>
                    <p className="text-muted-foreground">
                      {selectedExtraction.reviewer_notes}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editingExtraction && (
        <Dialog
          open={!!editingExtraction}
          onOpenChange={() => setEditingExtraction(null)}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Edit FAQ Extraction</DialogTitle>
            </DialogHeader>
            <FAQEditForm
              extraction={editingExtraction}
              onSave={(editedFaq) => {
                handleEdit(editingExtraction.id, editedFaq);
                setEditingExtraction(null);
              }}
              onCancel={() => setEditingExtraction(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// FAQ Edit Form Component
interface FAQEditFormProps {
  extraction: ReviewableExtraction;
  onSave: (editedFaq: Partial<ExtractedFAQ>) => void;
  onCancel: () => void;
}

function FAQEditForm({ extraction, onSave, onCancel }: FAQEditFormProps) {
  const [editedFaq, setEditedFaq] = useState<ExtractedFAQ>(
    extraction.extracted_faq,
  );

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      <div>
        <Label htmlFor="question">Question</Label>
        <Textarea
          id="question"
          value={editedFaq.question}
          onChange={(e) =>
            setEditedFaq((prev) => ({ ...prev, question: e.target.value }))
          }
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="answer">Answer</Label>
        <Textarea
          id="answer"
          value={editedFaq.answer}
          onChange={(e) =>
            setEditedFaq((prev) => ({ ...prev, answer: e.target.value }))
          }
          rows={6}
        />
      </div>

      <div>
        <Label htmlFor="summary">Summary</Label>
        <Textarea
          id="summary"
          value={editedFaq.summary}
          onChange={(e) =>
            setEditedFaq((prev) => ({ ...prev, summary: e.target.value }))
          }
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            value={editedFaq.category}
            onValueChange={(value) =>
              setEditedFaq((prev) => ({ ...prev, category: value as any }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEDDING_FAQ_CATEGORIES.map((cat) => (
                <SelectItem key={cat.slug} value={cat.slug}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="confidence">Confidence</Label>
          <Input
            id="confidence"
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={editedFaq.confidence}
            onChange={(e) =>
              setEditedFaq((prev) => ({
                ...prev,
                confidence: parseFloat(e.target.value) || 0,
              }))
            }
          />
        </div>
      </div>

      <div>
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={editedFaq.tags.join(', ')}
          onChange={(e) =>
            setEditedFaq((prev) => ({
              ...prev,
              tags: e.target.value
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
            }))
          }
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(editedFaq)}>Save Changes</Button>
      </div>
    </div>
  );
}

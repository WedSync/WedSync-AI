'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRealtimeConnection } from '@/hooks/useRealtime';
import { formatDistanceToNow } from 'date-fns';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Eye,
  Download,
  Upload,
  Trash2,
  AlertCircle,
  Shield,
  Users,
  Loader2,
  FileSignature,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocumentStatus } from '@/types/realtime';

interface RealtimeDocumentStatusProps {
  documentId: string;
  documentName: string;
  initialStatus?: DocumentStatus;
  onStatusChange?: (status: DocumentStatus) => void;
  showReviewers?: boolean;
  showSignatures?: boolean;
  allowActions?: boolean;
  className?: string;
}

export function RealtimeDocumentStatus({
  documentId,
  documentName,
  initialStatus,
  onStatusChange,
  showReviewers = true,
  showSignatures = true,
  allowActions = true,
  className,
}: RealtimeDocumentStatusProps) {
  const [status, setStatus] = useState<DocumentStatus>(
    initialStatus || {
      documentId,
      documentName,
      status: 'draft',
      lastModified: Date.now(),
      modifiedBy: 'system',
    },
  );

  const { isConnected, send } = useRealtimeConnection(
    `document-${documentId}`,
    {
      onMessage: handleDocumentUpdate,
    },
  );

  function handleDocumentUpdate(payload: any) {
    const { type, data } = payload;

    if (type === 'document_status' && data.documentId === documentId) {
      setStatus(data);
      onStatusChange?.(data);
    }
  }

  const updateStatus = useCallback(
    (newStatus: DocumentStatus['status']) => {
      const update: DocumentStatus = {
        ...status,
        status: newStatus,
        lastModified: Date.now(),
      };

      setStatus(update);
      send({
        type: 'document_status',
        data: update,
      });
      onStatusChange?.(update);
    },
    [status, send, onStatusChange],
  );

  const addReviewer = useCallback(
    (userId: string) => {
      const update: DocumentStatus = {
        ...status,
        reviewers: [
          ...(status.reviewers || []),
          {
            userId,
            status: 'pending',
          },
        ],
        lastModified: Date.now(),
      };

      setStatus(update);
      send({
        type: 'document_status',
        data: update,
      });
    },
    [status, send],
  );

  const updateReviewerStatus = useCallback(
    (
      userId: string,
      reviewStatus: 'approved' | 'rejected',
      comments?: string,
    ) => {
      const update: DocumentStatus = {
        ...status,
        reviewers: status.reviewers?.map((r) =>
          r.userId === userId
            ? { ...r, status: reviewStatus, timestamp: Date.now(), comments }
            : r,
        ),
        lastModified: Date.now(),
      };

      // Update document status based on all reviewers
      const allApproved = update.reviewers?.every(
        (r) => r.status === 'approved',
      );
      const anyRejected = update.reviewers?.some(
        (r) => r.status === 'rejected',
      );

      if (allApproved) {
        update.status = 'approved';
      } else if (anyRejected) {
        update.status = 'rejected';
      }

      setStatus(update);
      send({
        type: 'document_status',
        data: update,
      });
    },
    [status, send],
  );

  const addSignature = useCallback(
    (userId: string, ipAddress?: string) => {
      const update: DocumentStatus = {
        ...status,
        signatures: [
          ...(status.signatures || []),
          {
            userId,
            timestamp: Date.now(),
            ipAddress,
          },
        ],
        status: 'signed',
        lastModified: Date.now(),
      };

      setStatus(update);
      send({
        type: 'document_status',
        data: update,
      });
    },
    [status, send],
  );

  const getStatusColor = (status: DocumentStatus['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-700';
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'signed':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: DocumentStatus['status']) => {
    switch (status) {
      case 'draft':
        return <Edit className="w-4 h-4" />;
      case 'pending_review':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'signed':
        return <FileSignature className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className={cn('bg-white rounded-lg border p-4', className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <FileText className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{documentName}</h3>
            <p className="text-sm text-gray-500 mt-1">
              Last modified{' '}
              {formatDistanceToNow(status.lastModified, { addSuffix: true })}
              {status.modifiedBy && ` by ${status.modifiedBy}`}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={cn(
            'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
            getStatusColor(status.status),
          )}
        >
          {getStatusIcon(status.status)}
          {status.status.replace('_', ' ')}
        </span>
      </div>

      {/* Reviewers */}
      {showReviewers && status.reviewers && status.reviewers.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Reviewers ({status.reviewers.length})
          </h4>
          <div className="space-y-2">
            {status.reviewers.map((reviewer, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      reviewer.status === 'approved'
                        ? 'bg-green-500'
                        : reviewer.status === 'rejected'
                          ? 'bg-red-500'
                          : 'bg-yellow-500',
                    )}
                  />
                  <span className="text-sm text-gray-700">
                    User {reviewer.userId}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {reviewer.status}
                  </span>
                  {reviewer.timestamp && (
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(reviewer.timestamp, {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signatures */}
      {showSignatures && status.signatures && status.signatures.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Signatures ({status.signatures.length})
          </h4>
          <div className="space-y-2">
            {status.signatures.map((signature, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-green-50 rounded"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700">
                    User {signature.userId}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(signature.timestamp, {
                    addSuffix: true,
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {allowActions && (
        <div className="flex items-center gap-2 pt-4 border-t">
          {status.status === 'draft' && (
            <button
              onClick={() => updateStatus('pending_review')}
              className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
            >
              Submit for Review
            </button>
          )}
          {status.status === 'pending_review' && (
            <>
              <button
                onClick={() => updateStatus('approved')}
                className="px-3 py-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => updateStatus('rejected')}
                className="px-3 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
              >
                Reject
              </button>
            </>
          )}
          {status.status === 'approved' && !status.signatures?.length && (
            <button
              onClick={() => addSignature('current-user')}
              className="px-3 py-1.5 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 transition-colors"
            >
              Sign Document
            </button>
          )}
          <button className="p-1.5 text-gray-500 hover:text-gray-700">
            <Eye className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-gray-500 hover:text-gray-700">
            <Download className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Connection Indicator */}
      {!isConnected && (
        <div className="mt-4 p-2 bg-yellow-50 rounded flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          <span className="text-sm text-yellow-700">
            Working offline - changes will sync when connected
          </span>
        </div>
      )}
    </div>
  );
}

interface DocumentListProps {
  documents: Array<{
    id: string;
    name: string;
    status: DocumentStatus['status'];
    lastModified: number;
  }>;
  onSelect?: (documentId: string) => void;
  className?: string;
}

export function DocumentList({
  documents,
  onSelect,
  className,
}: DocumentListProps) {
  const [sortedDocs, setSortedDocs] = useState(documents);

  useEffect(() => {
    setSortedDocs(
      [...documents].sort((a, b) => b.lastModified - a.lastModified),
    );
  }, [documents]);

  const statusCounts = documents.reduce(
    (acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary */}
      <div className="grid grid-cols-5 gap-2">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="text-center p-2 bg-gray-50 rounded">
            <div className="text-2xl font-bold text-gray-900">{count}</div>
            <div className="text-xs text-gray-500">
              {status.replace('_', ' ')}
            </div>
          </div>
        ))}
      </div>

      {/* Document List */}
      <div className="space-y-2">
        {sortedDocs.map((doc) => (
          <button
            key={doc.id}
            onClick={() => onSelect?.(doc.id)}
            className="w-full p-3 bg-white border rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{doc.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatDistanceToNow(doc.lastModified, { addSuffix: true })}
                  </p>
                </div>
              </div>
              <StatusBadge status={doc.status} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DocumentStatus['status'] }) {
  const colors = {
    draft: 'bg-gray-100 text-gray-700',
    pending_review: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    signed: 'bg-purple-100 text-purple-700',
  };

  return (
    <span
      className={cn('px-2 py-1 rounded text-xs font-medium', colors[status])}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

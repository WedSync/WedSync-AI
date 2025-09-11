/**
 * WS-244 Real-Time Collaboration System - Operational Transform Engine
 * Team C - Y.js Integration and Conflict Resolution
 *
 * Advanced operational transform engine that implements conflict-free
 * collaborative editing algorithms for real-time document synchronization.
 */

import * as Y from 'yjs';
import {
  Operation,
  OperationType,
  TransformedOperation,
  ConflictResolution,
  StateVector,
  DocumentSnapshot,
  CollaborationError,
  CollaborationErrorCode,
  YjsDocument,
  DocumentMetadata,
} from '../../types/collaboration';

/**
 * Operational Transform Engine implementing conflict-free editing algorithms
 */
export class OperationalTransformEngine {
  private operationHistory: Map<string, Operation[]> = new Map();
  private transformationCache: Map<string, TransformedOperation> = new Map();
  private conflictResolutions: Map<string, ConflictResolution> = new Map();

  /**
   * Transform an operation against a series of applied operations
   * Uses operational transform algorithms to maintain consistency
   */
  public async transformOperation(
    operation: Operation,
    appliedOperations: Operation[],
    documentState: Y.Doc,
  ): Promise<TransformedOperation> {
    try {
      // Check cache for previously computed transformation
      const cacheKey = this.generateCacheKey(operation, appliedOperations);
      const cached = this.transformationCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      let transformedOp = { ...operation } as TransformedOperation;
      const conflictsWith: string[] = [];
      let transformationReason = 'No conflicts detected';

      // Apply operational transform against each applied operation
      for (const appliedOp of appliedOperations) {
        if (this.operationsConflict(operation, appliedOp)) {
          conflictsWith.push(appliedOp.id);
          transformedOp = await this.transformAgainstOperation(
            transformedOp,
            appliedOp,
            documentState,
          );
        }
      }

      // Set transformation metadata
      transformedOp.originalOperation = operation;
      transformedOp.transformationReason =
        conflictsWith.length > 0
          ? `Transformed against ${conflictsWith.length} conflicting operations`
          : transformationReason;
      transformedOp.conflictsWith = conflictsWith;

      // Cache the result
      this.transformationCache.set(cacheKey, transformedOp);

      // Store in operation history
      this.addToHistory(operation.documentId, transformedOp);

      return transformedOp;
    } catch (error) {
      throw new CollaborationError('Operation transformation failed', {
        code: CollaborationErrorCode.OPERATION_CONFLICT,
        operationId: operation.id,
        context: error,
      });
    }
  }

  /**
   * Resolve conflicts between local and remote operations
   */
  public async resolveConflict(
    localOps: Operation[],
    remoteOps: Operation[],
    baseState: DocumentSnapshot,
  ): Promise<ConflictResolution> {
    try {
      const conflictId = crypto.randomUUID();
      const conflictTimestamp = new Date();

      // Create document from base state
      const baseDoc = new Y.Doc();
      Y.applyUpdate(baseDoc, baseState.content);

      // Apply operational transform to resolve conflicts
      const resolvedOperations: Operation[] = [];
      const rejectedOperations: Operation[] = [];

      // Transform local operations against remote operations
      for (const localOp of localOps) {
        try {
          const transformed = await this.transformOperation(
            localOp,
            remoteOps,
            baseDoc,
          );
          resolvedOperations.push(transformed);
        } catch (error) {
          rejectedOperations.push(localOp);
          console.warn(`Rejected operation ${localOp.id}:`, error);
        }
      }

      // Apply resolved operations to get final state
      const finalDoc = baseDoc.clone();
      for (const op of resolvedOperations) {
        await this.applyOperationToDocument(op, finalDoc);
      }

      const resolution: ConflictResolution = {
        conflictId,
        operations: resolvedOperations,
        resolution: rejectedOperations.length > 0 ? 'merged' : 'merged',
        reason: `Resolved ${localOps.length} local operations against ${remoteOps.length} remote operations`,
        timestamp: conflictTimestamp,
        resolvedBy: 'algorithm',
      };

      // Store conflict resolution
      this.conflictResolutions.set(conflictId, resolution);

      return resolution;
    } catch (error) {
      throw new CollaborationError('Conflict resolution failed', {
        code: CollaborationErrorCode.OPERATION_CONFLICT,
        context: error,
      });
    }
  }

  /**
   * Transform one operation against another using operational transform rules
   */
  private async transformAgainstOperation(
    op1: Operation,
    op2: Operation,
    documentState: Y.Doc,
  ): Promise<TransformedOperation> {
    // Handle different operation type combinations
    const transformResult = this.getTransformFunction(op1.type, op2.type)(
      op1,
      op2,
      documentState,
    );

    return {
      ...transformResult,
      originalOperation: op1,
      transformationReason: `Transformed ${op1.type} against ${op2.type}`,
      conflictsWith: [op2.id],
    } as TransformedOperation;
  }

  /**
   * Get the appropriate transform function for operation types
   */
  private getTransformFunction(
    type1: OperationType,
    type2: OperationType,
  ): (op1: Operation, op2: Operation, doc: Y.Doc) => Operation {
    const transformMatrix = {
      [OperationType.INSERT]: {
        [OperationType.INSERT]: this.transformInsertInsert.bind(this),
        [OperationType.DELETE]: this.transformInsertDelete.bind(this),
        [OperationType.RETAIN]: this.transformInsertRetain.bind(this),
        [OperationType.FORMAT]: this.transformInsertFormat.bind(this),
        [OperationType.EMBED]: this.transformInsertEmbed.bind(this),
      },
      [OperationType.DELETE]: {
        [OperationType.INSERT]: this.transformDeleteInsert.bind(this),
        [OperationType.DELETE]: this.transformDeleteDelete.bind(this),
        [OperationType.RETAIN]: this.transformDeleteRetain.bind(this),
        [OperationType.FORMAT]: this.transformDeleteFormat.bind(this),
        [OperationType.EMBED]: this.transformDeleteEmbed.bind(this),
      },
      [OperationType.RETAIN]: {
        [OperationType.INSERT]: this.transformRetainInsert.bind(this),
        [OperationType.DELETE]: this.transformRetainDelete.bind(this),
        [OperationType.RETAIN]: this.transformRetainRetain.bind(this),
        [OperationType.FORMAT]: this.transformRetainFormat.bind(this),
        [OperationType.EMBED]: this.transformRetainEmbed.bind(this),
      },
      [OperationType.FORMAT]: {
        [OperationType.INSERT]: this.transformFormatInsert.bind(this),
        [OperationType.DELETE]: this.transformFormatDelete.bind(this),
        [OperationType.RETAIN]: this.transformFormatRetain.bind(this),
        [OperationType.FORMAT]: this.transformFormatFormat.bind(this),
        [OperationType.EMBED]: this.transformFormatEmbed.bind(this),
      },
      [OperationType.EMBED]: {
        [OperationType.INSERT]: this.transformEmbedInsert.bind(this),
        [OperationType.DELETE]: this.transformEmbedDelete.bind(this),
        [OperationType.RETAIN]: this.transformEmbedRetain.bind(this),
        [OperationType.FORMAT]: this.transformEmbedFormat.bind(this),
        [OperationType.EMBED]: this.transformEmbedEmbed.bind(this),
      },
    };

    return transformMatrix[type1][type2];
  }

  /**
   * Transform INSERT against INSERT operations
   */
  private transformInsertInsert(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    if (op1.position <= op2.position) {
      return op1; // No transformation needed
    } else {
      // Adjust position after the insertion
      return {
        ...op1,
        position: op1.position + (op2.length || 0),
      };
    }
  }

  /**
   * Transform INSERT against DELETE operations
   */
  private transformInsertDelete(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    if (op1.position <= op2.position) {
      return op1; // No transformation needed
    } else if (op1.position < op2.position + op2.length) {
      // Insert position is within deleted range - move to deletion point
      return {
        ...op1,
        position: op2.position,
      };
    } else {
      // Adjust position after the deletion
      return {
        ...op1,
        position: op1.position - op2.length,
      };
    }
  }

  /**
   * Transform INSERT against RETAIN operations
   */
  private transformInsertRetain(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    // INSERT is not affected by RETAIN operations
    return op1;
  }

  /**
   * Transform INSERT against FORMAT operations
   */
  private transformInsertFormat(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    // INSERT operations are not affected by formatting
    return op1;
  }

  /**
   * Transform INSERT against EMBED operations
   */
  private transformInsertEmbed(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    if (op1.position <= op2.position) {
      return op1;
    } else {
      return {
        ...op1,
        position: op1.position + 1, // Embed operations add one character
      };
    }
  }

  /**
   * Transform DELETE against INSERT operations
   */
  private transformDeleteInsert(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    if (op1.position < op2.position) {
      return op1; // No transformation needed
    } else {
      // Adjust position after the insertion
      return {
        ...op1,
        position: op1.position + (op2.length || 0),
      };
    }
  }

  /**
   * Transform DELETE against DELETE operations
   */
  private transformDeleteDelete(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    if (op1.position + op1.length <= op2.position) {
      return op1; // No overlap
    } else if (op1.position >= op2.position + op2.length) {
      // Adjust position after the other deletion
      return {
        ...op1,
        position: op1.position - op2.length,
      };
    } else {
      // Overlapping deletions - complex case
      const overlap = this.calculateDeleteOverlap(op1, op2);
      return {
        ...op1,
        position: Math.min(op1.position, op2.position),
        length: op1.length - overlap.length,
      };
    }
  }

  /**
   * Transform DELETE against RETAIN operations
   */
  private transformDeleteRetain(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    // DELETE is not affected by RETAIN operations
    return op1;
  }

  /**
   * Transform DELETE against FORMAT operations
   */
  private transformDeleteFormat(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    // DELETE operations are not affected by formatting
    return op1;
  }

  /**
   * Transform DELETE against EMBED operations
   */
  private transformDeleteEmbed(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    if (op1.position <= op2.position) {
      return op1;
    } else {
      return {
        ...op1,
        position: op1.position + 1,
      };
    }
  }

  /**
   * Transform RETAIN operations (simplified - RETAIN operations maintain position)
   */
  private transformRetainInsert(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    return op1;
  }

  private transformRetainDelete(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    return op1;
  }

  private transformRetainRetain(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    return op1;
  }

  private transformRetainFormat(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    return op1;
  }

  private transformRetainEmbed(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    return op1;
  }

  /**
   * Transform FORMAT operations against other operations
   */
  private transformFormatInsert(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    if (op1.position < op2.position) {
      return op1;
    } else {
      return {
        ...op1,
        position: op1.position + (op2.length || 0),
      };
    }
  }

  private transformFormatDelete(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    if (op1.position + op1.length <= op2.position) {
      return op1;
    } else if (op1.position >= op2.position + op2.length) {
      return {
        ...op1,
        position: op1.position - op2.length,
      };
    } else {
      // Format range overlaps with deletion - adjust
      const newStart = Math.max(op1.position, op2.position);
      const newEnd = Math.min(op1.position + op1.length, op2.position);
      return {
        ...op1,
        position: newStart,
        length: Math.max(0, newEnd - newStart),
      };
    }
  }

  private transformFormatRetain(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    return op1;
  }

  private transformFormatFormat(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    // Merge overlapping format operations
    if (this.rangesOverlap(op1, op2)) {
      return {
        ...op1,
        attributes: { ...op1.attributes, ...op2.attributes },
      };
    }
    return op1;
  }

  private transformFormatEmbed(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    if (op1.position < op2.position) {
      return op1;
    } else {
      return {
        ...op1,
        position: op1.position + 1,
      };
    }
  }

  /**
   * Transform EMBED operations against other operations
   */
  private transformEmbedInsert(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    if (op1.position < op2.position) {
      return op1;
    } else {
      return {
        ...op1,
        position: op1.position + (op2.length || 0),
      };
    }
  }

  private transformEmbedDelete(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    if (op1.position < op2.position) {
      return op1;
    } else if (op1.position < op2.position + op2.length) {
      // Embed position is within deleted range - move to deletion point
      return {
        ...op1,
        position: op2.position,
      };
    } else {
      return {
        ...op1,
        position: op1.position - op2.length,
      };
    }
  }

  private transformEmbedRetain(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    return op1;
  }

  private transformEmbedFormat(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    return op1;
  }

  private transformEmbedEmbed(
    op1: Operation,
    op2: Operation,
    doc: Y.Doc,
  ): Operation {
    if (op1.position < op2.position) {
      return op1;
    } else {
      return {
        ...op1,
        position: op1.position + 1,
      };
    }
  }

  /**
   * Check if two operations conflict
   */
  private operationsConflict(op1: Operation, op2: Operation): boolean {
    // Operations conflict if they affect overlapping ranges
    if (
      op1.type === OperationType.RETAIN &&
      op2.type === OperationType.RETAIN
    ) {
      return false; // RETAIN operations don't conflict
    }

    return this.rangesOverlap(op1, op2);
  }

  /**
   * Check if two operations have overlapping ranges
   */
  private rangesOverlap(op1: Operation, op2: Operation): boolean {
    const range1Start = op1.position;
    const range1End = op1.position + (op1.length || 0);
    const range2Start = op2.position;
    const range2End = op2.position + (op2.length || 0);

    return !(range1End <= range2Start || range2End <= range1Start);
  }

  /**
   * Calculate overlap between two DELETE operations
   */
  private calculateDeleteOverlap(
    op1: Operation,
    op2: Operation,
  ): { start: number; length: number } {
    const start1 = op1.position;
    const end1 = op1.position + op1.length;
    const start2 = op2.position;
    const end2 = op2.position + op2.length;

    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);

    return {
      start: overlapStart,
      length: Math.max(0, overlapEnd - overlapStart),
    };
  }

  /**
   * Apply an operation to a Y.js document
   */
  private async applyOperationToDocument(
    operation: Operation,
    document: Y.Doc,
  ): Promise<void> {
    try {
      const text = document.getText('content');

      switch (operation.type) {
        case OperationType.INSERT:
          if (operation.content) {
            text.insert(
              operation.position,
              operation.content,
              operation.attributes,
            );
          }
          break;

        case OperationType.DELETE:
          text.delete(operation.position, operation.length);
          break;

        case OperationType.FORMAT:
          if (operation.attributes) {
            text.format(
              operation.position,
              operation.length,
              operation.attributes,
            );
          }
          break;

        case OperationType.EMBED:
          if (operation.content) {
            text.insertEmbed(
              operation.position,
              operation.content,
              operation.attributes,
            );
          }
          break;

        case OperationType.RETAIN:
          // RETAIN operations don't change the document
          break;

        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }
    } catch (error) {
      throw new CollaborationError('Failed to apply operation to document', {
        code: CollaborationErrorCode.INVALID_OPERATION,
        operationId: operation.id,
        context: error,
      });
    }
  }

  /**
   * Generate cache key for operation transformation
   */
  private generateCacheKey(
    operation: Operation,
    appliedOperations: Operation[],
  ): string {
    const appliedOpsHash = appliedOperations
      .map((op) => `${op.id}:${op.type}:${op.position}:${op.length}`)
      .join(',');

    return `${operation.id}:${operation.type}:${operation.position}:${operation.length}|${appliedOpsHash}`;
  }

  /**
   * Add operation to history for debugging and analysis
   */
  private addToHistory(documentId: string, operation: Operation): void {
    if (!this.operationHistory.has(documentId)) {
      this.operationHistory.set(documentId, []);
    }

    const history = this.operationHistory.get(documentId)!;
    history.push(operation);

    // Keep only recent operations to prevent memory leaks
    if (history.length > 1000) {
      history.splice(0, 500); // Remove oldest 500 operations
    }
  }

  /**
   * Get operation history for a document
   */
  public getOperationHistory(documentId: string): Operation[] {
    return this.operationHistory.get(documentId) || [];
  }

  /**
   * Get conflict resolution details
   */
  public getConflictResolution(
    conflictId: string,
  ): ConflictResolution | undefined {
    return this.conflictResolutions.get(conflictId);
  }

  /**
   * Clear caches and history for a document
   */
  public clearDocument(documentId: string): void {
    this.operationHistory.delete(documentId);

    // Clear related cache entries
    for (const [key] of this.transformationCache) {
      if (key.includes(documentId)) {
        this.transformationCache.delete(key);
      }
    }
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    cacheSize: number;
    historySize: number;
    conflictResolutions: number;
  } {
    let totalHistorySize = 0;
    for (const history of this.operationHistory.values()) {
      totalHistorySize += history.length;
    }

    return {
      cacheSize: this.transformationCache.size,
      historySize: totalHistorySize,
      conflictResolutions: this.conflictResolutions.size,
    };
  }
}

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebsocketProvider } from 'y-websocket';
import { createClient } from '@supabase/supabase-js';

interface DocumentInfo {
  doc: Y.Doc;
  persistence: IndexeddbPersistence;
  provider: WebsocketProvider;
  userId: string;
  lastAccessed: number;
}

interface ServiceResult {
  success: boolean;
  error?: string;
  [key: string]: any;
}

export class YjsDocumentService {
  private documents: Map<string, DocumentInfo> = new Map();
  private maxDocuments: number = 50;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private supabase;
  private rateLimitMap: Map<string, number[]> = new Map();
  private readonly MAX_OPERATIONS_PER_MINUTE = 200;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Start cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupOldDocuments();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Initialize a Y.js document for collaborative editing
   */
  async initializeDocument(
    documentId: string,
    userId: string,
  ): Promise<ServiceResult> {
    try {
      // Check if document already exists
      if (this.documents.has(documentId)) {
        return {
          success: false,
          error: `Document ${documentId} is already initialized`,
        };
      }

      // Rate limiting check
      if (!this.checkRateLimit(userId)) {
        return {
          success: false,
          error: 'Rate limit exceeded',
        };
      }

      // Create new Y.js document
      const ydoc = new Y.Doc();

      // Set up IndexedDB persistence
      const persistence = new IndexeddbPersistence(documentId, ydoc);

      // Set up WebSocket provider for real-time collaboration
      const wsProvider = new WebsocketProvider(
        process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001',
        documentId,
        ydoc,
      );

      // Set up event listeners
      this.setupDocumentEventListeners(ydoc, documentId, userId);

      // Store document info
      this.documents.set(documentId, {
        doc: ydoc,
        persistence,
        provider: wsProvider,
        userId,
        lastAccessed: Date.now(),
      });

      // Cleanup old documents if we exceed limit
      if (this.documents.size > this.maxDocuments) {
        this.cleanupOldDocuments();
      }

      return {
        success: true,
        documentId,
        message: 'Document initialized successfully',
      };
    } catch (error) {
      console.error('Document initialization error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during document initialization',
      };
    }
  }

  /**
   * Get a Y.js document by ID
   */
  getDocument(documentId: string): Y.Doc | null {
    const docInfo = this.documents.get(documentId);
    if (!docInfo) {
      return null;
    }

    // Update last accessed time
    docInfo.lastAccessed = Date.now();
    return docInfo.doc;
  }

  /**
   * Insert text at a specific position
   */
  async insertText(
    documentId: string,
    position: number,
    content: string,
  ): Promise<ServiceResult> {
    try {
      const doc = this.getDocument(documentId);
      if (!doc) {
        return {
          success: false,
          error: `Document ${documentId} not found. Initialize it first.`,
        };
      }

      if (position < 0) {
        return {
          success: false,
          error: 'Invalid position: position must be non-negative',
        };
      }

      const ytext = doc.getText('content');

      // Wrap in transaction for atomic operation
      doc.transact(() => {
        ytext.insert(position, content);
      });

      // Log operation to database
      await this.logOperation(documentId, 'insert_text', {
        position,
        content,
      });

      return {
        success: true,
        position,
        content,
      };
    } catch (error) {
      console.error('Text insertion error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during text insertion',
      };
    }
  }

  /**
   * Delete text from a specific position
   */
  async deleteText(
    documentId: string,
    position: number,
    length: number,
  ): Promise<ServiceResult> {
    try {
      const doc = this.getDocument(documentId);
      if (!doc) {
        return {
          success: false,
          error: `Document ${documentId} not found`,
        };
      }

      if (position < 0 || length <= 0) {
        return {
          success: false,
          error: 'Invalid position or length',
        };
      }

      const ytext = doc.getText('content');

      doc.transact(() => {
        ytext.delete(position, length);
      });

      await this.logOperation(documentId, 'delete_text', {
        position,
        length,
      });

      return {
        success: true,
        position,
        length,
      };
    } catch (error) {
      console.error('Text deletion error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during text deletion',
      };
    }
  }

  /**
   * Format text with attributes
   */
  async formatText(
    documentId: string,
    position: number,
    length: number,
    attributes: Record<string, any>,
  ): Promise<ServiceResult> {
    try {
      const doc = this.getDocument(documentId);
      if (!doc) {
        return {
          success: false,
          error: `Document ${documentId} not found`,
        };
      }

      const ytext = doc.getText('content');

      doc.transact(() => {
        ytext.format(position, length, attributes);
      });

      await this.logOperation(documentId, 'format_text', {
        position,
        length,
        attributes,
      });

      return {
        success: true,
        position,
        length,
        attributes,
      };
    } catch (error) {
      console.error('Text formatting error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during text formatting',
      };
    }
  }

  /**
   * Get text content from document
   */
  async getTextContent(documentId: string): Promise<ServiceResult> {
    try {
      const doc = this.getDocument(documentId);
      if (!doc) {
        return {
          success: false,
          error: `Document ${documentId} not found`,
        };
      }

      const ytext = doc.getText('content');
      const content = ytext.toString();

      return {
        success: true,
        content,
        length: content.length,
      };
    } catch (error) {
      console.error('Get text content error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error getting text content',
      };
    }
  }

  /**
   * Insert item into Y.Array
   */
  async insertArrayItem(
    documentId: string,
    arrayName: string,
    index: number,
    item: any,
  ): Promise<ServiceResult> {
    try {
      const doc = this.getDocument(documentId);
      if (!doc) {
        return {
          success: false,
          error: `Document ${documentId} not found`,
        };
      }

      if (index < 0) {
        return {
          success: false,
          error: 'Invalid index: index must be non-negative',
        };
      }

      const yarray = doc.getArray(arrayName);

      doc.transact(() => {
        yarray.insert(index, [item]);
      });

      await this.logOperation(documentId, 'insert_array_item', {
        arrayName,
        index,
        item,
      });

      return {
        success: true,
        arrayName,
        index,
        item,
      };
    } catch (error) {
      console.error('Array item insertion error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during array item insertion',
      };
    }
  }

  /**
   * Delete item from Y.Array
   */
  async deleteArrayItem(
    documentId: string,
    arrayName: string,
    index: number,
    deleteCount: number = 1,
  ): Promise<ServiceResult> {
    try {
      const doc = this.getDocument(documentId);
      if (!doc) {
        return {
          success: false,
          error: `Document ${documentId} not found`,
        };
      }

      const yarray = doc.getArray(arrayName);

      doc.transact(() => {
        yarray.delete(index, deleteCount);
      });

      await this.logOperation(documentId, 'delete_array_item', {
        arrayName,
        index,
        deleteCount,
      });

      return {
        success: true,
        arrayName,
        index,
        deleteCount,
      };
    } catch (error) {
      console.error('Array item deletion error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during array item deletion',
      };
    }
  }

  /**
   * Get array content
   */
  async getArrayContent(
    documentId: string,
    arrayName: string,
  ): Promise<ServiceResult> {
    try {
      const doc = this.getDocument(documentId);
      if (!doc) {
        return {
          success: false,
          error: `Document ${documentId} not found`,
        };
      }

      const yarray = doc.getArray(arrayName);
      const content = yarray.toArray();

      return {
        success: true,
        arrayName,
        content,
        length: content.length,
      };
    } catch (error) {
      console.error('Get array content error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error getting array content',
      };
    }
  }

  /**
   * Set value in Y.Map
   */
  async setMapValue(
    documentId: string,
    mapName: string,
    key: string,
    value: any,
  ): Promise<ServiceResult> {
    try {
      const doc = this.getDocument(documentId);
      if (!doc) {
        return {
          success: false,
          error: `Document ${documentId} not found`,
        };
      }

      const ymap = doc.getMap(mapName);

      doc.transact(() => {
        ymap.set(key, value);
      });

      await this.logOperation(documentId, 'set_map_value', {
        mapName,
        key,
        value,
      });

      return {
        success: true,
        mapName,
        key,
        value,
      };
    } catch (error) {
      console.error('Map value setting error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error setting map value',
      };
    }
  }

  /**
   * Get value from Y.Map
   */
  async getMapValue(
    documentId: string,
    mapName: string,
    key: string,
  ): Promise<ServiceResult> {
    try {
      const doc = this.getDocument(documentId);
      if (!doc) {
        return {
          success: false,
          error: `Document ${documentId} not found`,
        };
      }

      const ymap = doc.getMap(mapName);
      const value = ymap.get(key);

      return {
        success: true,
        mapName,
        key,
        value,
      };
    } catch (error) {
      console.error('Get map value error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error getting map value',
      };
    }
  }

  /**
   * Delete value from Y.Map
   */
  async deleteMapValue(
    documentId: string,
    mapName: string,
    key: string,
  ): Promise<ServiceResult> {
    try {
      const doc = this.getDocument(documentId);
      if (!doc) {
        return {
          success: false,
          error: `Document ${documentId} not found`,
        };
      }

      const ymap = doc.getMap(mapName);

      doc.transact(() => {
        ymap.delete(key);
      });

      await this.logOperation(documentId, 'delete_map_value', {
        mapName,
        key,
      });

      return {
        success: true,
        mapName,
        key,
      };
    } catch (error) {
      console.error('Map value deletion error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error deleting map value',
      };
    }
  }

  /**
   * Get all entries from Y.Map
   */
  async getMapEntries(
    documentId: string,
    mapName: string,
  ): Promise<ServiceResult> {
    try {
      const doc = this.getDocument(documentId);
      if (!doc) {
        return {
          success: false,
          error: `Document ${documentId} not found`,
        };
      }

      const ymap = doc.getMap(mapName);
      const entries = Array.from(ymap.entries());

      return {
        success: true,
        mapName,
        entries,
        count: entries.length,
      };
    } catch (error) {
      console.error('Get map entries error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error getting map entries',
      };
    }
  }

  /**
   * Subscribe to text changes
   */
  subscribeToTextChanges(
    documentId: string,
    callback: (event: any) => void,
  ): void {
    const doc = this.getDocument(documentId);
    if (!doc) {
      return;
    }

    const ytext = doc.getText('content');
    ytext.observe(callback);
  }

  /**
   * Unsubscribe from text changes
   */
  unsubscribeFromTextChanges(
    documentId: string,
    callback: (event: any) => void,
  ): void {
    const doc = this.getDocument(documentId);
    if (!doc) {
      return;
    }

    const ytext = doc.getText('content');
    ytext.unobserve(callback);
  }

  /**
   * Subscribe to array changes
   */
  subscribeToArrayChanges(
    documentId: string,
    arrayName: string,
    callback: (event: any) => void,
  ): void {
    const doc = this.getDocument(documentId);
    if (!doc) {
      return;
    }

    const yarray = doc.getArray(arrayName);
    yarray.observe(callback);
  }

  /**
   * Subscribe to map changes
   */
  subscribeToMapChanges(
    documentId: string,
    mapName: string,
    callback: (event: any) => void,
  ): void {
    const doc = this.getDocument(documentId);
    if (!doc) {
      return;
    }

    const ymap = doc.getMap(mapName);
    ymap.observe(callback);
  }

  /**
   * Sync document to database
   */
  async syncToDatabase(documentId: string): Promise<ServiceResult> {
    try {
      const doc = this.getDocument(documentId);
      if (!doc) {
        return {
          success: false,
          error: `Document ${documentId} not found`,
        };
      }

      // Get document state
      const ytext = doc.getText('content');
      const content = ytext.toString();

      // Update database
      const { error } = await this.supabase
        .from('collaboration_documents')
        .update({
          content: { text: content },
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (error) {
        throw error;
      }

      return {
        success: true,
        documentId,
        syncedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Database sync error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during database sync',
      };
    }
  }

  /**
   * Load document from database
   */
  async loadFromDatabase(documentId: string): Promise<ServiceResult> {
    try {
      const { data, error } = await this.supabase
        .from('collaboration_documents')
        .select('content')
        .eq('id', documentId)
        .single();

      if (error) {
        throw error;
      }

      const content = data?.content ? JSON.parse(data.content) : null;

      return {
        success: true,
        documentId,
        content,
      };
    } catch (error) {
      console.error('Database load error:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during database load',
      };
    }
  }

  /**
   * Get document version
   */
  getDocumentVersion(documentId: string): number {
    const docInfo = this.documents.get(documentId);
    return docInfo?.doc.guid ? parseInt(docInfo.doc.guid.slice(-8), 16) : 0;
  }

  /**
   * Destroy a specific document
   */
  destroyDocument(documentId: string): void {
    const docInfo = this.documents.get(documentId);
    if (docInfo) {
      docInfo.doc.destroy();
      docInfo.persistence.destroy();
      docInfo.provider.destroy();
      this.documents.delete(documentId);
    }
  }

  /**
   * Destroy all documents and cleanup
   */
  destroy(): void {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Destroy all documents
    this.documents.forEach((docInfo, documentId) => {
      this.destroyDocument(documentId);
    });

    this.documents.clear();
    this.rateLimitMap.clear();
  }

  // Private methods

  private setupDocumentEventListeners(
    doc: Y.Doc,
    documentId: string,
    userId: string,
  ): void {
    doc.on('update', (update: Uint8Array, origin: any) => {
      // Log update to database for persistence and conflict resolution
      this.logOperation(documentId, 'yjs_update', {
        update: Array.from(update),
        origin: origin?.toString() || 'unknown',
        userId,
      });
    });
  }

  private async logOperation(
    documentId: string,
    operationType: string,
    operationData: any,
  ): Promise<void> {
    try {
      await this.supabase.from('document_operations').insert({
        document_id: documentId,
        user_id: operationData.userId || 'system',
        operation_type: operationType,
        operation_data: operationData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Operation logging error:', error);
      // Don't fail the main operation if logging fails
    }
  }

  private cleanupOldDocuments(): void {
    if (this.documents.size <= this.maxDocuments) {
      return;
    }

    // Sort documents by last accessed time
    const sortedDocs = Array.from(this.documents.entries()).sort(
      ([, a], [, b]) => a.lastAccessed - b.lastAccessed,
    );

    // Remove oldest documents until we're under the limit
    const toRemove = this.documents.size - this.maxDocuments;
    for (let i = 0; i < toRemove; i++) {
      const [documentId] = sortedDocs[i];
      this.destroyDocument(documentId);
    }
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    if (!this.rateLimitMap.has(userId)) {
      this.rateLimitMap.set(userId, []);
    }

    const timestamps = this.rateLimitMap.get(userId)!;

    // Remove old timestamps
    while (timestamps.length > 0 && timestamps[0] < now - windowMs) {
      timestamps.shift();
    }

    // Check if under limit
    if (timestamps.length >= this.MAX_OPERATIONS_PER_MINUTE) {
      return false;
    }

    // Add current timestamp
    timestamps.push(now);
    return true;
  }
}

# TEAM D - ROUND 1: WS-306 - Forms System Section Overview
## 2025-01-25 - 08:00 AM

**YOUR MISSION:** Build mobile-first form creation PWA with offline form building, AI-powered mobile form optimization, and cross-device form synchronization
**FEATURE ID:** WS-306 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about mobile form builder UX, offline form creation, and wedding vendor mobile workflows

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **MOBILE FORM BUILDER PWA VERIFICATION:**
```bash
open -a "Google Chrome" --args --allow-running-insecure-content http://localhost:3000/forms/mobile-builder
# MUST show: Install prompt appears, form builder works offline on mobile
```

2. **OFFLINE FORM CREATION TEST:**
```bash
# Test offline form building capability
# Disable network, create form on mobile, re-enable network
# MUST show: Form created offline syncs when connectivity restored
```

3. **MOBILE FORM OPTIMIZATION VALIDATION:**
```bash
npm run lighthouse -- --url="http://localhost:3000/forms/mobile-builder" --form-factor=mobile
# MUST show: Mobile performance >90, touch targets ≥48px
```

## 🧠 SEQUENTIAL THINKING FOR MOBILE FORM BUILDING

```typescript
// Mobile form builder complexity analysis
mcp__sequential-thinking__sequentialthinking({
  thought: "Mobile form builder for wedding vendors needs: Touch-optimized drag-and-drop for field placement, offline form creation capability for venues without WiFi, AI-powered mobile form optimization, simplified mobile editing interface, and gesture-based form field manipulation for on-site form building.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Wedding vendor mobile scenarios: Photographers creating timeline forms at engagement shoots, venues building guest info forms during site visits, coordinators updating forms during vendor meetings without reliable internet, florists creating seasonal forms while traveling to markets, all need offline-capable form building.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Mobile UX optimization: Bottom navigation for thumb reach, collapsible panels for small screens, touch-friendly field manipulation, voice input for field labels, simplified property panels, and mobile-specific field types (camera upload, location picker, signature capture).",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Technical architecture: Progressive Web App with offline caching, IndexedDB for local form storage, service worker for background sync, gesture recognition library, AI API integration for mobile optimization, and cross-device synchronization with conflict resolution.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 📚 ENHANCED SERENA + REF SETUP

### A. SERENA PWA PATTERN DISCOVERY
```typescript
// MANDATORY FIRST - Activate WedSync project context
await mcp__serena__activate_project("wedsync");

// Find existing PWA and mobile optimization patterns
await mcp__serena__search_for_pattern("pwa mobile optimization service worker");
await mcp__serena__find_symbol("PWA ServiceWorker mobile", "$WS_ROOT/wedsync/src/lib/pwa/");
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/components/mobile/");

// Study existing mobile form components
await mcp__serena__find_referencing_symbols("mobile touch gesture form");
```

### B. MOBILE PWA DOCUMENTATION LOADING
```typescript
// Load PWA and mobile form building documentation
// Use Ref MCP to search for:
# - "PWA offline form builder patterns"
# - "Mobile drag-drop touch optimization"
# - "React mobile form builder libraries"

// Load AI mobile optimization patterns
// Use Ref MCP to search for:
# - "AI mobile UX optimization strategies"
# - "Mobile form field arrangement algorithms"
# - "Touch gesture recognition libraries"
```

## 🎯 SPECIFIC DELIVERABLES

### ROUND 1 DELIVERABLES (WITH EVIDENCE):
- [ ] **Mobile Form Builder PWA** (`$WS_ROOT/wedsync/src/lib/pwa/mobile-form-builder.ts`)
  - Installable PWA with offline form building capability
  - Touch-optimized drag-and-drop interface
  - Offline storage and sync when connectivity restored
  - Evidence: PWA installs on mobile, forms can be built completely offline

- [ ] **Mobile Form Canvas** (`$WS_ROOT/wedsync/src/components/mobile/forms/mobile-form-canvas.tsx`)
  - Touch-friendly field placement and manipulation
  - Gesture-based field reordering and deletion
  - Mobile-optimized field property editing
  - Evidence: All form building actions work smoothly with touch gestures

- [ ] **AI Mobile Form Optimizer** (`$WS_ROOT/wedsync/src/lib/ai/mobile-form-optimizer.ts`)
  - AI-powered mobile form layout optimization
  - Smart field ordering for mobile completion rates
  - Mobile-specific field type recommendations
  - Evidence: AI suggests optimal mobile form layouts based on field types

- [ ] **Offline Form Storage System** (`$WS_ROOT/wedsync/src/lib/pwa/offline-form-storage.ts`)
  - IndexedDB for local form creation and editing
  - Background sync queue for offline changes
  - Conflict resolution for concurrent mobile/web edits
  - Evidence: Forms created offline sync correctly when back online

- [ ] **Mobile Form Preview** (`$WS_ROOT/wedsync/src/components/mobile/forms/mobile-form-preview.tsx`)
  - Real-time mobile form preview as couples see it
  - Touch interaction testing within preview
  - Mobile-responsive preview modes
  - Evidence: Preview accurately shows mobile form experience

## 📱 MOBILE PWA FORM BUILDER IMPLEMENTATION

### Core Mobile Form Builder PWA
```typescript
// File: $WS_ROOT/wedsync/src/lib/pwa/mobile-form-builder.ts

export class MobileFormBuilderPWA {
  private db: IDBDatabase | null = null;
  private syncQueue: OfflineFormOperation[] = [];
  private gestureRecognizer: GestureRecognizer;

  async initialize() {
    // Initialize IndexedDB for offline storage
    this.db = await this.openFormBuilderDatabase();
    
    // Register service worker
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/sw-form-builder.js');
    }

    // Initialize gesture recognition
    this.gestureRecognizer = new GestureRecognizer({
      longPress: 500,
      swipeThreshold: 50,
      pinchThreshold: 0.2
    });

    // Setup background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('form-builder-sync');
    }

    // Load offline forms
    await this.preloadCriticalFormData();
  }

  private async openFormBuilderDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WedSyncFormBuilder', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Forms store
        const formsStore = db.createObjectStore('forms', { keyPath: 'id' });
        formsStore.createIndex('supplier_id', 'supplier_id');
        formsStore.createIndex('created_at', 'created_at');
        formsStore.createIndex('offline_created', 'offline_created');

        // Form fields store
        const fieldsStore = db.createObjectStore('form_fields', { keyPath: 'id' });
        fieldsStore.createIndex('form_id', 'form_id');
        fieldsStore.createIndex('position', 'position');

        // Offline operations queue
        const operationsStore = db.createObjectStore('offline_operations', { 
          keyPath: 'id',
          autoIncrement: true 
        });
        operationsStore.createIndex('timestamp', 'timestamp');
        operationsStore.createIndex('synced', 'synced');

        // Mobile optimizations cache
        const optimizationsStore = db.createObjectStore('mobile_optimizations', { keyPath: 'form_id' });
        optimizationsStore.createIndex('created_at', 'created_at');
      };
    });
  }

  async createFormOffline(formData: {
    title: string;
    description?: string;
    fields: FormField[];
    settings?: Record<string, any>;
  }): Promise<string> {
    if (!this.db) await this.initialize();

    const formId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const form = {
      id: formId,
      ...formData,
      offline_created: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'pending'
    };

    // Store form locally
    await this.storeFormLocally(form);

    // Queue sync operation
    const syncOperation: OfflineFormOperation = {
      type: 'create_form',
      form_id: formId,
      data: form,
      timestamp: Date.now(),
      synced: false
    };

    await this.queueSyncOperation(syncOperation);

    return formId;
  }

  async updateFormOffline(formId: string, changes: Partial<FormData>): Promise<void> {
    if (!this.db) await this.initialize();

    const existingForm = await this.getFormFromStorage(formId);
    if (!existingForm) {
      throw new Error('Form not found');
    }

    const updatedForm = {
      ...existingForm,
      ...changes,
      updated_at: new Date().toISOString()
    };

    await this.storeFormLocally(updatedForm);

    // Queue sync operation
    const syncOperation: OfflineFormOperation = {
      type: 'update_form',
      form_id: formId,
      data: changes,
      timestamp: Date.now(),
      synced: false
    };

    await this.queueSyncOperation(syncOperation);
  }

  private async storeFormLocally(form: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['forms'], 'readwrite');
      const store = transaction.objectStore('forms');
      const request = store.put(form);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async queueSyncOperation(operation: OfflineFormOperation): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_operations'], 'readwrite');
      const store = transaction.objectStore('offline_operations');
      const request = store.add(operation);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async syncWhenOnline(): Promise<{ success: number; failed: number }> {
    if (!navigator.onLine) return { success: 0, failed: 0 };

    const pendingOperations = await this.getPendingSyncOperations();
    let success = 0;
    let failed = 0;

    for (const operation of pendingOperations) {
      try {
        await this.syncOperation(operation);
        await this.markOperationSynced(operation.id!);
        success++;
      } catch (error) {
        console.error('Sync operation failed:', error);
        failed++;
      }
    }

    return { success, failed };
  }

  private async syncOperation(operation: OfflineFormOperation): Promise<void> {
    const endpoint = operation.type === 'create_form' 
      ? '/api/forms'
      : `/api/forms/${operation.form_id}`;
    
    const method = operation.type === 'create_form' ? 'POST' : 'PUT';

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAuthToken()}`
      },
      body: JSON.stringify(operation.data)
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }

    // Update local form with server ID if it was created
    if (operation.type === 'create_form') {
      const serverForm = await response.json();
      await this.updateLocalFormId(operation.form_id, serverForm.id);
    }
  }

  private async getPendingSyncOperations(): Promise<OfflineFormOperation[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline_operations'], 'readonly');
      const store = transaction.objectStore('offline_operations');
      const index = store.index('synced');
      const request = index.getAll(false);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async optimizeFormForMobile(formId: string, fields: FormField[]): Promise<{
    optimized_fields: FormField[];
    recommendations: string[];
    mobile_score: number;
  }> {
    try {
      const response = await fetch('/api/ai/optimize-mobile-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          form_id: formId,
          fields: fields,
          device_info: {
            screen_width: window.screen.width,
            screen_height: window.screen.height,
            pixel_ratio: window.devicePixelRatio,
            touch_support: 'ontouchstart' in window
          }
        })
      });

      if (!response.ok) {
        throw new Error('Mobile optimization failed');
      }

      const optimization = await response.json();

      // Cache optimization locally
      await this.cacheOptimization(formId, optimization);

      return optimization;

    } catch (error) {
      console.error('Mobile optimization error:', error);
      
      // Fallback to basic mobile optimization
      return this.basicMobileOptimization(fields);
    }
  }

  private basicMobileOptimization(fields: FormField[]): {
    optimized_fields: FormField[];
    recommendations: string[];
    mobile_score: number;
  } {
    const optimizedFields = [...fields];
    const recommendations: string[] = [];
    let score = 100;

    // Reorder fields for mobile-first completion
    const priorityOrder = ['wedding_date', 'client_email', 'client_phone', 'venue_address'];
    optimizedFields.sort((a, b) => {
      const aPriority = priorityOrder.indexOf(a.type);
      const bPriority = priorityOrder.indexOf(b.type);
      
      if (aPriority !== -1 && bPriority !== -1) {
        return aPriority - bPriority;
      }
      if (aPriority !== -1) return -1;
      if (bPriority !== -1) return 1;
      return 0;
    });

    // Check for mobile-unfriendly patterns
    if (fields.length > 10) {
      recommendations.push('Consider breaking long forms into multiple steps for mobile users');
      score -= 10;
    }

    const textFields = fields.filter(f => f.type === 'textarea');
    if (textFields.length > 2) {
      recommendations.push('Multiple text areas can be challenging on mobile keyboards');
      score -= 5;
    }

    return {
      optimized_fields: optimizedFields,
      recommendations,
      mobile_score: Math.max(score, 50)
    };
  }

  private async cacheOptimization(formId: string, optimization: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mobile_optimizations'], 'readwrite');
      const store = transaction.objectStore('mobile_optimizations');
      const request = store.put({
        form_id: formId,
        optimization,
        created_at: new Date().toISOString()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getAuthToken(): Promise<string> {
    // Get auth token from session or storage
    const session = await fetch('/api/auth/session').then(r => r.json());
    return session.access_token;
  }

  private async preloadCriticalFormData(): Promise<void> {
    try {
      // Load form templates and common fields for offline use
      const response = await fetch('/api/forms/templates?mobile=true');
      const templates = await response.json();
      
      // Store templates locally
      for (const template of templates) {
        await this.storeFormLocally({
          ...template,
          is_template: true,
          offline_available: true
        });
      }
    } catch (error) {
      console.log('Failed to preload form data:', error);
    }
  }
}

interface OfflineFormOperation {
  id?: number;
  type: 'create_form' | 'update_form' | 'delete_form';
  form_id: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
  validation?: Record<string, any>;
  position: number;
}

class GestureRecognizer {
  constructor(private config: {
    longPress: number;
    swipeThreshold: number;
    pinchThreshold: number;
  }) {}

  // Gesture recognition implementation would go here
  // This is a simplified version for the prompt
}
```

### Mobile Form Canvas Component
```typescript
// File: $WS_ROOT/wedsync/src/components/mobile/forms/mobile-form-canvas.tsx

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  GripVertical, 
  X, 
  Settings,
  Plus,
  Smartphone,
  Tablet,
  Eye,
  Wand2
} from 'lucide-react';

interface MobileFormCanvasProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onFieldSelect: (fieldId: string | null) => void;
  onFieldUpdate: (fieldId: string, updates: Partial<FormField>) => void;
  onFieldDelete: (fieldId: string) => void;
  onFieldAdd: () => void;
  onAIOptimize: () => void;
}

export function MobileFormCanvas({ 
  fields, 
  selectedFieldId, 
  onFieldSelect,
  onFieldUpdate,
  onFieldDelete,
  onFieldAdd,
  onAIOptimize
}: MobileFormCanvasProps) {
  const [previewMode, setPreviewMode] = useState<'phone' | 'tablet'>('phone');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; fieldId?: string }>({ x: 0, y: 0 });

  const handleTouchStart = useCallback((e: React.TouchEvent, fieldId: string) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      fieldId
    };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current.fieldId) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // Start drag if moved more than threshold
    if (deltaX > 10 || deltaY > 10) {
      setIsDragging(true);
      
      // Find drop target
      const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
      const fieldElement = elements.find(el => el.hasAttribute('data-field-index'));
      
      if (fieldElement) {
        const index = parseInt(fieldElement.getAttribute('data-field-index') || '0');
        setDragOverIndex(index);
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const fieldId = touchStartRef.current.fieldId;
    
    if (!isDragging && fieldId) {
      // Simple tap - select field
      onFieldSelect(fieldId);
    } else if (isDragging && fieldId && dragOverIndex !== null) {
      // Reorder fields
      const currentIndex = fields.findIndex(f => f.id === fieldId);
      if (currentIndex !== -1 && currentIndex !== dragOverIndex) {
        reorderFields(currentIndex, dragOverIndex);
      }
    }

    setIsDragging(false);
    setDragOverIndex(null);
    touchStartRef.current = { x: 0, y: 0 };
  }, [isDragging, dragOverIndex, fields, onFieldSelect]);

  const reorderFields = (fromIndex: number, toIndex: number) => {
    const reorderedFields = [...fields];
    const [movedField] = reorderedFields.splice(fromIndex, 1);
    reorderedFields.splice(toIndex, 0, movedField);

    // Update positions
    reorderedFields.forEach((field, index) => {
      if (field.position !== index) {
        onFieldUpdate(field.id, { position: index });
      }
    });
  };

  const getPreviewSize = () => {
    if (previewMode === 'phone') {
      return { width: '375px', minHeight: '667px' };
    } else {
      return { width: '768px', minHeight: '1024px' };
    }
  };

  const sortedFields = [...fields].sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Mobile Canvas Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold">Mobile Form Builder</h3>
          <Badge variant="outline" className="text-xs">
            {fields.length} fields
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPreviewMode(previewMode === 'phone' ? 'tablet' : 'phone')}
          >
            {previewMode === 'phone' ? (
              <Smartphone className="h-4 w-4" />
            ) : (
              <Tablet className="h-4 w-4" />
            )}
          </Button>

          <Button size="sm" variant="outline" onClick={onAIOptimize}>
            <Wand2 className="h-4 w-4 mr-1" />
            AI Optimize
          </Button>

          <Button size="sm" onClick={onFieldAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add Field
          </Button>
        </div>
      </div>

      {/* Mobile Form Canvas */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="flex justify-center">
          <div 
            ref={canvasRef}
            className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
            style={getPreviewSize()}
          >
            {/* Mobile Form Header */}
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4">
              <h2 className="text-lg font-semibold">Wedding Form</h2>
              <p className="text-sm opacity-90">Complete your wedding details</p>
            </div>

            {/* Form Fields */}
            <div className="p-4 space-y-4">
              {sortedFields.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Smartphone className="h-16 w-16 mx-auto" />
                  </div>
                  <p className="text-gray-500">
                    Add fields to start building your mobile form
                  </p>
                  <Button onClick={onFieldAdd} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Field
                  </Button>
                </div>
              ) : (
                sortedFields.map((field, index) => (
                  <MobileFormField
                    key={field.id}
                    field={field}
                    index={index}
                    isSelected={selectedFieldId === field.id}
                    isDragOver={dragOverIndex === index}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onSelect={() => onFieldSelect(field.id)}
                    onDelete={() => onFieldDelete(field.id)}
                  />
                ))
              )}
            </div>

            {/* Mobile Form Footer */}
            <div className="p-4 bg-gray-50 border-t">
              <Button className="w-full h-12 text-lg">
                Submit Wedding Details
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Optimization Tips */}
      <div className="p-4 bg-white border-t">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Mobile Optimization Tips</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Keep forms short (5-7 fields max) for better mobile completion</li>
            <li>• Place important fields (wedding date, contact) at the top</li>
            <li>• Use large touch targets (48px minimum) for easy tapping</li>
            <li>• Consider using mobile-specific field types (camera, location)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

interface MobileFormFieldProps {
  field: FormField;
  index: number;
  isSelected: boolean;
  isDragOver: boolean;
  onTouchStart: (e: React.TouchEvent, fieldId: string) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onSelect: () => void;
  onDelete: () => void;
}

function MobileFormField({
  field,
  index,
  isSelected,
  isDragOver,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onSelect,
  onDelete
}: MobileFormFieldProps) {
  const isWeddingField = ['wedding_date', 'venue_address', 'guest_count'].includes(field.type);

  return (
    <div
      data-field-index={index}
      className={`
        relative bg-white border-2 rounded-lg p-3 transition-all
        ${isSelected ? 'border-blue-400 shadow-md' : 'border-gray-200'}
        ${isDragOver ? 'border-green-400 bg-green-50' : ''}
      `}
      onTouchStart={(e) => onTouchStart(e, field.id)}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={onSelect}
    >
      {/* Field Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <GripVertical className="h-4 w-4 text-gray-400" />
          <span className="font-medium text-gray-900">
            {field.label}
          </span>
          {field.required && (
            <Badge variant="destructive" className="text-xs px-1">
              Required
            </Badge>
          )}
          {isWeddingField && (
            <Badge variant="secondary" className="text-xs bg-pink-100 text-pink-700">
              Wedding
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="h-8 w-8 p-0"
          >
            <Settings className="h-3 w-3" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Field Preview */}
      <div className="space-y-2">
        {renderMobileFieldPreview(field)}
      </div>

      {/* Field Metadata */}
      <div className="mt-2 text-xs text-gray-500">
        {field.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        {field.options && ` • ${field.options.length} options`}
      </div>
    </div>
  );
}

function renderMobileFieldPreview(field: FormField) {
  const baseInputClass = "w-full p-3 border border-gray-300 rounded-lg text-base"; // Larger text for mobile

  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
      return (
        <input
          type={field.type}
          placeholder={`Enter ${field.label.toLowerCase()}`}
          className={baseInputClass}
          readOnly
        />
      );
      
    case 'textarea':
      return (
        <textarea
          placeholder={`Enter ${field.label.toLowerCase()}`}
          className={`${baseInputClass} min-h-20`}
          readOnly
        />
      );
      
    case 'select':
      return (
        <select className={baseInputClass} disabled>
          <option>Choose {field.label.toLowerCase()}</option>
          {field.options?.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
      
    case 'date':
    case 'wedding_date':
      return (
        <input
          type="date"
          className={baseInputClass}
          readOnly
        />
      );
      
    case 'number':
    case 'guest_count':
      return (
        <input
          type="number"
          placeholder={`Enter ${field.label.toLowerCase()}`}
          className={baseInputClass}
          readOnly
        />
      );
      
    default:
      return (
        <input
          type="text"
          placeholder={`Enter ${field.label.toLowerCase()}`}
          className={baseInputClass}
          readOnly
        />
      );
  }
}
```

## 🧪 REQUIRED TESTING

### Mobile PWA Tests
```typescript
// File: $WS_ROOT/wedsync/src/__tests__/pwa/mobile-form-builder.test.ts

describe('Mobile Form Builder PWA', () => {
  let formBuilder: MobileFormBuilderPWA;
  
  beforeEach(async () => {
    formBuilder = new MobileFormBuilderPWA();
    await formBuilder.initialize();
  });

  it('should create forms offline', async () => {
    // Simulate offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const formData = {
      title: 'Offline Wedding Form',
      fields: [
        {
          id: '1',
          type: 'wedding_date',
          label: 'Wedding Date',
          required: true,
          position: 0
        }
      ]
    };

    const formId = await formBuilder.createFormOffline(formData);
    expect(formId).toMatch(/^offline_/);
  });

  it('should sync offline forms when back online', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    
    // Create form offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    await formBuilder.createFormOffline({
      title: 'Test Form',
      fields: []
    });

    // Go online and sync
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    const syncResult = await formBuilder.syncWhenOnline();
    
    expect(syncResult.success).toBe(1);
    expect(fetchSpy).toHaveBeenCalledWith('/api/forms', expect.any(Object));
  });

  it('should optimize forms for mobile', async () => {
    const fields = [
      { id: '1', type: 'text', label: 'Long Text Field', required: false, position: 0 },
      { id: '2', type: 'wedding_date', label: 'Wedding Date', required: true, position: 1 },
      { id: '3', type: 'email', label: 'Email', required: true, position: 2 }
    ];

    const optimization = await formBuilder.optimizeFormForMobile('test-form', fields);
    
    expect(optimization.optimized_fields).toBeDefined();
    expect(optimization.mobile_score).toBeGreaterThan(0);
    expect(optimization.recommendations).toBeInstanceOf(Array);
  });
});
```

### Mobile Touch Interface Tests
```typescript
// File: $WS_ROOT/wedsync/src/__tests__/components/mobile-form-canvas.test.tsx

describe('MobileFormCanvas', () => {
  it('should handle touch gestures for field reordering', async () => {
    const mockFields = [
      { id: '1', type: 'text', label: 'Field 1', position: 0 },
      { id: '2', type: 'email', label: 'Field 2', position: 1 }
    ];

    const onFieldUpdate = jest.fn();
    const { container } = render(
      <MobileFormCanvas 
        fields={mockFields}
        selectedFieldId={null}
        onFieldSelect={jest.fn()}
        onFieldUpdate={onFieldUpdate}
        onFieldDelete={jest.fn()}
        onFieldAdd={jest.fn()}
        onAIOptimize={jest.fn()}
      />
    );

    // Simulate touch drag
    const firstField = container.querySelector('[data-field-index="0"]');
    
    fireEvent.touchStart(firstField!, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    
    fireEvent.touchMove(firstField!, {
      touches: [{ clientX: 100, clientY: 200 }]
    });
    
    fireEvent.touchEnd(firstField!);

    // Verify field reordering was triggered
    expect(onFieldUpdate).toHaveBeenCalled();
  });
});
```

## 📊 MANDATORY: UPDATE PROJECT DASHBOARD AFTER COMPLETION

```json
{
  "id": "WS-306-forms-system-section-overview",
  "status": "completed",
  "completion": "100%",
  "completed_date": "2025-01-25",
  "testing_status": "needs-testing",
  "team": "Team D",
  "notes": "Mobile form builder PWA completed. Offline form creation, touch optimization, AI mobile optimization, cross-device sync."
}
```

---

**WedSync Mobile Form Builder - Create Beautiful Forms Anywhere! 📱✨💍**
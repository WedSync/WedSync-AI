# WS-288 SOLUTION ARCHITECTURE - TEAM B MISSION BRIEF
## Generated 2025-01-22 | Backend Architecture & Core Fields API

---

## 🎯 MISSION: Backend Architecture for Core Fields System & Database Design

You are **TEAM B - Backend API & Database Specialists** building the revolutionary Core Fields System backend architecture that enables seamless, secure, and scalable wedding data management with real-time synchronization across the platform.

### 🔧 YOUR SPECIALIZED FOCUS
**Core Fields Database**: Design and implement the revolutionary Core Fields schema
**API Architecture**: Build secure, fast APIs for Core Fields management
**Real-Time Infrastructure**: Implement WebSocket-based live data synchronization
**Security & RLS**: Enforce data access policies and audit trails

---

## 🎬 REAL WEDDING SCENARIO CONTEXT
*"When Emma and James update their guest count from 100 to 120 in WedMe, the Core Fields API instantly validates the change, triggers audit logging, updates the PostgreSQL database with Row Level Security, broadcasts the update via WebSocket to all connected suppliers, and logs the change for compliance. All of this happens in under 500ms with bank-level security."*

Your backend architecture powers the seamless data flow that revolutionizes wedding planning.

---

## 📋 COMPREHENSIVE DELIVERABLES

### 1. CORE FIELDS DATABASE ARCHITECTURE

#### A. Complete Core Fields Schema Implementation
```sql
-- Core Fields System - Revolutionary Wedding Data Management
-- Location: /supabase/migrations/058_core_fields_system.sql

-- Main Core Fields table (single source of truth for wedding data)
CREATE TABLE IF NOT EXISTS core_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  
  -- Couple Information (structured for easy querying)
  partner1_name VARCHAR(100) NOT NULL,
  partner1_email VARCHAR(255),
  partner1_phone VARCHAR(20),
  partner2_name VARCHAR(100) NOT NULL,
  partner2_email VARCHAR(255),
  partner2_phone VARCHAR(20),
  couple_address JSONB DEFAULT '{}',
  
  -- Wedding Details (core planning information)
  wedding_date DATE,
  ceremony_venue JSONB DEFAULT '{}', -- {name, address, contact_person, contact_phone, notes}
  reception_venue JSONB DEFAULT '{}',
  guest_count JSONB DEFAULT '{"adults": 0, "children": 0, "total": 0, "confirmed": 0, "pending": 0}',
  wedding_style TEXT[] DEFAULT '{}', -- ['rustic', 'modern', 'traditional']
  wedding_colors TEXT[] DEFAULT '{}', -- ['#FF6B6B', '#4ECDC4']
  
  -- Timeline Information
  ceremony_time TIME,
  reception_time TIME,
  key_moments JSONB DEFAULT '[]', -- [{name: string, time: string, description: string, vendor_involved: string[]}]
  
  -- Key People (wedding party and VIPs)
  wedding_party JSONB DEFAULT '[]', -- [{name, role, contact_info, responsibilities}]
  family_vips JSONB DEFAULT '[]', -- [{name, relationship, special_needs, contact_info}]
  
  -- Connected Vendors (suppliers with access to this data)
  connected_vendors JSONB DEFAULT '[]', -- [{supplier_id, supplier_name, access_fields[], connected_at, permissions}]
  
  -- Data sharing and permissions
  sharing_preferences JSONB DEFAULT '{"auto_share_basic": true, "require_approval": false}',
  field_permissions JSONB DEFAULT '{}', -- Which suppliers can see which fields
  
  -- Metadata and auditing
  version_number INTEGER DEFAULT 1,
  last_updated_by UUID REFERENCES auth.users(id),
  last_sync_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(couple_id),
  
  -- Ensure at least one partner name is provided
  CONSTRAINT valid_partner_names CHECK (
    partner1_name IS NOT NULL AND length(trim(partner1_name)) > 0
  ),
  
  -- Ensure wedding date is in the future (for new entries)
  CONSTRAINT valid_wedding_date CHECK (
    wedding_date IS NULL OR wedding_date >= CURRENT_DATE - INTERVAL '1 year'
  ),
  
  -- Guest count must be valid
  CONSTRAINT valid_guest_count CHECK (
    (guest_count->>'total')::integer >= 0 AND
    (guest_count->>'adults')::integer >= 0 AND
    (guest_count->>'children')::integer >= 0
  )
);

-- Enable Row Level Security (critical for data protection)
ALTER TABLE core_fields ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Couples can access their own core fields
CREATE POLICY "couples_own_core_fields" ON core_fields
  FOR ALL USING (
    couple_id = auth.uid()::UUID
  ) WITH CHECK (
    couple_id = auth.uid()::UUID
  );

-- RLS Policy: Connected suppliers can read permitted core fields
CREATE POLICY "suppliers_read_connected_core_fields" ON core_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM supplier_couple_connections scc
      WHERE scc.couple_id = core_fields.couple_id
      AND scc.supplier_id = auth.uid()::UUID
      AND scc.status = 'active'
      AND scc.permissions ? 'read_core_fields'
    )
  );

-- RLS Policy: Suppliers can update specific fields they have permission for
CREATE POLICY "suppliers_update_permitted_fields" ON core_fields
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM supplier_couple_connections scc
      WHERE scc.couple_id = core_fields.couple_id
      AND scc.supplier_id = auth.uid()::UUID
      AND scc.status = 'active'
      AND scc.permissions ? 'update_core_fields'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM supplier_couple_connections scc
      WHERE scc.couple_id = core_fields.couple_id
      AND scc.supplier_id = auth.uid()::UUID
      AND scc.status = 'active'
      AND scc.permissions ? 'update_core_fields'
    )
  );

-- Comprehensive audit table for all Core Fields changes
CREATE TABLE IF NOT EXISTS core_fields_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  core_field_id UUID REFERENCES core_fields(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  
  -- Change tracking
  changed_field VARCHAR(100) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  change_type VARCHAR(20) DEFAULT 'update', -- 'create', 'update', 'delete'
  
  -- Actor information
  changed_by UUID REFERENCES auth.users(id),
  changed_by_type VARCHAR(20) NOT NULL, -- 'couple', 'supplier', 'system'
  supplier_id UUID, -- If changed by supplier
  
  -- Context
  change_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  
  -- Metadata
  version_before INTEGER,
  version_after INTEGER,
  changed_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_core_fields_audit_couple_id (couple_id),
  INDEX idx_core_fields_audit_changed_at (changed_at),
  INDEX idx_core_fields_audit_changed_by (changed_by),
  INDEX idx_core_fields_audit_field (changed_field)
);

-- Field mapping configuration for auto-population
CREATE TABLE IF NOT EXISTS core_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  
  -- Mapping configuration
  form_field_name VARCHAR(100) NOT NULL,
  core_field_path VARCHAR(200) NOT NULL, -- e.g., 'wedding.date', 'partner1_email'
  transformation_rule JSONB DEFAULT '{}', -- For data format transformation
  auto_populate BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(form_id, form_field_name)
);

-- Supplier permissions for Core Fields access
CREATE TABLE IF NOT EXISTS core_fields_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Field-level permissions
  readable_fields TEXT[] DEFAULT '{}',
  writable_fields TEXT[] DEFAULT '{}',
  
  -- Access settings
  auto_sync_enabled BOOLEAN DEFAULT true,
  notification_preferences JSONB DEFAULT '{"updates": true, "changes": true}',
  
  -- Approval workflow
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'revoked'
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP,
  
  -- Metadata
  requested_at TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP,
  
  UNIQUE(couple_id, supplier_id)
);

-- Triggers for automatic audit logging
CREATE OR REPLACE FUNCTION log_core_fields_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log all field changes with detailed information
  IF TG_OP = 'UPDATE' THEN
    -- Compare old and new values for each field
    INSERT INTO core_fields_audit (
      core_field_id,
      couple_id,
      changed_field,
      old_value,
      new_value,
      changed_by,
      changed_by_type,
      version_before,
      version_after
    ) VALUES (
      NEW.id,
      NEW.couple_id,
      'bulk_update',
      row_to_json(OLD),
      row_to_json(NEW),
      NEW.last_updated_by,
      CASE 
        WHEN NEW.last_updated_by = NEW.couple_id THEN 'couple'
        ELSE 'supplier'
      END,
      OLD.version_number,
      NEW.version_number
    );
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to Core Fields table
CREATE TRIGGER core_fields_audit_trigger
  AFTER UPDATE ON core_fields
  FOR EACH ROW
  EXECUTE FUNCTION log_core_fields_changes();

-- Function to update version number on changes
CREATE OR REPLACE FUNCTION update_core_fields_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version_number = OLD.version_number + 1;
  NEW.updated_at = NOW();
  NEW.last_sync_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER core_fields_version_trigger
  BEFORE UPDATE ON core_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_core_fields_version();

-- Indexes for optimal performance
CREATE INDEX idx_core_fields_couple_id ON core_fields(couple_id);
CREATE INDEX idx_core_fields_wedding_date ON core_fields(wedding_date);
CREATE INDEX idx_core_fields_updated_at ON core_fields(updated_at);
CREATE INDEX idx_core_fields_connected_vendors ON core_fields USING gin(connected_vendors);
```

#### B. Core Fields Service Implementation
```typescript
// Service: CoreFieldsService.ts
// Location: /src/lib/core-fields/service.ts

import { createClient } from '@/lib/supabase/server';
import { CoreFields, CoreFieldsUpdate, AuditEntry } from './types';
import { validateCoreFields } from './validation';
import { broadcastCoreFieldsUpdate } from './realtime';

export class CoreFieldsService {
  private supabase = createClient();

  /**
   * Get complete Core Fields for a couple
   */
  async getCoreFields(coupleId: string): Promise<CoreFields | null> {
    const { data, error } = await this.supabase
      .from('core_fields')
      .select(`
        *,
        core_fields_permissions!core_fields_permissions_couple_id_fkey(
          supplier_id,
          readable_fields,
          writable_fields,
          status,
          auto_sync_enabled
        )
      `)
      .eq('couple_id', coupleId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No core fields exist yet, create default ones
        return await this.createDefaultCoreFields(coupleId);
      }
      throw error;
    }

    return this.transformToCoreFields(data);
  }

  /**
   * Update Core Fields with comprehensive validation and audit
   */
  async updateCoreFields(
    coupleId: string, 
    updates: Partial<CoreFieldsUpdate>,
    updatedBy: string,
    updatedByType: 'couple' | 'supplier' = 'couple'
  ): Promise<CoreFields> {
    // Validate the updates
    const validationResult = await validateCoreFields(updates);
    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
    }

    // Get current version for optimistic locking
    const current = await this.getCoreFields(coupleId);
    if (!current) {
      throw new Error('Core fields not found');
    }

    // Prepare update with metadata
    const updateData = {
      ...updates,
      last_updated_by: updatedBy,
      updated_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString()
    };

    // Perform atomic update with version check
    const { data, error } = await this.supabase
      .from('core_fields')
      .update(updateData)
      .eq('couple_id', coupleId)
      .eq('version_number', current.version_number) // Optimistic locking
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Core fields have been modified by another user. Please refresh and try again.');
      }
      throw error;
    }

    const updatedCoreFields = this.transformToCoreFields(data);

    // Broadcast real-time updates to connected clients
    await this.broadcastUpdate(coupleId, updates, updatedByType);

    // Notify connected suppliers if relevant fields changed
    await this.notifySuppliers(coupleId, updates, updatedByType);

    return updatedCoreFields;
  }

  /**
   * Grant supplier access to specific Core Fields
   */
  async grantSupplierAccess(
    coupleId: string,
    supplierId: string,
    permissions: {
      readableFields: string[];
      writableFields?: string[];
      autoSyncEnabled?: boolean;
    }
  ): Promise<void> {
    const { error } = await this.supabase
      .from('core_fields_permissions')
      .upsert({
        couple_id: coupleId,
        supplier_id: supplierId,
        readable_fields: permissions.readableFields,
        writable_fields: permissions.writableFields || [],
        auto_sync_enabled: permissions.autoSyncEnabled ?? true,
        status: 'approved',
        approved_by: coupleId,
        approved_at: new Date().toISOString()
      });

    if (error) throw error;

    // Update connected_vendors in core_fields
    await this.updateConnectedVendors(coupleId, supplierId, 'connect');
  }

  /**
   * Auto-populate form fields from Core Fields
   */
  async populateFormFields(
    formId: string, 
    coupleId: string
  ): Promise<Record<string, any>> {
    // Get form field mappings
    const { data: mappings } = await this.supabase
      .from('core_field_mappings')
      .select('form_field_name, core_field_path, transformation_rule')
      .eq('form_id', formId)
      .eq('auto_populate', true);

    if (!mappings || mappings.length === 0) {
      return {};
    }

    // Get core fields data
    const coreFields = await this.getCoreFields(coupleId);
    if (!coreFields) {
      return {};
    }

    // Map core fields to form fields
    const populatedData: Record<string, any> = {};

    for (const mapping of mappings) {
      try {
        const value = this.getNestedValue(coreFields, mapping.core_field_path);
        
        if (value !== undefined && value !== null) {
          // Apply transformation if specified
          let transformedValue = value;
          if (mapping.transformation_rule && Object.keys(mapping.transformation_rule).length > 0) {
            transformedValue = this.applyTransformation(value, mapping.transformation_rule);
          }
          
          populatedData[mapping.form_field_name] = transformedValue;
        }
      } catch (error) {
        console.warn(`Failed to populate field ${mapping.form_field_name}:`, error);
        // Continue with other fields
      }
    }

    return populatedData;
  }

  /**
   * Get comprehensive audit trail for Core Fields
   */
  async getAuditTrail(coupleId: string, limit: number = 50): Promise<AuditEntry[]> {
    const { data, error } = await this.supabase
      .from('core_fields_audit')
      .select(`
        *,
        changed_by_user:auth.users!changed_by(email, full_name),
        supplier:suppliers!supplier_id(business_name)
      `)
      .eq('couple_id', coupleId)
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(entry => ({
      id: entry.id,
      field: entry.changed_field,
      oldValue: entry.old_value,
      newValue: entry.new_value,
      changedBy: {
        id: entry.changed_by,
        name: entry.changed_by_user?.full_name || entry.changed_by_user?.email,
        type: entry.changed_by_type
      },
      supplier: entry.supplier ? {
        id: entry.supplier_id,
        name: entry.supplier.business_name
      } : null,
      timestamp: entry.changed_at,
      reason: entry.change_reason,
      ipAddress: entry.ip_address
    }));
  }

  /**
   * Real-time subscription setup for Core Fields changes
   */
  async subscribeToChanges(
    coupleId: string,
    callback: (payload: any) => void
  ) {
    return this.supabase
      .channel(`core_fields_${coupleId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'core_fields',
        filter: `couple_id=eq.${coupleId}`
      }, callback)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'core_fields_audit',
        filter: `couple_id=eq.${coupleId}`
      }, (payload) => {
        callback({ type: 'audit', payload });
      })
      .subscribe();
  }

  // Private helper methods
  private async createDefaultCoreFields(coupleId: string): Promise<CoreFields> {
    const defaultData = {
      couple_id: coupleId,
      partner1_name: '',
      partner2_name: '',
      guest_count: { adults: 0, children: 0, total: 0, confirmed: 0, pending: 0 },
      wedding_style: [],
      wedding_colors: [],
      ceremony_venue: {},
      reception_venue: {},
      key_moments: [],
      wedding_party: [],
      family_vips: [],
      connected_vendors: [],
      sharing_preferences: { auto_share_basic: true, require_approval: false },
      field_permissions: {},
      version_number: 1
    };

    const { data, error } = await this.supabase
      .from('core_fields')
      .insert(defaultData)
      .select()
      .single();

    if (error) throw error;

    return this.transformToCoreFields(data);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object') {
        return current[key];
      }
      return undefined;
    }, obj);
  }

  private applyTransformation(value: any, rule: any): any {
    // Implement transformation logic based on rule
    // Examples: date formatting, string manipulation, etc.
    return value;
  }

  private async broadcastUpdate(
    coupleId: string, 
    updates: Partial<CoreFieldsUpdate>,
    updatedByType: 'couple' | 'supplier'
  ): Promise<void> {
    await broadcastCoreFieldsUpdate(coupleId, {
      type: 'core_fields_updated',
      data: updates,
      updatedBy: updatedByType,
      timestamp: new Date().toISOString()
    });
  }

  private async notifySuppliers(
    coupleId: string,
    updates: Partial<CoreFieldsUpdate>,
    updatedByType: 'couple' | 'supplier'
  ): Promise<void> {
    // Get connected suppliers
    const { data: permissions } = await this.supabase
      .from('core_fields_permissions')
      .select('supplier_id, readable_fields, notification_preferences')
      .eq('couple_id', coupleId)
      .eq('status', 'approved')
      .eq('auto_sync_enabled', true);

    if (!permissions || permissions.length === 0) return;

    // Send notifications to relevant suppliers
    for (const permission of permissions) {
      const relevantUpdates = this.filterRelevantUpdates(updates, permission.readable_fields);
      
      if (Object.keys(relevantUpdates).length > 0) {
        // Send notification via email/SMS/push
        await this.sendSupplierNotification(
          permission.supplier_id,
          coupleId,
          relevantUpdates,
          updatedByType
        );
      }
    }
  }

  private filterRelevantUpdates(
    updates: Partial<CoreFieldsUpdate>,
    readableFields: string[]
  ): Partial<CoreFieldsUpdate> {
    const relevant: Partial<CoreFieldsUpdate> = {};
    
    for (const [field, value] of Object.entries(updates)) {
      if (readableFields.includes(field)) {
        relevant[field] = value;
      }
    }
    
    return relevant;
  }

  private async sendSupplierNotification(
    supplierId: string,
    coupleId: string,
    updates: Partial<CoreFieldsUpdate>,
    updatedByType: 'couple' | 'supplier'
  ): Promise<void> {
    // Implementation for sending notifications
    // This would integrate with email service, push notifications, etc.
  }

  private transformToCoreFields(data: any): CoreFields {
    // Transform database row to CoreFields interface
    return {
      id: data.id,
      coupleId: data.couple_id,
      couple: {
        partner1: {
          name: data.partner1_name,
          email: data.partner1_email,
          phone: data.partner1_phone
        },
        partner2: {
          name: data.partner2_name,
          email: data.partner2_email,
          phone: data.partner2_phone
        },
        address: data.couple_address
      },
      wedding: {
        date: data.wedding_date,
        ceremonyVenue: data.ceremony_venue,
        receptionVenue: data.reception_venue,
        guestCount: data.guest_count,
        style: data.wedding_style,
        colors: data.wedding_colors
      },
      timeline: {
        ceremonyTime: data.ceremony_time,
        receptionTime: data.reception_time,
        keyMoments: data.key_moments
      },
      people: {
        weddingParty: data.wedding_party,
        familyVips: data.family_vips
      },
      connectedVendors: data.connected_vendors,
      metadata: {
        version: data.version_number,
        lastUpdatedBy: data.last_updated_by,
        updatedAt: data.updated_at,
        createdAt: data.created_at
      }
    };
  }
}
```

### 2. API ENDPOINTS IMPLEMENTATION

#### A. Core Fields REST API
```typescript
// API Route: /src/app/api/v1/core-fields/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CoreFieldsService } from '@/lib/core-fields/service';
import { validateApiKey, getCurrentUser } from '@/lib/auth/server';
import { rateLimit } from '@/lib/middleware/rate-limit';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'core-fields-read', 100); // 100 requests per minute
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Authentication
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const coupleId = searchParams.get('couple_id') || user.id;

    // Authorization check
    if (coupleId !== user.id) {
      // Check if user is a connected supplier
      const supabase = createClient();
      const { data: connection } = await supabase
        .from('core_fields_permissions')
        .select('readable_fields')
        .eq('couple_id', coupleId)
        .eq('supplier_id', user.id)
        .eq('status', 'approved')
        .single();

      if (!connection) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    const coreFieldsService = new CoreFieldsService();
    const coreFields = await coreFieldsService.getCoreFields(coupleId);

    if (!coreFields) {
      return NextResponse.json(
        { error: 'Core fields not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: coreFields,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Core Fields GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Rate limiting for updates (stricter)
    const rateLimitResult = await rateLimit(request, 'core-fields-write', 20); // 20 updates per minute
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Authentication
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { couple_id, updates, version } = body;

    // Validation
    if (!couple_id || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields: couple_id, updates' },
        { status: 400 }
      );
    }

    // Authorization check
    let updatedByType: 'couple' | 'supplier' = 'couple';
    
    if (couple_id !== user.id) {
      // Check supplier permissions
      const supabase = createClient();
      const { data: permission } = await supabase
        .from('core_fields_permissions')
        .select('writable_fields')
        .eq('couple_id', couple_id)
        .eq('supplier_id', user.id)
        .eq('status', 'approved')
        .single();

      if (!permission) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }

      // Validate that supplier only updates permitted fields
      const attemptedFields = Object.keys(updates);
      const permittedFields = permission.writable_fields;
      const unauthorizedFields = attemptedFields.filter(
        field => !permittedFields.includes(field)
      );

      if (unauthorizedFields.length > 0) {
        return NextResponse.json(
          { 
            error: 'Access denied to fields',
            unauthorized_fields: unauthorizedFields
          },
          { status: 403 }
        );
      }

      updatedByType = 'supplier';
    }

    const coreFieldsService = new CoreFieldsService();
    const updatedCoreFields = await coreFieldsService.updateCoreFields(
      couple_id,
      updates,
      user.id,
      updatedByType
    );

    return NextResponse.json({
      success: true,
      data: updatedCoreFields,
      message: 'Core fields updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Core Fields PUT error:', error);
    
    if (error.message.includes('modified by another user')) {
      return NextResponse.json(
        { error: 'Conflict: Core fields have been modified by another user' },
        { status: 409 }
      );
    }

    if (error.message.includes('Validation failed')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Auto-population endpoint
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'core-fields-populate', 30);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Authentication
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { form_id, couple_id } = body;

    if (!form_id || !couple_id) {
      return NextResponse.json(
        { error: 'Missing required fields: form_id, couple_id' },
        { status: 400 }
      );
    }

    const coreFieldsService = new CoreFieldsService();
    const populatedData = await coreFieldsService.populateFormFields(form_id, couple_id);

    return NextResponse.json({
      success: true,
      data: populatedData,
      populated_fields: Object.keys(populatedData),
      message: `${Object.keys(populatedData).length} fields auto-populated`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Core Fields auto-populate error:', error);
    return NextResponse.json(
      { 
        error: 'Auto-population failed',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
```

### 3. REAL-TIME INFRASTRUCTURE

#### A. WebSocket Broadcasting System
```typescript
// Service: realtime.ts
// Location: /src/lib/core-fields/realtime.ts

import { createClient } from '@/lib/supabase/server';
import { RealtimeChannel } from '@supabase/supabase-js';

interface BroadcastMessage {
  type: string;
  data: any;
  updatedBy: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export class CoreFieldsRealtime {
  private supabase = createClient();
  private channels = new Map<string, RealtimeChannel>();

  /**
   * Broadcast Core Fields update to all connected clients
   */
  async broadcastCoreFieldsUpdate(
    coupleId: string,
    message: BroadcastMessage
  ): Promise<void> {
    const channelName = `core_fields_${coupleId}`;
    
    try {
      // Get or create channel
      let channel = this.channels.get(channelName);
      if (!channel) {
        channel = this.supabase.channel(channelName);
        this.channels.set(channelName, channel);
      }

      // Broadcast to all subscribers
      await channel.send({
        type: 'broadcast',
        event: 'core_fields_updated',
        payload: {
          ...message,
          couple_id: coupleId,
          server_timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Failed to broadcast Core Fields update:', error);
      // Don't throw - this shouldn't break the main update flow
    }
  }

  /**
   * Set up real-time presence tracking for Core Fields editing
   */
  async setupPresenceTracking(
    coupleId: string,
    userId: string,
    userType: 'couple' | 'supplier',
    currentSection?: string
  ): Promise<RealtimeChannel> {
    const channelName = `presence_${coupleId}`;
    
    const channel = this.supabase.channel(channelName, {
      config: {
        presence: {
          key: userId
        }
      }
    });

    // Track user presence
    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: userId,
          user_type: userType,
          current_section: currentSection,
          joined_at: new Date().toISOString()
        });
      }
    });

    // Handle presence changes
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        this.handlePresenceSync(coupleId, presenceState);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        this.handlePresenceJoin(coupleId, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        this.handlePresenceLeave(coupleId, leftPresences);
      });

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Send targeted notification to specific supplier
   */
  async notifySupplier(
    supplierId: string,
    coupleId: string,
    notification: {
      type: string;
      title: string;
      message: string;
      data?: any;
    }
  ): Promise<void> {
    const channelName = `supplier_${supplierId}`;
    
    try {
      const channel = this.supabase.channel(channelName);
      
      await channel.send({
        type: 'broadcast',
        event: 'notification',
        payload: {
          ...notification,
          couple_id: coupleId,
          timestamp: new Date().toISOString(),
          read: false
        }
      });

    } catch (error) {
      console.error('Failed to notify supplier:', error);
    }
  }

  /**
   * Clean up unused channels
   */
  async cleanup(): Promise<void> {
    for (const [channelName, channel] of this.channels) {
      try {
        await channel.unsubscribe();
        this.channels.delete(channelName);
      } catch (error) {
        console.error(`Failed to cleanup channel ${channelName}:`, error);
      }
    }
  }

  private handlePresenceSync(coupleId: string, presenceState: any): void {
    // Handle real-time editing conflicts and show who's currently editing
    const activeUsers = Object.values(presenceState).flat();
    
    // Broadcast active users to all clients
    this.broadcastCoreFieldsUpdate(coupleId, {
      type: 'presence_update',
      data: { active_users: activeUsers },
      updatedBy: 'system',
      timestamp: new Date().toISOString()
    });
  }

  private handlePresenceJoin(coupleId: string, newPresences: any[]): void {
    // Notify about new users joining the editing session
    for (const presence of newPresences) {
      this.broadcastCoreFieldsUpdate(coupleId, {
        type: 'user_joined',
        data: presence,
        updatedBy: 'system',
        timestamp: new Date().toISOString()
      });
    }
  }

  private handlePresenceLeave(coupleId: string, leftPresences: any[]): void {
    // Clean up when users leave
    for (const presence of leftPresences) {
      this.broadcastCoreFieldsUpdate(coupleId, {
        type: 'user_left',
        data: presence,
        updatedBy: 'system',
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Export singleton instance
export const coreFieldsRealtime = new CoreFieldsRealtime();

// Convenience function for broadcasting updates
export const broadcastCoreFieldsUpdate = (coupleId: string, message: BroadcastMessage) => 
  coreFieldsRealtime.broadcastCoreFieldsUpdate(coupleId, message);
```

---

## 🎯 EVIDENCE OF REALITY REQUIREMENTS

### DATABASE PERFORMANCE EVIDENCE
- [ ] **Query Performance**: All Core Fields queries complete in <50ms
- [ ] **Concurrent Updates**: Handle 1000+ simultaneous Core Fields updates
- [ ] **RLS Enforcement**: Row Level Security policies block unauthorized access 100%
- [ ] **Audit Completeness**: Every change captured in audit trail with full context
- [ ] **Data Integrity**: Zero data corruption or loss during high-load scenarios
- [ ] **Index Optimization**: All queries use appropriate indexes for optimal performance

### API RELIABILITY EVIDENCE
- [ ] **Response Times**: All API endpoints respond in <200ms (p95)
- [ ] **Rate Limiting**: API properly throttles requests to prevent abuse
- [ ] **Error Handling**: Graceful error responses with appropriate HTTP status codes
- [ ] **Auto-Population Speed**: Form auto-population completes in <500ms
- [ ] **Real-Time Latency**: WebSocket updates delivered in <2 seconds
- [ ] **Concurrent Safety**: No race conditions during simultaneous updates

### SECURITY VALIDATION EVIDENCE
```typescript
// Security tests that must pass:
interface SecurityValidation {
  dataEncryption: 'All Core Fields data encrypted in transit and at rest',
  accessControl: 'RLS policies prevent unauthorized data access',
  auditCompliance: 'Complete audit trail for all data changes',
  inputValidation: 'All API inputs properly sanitized and validated',
  authenticationStrength: 'Multi-factor authentication for sensitive operations'
}
```

---

## ✅ VALIDATION CHECKLIST

### Database Validation
- [ ] Core Fields schema supports all required wedding data types
- [ ] RLS policies correctly enforce data access permissions
- [ ] Audit triggers capture all changes with complete context
- [ ] Indexes provide optimal query performance for all common operations
- [ ] Foreign key constraints maintain data integrity

### API Validation
- [ ] All endpoints handle authentication and authorization correctly
- [ ] Rate limiting prevents abuse while allowing normal usage
- [ ] Error responses provide helpful information without security leaks
- [ ] Auto-population correctly maps Core Fields to form fields
- [ ] Real-time updates broadcast reliably to all connected clients

### Performance Validation
- [ ] Database queries complete in <50ms under normal load
- [ ] API endpoints respond in <200ms (p95) under peak load
- [ ] WebSocket connections handle 10,000+ concurrent users
- [ ] Auto-population processes 100+ forms simultaneously
- [ ] Memory usage remains stable during extended operation

### Security Validation
- [ ] All data encrypted using industry-standard algorithms
- [ ] Authentication tokens properly validated on every request
- [ ] Authorization checks prevent data access violations
- [ ] Audit logs capture sufficient detail for compliance
- [ ] Input validation prevents SQL injection and XSS attacks

---

## 🚀 SUCCESS METRICS

### Performance KPIs
- **Query Speed**: Core Fields queries <50ms average response time
- **API Latency**: All endpoints <200ms response time (p95)
- **Real-Time Sync**: WebSocket updates delivered <2 seconds
- **Throughput**: Handle 10,000+ API requests per minute
- **Concurrent Users**: Support 5,000+ simultaneous WebSocket connections

### Reliability KPIs
- **Uptime**: 99.99% availability for Core Fields system
- **Data Consistency**: Zero data corruption incidents
- **Error Rate**: <0.01% API error rate under normal conditions
- **Recovery Time**: <30 seconds recovery from system failures
- **Audit Completeness**: 100% of changes captured in audit trail

### Security KPIs
- **Access Control**: 100% enforcement of RLS policies
- **Encryption**: All data encrypted with AES-256
- **Vulnerability Scans**: Zero critical security vulnerabilities
- **Compliance**: 100% audit compliance for data handling
- **Breach Prevention**: Zero unauthorized data access incidents

---

## 📞 TEAM COORDINATION

### Integration Points with Other Teams
- **Team A (Frontend)**: Provide robust APIs for Core Fields UI components
- **Team C (Integration)**: WebSocket infrastructure and external service hooks
- **Team D (Platform)**: Database optimization and infrastructure scaling
- **Team E (QA)**: Comprehensive testing of all backend functionality

### Communication Protocols
- **Daily Standups**: Share API development progress and database performance
- **API Documentation**: Maintain up-to-date OpenAPI specifications
- **Database Reviews**: Weekly schema optimization and performance analysis
- **Security Audits**: Regular security reviews and penetration testing

### Handoff Requirements
- **API Documentation**: Complete REST API and WebSocket documentation
- **Database Schema**: Comprehensive schema documentation with examples
- **Performance Benchmarks**: Baseline performance metrics for monitoring
- **Security Guidelines**: Complete security implementation documentation

---

**CRITICAL SUCCESS FACTOR**: Your backend architecture must be bulletproof - handling thousands of concurrent users, ensuring zero data loss, and maintaining bank-level security while providing lightning-fast responses.

**WEDDING INDUSTRY IMPACT**: Your APIs and database design enable the revolutionary Core Fields System that eliminates the frustration of couples entering wedding information 14+ times.

**REMEMBER**: Wedding data is sacred and irreplaceable. Your backend must protect it with military-grade security while making it instantly accessible to authorized users. Every API call, every database query, and every real-time update must be flawless.
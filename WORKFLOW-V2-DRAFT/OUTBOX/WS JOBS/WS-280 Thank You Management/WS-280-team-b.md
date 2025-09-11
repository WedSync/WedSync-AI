# WS-280 Thank You Management - Team B Comprehensive Prompt
**Team B: Backend/API Development Specialists**

## 🎯 Your Mission: Bulletproof Thank You Management Backend Infrastructure
You are the **Backend/API specialists** responsible for building the server-side infrastructure that powers the wedding thank you management system. Your focus: **Rock-solid database operations, scalable API architecture, and intelligent automation that handles 10,000+ wedding gifts seamlessly while maintaining data integrity and security**.

## 💝 The Wedding Thank You Backend Challenge
**Context**: Emma just finished her honeymoon and returns to find 247 wedding gifts waiting to be tracked, thank you notes to be written, and addresses to be managed. Your backend must handle massive gift imports, relationship mapping between gifts and guests, automated thank you tracking, and real-time synchronization across multiple family members managing the process. **One database error could mean a missed thank you note and a damaged relationship**.

## 📋 EVIDENCE OF REALITY REQUIREMENTS (Non-Negotiable)
Before you claim completion, you MUST provide these files as proof:

### 🔍 Required Evidence Files:
1. **`/src/app/api/thank-you/gifts/route.ts`** - Complete CRUD operations for gift management
2. **`/src/app/api/thank-you/recipients/route.ts`** - Recipient management with relationship mapping
3. **`/src/app/api/thank-you/notes/route.ts`** - Thank you note tracking and automation
4. **`/src/app/api/thank-you/templates/route.ts`** - Template management and personalization
5. **`/src/app/api/thank-you/bulk-operations/route.ts`** - Bulk gift import and batch operations

### 🏗️ Backend Architecture Requirements:
- **Database Schema**: Complete thank you management tables with proper relationships and constraints
- **API Security**: All endpoints protected with authentication and input validation
- **Data Validation**: Comprehensive Zod schemas for all gift and recipient data
- **Performance**: Bulk operations handle 1000+ gifts without timeout
- **Real-time Sync**: WebSocket/Supabase realtime for collaborative thank you management
- **Audit Trail**: Complete history of all gift and thank you note changes

Your backend ensures every wedding gift is tracked and every thank you note is delivered flawlessly.

## 🗄️ Core Database Schema Implementation

### Database Tables Structure
```sql
-- Gift tracking and management
CREATE TABLE thank_you_gifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id UUID NOT NULL REFERENCES weddings(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Gift Details
  gift_description TEXT NOT NULL,
  gift_value DECIMAL(10,2),
  gift_category VARCHAR(100), -- 'household', 'money', 'experience', 'decorative', 'personal'
  gift_image_url TEXT,
  purchase_store VARCHAR(200),
  
  -- Giver Information (can be multiple people)
  primary_giver_name VARCHAR(200) NOT NULL,
  secondary_giver_name VARCHAR(200),
  relationship_to_couple VARCHAR(100), -- 'family', 'friend', 'colleague', 'family_friend'
  giver_address TEXT,
  giver_phone VARCHAR(20),
  giver_email VARCHAR(100),
  
  -- Thank You Tracking
  thank_you_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'written', 'sent', 'delivered'
  thank_you_method VARCHAR(50), -- 'handwritten', 'email', 'text', 'call', 'in_person'
  thank_you_sent_date TIMESTAMP,
  thank_you_delivered_date TIMESTAMP,
  
  -- Notes and Personalization
  personal_notes TEXT,
  couple_notes TEXT, -- Private notes between couple
  thank_you_template_used UUID REFERENCES thank_you_templates(id),
  
  -- Import and Organization
  imported_from VARCHAR(100), -- 'csv', 'registry', 'manual', 'guest_list'
  gift_received_date DATE,
  wedding_event VARCHAR(100), -- 'engagement_party', 'bridal_shower', 'bachelor_party', 'wedding_day', 'post_wedding'
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Thank you note templates and personalization
CREATE TABLE thank_you_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Template Details
  template_name VARCHAR(200) NOT NULL,
  template_content TEXT NOT NULL,
  template_type VARCHAR(50) DEFAULT 'general', -- 'general', 'monetary', 'experience', 'household'
  
  -- Personalization Variables
  personalization_fields JSONB DEFAULT '{}', -- Dynamic fields for personalization
  tone VARCHAR(50) DEFAULT 'formal', -- 'formal', 'casual', 'heartfelt', 'fun'
  
  -- Usage and Management
  is_default BOOLEAN DEFAULT false,
  times_used INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Recipient management and relationship mapping
CREATE TABLE thank_you_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Personal Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200), -- How they prefer to be addressed
  title VARCHAR(20), -- 'Mr.', 'Mrs.', 'Dr.', 'Ms.'
  
  -- Contact Information
  email VARCHAR(100),
  phone VARCHAR(20),
  mailing_address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  postal_code VARCHAR(20),
  country VARCHAR(50) DEFAULT 'United Kingdom',
  
  -- Relationship Information
  relationship_to_bride VARCHAR(100),
  relationship_to_groom VARCHAR(100),
  relationship_category VARCHAR(50), -- 'immediate_family', 'extended_family', 'friend', 'colleague'
  how_we_met TEXT,
  
  -- Preferences and Notes
  communication_preferences JSONB DEFAULT '{}', -- preferred contact method, etc.
  dietary_restrictions TEXT,
  personal_notes TEXT,
  
  -- Wedding Involvement
  wedding_role VARCHAR(100), -- 'bridesmaid', 'groomsman', 'officiant', 'guest', 'vendor'
  invited_to_events TEXT[], -- ['engagement_party', 'bridal_shower', 'wedding']
  attendance_status JSONB DEFAULT '{}', -- Track attendance at different events
  
  -- Import and Management
  imported_from VARCHAR(100),
  guest_list_id UUID, -- Link to original guest list if applicable
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Thank you note tracking and history
CREATE TABLE thank_you_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gift_id UUID NOT NULL REFERENCES thank_you_gifts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Note Content
  note_content TEXT NOT NULL,
  template_id UUID REFERENCES thank_you_templates(id),
  personalization_data JSONB DEFAULT '{}',
  
  -- Delivery Information
  delivery_method VARCHAR(50) NOT NULL, -- 'mail', 'email', 'hand_delivery', 'text'
  recipient_address TEXT,
  recipient_email VARCHAR(100),
  tracking_number VARCHAR(100), -- For postal mail
  
  -- Status Tracking
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'ready', 'sent', 'delivered', 'bounced'
  sent_date TIMESTAMP,
  delivered_date TIMESTAMP,
  delivery_confirmation TEXT,
  
  -- Quality Control
  proofread_by UUID REFERENCES auth.users(id),
  proofread_date TIMESTAMP,
  approval_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'needs_revision'
  revision_notes TEXT,
  
  -- Communication History
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_date DATE,
  response_received BOOLEAN DEFAULT false,
  response_date TIMESTAMP,
  response_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Gift registry integration and tracking
CREATE TABLE gift_registry_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  wedding_id UUID NOT NULL REFERENCES weddings(id),
  
  -- Registry Item Details
  item_name VARCHAR(300) NOT NULL,
  item_description TEXT,
  item_category VARCHAR(100),
  item_price DECIMAL(10,2),
  item_url TEXT,
  item_image_url TEXT,
  
  -- Registry Information
  registry_platform VARCHAR(100), -- 'amazon', 'john_lewis', 'marks_spencer', 'argos'
  registry_item_id VARCHAR(200), -- External registry ID
  item_priority VARCHAR(20) DEFAULT 'medium', -- 'high', 'medium', 'low'
  
  -- Purchase Tracking
  purchase_status VARCHAR(50) DEFAULT 'available', -- 'available', 'purchased', 'partially_purchased'
  quantity_requested INTEGER DEFAULT 1,
  quantity_purchased INTEGER DEFAULT 0,
  purchased_by TEXT, -- Names of people who purchased
  
  -- Gift Received Matching
  gift_id UUID REFERENCES thank_you_gifts(id), -- Link to received gift
  received_date DATE,
  condition_on_arrival VARCHAR(50), -- 'perfect', 'damaged', 'wrong_item'
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Thank you progress tracking and analytics
CREATE TABLE thank_you_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  wedding_id UUID NOT NULL REFERENCES weddings(id),
  
  -- Progress Metrics
  total_gifts_received INTEGER DEFAULT 0,
  thank_you_notes_written INTEGER DEFAULT 0,
  thank_you_notes_sent INTEGER DEFAULT 0,
  thank_you_notes_delivered INTEGER DEFAULT 0,
  
  -- Category Breakdown
  gifts_by_category JSONB DEFAULT '{}',
  thank_you_by_method JSONB DEFAULT '{}',
  
  -- Timeline Tracking
  average_days_to_write DECIMAL(4,2),
  average_days_to_send DECIMAL(4,2),
  fastest_thank_you_time INTEGER, -- In hours
  slowest_thank_you_time INTEGER, -- In hours
  
  -- Goals and Deadlines
  thank_you_deadline DATE, -- Traditional 3-month rule
  daily_goal INTEGER DEFAULT 5, -- Notes to write per day
  weekly_goal INTEGER DEFAULT 35,
  
  -- Quality Metrics
  personalization_score DECIMAL(3,2), -- 0-10 scale
  template_usage_ratio DECIMAL(3,2), -- Templates vs custom
  revision_rate DECIMAL(3,2), -- How often notes need revision
  
  -- Last Updated
  last_calculated TIMESTAMP DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Row Level Security (RLS) Implementation
```sql
-- Enable RLS on all thank you management tables
ALTER TABLE thank_you_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE thank_you_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE thank_you_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE thank_you_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_registry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE thank_you_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for thank_you_gifts
CREATE POLICY "Users can view gifts for their organization" ON thank_you_gifts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert gifts for their organization" ON thank_you_gifts
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update gifts for their organization" ON thank_you_gifts
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Similar policies for other tables...
```

## 🔌 API Endpoint Implementation

### Gift Management API (`/src/app/api/thank-you/gifts/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { withSecureValidation } from '@/lib/security/api-middleware'

// Input validation schemas
const createGiftSchema = z.object({
  giftDescription: z.string().min(1).max(500),
  giftValue: z.number().min(0).max(50000).optional(),
  giftCategory: z.enum(['household', 'money', 'experience', 'decorative', 'personal']),
  primaryGiverName: z.string().min(1).max(200),
  secondaryGiverName: z.string().max(200).optional(),
  relationshipToCouple: z.string().max(100).optional(),
  giverAddress: z.string().max(1000).optional(),
  giverPhone: z.string().max(20).optional(),
  giverEmail: z.string().email().optional(),
  giftReceivedDate: z.string().date().optional(),
  weddingEvent: z.enum(['engagement_party', 'bridal_shower', 'bachelor_party', 'wedding_day', 'post_wedding']).optional(),
  personalNotes: z.string().max(2000).optional(),
  coupleNotes: z.string().max(2000).optional()
})

const updateGiftSchema = createGiftSchema.partial().extend({
  id: z.string().uuid()
})

const bulkImportSchema = z.object({
  gifts: z.array(createGiftSchema).min(1).max(1000),
  importSource: z.string().max(100)
})

export async function GET(request: NextRequest) {
  return withSecureValidation(request, async () => {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse query parameters
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
    const category = url.searchParams.get('category')
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')
    const weddingId = url.searchParams.get('weddingId')

    // Build query
    let query = supabase
      .from('thank_you_gifts')
      .select(`
        *,
        thank_you_notes!inner(
          id,
          status,
          sent_date,
          delivered_date
        )
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (weddingId) {
      query = query.eq('wedding_id', weddingId)
    }
    if (category) {
      query = query.eq('gift_category', category)
    }
    if (status) {
      query = query.eq('thank_you_status', status)
    }
    if (search) {
      query = query.or(`gift_description.ilike.%${search}%,primary_giver_name.ilike.%${search}%`)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: gifts, error, count } = await query

    if (error) {
      console.error('Error fetching gifts:', error)
      return NextResponse.json({ error: 'Failed to fetch gifts' }, { status: 500 })
    }

    // Get summary statistics
    const { data: stats } = await supabase
      .from('thank_you_gifts')
      .select('thank_you_status, gift_category')
      .eq('organization_id', profile.organization_id)

    const summary = {
      total: count || 0,
      pending: stats?.filter(g => g.thank_you_status === 'pending').length || 0,
      written: stats?.filter(g => g.thank_you_status === 'written').length || 0,
      sent: stats?.filter(g => g.thank_you_status === 'sent').length || 0,
      delivered: stats?.filter(g => g.thank_you_status === 'delivered').length || 0,
      byCategory: stats?.reduce((acc, gift) => {
        acc[gift.gift_category] = (acc[gift.gift_category] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}
    }

    return NextResponse.json({
      gifts,
      summary,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })
  })
}

export async function POST(request: NextRequest) {
  return withSecureValidation(request, async () => {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Handle bulk import
    if (body.gifts && Array.isArray(body.gifts)) {
      const validatedData = bulkImportSchema.parse(body)
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!profile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
      }

      // Process gifts in batches of 100
      const batchSize = 100
      const results = []
      
      for (let i = 0; i < validatedData.gifts.length; i += batchSize) {
        const batch = validatedData.gifts.slice(i, i + batchSize)
        
        const giftsToInsert = batch.map(gift => ({
          organization_id: profile.organization_id,
          gift_description: gift.giftDescription,
          gift_value: gift.giftValue,
          gift_category: gift.giftCategory,
          primary_giver_name: gift.primaryGiverName,
          secondary_giver_name: gift.secondaryGiverName,
          relationship_to_couple: gift.relationshipToCouple,
          giver_address: gift.giverAddress,
          giver_phone: gift.giverPhone,
          giver_email: gift.giverEmail,
          gift_received_date: gift.giftReceivedDate,
          wedding_event: gift.weddingEvent,
          personal_notes: gift.personalNotes,
          couple_notes: gift.coupleNotes,
          imported_from: validatedData.importSource,
          created_by: user.id,
          updated_by: user.id
        }))

        const { data: batchResults, error } = await supabase
          .from('thank_you_gifts')
          .insert(giftsToInsert)
          .select()

        if (error) {
          console.error('Batch insert error:', error)
          throw error
        }

        results.push(...(batchResults || []))
      }

      // Update progress tracking
      await updateThankYouProgress(supabase, profile.organization_id)

      return NextResponse.json({
        success: true,
        imported: results.length,
        gifts: results
      })
    }

    // Handle single gift creation
    const validatedData = createGiftSchema.parse(body)
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { data: gift, error } = await supabase
      .from('thank_you_gifts')
      .insert({
        organization_id: profile.organization_id,
        gift_description: validatedData.giftDescription,
        gift_value: validatedData.giftValue,
        gift_category: validatedData.giftCategory,
        primary_giver_name: validatedData.primaryGiverName,
        secondary_giver_name: validatedData.secondaryGiverName,
        relationship_to_couple: validatedData.relationshipToCouple,
        giver_address: validatedData.giverAddress,
        giver_phone: validatedData.giverPhone,
        giver_email: validatedData.giverEmail,
        gift_received_date: validatedData.giftReceivedDate,
        wedding_event: validatedData.weddingEvent,
        personal_notes: validatedData.personalNotes,
        couple_notes: validatedData.coupleNotes,
        imported_from: 'manual',
        created_by: user.id,
        updated_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating gift:', error)
      return NextResponse.json({ error: 'Failed to create gift' }, { status: 500 })
    }

    // Update progress tracking
    await updateThankYouProgress(supabase, profile.organization_id)

    return NextResponse.json(gift, { status: 201 })
  })
}

export async function PUT(request: NextRequest) {
  return withSecureValidation(request, async () => {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateGiftSchema.parse(body)
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Update gift with organization security
    const { data: gift, error } = await supabase
      .from('thank_you_gifts')
      .update({
        gift_description: validatedData.giftDescription,
        gift_value: validatedData.giftValue,
        gift_category: validatedData.giftCategory,
        primary_giver_name: validatedData.primaryGiverName,
        secondary_giver_name: validatedData.secondaryGiverName,
        relationship_to_couple: validatedData.relationshipToCouple,
        giver_address: validatedData.giverAddress,
        giver_phone: validatedData.giverPhone,
        giver_email: validatedData.giverEmail,
        gift_received_date: validatedData.giftReceivedDate,
        wedding_event: validatedData.weddingEvent,
        personal_notes: validatedData.personalNotes,
        couple_notes: validatedData.coupleNotes,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', validatedData.id)
      .eq('organization_id', profile.organization_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating gift:', error)
      return NextResponse.json({ error: 'Failed to update gift' }, { status: 500 })
    }

    if (!gift) {
      return NextResponse.json({ error: 'Gift not found' }, { status: 404 })
    }

    // Update progress tracking
    await updateThankYouProgress(supabase, profile.organization_id)

    return NextResponse.json(gift)
  })
}

// Helper function to update progress tracking
async function updateThankYouProgress(supabase: any, organizationId: string) {
  const { data: gifts } = await supabase
    .from('thank_you_gifts')
    .select('thank_you_status, gift_category')
    .eq('organization_id', organizationId)

  if (!gifts) return

  const stats = {
    total_gifts_received: gifts.length,
    thank_you_notes_written: gifts.filter(g => ['written', 'sent', 'delivered'].includes(g.thank_you_status)).length,
    thank_you_notes_sent: gifts.filter(g => ['sent', 'delivered'].includes(g.thank_you_status)).length,
    thank_you_notes_delivered: gifts.filter(g => g.thank_you_status === 'delivered').length,
    gifts_by_category: gifts.reduce((acc, gift) => {
      acc[gift.gift_category] = (acc[gift.gift_category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  await supabase
    .from('thank_you_progress')
    .upsert({
      organization_id: organizationId,
      ...stats,
      last_calculated: new Date().toISOString()
    })
}
```

### Thank You Note Management API (`/src/app/api/thank-you/notes/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { withSecureValidation } from '@/lib/security/api-middleware'

const createNoteSchema = z.object({
  giftId: z.string().uuid(),
  noteContent: z.string().min(10).max(2000),
  templateId: z.string().uuid().optional(),
  personalizationData: z.record(z.any()).optional(),
  deliveryMethod: z.enum(['mail', 'email', 'hand_delivery', 'text']),
  recipientAddress: z.string().max(1000).optional(),
  recipientEmail: z.string().email().optional(),
  followUpNeeded: z.boolean().default(false),
  followUpDate: z.string().date().optional()
})

const updateNoteStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['draft', 'ready', 'sent', 'delivered', 'bounced']),
  sentDate: z.string().datetime().optional(),
  deliveredDate: z.string().datetime().optional(),
  deliveryConfirmation: z.string().optional(),
  trackingNumber: z.string().optional()
})

export async function GET(request: NextRequest) {
  return withSecureValidation(request, async () => {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const giftId = url.searchParams.get('giftId')
    const status = url.searchParams.get('status')
    const deliveryMethod = url.searchParams.get('deliveryMethod')

    let query = supabase
      .from('thank_you_notes')
      .select(`
        *,
        thank_you_gifts!inner(
          id,
          gift_description,
          primary_giver_name,
          secondary_giver_name,
          relationship_to_couple
        ),
        thank_you_templates(
          id,
          template_name,
          template_type
        )
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    if (giftId) {
      query = query.eq('gift_id', giftId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (deliveryMethod) {
      query = query.eq('delivery_method', deliveryMethod)
    }

    const { data: notes, error } = await query

    if (error) {
      console.error('Error fetching notes:', error)
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
    }

    return NextResponse.json(notes)
  })
}

export async function POST(request: NextRequest) {
  return withSecureValidation(request, async () => {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createNoteSchema.parse(body)
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Verify gift belongs to organization
    const { data: gift } = await supabase
      .from('thank_you_gifts')
      .select('id')
      .eq('id', validatedData.giftId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!gift) {
      return NextResponse.json({ error: 'Gift not found' }, { status: 404 })
    }

    const { data: note, error } = await supabase
      .from('thank_you_notes')
      .insert({
        gift_id: validatedData.giftId,
        organization_id: profile.organization_id,
        note_content: validatedData.noteContent,
        template_id: validatedData.templateId,
        personalization_data: validatedData.personalizationData || {},
        delivery_method: validatedData.deliveryMethod,
        recipient_address: validatedData.recipientAddress,
        recipient_email: validatedData.recipientEmail,
        follow_up_needed: validatedData.followUpNeeded,
        follow_up_date: validatedData.followUpDate,
        created_by: user.id,
        updated_by: user.id
      })
      .select(`
        *,
        thank_you_gifts!inner(
          gift_description,
          primary_giver_name
        )
      `)
      .single()

    if (error) {
      console.error('Error creating note:', error)
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
    }

    // Update gift status to 'written'
    await supabase
      .from('thank_you_gifts')
      .update({ thank_you_status: 'written' })
      .eq('id', validatedData.giftId)

    return NextResponse.json(note, { status: 201 })
  })
}

export async function PUT(request: NextRequest) {
  return withSecureValidation(request, async () => {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateNoteStatusSchema.parse(body)
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const updateData: any = {
      status: validatedData.status,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    }

    if (validatedData.sentDate) {
      updateData.sent_date = validatedData.sentDate
    }
    if (validatedData.deliveredDate) {
      updateData.delivered_date = validatedData.deliveredDate
    }
    if (validatedData.deliveryConfirmation) {
      updateData.delivery_confirmation = validatedData.deliveryConfirmation
    }
    if (validatedData.trackingNumber) {
      updateData.tracking_number = validatedData.trackingNumber
    }

    const { data: note, error } = await supabase
      .from('thank_you_notes')
      .update(updateData)
      .eq('id', validatedData.id)
      .eq('organization_id', profile.organization_id)
      .select(`
        *,
        thank_you_gifts!inner(
          id,
          gift_description,
          primary_giver_name
        )
      `)
      .single()

    if (error) {
      console.error('Error updating note:', error)
      return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
    }

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Update gift status based on note status
    const giftStatusMap = {
      'draft': 'written',
      'ready': 'written',
      'sent': 'sent',
      'delivered': 'delivered',
      'bounced': 'written' // Reset to written for retry
    }

    await supabase
      .from('thank_you_gifts')
      .update({ thank_you_status: giftStatusMap[validatedData.status] })
      .eq('id', note.thank_you_gifts.id)

    return NextResponse.json(note)
  })
}
```

### Template Management API (`/src/app/api/thank-you/templates/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { withSecureValidation } from '@/lib/security/api-middleware'

const createTemplateSchema = z.object({
  templateName: z.string().min(1).max(200),
  templateContent: z.string().min(10).max(5000),
  templateType: z.enum(['general', 'monetary', 'experience', 'household']).default('general'),
  personalizationFields: z.record(z.string()).optional(),
  tone: z.enum(['formal', 'casual', 'heartfelt', 'fun']).default('formal'),
  isDefault: z.boolean().default(false)
})

const updateTemplateSchema = createTemplateSchema.partial().extend({
  id: z.string().uuid()
})

export async function GET(request: NextRequest) {
  return withSecureValidation(request, async () => {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const templateType = url.searchParams.get('type')
    const tone = url.searchParams.get('tone')
    const includeUsage = url.searchParams.get('includeUsage') === 'true'

    let query = supabase
      .from('thank_you_templates')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('is_default', { ascending: false })
      .order('times_used', { ascending: false })

    if (templateType) {
      query = query.eq('template_type', templateType)
    }
    if (tone) {
      query = query.eq('tone', tone)
    }

    const { data: templates, error } = await query

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    // Include usage statistics if requested
    if (includeUsage && templates) {
      for (const template of templates) {
        const { count } = await supabase
          .from('thank_you_notes')
          .select('id', { count: 'exact' })
          .eq('template_id', template.id)
          .eq('organization_id', profile.organization_id)

        template.actual_usage = count || 0
      }
    }

    return NextResponse.json(templates)
  })
}

export async function POST(request: NextRequest) {
  return withSecureValidation(request, async () => {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createTemplateSchema.parse(body)
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // If setting as default, unset other defaults
    if (validatedData.isDefault) {
      await supabase
        .from('thank_you_templates')
        .update({ is_default: false })
        .eq('organization_id', profile.organization_id)
        .eq('template_type', validatedData.templateType)
    }

    const { data: template, error } = await supabase
      .from('thank_you_templates')
      .insert({
        organization_id: profile.organization_id,
        template_name: validatedData.templateName,
        template_content: validatedData.templateContent,
        template_type: validatedData.templateType,
        personalization_fields: validatedData.personalizationFields || {},
        tone: validatedData.tone,
        is_default: validatedData.isDefault,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json(template, { status: 201 })
  })
}

export async function PUT(request: NextRequest) {
  return withSecureValidation(request, async () => {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateTemplateSchema.parse(body)
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // If setting as default, unset other defaults
    if (validatedData.isDefault && validatedData.templateType) {
      await supabase
        .from('thank_you_templates')
        .update({ is_default: false })
        .eq('organization_id', profile.organization_id)
        .eq('template_type', validatedData.templateType)
        .neq('id', validatedData.id)
    }

    const updateData = Object.fromEntries(
      Object.entries(validatedData).filter(([key, value]) => 
        key !== 'id' && value !== undefined
      )
    )
    updateData.updated_at = new Date().toISOString()

    const { data: template, error } = await supabase
      .from('thank_you_templates')
      .update(updateData)
      .eq('id', validatedData.id)
      .eq('organization_id', profile.organization_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating template:', error)
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json(template)
  })
}

export async function DELETE(request: NextRequest) {
  return withSecureValidation(request, async () => {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const templateId = url.searchParams.get('id')

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check if template is in use
    const { count } = await supabase
      .from('thank_you_notes')
      .select('id', { count: 'exact' })
      .eq('template_id', templateId)
      .eq('organization_id', profile.organization_id)

    if (count && count > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete template that is in use by thank you notes' 
      }, { status: 409 })
    }

    const { error } = await supabase
      .from('thank_you_templates')
      .delete()
      .eq('id', templateId)
      .eq('organization_id', profile.organization_id)

    if (error) {
      console.error('Error deleting template:', error)
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  })
}
```

## ⚡ Real-time Synchronization and Performance

### Real-time Updates Implementation
```typescript
// /src/hooks/useThankYouRealtime.ts
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface ThankYouRealtimeData {
  gifts: any[]
  notes: any[]
  templates: any[]
  progress: any
}

export function useThankYouRealtime(organizationId: string) {
  const [data, setData] = useState<ThankYouRealtimeData>({
    gifts: [],
    notes: [],
    templates: [],
    progress: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  useEffect(() => {
    if (!organizationId) return

    let channels: RealtimeChannel[] = []

    // Set up realtime subscriptions
    const setupRealtime = () => {
      // Gift updates
      const giftChannel = supabase
        .channel(`thank_you_gifts:${organizationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'thank_you_gifts',
            filter: `organization_id=eq.${organizationId}`
          },
          (payload) => {
            console.log('Gift change:', payload)
            handleGiftChange(payload)
          }
        )
        .subscribe()

      // Note updates
      const noteChannel = supabase
        .channel(`thank_you_notes:${organizationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'thank_you_notes',
            filter: `organization_id=eq.${organizationId}`
          },
          (payload) => {
            console.log('Note change:', payload)
            handleNoteChange(payload)
          }
        )
        .subscribe()

      // Template updates
      const templateChannel = supabase
        .channel(`thank_you_templates:${organizationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'thank_you_templates',
            filter: `organization_id=eq.${organizationId}`
          },
          (payload) => {
            console.log('Template change:', payload)
            handleTemplateChange(payload)
          }
        )
        .subscribe()

      // Progress updates
      const progressChannel = supabase
        .channel(`thank_you_progress:${organizationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'thank_you_progress',
            filter: `organization_id=eq.${organizationId}`
          },
          (payload) => {
            console.log('Progress change:', payload)
            handleProgressChange(payload)
          }
        )
        .subscribe()

      channels = [giftChannel, noteChannel, templateChannel, progressChannel]
    }

    const handleGiftChange = (payload: any) => {
      setData(prev => {
        const newGifts = [...prev.gifts]
        
        if (payload.eventType === 'INSERT') {
          newGifts.push(payload.new)
        } else if (payload.eventType === 'UPDATE') {
          const index = newGifts.findIndex(g => g.id === payload.new.id)
          if (index !== -1) {
            newGifts[index] = payload.new
          }
        } else if (payload.eventType === 'DELETE') {
          const index = newGifts.findIndex(g => g.id === payload.old.id)
          if (index !== -1) {
            newGifts.splice(index, 1)
          }
        }

        return { ...prev, gifts: newGifts }
      })
    }

    const handleNoteChange = (payload: any) => {
      setData(prev => {
        const newNotes = [...prev.notes]
        
        if (payload.eventType === 'INSERT') {
          newNotes.push(payload.new)
        } else if (payload.eventType === 'UPDATE') {
          const index = newNotes.findIndex(n => n.id === payload.new.id)
          if (index !== -1) {
            newNotes[index] = payload.new
          }
        } else if (payload.eventType === 'DELETE') {
          const index = newNotes.findIndex(n => n.id === payload.old.id)
          if (index !== -1) {
            newNotes.splice(index, 1)
          }
        }

        return { ...prev, notes: newNotes }
      })
    }

    const handleTemplateChange = (payload: any) => {
      setData(prev => {
        const newTemplates = [...prev.templates]
        
        if (payload.eventType === 'INSERT') {
          newTemplates.push(payload.new)
        } else if (payload.eventType === 'UPDATE') {
          const index = newTemplates.findIndex(t => t.id === payload.new.id)
          if (index !== -1) {
            newTemplates[index] = payload.new
          }
        } else if (payload.eventType === 'DELETE') {
          const index = newTemplates.findIndex(t => t.id === payload.old.id)
          if (index !== -1) {
            newTemplates.splice(index, 1)
          }
        }

        return { ...prev, templates: newTemplates }
      })
    }

    const handleProgressChange = (payload: any) => {
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        setData(prev => ({ ...prev, progress: payload.new }))
      }
    }

    // Initial data load
    const loadInitialData = async () => {
      try {
        setLoading(true)
        
        const [giftsResponse, notesResponse, templatesResponse, progressResponse] = await Promise.all([
          fetch(`/api/thank-you/gifts?organizationId=${organizationId}`),
          fetch(`/api/thank-you/notes?organizationId=${organizationId}`),
          fetch(`/api/thank-you/templates?organizationId=${organizationId}`),
          fetch(`/api/thank-you/progress?organizationId=${organizationId}`)
        ])

        const [gifts, notes, templates, progress] = await Promise.all([
          giftsResponse.json(),
          notesResponse.json(),
          templatesResponse.json(),
          progressResponse.json()
        ])

        setData({
          gifts: gifts.gifts || [],
          notes: notes || [],
          templates: templates || [],
          progress: progress || null
        })

        setError(null)
      } catch (err) {
        console.error('Error loading initial data:', err)
        setError('Failed to load thank you data')
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
    setupRealtime()

    return () => {
      channels.forEach(channel => channel.unsubscribe())
    }
  }, [organizationId])

  return { data, loading, error }
}
```

## 📊 Analytics and Progress Tracking

### Progress Analytics API (`/src/app/api/thank-you/analytics/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { withSecureValidation } from '@/lib/security/api-middleware'

export async function GET(request: NextRequest) {
  return withSecureValidation(request, async () => {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const timeRange = url.searchParams.get('timeRange') || '30d'
    const weddingId = url.searchParams.get('weddingId')

    // Calculate date range
    const now = new Date()
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 30
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

    // Base query filters
    const baseFilters = {
      organization_id: profile.organization_id,
      created_at: { gte: startDate.toISOString() }
    }

    if (weddingId) {
      baseFilters['wedding_id'] = weddingId
    }

    // Get comprehensive analytics data
    const [
      giftsData,
      notesData,
      templatesData,
      progressData,
      dailyProgress
    ] = await Promise.all([
      // Gift analytics
      supabase
        .from('thank_you_gifts')
        .select('thank_you_status, gift_category, gift_value, created_at, gift_received_date')
        .gte('created_at', startDate.toISOString())
        .eq('organization_id', profile.organization_id),

      // Note analytics
      supabase
        .from('thank_you_notes')
        .select('status, delivery_method, created_at, sent_date, delivered_date')
        .gte('created_at', startDate.toISOString())
        .eq('organization_id', profile.organization_id),

      // Template usage
      supabase
        .from('thank_you_templates')
        .select('id, template_name, template_type, times_used')
        .eq('organization_id', profile.organization_id),

      // Current progress
      supabase
        .from('thank_you_progress')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .single(),

      // Daily progress for charts
      supabase
        .rpc('get_daily_thank_you_progress', {
          org_id: profile.organization_id,
          start_date: startDate.toISOString(),
          end_date: now.toISOString()
        })
    ])

    // Process gift analytics
    const gifts = giftsData.data || []
    const giftAnalytics = {
      total: gifts.length,
      byStatus: gifts.reduce((acc, gift) => {
        acc[gift.thank_you_status] = (acc[gift.thank_you_status] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byCategory: gifts.reduce((acc, gift) => {
        acc[gift.gift_category] = (acc[gift.gift_category] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      totalValue: gifts.reduce((sum, gift) => sum + (gift.gift_value || 0), 0),
      averageValue: gifts.length > 0 ? gifts.reduce((sum, gift) => sum + (gift.gift_value || 0), 0) / gifts.length : 0,
      receivedByDate: gifts.reduce((acc, gift) => {
        const date = gift.gift_received_date ? new Date(gift.gift_received_date).toDateString() : 'Unknown'
        acc[date] = (acc[date] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    // Process note analytics
    const notes = notesData.data || []
    const noteAnalytics = {
      total: notes.length,
      byStatus: notes.reduce((acc, note) => {
        acc[note.status] = (acc[note.status] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byDeliveryMethod: notes.reduce((acc, note) => {
        acc[note.delivery_method] = (acc[note.delivery_method] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      averageTimeToSend: calculateAverageTimeToSend(notes),
      deliveryRate: calculateDeliveryRate(notes),
      sentByDate: notes.reduce((acc, note) => {
        const date = note.sent_date ? new Date(note.sent_date).toDateString() : 'Unsent'
        if (date !== 'Unsent') {
          acc[date] = (acc[date] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>)
    }

    // Process template analytics
    const templates = templatesData.data || []
    const templateAnalytics = {
      total: templates.length,
      mostUsed: templates
        .sort((a, b) => b.times_used - a.times_used)
        .slice(0, 5)
        .map(t => ({
          id: t.id,
          name: t.template_name,
          type: t.template_type,
          usage: t.times_used
        })),
      byType: templates.reduce((acc, template) => {
        acc[template.template_type] = (acc[template.template_type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      totalUsage: templates.reduce((sum, template) => sum + template.times_used, 0)
    }

    // Current progress
    const currentProgress = progressData.data || {
      total_gifts_received: 0,
      thank_you_notes_written: 0,
      thank_you_notes_sent: 0,
      thank_you_notes_delivered: 0,
      gifts_by_category: {},
      thank_you_by_method: {}
    }

    // Calculate completion rates
    const completionRate = currentProgress.total_gifts_received > 0 
      ? (currentProgress.thank_you_notes_delivered / currentProgress.total_gifts_received) * 100 
      : 0

    const responseRate = currentProgress.thank_you_notes_sent > 0
      ? (currentProgress.thank_you_notes_delivered / currentProgress.thank_you_notes_sent) * 100
      : 0

    // Generate insights and recommendations
    const insights = generateInsights(giftAnalytics, noteAnalytics, currentProgress)

    return NextResponse.json({
      gifts: giftAnalytics,
      notes: noteAnalytics,
      templates: templateAnalytics,
      progress: {
        ...currentProgress,
        completionRate: Math.round(completionRate * 10) / 10,
        responseRate: Math.round(responseRate * 10) / 10
      },
      dailyProgress: dailyProgress.data || [],
      insights,
      timeRange,
      lastUpdated: new Date().toISOString()
    })
  })
}

function calculateAverageTimeToSend(notes: any[]): number {
  const sentNotes = notes.filter(note => note.created_at && note.sent_date)
  
  if (sentNotes.length === 0) return 0

  const totalTime = sentNotes.reduce((sum, note) => {
    const created = new Date(note.created_at).getTime()
    const sent = new Date(note.sent_date).getTime()
    return sum + (sent - created)
  }, 0)

  // Return average time in days
  return Math.round((totalTime / sentNotes.length) / (1000 * 60 * 60 * 24) * 10) / 10
}

function calculateDeliveryRate(notes: any[]): number {
  const sentNotes = notes.filter(note => note.status === 'sent' || note.status === 'delivered')
  const deliveredNotes = notes.filter(note => note.status === 'delivered')
  
  if (sentNotes.length === 0) return 0
  
  return Math.round((deliveredNotes.length / sentNotes.length) * 100 * 10) / 10
}

function generateInsights(giftAnalytics: any, noteAnalytics: any, progress: any): string[] {
  const insights = []

  // Gift insights
  if (giftAnalytics.total > 0) {
    const pendingPercentage = ((giftAnalytics.byStatus.pending || 0) / giftAnalytics.total) * 100
    if (pendingPercentage > 30) {
      insights.push(`${Math.round(pendingPercentage)}% of gifts still need thank you notes. Consider setting daily goals to catch up.`)
    }

    const topCategory = Object.entries(giftAnalytics.byCategory)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]
    if (topCategory) {
      insights.push(`Most gifts are ${topCategory[0]} items (${topCategory[1]} gifts). Consider creating specialized templates for this category.`)
    }
  }

  // Note insights
  if (noteAnalytics.averageTimeToSend > 7) {
    insights.push(`It takes an average of ${noteAnalytics.averageTimeToSend} days to send thank you notes. Try to reduce this to under 7 days.`)
  }

  if (noteAnalytics.deliveryRate < 90) {
    insights.push(`Only ${noteAnalytics.deliveryRate}% of sent notes are confirmed delivered. Consider following up on undelivered notes.`)
  }

  // Progress insights
  const completionRate = progress.total_gifts_received > 0 
    ? (progress.thank_you_notes_delivered / progress.total_gifts_received) * 100 
    : 0

  if (completionRate < 50) {
    insights.push('You\'re less than halfway through your thank you notes. Set a daily goal of 5-10 notes to stay on track.')
  } else if (completionRate > 90) {
    insights.push('Excellent progress! You\'re almost done with all your thank you notes.')
  }

  return insights
}
```

## 🚀 Performance Optimizations

### Bulk Operations for Large Gift Lists
```typescript
// /src/lib/thank-you/bulk-operations.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface BulkGiftImport {
  gifts: Array<{
    giftDescription: string
    giftValue?: number
    giftCategory: string
    primaryGiverName: string
    secondaryGiverName?: string
    relationshipToCouple?: string
    giverAddress?: string
    giverPhone?: string
    giverEmail?: string
    giftReceivedDate?: string
    weddingEvent?: string
    personalNotes?: string
  }>
  importSource: string
  organizationId: string
}

export class ThankYouBulkOperations {
  private supabase = createClientComponentClient()
  private readonly BATCH_SIZE = 100
  private readonly MAX_CONCURRENT_BATCHES = 3

  async bulkImportGifts({ gifts, importSource, organizationId }: BulkGiftImport) {
    console.log(`Starting bulk import of ${gifts.length} gifts`)
    
    // Validate input
    if (gifts.length === 0) {
      throw new Error('No gifts to import')
    }
    
    if (gifts.length > 5000) {
      throw new Error('Maximum 5000 gifts per import')
    }

    // Split into batches
    const batches = this.chunkArray(gifts, this.BATCH_SIZE)
    const results = []
    let processedCount = 0

    // Process batches with concurrency control
    for (let i = 0; i < batches.length; i += this.MAX_CONCURRENT_BATCHES) {
      const batchGroup = batches.slice(i, i + this.MAX_CONCURRENT_BATCHES)
      
      const batchPromises = batchGroup.map(async (batch, batchIndex) => {
        const actualBatchIndex = i + batchIndex
        console.log(`Processing batch ${actualBatchIndex + 1}/${batches.length} (${batch.length} items)`)
        
        try {
          const transformedGifts = batch.map(gift => ({
            organization_id: organizationId,
            gift_description: gift.giftDescription,
            gift_value: gift.giftValue,
            gift_category: gift.giftCategory,
            primary_giver_name: gift.primaryGiverName,
            secondary_giver_name: gift.secondaryGiverName,
            relationship_to_couple: gift.relationshipToCouple,
            giver_address: gift.giverAddress,
            giver_phone: gift.giverPhone,
            giver_email: gift.giverEmail,
            gift_received_date: gift.giftReceivedDate,
            wedding_event: gift.weddingEvent,
            personal_notes: gift.personalNotes,
            imported_from: importSource,
            thank_you_status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))

          const { data, error } = await this.supabase
            .from('thank_you_gifts')
            .insert(transformedGifts)
            .select()

          if (error) {
            console.error(`Batch ${actualBatchIndex + 1} error:`, error)
            throw error
          }

          return data || []
        } catch (error) {
          console.error(`Batch ${actualBatchIndex + 1} failed:`, error)
          throw error
        }
      })

      const batchResults = await Promise.all(batchPromises)
      
      for (const batchResult of batchResults) {
        results.push(...batchResult)
        processedCount += batchResult.length
        
        // Report progress
        const progress = Math.round((processedCount / gifts.length) * 100)
        console.log(`Import progress: ${processedCount}/${gifts.length} (${progress}%)`)
        
        // Optional: Emit progress event for UI updates
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('bulkImportProgress', {
            detail: { processed: processedCount, total: gifts.length, progress }
          }))
        }
      }

      // Small delay between batch groups to prevent overwhelming the database
      if (i + this.MAX_CONCURRENT_BATCHES < batches.length) {
        await this.delay(100)
      }
    }

    // Update organization progress statistics
    await this.updateProgressStats(organizationId)

    console.log(`Bulk import completed: ${results.length} gifts imported successfully`)
    
    return {
      imported: results.length,
      failed: gifts.length - results.length,
      gifts: results
    }
  }

  async bulkUpdateGiftStatus(
    giftIds: string[], 
    newStatus: string, 
    organizationId: string
  ) {
    if (giftIds.length === 0) return { updated: 0 }
    
    console.log(`Bulk updating ${giftIds.length} gifts to status: ${newStatus}`)
    
    // Split into batches
    const batches = this.chunkArray(giftIds, this.BATCH_SIZE)
    let updatedCount = 0

    for (const batch of batches) {
      const { data, error } = await this.supabase
        .from('thank_you_gifts')
        .update({ 
          thank_you_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .in('id', batch)
        .eq('organization_id', organizationId)
        .select('id')

      if (error) {
        console.error('Batch update error:', error)
        throw error
      }

      updatedCount += data?.length || 0
    }

    // Update progress statistics
    await this.updateProgressStats(organizationId)

    return { updated: updatedCount }
  }

  async bulkDeleteGifts(giftIds: string[], organizationId: string) {
    if (giftIds.length === 0) return { deleted: 0 }
    
    console.log(`Bulk deleting ${giftIds.length} gifts`)
    
    // First, delete associated thank you notes
    await this.supabase
      .from('thank_you_notes')
      .delete()
      .in('gift_id', giftIds)
      .eq('organization_id', organizationId)

    // Then delete gifts in batches
    const batches = this.chunkArray(giftIds, this.BATCH_SIZE)
    let deletedCount = 0

    for (const batch of batches) {
      const { data, error } = await this.supabase
        .from('thank_you_gifts')
        .delete()
        .in('id', batch)
        .eq('organization_id', organizationId)
        .select('id')

      if (error) {
        console.error('Batch delete error:', error)
        throw error
      }

      deletedCount += data?.length || 0
    }

    // Update progress statistics
    await this.updateProgressStats(organizationId)

    return { deleted: deletedCount }
  }

  private async updateProgressStats(organizationId: string) {
    try {
      // Get current gift statistics
      const { data: gifts } = await this.supabase
        .from('thank_you_gifts')
        .select('thank_you_status, gift_category')
        .eq('organization_id', organizationId)

      if (!gifts) return

      const stats = {
        total_gifts_received: gifts.length,
        thank_you_notes_written: gifts.filter(g => ['written', 'sent', 'delivered'].includes(g.thank_you_status)).length,
        thank_you_notes_sent: gifts.filter(g => ['sent', 'delivered'].includes(g.thank_you_status)).length,
        thank_you_notes_delivered: gifts.filter(g => g.thank_you_status === 'delivered').length,
        gifts_by_category: gifts.reduce((acc, gift) => {
          acc[gift.gift_category] = (acc[gift.gift_category] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }

      await this.supabase
        .from('thank_you_progress')
        .upsert({
          organization_id: organizationId,
          ...stats,
          last_calculated: new Date().toISOString()
        })

      console.log('Progress statistics updated')
    } catch (error) {
      console.error('Error updating progress stats:', error)
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Usage example
export async function importGiftsFromCSV(
  csvData: string, 
  organizationId: string,
  importSource: string = 'csv'
) {
  const bulkOps = new ThankYouBulkOperations()
  
  // Parse CSV data (implement your CSV parser)
  const gifts = parseCSVToGifts(csvData)
  
  return await bulkOps.bulkImportGifts({
    gifts,
    importSource,
    organizationId
  })
}

function parseCSVToGifts(csvData: string) {
  // Implement CSV parsing logic
  // Return array of gift objects
  return []
}
```

## ✅ Acceptance Criteria Checklist

- [ ] **Complete Database Schema** implemented with all 6 thank you management tables and proper relationships
- [ ] **Comprehensive API Endpoints** provide full CRUD operations for gifts, notes, templates, and recipients
- [ ] **Bulk Operations Support** handles imports of 1000+ gifts efficiently with progress tracking
- [ ] **Real-time Synchronization** updates all connected clients instantly via Supabase realtime
- [ ] **Input Validation** prevents invalid data with comprehensive Zod schemas on all endpoints
- [ ] **Security Implementation** includes RLS policies and withSecureValidation middleware on all routes
- [ ] **Performance Optimization** includes batching, pagination, and indexing for large datasets
- [ ] **Analytics and Insights** provides comprehensive progress tracking and intelligent recommendations
- [ ] **Template Management** supports personalized thank you note templates with usage tracking
- [ ] **Audit Trail** maintains complete history of all changes with user attribution
- [ ] **Error Handling** provides detailed error messages and graceful degradation
- [ ] **Wedding Context Integration** includes wedding-specific fields and relationship mapping

Your backend creates the foundation for flawless wedding gratitude management that scales effortlessly.

**Remember**: Every database operation affects a couple's most precious memories. Build with the reliability of wedding vows! 💾💍
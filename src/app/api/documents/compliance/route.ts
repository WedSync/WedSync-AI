/**
 * Document Compliance API Route
 * Provides compliance dashboard data and alerts
 * WS-068: Wedding Business Compliance Hub
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { documentStorageService } from '@/lib/services/documentStorageService';

// GET /api/documents/compliance - Get compliance dashboard data
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const days = parseInt(searchParams.get('days') || '90');

    // Get compliance dashboard data
    const dashboardData = await documentStorageService.getComplianceDashboard(
      session.user.id,
      category || undefined,
      days,
    );

    return NextResponse.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('Compliance dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch compliance data' },
      { status: 500 },
    );
  }
}

// POST /api/documents/compliance - Update compliance tracking for document
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { document_id, expiry_date, warning_days, is_compliance_required } =
      body;

    if (!document_id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 },
      );
    }

    // Verify document ownership
    const { data: document, error: docError } = await supabase
      .from('business_documents')
      .select('id')
      .eq('id', document_id)
      .eq('user_id', session.user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 },
      );
    }

    // Update document compliance tracking
    await documentStorageService.updateExpiryTracking(
      document_id,
      session.user.id,
      expiry_date,
      warning_days || 30,
      is_compliance_required,
    );

    return NextResponse.json({
      success: true,
      message: 'Compliance tracking updated successfully',
    });
  } catch (error) {
    console.error('Compliance update error:', error);
    return NextResponse.json(
      { error: 'Failed to update compliance tracking' },
      { status: 500 },
    );
  }
}

// PUT /api/documents/compliance - Bulk compliance operations
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, document_ids, ...payload } = body;

    if (!action || !document_ids || !Array.isArray(document_ids)) {
      return NextResponse.json(
        { error: 'Invalid bulk compliance operation request' },
        { status: 400 },
      );
    }

    // Verify all documents belong to user
    const { data: documents, error: docsError } = await supabase
      .from('business_documents')
      .select('id')
      .eq('user_id', session.user.id)
      .in('id', document_ids);

    if (docsError || documents.length !== document_ids.length) {
      return NextResponse.json(
        { error: 'Some documents not found or access denied' },
        { status: 404 },
      );
    }

    let result;

    switch (action) {
      case 'mark_compliance_required':
        const { data: complianceResult } = await supabase
          .from('business_documents')
          .update({
            is_compliance_required: true,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', session.user.id)
          .in('id', document_ids);

        result = { updated_count: document_ids.length };
        break;

      case 'update_warning_days':
        if (!payload.warning_days) {
          return NextResponse.json(
            { error: 'Warning days required for this operation' },
            { status: 400 },
          );
        }

        const { data: warningResult } = await supabase
          .from('business_documents')
          .update({
            expiry_warning_days: payload.warning_days,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', session.user.id)
          .in('id', document_ids);

        result = { updated_count: document_ids.length };
        break;

      case 'refresh_compliance_status':
        // Update compliance status for all documents
        for (const docId of document_ids) {
          await documentStorageService.updateComplianceStatus(docId);
        }

        result = { updated_count: document_ids.length };
        break;

      default:
        return NextResponse.json(
          { error: `Unknown bulk compliance action: ${action}` },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      result,
      message: `Bulk compliance ${action} completed successfully`,
    });
  } catch (error) {
    console.error('Bulk compliance operation error:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk compliance operation' },
      { status: 500 },
    );
  }
}

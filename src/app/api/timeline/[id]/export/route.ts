// =====================================================
// TIMELINE EXPORT API ENDPOINT
// =====================================================
// Professional timeline export system supporting PDF, CSV, Excel, and iCal formats
// Secure file handling with temporary URLs and progress tracking
// Feature ID: WS-160 - Timeline Builder UI
// Created: 2025-08-27
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import {
  TimelineExportService,
  type ExportOptions,
  type ExportProgress,
} from '@/lib/services/timelineExportService';
import { validateExportOptions } from '@/lib/services/timelineExportService';
import type {
  WeddingTimeline,
  TimelineEvent,
  TimelineExport,
} from '@/types/timeline';

// =====================================================
// TYPES & INTERFACES
// =====================================================

interface ExportRequest extends TimelineExport {
  // WS-160 specific options
  clientFriendlyVersion?: boolean;
  vendorDetailedVersion?: boolean;
  printOptimized?: boolean;
  includeContactInfo?: boolean;
  includeLocationMaps?: boolean;
  reminderSettings?: boolean;
  email_export?: {
    recipient_email: string;
    subject?: string;
    message?: string;
  };
}

interface SecureExportResult {
  success: boolean;
  export_id: string;
  secure_url: string;
  filename: string;
  expires_at: string;
  download_limit?: number;
  error?: string;
}

// =====================================================
// EXPORT ENDPOINT
// =====================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient();
    const timelineId = params.id;

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Parse request body
    const exportRequest: ExportRequest = await request.json();

    // Validate export options
    const validation = validateExportOptions(exportRequest);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid export options',
          details: validation.errors,
        },
        { status: 400 },
      );
    }

    // Get timeline with events and vendor details
    const { data: timeline, error: timelineError } = await supabase
      .from('wedding_timelines')
      .select(
        `
        *,
        events:timeline_events(
          *,
          vendors:timeline_event_vendors(
            *,
            vendor:vendors(
              id,
              business_name,
              business_type,
              email,
              phone,
              avatar_url
            )
          )
        )
      `,
      )
      .eq('id', timelineId)
      .single();

    if (timelineError || !timeline) {
      return NextResponse.json(
        { success: false, error: 'Timeline not found' },
        { status: 404 },
      );
    }

    // Check permissions - user must be owner or collaborator
    const { data: access } = await supabase
      .from('timeline_collaborators')
      .select('role, can_edit')
      .eq('timeline_id', timelineId)
      .eq('user_id', user.id)
      .single();

    if (!access && timeline.created_by !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 },
      );
    }

    // Filter events based on export options
    let events = timeline.events || [];

    // Apply date range filtering
    if (exportRequest.date_range?.start || exportRequest.date_range?.end) {
      events = events.filter((event) => {
        const eventDate = new Date(event.start_time);
        if (
          exportRequest.date_range?.start &&
          eventDate < new Date(exportRequest.date_range.start)
        ) {
          return false;
        }
        if (
          exportRequest.date_range?.end &&
          eventDate > new Date(exportRequest.date_range.end)
        ) {
          return false;
        }
        return true;
      });
    }

    // Apply event type filtering
    if (exportRequest.event_types?.length) {
      events = events.filter((event) =>
        exportRequest.event_types!.includes(event.event_type!),
      );
    }

    // Apply vendor filtering
    if (exportRequest.vendor_id) {
      events = events.filter((event) =>
        event.vendors?.some((v) => v.vendor_id === exportRequest.vendor_id),
      );
    }

    // Prepare export options with branding
    const exportOptions: ExportOptions = {
      ...exportRequest,
      branding: exportRequest.branding || {
        company_name: timeline.organization?.name || 'WedSync',
        footer_text:
          'Generated by WedSync - Professional Wedding Timeline Management',
      },
    };

    // Create export service with progress tracking
    let progressData: ExportProgress | null = null;
    const exportService = new TimelineExportService((progress) => {
      progressData = progress;
    });

    // Perform the export
    const exportResult = await exportService.exportTimeline(
      timeline as WeddingTimeline,
      events as TimelineEvent[],
      exportOptions,
    );

    if (!exportResult.success || !exportResult.blob) {
      return NextResponse.json(
        { success: false, error: exportResult.error || 'Export failed' },
        { status: 500 },
      );
    }

    // Store the file securely and create temporary URL
    const secureResult = await storeSecureExport(
      exportResult.blob,
      exportResult.filename,
      timelineId,
      user.id,
      exportRequest.file_security,
    );

    if (!secureResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to create secure export' },
        { status: 500 },
      );
    }

    // Log the export activity
    await supabase.from('timeline_activity_logs').insert({
      timeline_id: timelineId,
      action: 'exported',
      entity_type: 'timeline',
      entity_id: timelineId,
      user_id: user.id,
      user_name: user.user_metadata?.full_name || user.email,
      new_values: {
        format: exportRequest.format,
        version: exportRequest.clientFriendlyVersion
          ? 'client'
          : exportRequest.vendorDetailedVersion
            ? 'vendor'
            : 'standard',
        file_size: exportResult.size,
      },
    });

    // Send email if requested
    if (exportRequest.email_export) {
      await sendExportEmail(
        exportRequest.email_export,
        secureResult,
        timeline.name,
        user,
      );
    }

    // Return secure export details
    return NextResponse.json({
      success: true,
      export_id: secureResult.export_id,
      secure_url: secureResult.secure_url,
      filename: secureResult.filename,
      expires_at: secureResult.expires_at,
      download_limit: secureResult.download_limit,
      file_size: exportResult.size,
      progress: progressData,
    });
  } catch (error) {
    console.error('Timeline export error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// =====================================================
// SECURE FILE STORAGE
// =====================================================

async function storeSecureExport(
  blob: Blob,
  filename: string,
  timelineId: string,
  userId: string,
  security?: { password_protected?: boolean; expiry_hours?: number },
): Promise<SecureExportResult> {
  try {
    const supabase = createClient();

    // Create unique export ID
    const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiryHours = security?.expiry_hours || 24;
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    // Convert blob to buffer for storage
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Store in Supabase Storage with expiry
    const storageClient = supabase.storage.from('timeline-exports');
    const { data: uploadData, error: uploadError } = await storageClient.upload(
      `${timelineId}/${exportId}/${filename}`,
      buffer,
      {
        contentType: blob.type,
        metadata: {
          timeline_id: timelineId,
          user_id: userId,
          expires_at: expiresAt.toISOString(),
          password_protected:
            security?.password_protected?.toString() || 'false',
        },
      },
    );

    if (uploadError) {
      throw uploadError;
    }

    // Create export record in database
    const { data: exportRecord, error: recordError } = await supabase
      .from('timeline_exports')
      .insert({
        id: exportId,
        timeline_id: timelineId,
        user_id: userId,
        filename: filename,
        file_path: uploadData.path,
        file_size: buffer.length,
        mime_type: blob.type,
        expires_at: expiresAt.toISOString(),
        download_limit: 10, // Allow up to 10 downloads
        is_password_protected: security?.password_protected || false,
      })
      .select()
      .single();

    if (recordError) {
      throw recordError;
    }

    // Generate secure signed URL
    const { data: urlData, error: urlError } =
      await storageClient.createSignedUrl(uploadData.path, expiryHours * 3600);

    if (urlError) {
      throw urlError;
    }

    return {
      success: true,
      export_id: exportId,
      secure_url: urlData.signedUrl,
      filename: filename,
      expires_at: expiresAt.toISOString(),
      download_limit: 10,
    };
  } catch (error) {
    console.error('Secure export storage failed:', error);
    return {
      success: false,
      export_id: '',
      secure_url: '',
      filename: '',
      expires_at: '',
      error: error instanceof Error ? error.message : 'Storage failed',
    };
  }
}

// =====================================================
// EMAIL EXPORT FUNCTIONALITY
// =====================================================

async function sendExportEmail(
  emailOptions: { recipient_email: string; subject?: string; message?: string },
  exportResult: SecureExportResult,
  timelineName: string,
  user: any,
): Promise<void> {
  try {
    const supabase = createClient();

    // Create email template
    const subject =
      emailOptions.subject || `Wedding Timeline Export: ${timelineName}`;
    const message =
      emailOptions.message ||
      `
      Your wedding timeline export is ready for download.
      
      Timeline: ${timelineName}
      Export expires: ${new Date(exportResult.expires_at).toLocaleString()}
      
      Download your timeline: ${exportResult.secure_url}
      
      This link will expire in 24 hours for security.
      
      Best regards,
      ${user.user_metadata?.full_name || 'Your Wedding Team'}
    `;

    // Send email via Supabase Edge Function or your email service
    await supabase.functions.invoke('send-export-email', {
      body: {
        to: emailOptions.recipient_email,
        subject: subject,
        message: message,
        secure_url: exportResult.secure_url,
        timeline_name: timelineName,
        expires_at: exportResult.expires_at,
      },
    });
  } catch (error) {
    console.error('Failed to send export email:', error);
    // Don't throw - email failure shouldn't stop the export
  }
}

// =====================================================
// EXPORT DOWNLOAD ENDPOINT
// =====================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { searchParams } = new URL(request.url);
    const exportId = searchParams.get('export_id');

    if (!exportId) {
      return NextResponse.json(
        { success: false, error: 'Export ID required' },
        { status: 400 },
      );
    }

    const supabase = createClient();

    // Get export record
    const { data: exportRecord, error: recordError } = await supabase
      .from('timeline_exports')
      .select('*')
      .eq('id', exportId)
      .single();

    if (recordError || !exportRecord) {
      return NextResponse.json(
        { success: false, error: 'Export not found' },
        { status: 404 },
      );
    }

    // Check if expired
    if (new Date(exportRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Export has expired' },
        { status: 410 },
      );
    }

    // Check download limit
    if (exportRecord.downloads_count >= exportRecord.download_limit) {
      return NextResponse.json(
        { success: false, error: 'Download limit exceeded' },
        { status: 429 },
      );
    }

    // Increment download count
    await supabase
      .from('timeline_exports')
      .update({
        downloads_count: exportRecord.downloads_count + 1,
        last_downloaded_at: new Date().toISOString(),
      })
      .eq('id', exportId);

    // Get file from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('timeline-exports')
      .download(exportRecord.file_path);

    if (fileError || !fileData) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 },
      );
    }

    // Return file with appropriate headers
    const headers = new Headers({
      'Content-Type': exportRecord.mime_type,
      'Content-Disposition': `attachment; filename="${exportRecord.filename}"`,
      'Content-Length': exportRecord.file_size.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Export-ID': exportId,
    });

    return new NextResponse(fileData, { headers });
  } catch (error) {
    console.error('Export download error:', error);
    return NextResponse.json(
      { success: false, error: 'Download failed' },
      { status: 500 },
    );
  }
}

// CRM Integration API Endpoints
// Handles HoneyBook, Tave, Light Blue, and other CRM platform connections

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { VendorCRMSyncManager } from '@/lib/integrations/marketplace/vendor-crm-sync-manager';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const crmManager = new VendorCRMSyncManager();
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const vendorId = searchParams.get('vendorId');
    const platform = searchParams.get('platform');
    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID required' },
        { status: 400 },
      );
    }

    switch (action) {
      case 'connections':
        // Get all CRM connections for vendor
        const connections = await crmManager.getAllConnections(vendorId);
        return NextResponse.json({ success: true, data: connections });
      case 'sync-status':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Get sync status for specific platform
        const syncStatus = await crmManager.getSyncStatus(vendorId, platform);
        return NextResponse.json({ success: true, data: syncStatus });
      case 'platforms':
        // Get available CRM platforms
        const platforms = await crmManager.getAvailablePlatforms();
        return NextResponse.json({ success: true, data: platforms });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('CRM API GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, vendorId, platform, connectionData } = body;
    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID required' },
        { status: 400 },
      );
    }

    switch (action) {
      case 'connect':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Connect to CRM platform
        const connection = await crmManager.connectCRMPlatform(
          platform,
          vendorId,
        );
        return NextResponse.json({
          success: true,
          data: connection,
          message: `Successfully connected to ${platform}`,
        });
      case 'sync':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Perform CRM sync
        const syncResult = await crmManager.syncCRMData(vendorId, platform);
        return NextResponse.json({
          success: true,
          data: syncResult,
          message: `Sync completed for ${platform}`,
        });
      case 'import-clients':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Import clients from CRM
        const importResult = await crmManager.importClients(vendorId, platform);
        return NextResponse.json({
          success: true,
          data: importResult,
          message: `Imported ${importResult.clientsImported} clients from ${platform}`,
        });
      case 'export-leads':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Export leads to CRM
        const exportResult = await crmManager.exportLeads(vendorId, platform);
        return NextResponse.json({
          success: true,
          data: exportResult,
          message: `Exported ${exportResult.leadsExported} leads to ${platform}`,
        });
      case 'sync-workflows':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Sync workflow templates
        const workflowResult = await crmManager.syncWorkflowTemplates(
          vendorId,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: workflowResult,
          message: `Synced ${workflowResult.workflowsSynced} workflows with ${platform}`,
        });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('CRM API POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, vendorId, platform, connectionId, settings } = body;
    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID required' },
        { status: 400 },
      );
    }

    switch (action) {
      case 'update-settings':
        if (!connectionId) {
          return NextResponse.json(
            { error: 'Connection ID required' },
            { status: 400 },
          );
        }

        // Update CRM connection settings
        const updateResult = await crmManager.updateSyncSettings(
          connectionId,
          settings,
        );
        return NextResponse.json({
          success: true,
          data: updateResult,
          message: 'CRM settings updated successfully',
        });
      case 'toggle-auto-sync':
        if (!connectionId) {
          return NextResponse.json(
            { error: 'Connection ID required' },
            { status: 400 },
          );
        }

        // Toggle auto-sync
        const toggleResult = await crmManager.toggleAutoSync(connectionId);
        return NextResponse.json({
          success: true,
          data: toggleResult,
          message: `Auto-sync ${toggleResult.enabled ? 'enabled' : 'disabled'}`,
        });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('CRM API PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const vendorId = searchParams.get('vendorId');
    if (!connectionId || !vendorId) {
      return NextResponse.json(
        { error: 'Connection ID and Vendor ID required' },
        { status: 400 },
      );
    }

    // Disconnect CRM platform
    const result = await crmManager.disconnectCRM(connectionId, vendorId);
    return NextResponse.json({
      success: true,
      data: result,
      message: 'CRM connection removed successfully',
    });
  } catch (error) {
    console.error('CRM API DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}

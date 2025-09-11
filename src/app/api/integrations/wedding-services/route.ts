// Wedding Services Integration API Endpoints
// Handles The Knot, WeddingWire, Zola, and other wedding platform connections

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { WeddingServiceAPIManager } from '@/lib/integrations/marketplace/wedding-service-api-manager';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const weddingServiceManager = new WeddingServiceAPIManager();

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
        // Get all wedding service connections for vendor
        const connections =
          await weddingServiceManager.getAllConnections(vendorId);
        return NextResponse.json({ success: true, data: connections });

      case 'leads':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        const limit = searchParams.get('limit') || '50';
        const offset = searchParams.get('offset') || '0';

        // Get leads from specific platform
        const leads = await weddingServiceManager.getLeads(vendorId, platform, {
          limit: parseInt(limit),
          offset: parseInt(offset),
        });
        return NextResponse.json({ success: true, data: leads });

      case 'profile':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Get vendor profile from platform
        const profile = await weddingServiceManager.getVendorProfile(
          vendorId,
          platform,
        );
        return NextResponse.json({ success: true, data: profile });

      case 'reviews':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Get reviews from platform
        const reviews = await weddingServiceManager.getReviews(
          vendorId,
          platform,
        );
        return NextResponse.json({ success: true, data: reviews });

      case 'analytics':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        const dateRange = searchParams.get('dateRange') || '30';

        // Get analytics data
        const analytics = await weddingServiceManager.getAnalytics(
          vendorId,
          platform,
          parseInt(dateRange),
        );
        return NextResponse.json({ success: true, data: analytics });

      case 'sync-status':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Get sync status for platform
        const syncStatus = await weddingServiceManager.getSyncStatus(
          vendorId,
          platform,
        );
        return NextResponse.json({ success: true, data: syncStatus });

      case 'platforms':
        // Get supported wedding platforms
        const platforms = await weddingServiceManager.getSupportedPlatforms();
        return NextResponse.json({ success: true, data: platforms });

      case 'market-insights':
        // Get market insights and competitor analysis
        const insights = await weddingServiceManager.getMarketInsights(
          vendorId,
          platform,
        );
        return NextResponse.json({ success: true, data: insights });

      case 'booking-calendar':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Get booking calendar availability
        const calendar = await weddingServiceManager.getBookingCalendar(
          vendorId,
          platform,
        );
        return NextResponse.json({ success: true, data: calendar });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Wedding Services API GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, vendorId, platform, profileData, leadData, responseData } =
      body;

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

        // Connect to wedding service platform
        const connection = await weddingServiceManager.connectPlatform(
          platform,
          vendorId,
        );
        return NextResponse.json({
          success: true,
          data: connection,
          message: `Successfully connected to ${platform}`,
        });

      case 'update-profile':
        if (!platform || !profileData) {
          return NextResponse.json(
            { error: 'Platform and profile data required' },
            { status: 400 },
          );
        }

        // Update vendor profile on platform
        const profile = await weddingServiceManager.updateVendorProfile(
          vendorId,
          platform,
          profileData,
        );
        return NextResponse.json({
          success: true,
          data: profile,
          message: 'Profile updated successfully',
        });

      case 'respond-to-lead':
        if (!leadData || !responseData) {
          return NextResponse.json(
            { error: 'Lead data and response required' },
            { status: 400 },
          );
        }

        // Respond to wedding lead
        const response = await weddingServiceManager.respondToLead(
          vendorId,
          leadData.leadId,
          responseData,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: response,
          message: 'Lead response sent successfully',
        });

      case 'sync-leads':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Sync leads from platform
        const syncResult = await weddingServiceManager.syncLeads(
          vendorId,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: syncResult,
          message: `Synced ${syncResult.leadsSynced} leads from ${platform}`,
        });

      case 'upload-photos':
        if (!profileData?.photos || !Array.isArray(profileData.photos)) {
          return NextResponse.json(
            { error: 'Photos array required' },
            { status: 400 },
          );
        }

        // Upload photos to platform profile
        const uploadResult = await weddingServiceManager.uploadProfilePhotos(
          vendorId,
          platform || 'theknot', // Default to The Knot
          profileData.photos,
        );
        return NextResponse.json({
          success: true,
          data: uploadResult,
          message: `Uploaded ${uploadResult.photosUploaded} photos successfully`,
        });

      case 'create-showcase':
        if (!profileData) {
          return NextResponse.json(
            { error: 'Showcase data required' },
            { status: 400 },
          );
        }

        // Create wedding showcase/portfolio
        const showcase = await weddingServiceManager.createWeddingShowcase(
          vendorId,
          platform,
          profileData,
        );
        return NextResponse.json({
          success: true,
          data: showcase,
          message: 'Wedding showcase created successfully',
        });

      case 'boost-listing':
        // Boost listing visibility (paid feature)
        const boostResult = await weddingServiceManager.boostListing(
          vendorId,
          platform,
          profileData?.boostOptions,
        );
        return NextResponse.json({
          success: true,
          data: boostResult,
          message: 'Listing boost activated successfully',
        });

      case 'request-reviews':
        if (!leadData?.clientContacts) {
          return NextResponse.json(
            { error: 'Client contacts required' },
            { status: 400 },
          );
        }

        // Request reviews from past clients
        const reviewRequest = await weddingServiceManager.requestClientReviews(
          vendorId,
          platform,
          leadData.clientContacts,
        );
        return NextResponse.json({
          success: true,
          data: reviewRequest,
          message: `Review requests sent to ${reviewRequest.requestsSent} clients`,
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Wedding Services API POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, vendorId, platform, leadId, updateData, settings } = body;

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID required' },
        { status: 400 },
      );
    }

    switch (action) {
      case 'update-lead-status':
        if (!leadId || !updateData?.status) {
          return NextResponse.json(
            { error: 'Lead ID and status required' },
            { status: 400 },
          );
        }

        // Update lead status (contacted, qualified, booked, etc.)
        const updatedLead = await weddingServiceManager.updateLeadStatus(
          vendorId,
          leadId,
          updateData.status,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: updatedLead,
          message: 'Lead status updated successfully',
        });

      case 'update-pricing':
        if (!updateData?.pricing) {
          return NextResponse.json(
            { error: 'Pricing data required' },
            { status: 400 },
          );
        }

        // Update pricing on platform
        const pricingUpdate = await weddingServiceManager.updatePricing(
          vendorId,
          platform,
          updateData.pricing,
        );
        return NextResponse.json({
          success: true,
          data: pricingUpdate,
          message: 'Pricing updated successfully',
        });

      case 'update-availability':
        if (!updateData?.availability) {
          return NextResponse.json(
            { error: 'Availability data required' },
            { status: 400 },
          );
        }

        // Update availability calendar
        const availability = await weddingServiceManager.updateAvailability(
          vendorId,
          platform,
          updateData.availability,
        );
        return NextResponse.json({
          success: true,
          data: availability,
          message: 'Availability updated successfully',
        });

      case 'update-sync-settings':
        // Update platform sync settings
        const updateResult = await weddingServiceManager.updateSyncSettings(
          vendorId,
          platform,
          settings,
        );
        return NextResponse.json({
          success: true,
          data: updateResult,
          message: 'Sync settings updated successfully',
        });

      case 'set-auto-responses':
        if (!settings?.autoResponses) {
          return NextResponse.json(
            { error: 'Auto-response settings required' },
            { status: 400 },
          );
        }

        // Set automatic lead response settings
        const autoResponseResult = await weddingServiceManager.setAutoResponses(
          vendorId,
          platform,
          settings.autoResponses,
        );
        return NextResponse.json({
          success: true,
          data: autoResponseResult,
          message: 'Auto-response settings updated successfully',
        });

      case 'toggle-lead-notifications':
        const connectionId = body.connectionId;
        if (!connectionId) {
          return NextResponse.json(
            { error: 'Connection ID required' },
            { status: 400 },
          );
        }

        // Toggle lead notifications
        const toggleResult =
          await weddingServiceManager.toggleLeadNotifications(connectionId);
        return NextResponse.json({
          success: true,
          data: toggleResult,
          message: `Lead notifications ${toggleResult.enabled ? 'enabled' : 'disabled'}`,
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Wedding Services API PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const platform = searchParams.get('platform');
    const connectionId = searchParams.get('connectionId');
    const leadId = searchParams.get('leadId');
    const showcaseId = searchParams.get('showcaseId');
    const action = searchParams.get('action');

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID required' },
        { status: 400 },
      );
    }

    switch (action) {
      case 'delete-lead':
        if (!leadId) {
          return NextResponse.json(
            { error: 'Lead ID required' },
            { status: 400 },
          );
        }

        // Delete lead record
        const result = await weddingServiceManager.deleteLead(
          vendorId,
          leadId,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: result,
          message: 'Lead deleted successfully',
        });

      case 'delete-showcase':
        if (!showcaseId) {
          return NextResponse.json(
            { error: 'Showcase ID required' },
            { status: 400 },
          );
        }

        // Delete wedding showcase
        const showcaseResult =
          await weddingServiceManager.deleteWeddingShowcase(
            vendorId,
            showcaseId,
            platform,
          );
        return NextResponse.json({
          success: true,
          data: showcaseResult,
          message: 'Wedding showcase deleted successfully',
        });

      case 'remove-photos':
        const photoIds = searchParams.get('photoIds')?.split(',');
        if (!photoIds?.length) {
          return NextResponse.json(
            { error: 'Photo IDs required' },
            { status: 400 },
          );
        }

        // Remove photos from profile
        const photoResult = await weddingServiceManager.removeProfilePhotos(
          vendorId,
          photoIds,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: photoResult,
          message: `Removed ${photoResult.photosRemoved} photos successfully`,
        });

      case 'disconnect':
        if (!connectionId) {
          return NextResponse.json(
            { error: 'Connection ID required' },
            { status: 400 },
          );
        }

        // Disconnect wedding service platform
        const disconnectResult = await weddingServiceManager.disconnectPlatform(
          connectionId,
          vendorId,
        );
        return NextResponse.json({
          success: true,
          data: disconnectResult,
          message: 'Wedding service platform disconnected successfully',
        });

      case 'clear-sync-data':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Clear local sync data
        const clearResult = await weddingServiceManager.clearSyncData(
          vendorId,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: clearResult,
          message: 'Sync data cleared successfully',
        });

      case 'deactivate-listing':
        // Temporarily deactivate platform listing
        const deactivateResult = await weddingServiceManager.deactivateListing(
          vendorId,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: deactivateResult,
          message: 'Listing deactivated successfully',
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Wedding Services API DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}

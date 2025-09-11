// Portfolio Integration API Endpoints
// Handles SmugMug, Pixieset, Zenfolio, and other portfolio platform connections

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PortfolioIntegrationManager } from '@/lib/integrations/marketplace/portfolio-integration-manager';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const portfolioManager = new PortfolioIntegrationManager();

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
      case 'portfolios':
        // Get all portfolio connections for vendor
        const portfolios = await portfolioManager.getAllPortfolios(vendorId);
        return NextResponse.json({ success: true, data: portfolios });

      case 'galleries':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Get galleries from specific platform
        const galleries = await portfolioManager.getGalleries(
          vendorId,
          platform,
        );
        return NextResponse.json({ success: true, data: galleries });

      case 'gallery-photos':
        const galleryId = searchParams.get('galleryId');
        if (!galleryId) {
          return NextResponse.json(
            { error: 'Gallery ID required' },
            { status: 400 },
          );
        }

        // Get photos from specific gallery
        const photos = await portfolioManager.getGalleryPhotos(
          vendorId,
          galleryId,
          platform,
        );
        return NextResponse.json({ success: true, data: photos });

      case 'client-galleries':
        const clientId = searchParams.get('clientId');
        if (!clientId) {
          return NextResponse.json(
            { error: 'Client ID required' },
            { status: 400 },
          );
        }

        // Get galleries for specific client
        const clientGalleries = await portfolioManager.getClientGalleries(
          vendorId,
          clientId,
        );
        return NextResponse.json({ success: true, data: clientGalleries });

      case 'sync-status':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Get sync status for platform
        const syncStatus = await portfolioManager.getSyncStatus(
          vendorId,
          platform,
        );
        return NextResponse.json({ success: true, data: syncStatus });

      case 'platforms':
        // Get supported portfolio platforms
        const platforms = await portfolioManager.getSupportedPlatforms();
        return NextResponse.json({ success: true, data: platforms });

      case 'storage-usage':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Get storage usage statistics
        const storageUsage = await portfolioManager.getStorageUsage(
          vendorId,
          platform,
        );
        return NextResponse.json({ success: true, data: storageUsage });

      case 'download-stats':
        const dateRange = searchParams.get('dateRange') || '30';

        // Get download statistics
        const downloadStats = await portfolioManager.getDownloadStatistics(
          vendorId,
          platform,
          parseInt(dateRange),
        );
        return NextResponse.json({ success: true, data: downloadStats });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Portfolio API GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, vendorId, platform, galleryData, photoData, clientData } =
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

        // Connect to portfolio platform
        const connection = await portfolioManager.connectPortfolioPlatform(
          platform,
          vendorId,
        );
        return NextResponse.json({
          success: true,
          data: connection,
          message: `Successfully connected to ${platform}`,
        });

      case 'create-gallery':
        if (!galleryData) {
          return NextResponse.json(
            { error: 'Gallery data required' },
            { status: 400 },
          );
        }

        // Create new gallery
        const gallery = await portfolioManager.createGallery(
          vendorId,
          platform || 'smugmug', // Default to SmugMug
          galleryData,
        );
        return NextResponse.json({
          success: true,
          data: gallery,
          message: 'Gallery created successfully',
        });

      case 'upload-photos':
        if (!photoData || !Array.isArray(photoData)) {
          return NextResponse.json(
            { error: 'Photo data array required' },
            { status: 400 },
          );
        }

        const galleryId = body.galleryId;
        if (!galleryId) {
          return NextResponse.json(
            { error: 'Gallery ID required' },
            { status: 400 },
          );
        }

        // Upload photos to gallery
        const uploadResult = await portfolioManager.uploadPhotos(
          vendorId,
          galleryId,
          photoData,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: uploadResult,
          message: `Uploaded ${uploadResult.photosUploaded} photos successfully`,
        });

      case 'bulk-upload':
        if (!photoData || !Array.isArray(photoData)) {
          return NextResponse.json(
            { error: 'Photo data array required' },
            { status: 400 },
          );
        }

        // Bulk upload photos across multiple galleries
        const bulkResult = await portfolioManager.bulkUploadPhotos(
          vendorId,
          photoData,
          platform || 'smugmug',
        );
        return NextResponse.json({
          success: true,
          data: bulkResult,
          message: `Bulk uploaded ${bulkResult.totalPhotosUploaded} photos`,
        });

      case 'share-gallery':
        const shareGalleryId = body.galleryId;
        if (!shareGalleryId || !clientData) {
          return NextResponse.json(
            { error: 'Gallery ID and client data required' },
            { status: 400 },
          );
        }

        // Share gallery with client
        const shareResult = await portfolioManager.shareGalleryWithClient(
          vendorId,
          shareGalleryId,
          clientData,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: shareResult,
          message: 'Gallery shared successfully',
        });

      case 'sync':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Sync portfolio data
        const syncResult = await portfolioManager.syncPortfolioData(
          vendorId,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: syncResult,
          message: `Synced ${syncResult.galleriesSynced} galleries from ${platform}`,
        });

      case 'create-client-portal':
        if (!clientData) {
          return NextResponse.json(
            { error: 'Client data required' },
            { status: 400 },
          );
        }

        // Create dedicated client portal
        const portal = await portfolioManager.createClientPortal(
          vendorId,
          clientData,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: portal,
          message: 'Client portal created successfully',
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Portfolio API POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      vendorId,
      platform,
      galleryId,
      photoId,
      updateData,
      settings,
    } = body;

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID required' },
        { status: 400 },
      );
    }

    switch (action) {
      case 'update-gallery':
        if (!galleryId || !updateData) {
          return NextResponse.json(
            { error: 'Gallery ID and update data required' },
            { status: 400 },
          );
        }

        // Update gallery details
        const updatedGallery = await portfolioManager.updateGallery(
          vendorId,
          galleryId,
          updateData,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: updatedGallery,
          message: 'Gallery updated successfully',
        });

      case 'update-photo-metadata':
        if (!photoId || !updateData) {
          return NextResponse.json(
            { error: 'Photo ID and update data required' },
            { status: 400 },
          );
        }

        // Update photo metadata
        const updatedPhoto = await portfolioManager.updatePhotoMetadata(
          vendorId,
          photoId,
          updateData,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: updatedPhoto,
          message: 'Photo metadata updated successfully',
        });

      case 'set-gallery-permissions':
        if (!galleryId || !settings.permissions) {
          return NextResponse.json(
            { error: 'Gallery ID and permissions required' },
            { status: 400 },
          );
        }

        // Set gallery access permissions
        const permissions = await portfolioManager.setGalleryPermissions(
          vendorId,
          galleryId,
          settings.permissions,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: permissions,
          message: 'Gallery permissions updated successfully',
        });

      case 'update-sync-settings':
        // Update portfolio sync settings
        const updateResult = await portfolioManager.updateSyncSettings(
          vendorId,
          platform,
          settings,
        );
        return NextResponse.json({
          success: true,
          data: updateResult,
          message: 'Sync settings updated successfully',
        });

      case 'organize-photos':
        if (!galleryId || !updateData.organization) {
          return NextResponse.json(
            { error: 'Gallery ID and organization data required' },
            { status: 400 },
          );
        }

        // Organize photos in gallery
        const organizationResult = await portfolioManager.organizePhotos(
          vendorId,
          galleryId,
          updateData.organization,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: organizationResult,
          message: 'Photos organized successfully',
        });

      case 'toggle-auto-sync':
        const connectionId = body.connectionId;
        if (!connectionId) {
          return NextResponse.json(
            { error: 'Connection ID required' },
            { status: 400 },
          );
        }

        // Toggle automatic sync
        const toggleResult =
          await portfolioManager.toggleAutoSync(connectionId);
        return NextResponse.json({
          success: true,
          data: toggleResult,
          message: `Auto-sync ${toggleResult.enabled ? 'enabled' : 'disabled'}`,
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Portfolio API PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const galleryId = searchParams.get('galleryId');
    const photoId = searchParams.get('photoId');
    const vendorId = searchParams.get('vendorId');
    const platform = searchParams.get('platform');
    const connectionId = searchParams.get('connectionId');
    const action = searchParams.get('action');

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID required' },
        { status: 400 },
      );
    }

    switch (action) {
      case 'delete-gallery':
        if (!galleryId) {
          return NextResponse.json(
            { error: 'Gallery ID required' },
            { status: 400 },
          );
        }

        // Delete gallery
        const result = await portfolioManager.deleteGallery(
          vendorId,
          galleryId,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: result,
          message: 'Gallery deleted successfully',
        });

      case 'delete-photo':
        if (!photoId) {
          return NextResponse.json(
            { error: 'Photo ID required' },
            { status: 400 },
          );
        }

        // Delete individual photo
        const photoResult = await portfolioManager.deletePhoto(
          vendorId,
          photoId,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: photoResult,
          message: 'Photo deleted successfully',
        });

      case 'remove-client-access':
        const clientId = searchParams.get('clientId');
        if (!galleryId || !clientId) {
          return NextResponse.json(
            { error: 'Gallery ID and Client ID required' },
            { status: 400 },
          );
        }

        // Remove client access to gallery
        const accessResult = await portfolioManager.removeClientAccess(
          vendorId,
          galleryId,
          clientId,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: accessResult,
          message: 'Client access removed successfully',
        });

      case 'disconnect':
        if (!connectionId) {
          return NextResponse.json(
            { error: 'Connection ID required' },
            { status: 400 },
          );
        }

        // Disconnect portfolio platform
        const disconnectResult = await portfolioManager.disconnectPortfolio(
          connectionId,
          vendorId,
        );
        return NextResponse.json({
          success: true,
          data: disconnectResult,
          message: 'Portfolio platform disconnected successfully',
        });

      case 'clear-sync-data':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Clear local sync data
        const clearResult = await portfolioManager.clearSyncData(
          vendorId,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: clearResult,
          message: 'Sync data cleared successfully',
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Portfolio API DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}

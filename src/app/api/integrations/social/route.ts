// Social Media Integration API Endpoints
// Handles Instagram, Facebook, Pinterest, and other social platform connections

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SocialMediaConnector } from '@/lib/integrations/marketplace/social-media-connector';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const socialConnector = new SocialMediaConnector();

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
        // Get all social media connections for vendor
        const connections = await socialConnector.getAllConnections(vendorId);
        return NextResponse.json({ success: true, data: connections });

      case 'analytics':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Get social media analytics
        const analytics = await socialConnector.getAnalytics(
          vendorId,
          platform,
        );
        return NextResponse.json({ success: true, data: analytics });

      case 'platforms':
        // Get available social media platforms
        const platforms = await socialConnector.getAvailablePlatforms();
        return NextResponse.json({ success: true, data: platforms });

      case 'content-queue':
        // Get scheduled content queue
        const contentQueue = await socialConnector.getContentQueue(vendorId);
        return NextResponse.json({ success: true, data: contentQueue });

      case 'engagement-metrics':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Get engagement metrics
        const metrics = await socialConnector.getEngagementMetrics(
          vendorId,
          platform,
        );
        return NextResponse.json({ success: true, data: metrics });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Social Media API GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, vendorId, platform, postData, contentData, campaignData } =
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

        // Connect to social media platform
        const connection = await socialConnector.connectSocialPlatform(
          platform,
          vendorId,
        );
        return NextResponse.json({
          success: true,
          data: connection,
          message: `Successfully connected to ${platform}`,
        });

      case 'post':
        if (!platform || !postData) {
          return NextResponse.json(
            { error: 'Platform and post data required' },
            { status: 400 },
          );
        }

        // Create social media post
        const postResult = await socialConnector.createPost(
          vendorId,
          platform,
          postData,
        );
        return NextResponse.json({
          success: true,
          data: postResult,
          message: `Post published to ${platform} successfully`,
        });

      case 'schedule-post':
        if (!platform || !postData) {
          return NextResponse.json(
            { error: 'Platform and post data required' },
            { status: 400 },
          );
        }

        // Schedule social media post
        const scheduleResult = await socialConnector.schedulePost(
          vendorId,
          platform,
          postData,
        );
        return NextResponse.json({
          success: true,
          data: scheduleResult,
          message: `Post scheduled for ${platform}`,
        });

      case 'bulk-upload':
        if (!contentData) {
          return NextResponse.json(
            { error: 'Content data required' },
            { status: 400 },
          );
        }

        // Bulk upload wedding photos
        const bulkResult = await socialConnector.bulkUploadWeddingPhotos(
          vendorId,
          contentData,
        );
        return NextResponse.json({
          success: true,
          data: bulkResult,
          message: `Uploaded ${bulkResult.photosUploaded} photos across platforms`,
        });

      case 'sync-engagement':
        if (!platform) {
          return NextResponse.json(
            { error: 'Platform required' },
            { status: 400 },
          );
        }

        // Sync engagement data
        const engagementResult = await socialConnector.syncEngagementData(
          vendorId,
          platform,
        );
        return NextResponse.json({
          success: true,
          data: engagementResult,
          message: `Synced engagement data from ${platform}`,
        });

      case 'create-campaign':
        if (!campaignData) {
          return NextResponse.json(
            { error: 'Campaign data required' },
            { status: 400 },
          );
        }

        // Create marketing campaign
        const campaignResult = await socialConnector.createMarketingCampaign(
          vendorId,
          campaignData,
        );
        return NextResponse.json({
          success: true,
          data: campaignResult,
          message: `Marketing campaign created successfully`,
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Social Media API POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, vendorId, platform, connectionId, postId, settings } = body;

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

        // Update social media settings
        const updateResult = await socialConnector.updatePostingSettings(
          connectionId,
          settings,
        );
        return NextResponse.json({
          success: true,
          data: updateResult,
          message: 'Social media settings updated successfully',
        });

      case 'edit-post':
        if (!postId || !platform) {
          return NextResponse.json(
            { error: 'Post ID and platform required' },
            { status: 400 },
          );
        }

        // Edit scheduled post
        const editResult = await socialConnector.editScheduledPost(
          vendorId,
          platform,
          postId,
          settings,
        );
        return NextResponse.json({
          success: true,
          data: editResult,
          message: 'Post updated successfully',
        });

      case 'toggle-auto-post':
        if (!connectionId) {
          return NextResponse.json(
            { error: 'Connection ID required' },
            { status: 400 },
          );
        }

        // Toggle auto-posting
        const toggleResult =
          await socialConnector.toggleAutoPosting(connectionId);
        return NextResponse.json({
          success: true,
          data: toggleResult,
          message: `Auto-posting ${toggleResult.enabled ? 'enabled' : 'disabled'}`,
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Social Media API PUT error:', error);
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
    const postId = searchParams.get('postId');
    const platform = searchParams.get('platform');

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID required' },
        { status: 400 },
      );
    }

    if (postId && platform) {
      // Delete specific post
      const deletePostResult = await socialConnector.deletePost(
        vendorId,
        platform,
        postId,
      );
      return NextResponse.json({
        success: true,
        data: deletePostResult,
        message: 'Post deleted successfully',
      });
    } else if (connectionId) {
      // Disconnect social media platform
      const disconnectResult = await socialConnector.disconnectSocialPlatform(
        connectionId,
        vendorId,
      );
      return NextResponse.json({
        success: true,
        data: disconnectResult,
        message: 'Social media connection removed successfully',
      });
    } else {
      return NextResponse.json(
        { error: 'Either connection ID or post ID with platform required' },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error('Social Media API DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    );
  }
}
